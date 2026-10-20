import prisma from '@/lib/prisma'
import { listCandidatesWithResumesFor, type Session } from '@/lib/auth'
import { listVacancies, type Vacancy } from '@/lib/vacancies'
import { SECTOR_CATEGORY_MAP } from '@/config/sector-categories'
import { guideAnswer, looksLikeHowTo, GUIDE_TEXT } from '@/services/app-guide'
import ai from '@/lib/gemini'

/**
 * Answers questions about the application's own data (CV counts, stages, categories, ages,
 * vacancy posters, branches ...) straight from the database, so the numbers are always exact and
 * always limited to what the signed-in user may see (a branch only ever sees its own CVs).
 * Returns null when the question is not about app data, so the caller can fall back to the CV-text AI.
 */

const STAGES = [
  'Applied', 'Screening', 'Shortlisted', 'Interview Scheduled',
  'Technical Interview', 'HR Interview', 'Selected', 'Rejected',
]

export const ASSISTANT_HELP = [
  'I can answer questions about everything in ResumeIQ. For example:',
  '• How many candidates are there in total?',
  '• How many vacancy posters are active?',
  '• How many nurses are there? / How many CVs in the IT category?',
  '• Candidates above 30 / between 25 and 35 / aged 28',
  '• How many are shortlisted? / selected / in interviews?',
  '• CVs added today / this week / this month',
  '• Candidates by category, sub category, age, experience or agent',
  '• Tell me about <candidate name>',
  '• Latest uploads / who is the oldest candidate',
  '• Give me a summary of the app',
  '• (Admin) How many branches? Which branch has the most CVs?',
  '• How do I upload a CV? / change a status / post a vacancy / change my password?',
  '• Which vacancy expires first?',
].join('\n')

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const norm = (s: string) => s.toLowerCase().replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim()
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function listLines(items: string[], max = 15) {
  const shown = items.slice(0, max).map((x, i) => `${i + 1}. ${x}`)
  if (items.length > max) shown.push(`…and ${items.length - max} more`)
  return shown.join('\n')
}

function groupCount(list: any[], key: (c: any) => string | null | undefined) {
  const m = new Map<string, number>()
  for (const c of list) {
    const k = (key(c) ?? '').toString().trim() || 'Not specified / uncategorized'
    m.set(k, (m.get(k) || 0) + 1)
  }
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

const breakdown = (rows: [string, number][]) => rows.map(([k, v]) => `• ${k}: ${v}`).join('\n')
const expNumber = (c: any): number | null => {
  const m = String(c.yearsOfExperience ?? '').match(/\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

interface Ctx {
  session: Session
  isAdmin: boolean
  candidates: any[]
  vacancies: Vacancy[] // admin: all (active + expired); branch: active only
  branches: { name: string; loginId: string; active: boolean; cvs: number }[]
  jobTitles: string[]
}

async function loadCtx(session: Session): Promise<Ctx> {
  const isAdmin = session.role === 'ADMIN'
  const [candidates, vacancies] = await Promise.all([
    listCandidatesWithResumesFor(session),
    listVacancies(isAdmin),
  ])
  let branches: Ctx['branches'] = []
  if (isAdmin) {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT a.name, a.loginId, a.active, (SELECT COUNT(*) FROM Candidate c WHERE c.ownerId = a.id) AS cvs
       FROM Account a WHERE a.role = 'BRANCH' ORDER BY a.name`
    )
    branches = rows.map(r => ({ name: r.name, loginId: r.loginId, active: Number(r.active) === 1 || r.active === true, cvs: Number(r.cvs) }))
  }
  let jobTitles: string[] = []
  try {
    const jobs = await prisma.$queryRawUnsafe<any[]>(`SELECT jobTitle FROM JobDescription ORDER BY createdAt DESC`)
    jobTitles = jobs.map(j => j.jobTitle)
  } catch { /* table missing: no jobs */ }
  return { session, isAdmin, candidates, vacancies, branches, jobTitles }
}

// ── Filters pulled out of the question ───────────────────────────────────────

interface Filters {
  stage?: string
  stageGroup?: string // "interview" = any interview stage
  sector?: string
  sub?: string
  ageMin?: number
  ageMax?: number
  exp?: { min?: number; max?: number }
  agent?: string
  branch?: string
  since?: Date
  labels: string[]
}

function parseFilters(q: string, ctx: Ctx): Filters {
  const f: Filters = { labels: [] }
  const cands = ctx.candidates

  // stage
  const stageRules: [string, RegExp][] = [
    ['Interview Scheduled', /interview scheduled|scheduled (for )?interview/],
    ['Technical Interview', /technical (interview|round)/],
    ['HR Interview', /\bhr (interview|round)/],
    ['Shortlisted', /short-?listed/],
    ['Screening', /\bscreening\b/],
    ['Selected', /\b(selected|hired|placed)\b/],
    ['Rejected', /\b(rejected|declined)\b/],
    ['Applied', /\bapplied\b|\bnew applicants?\b/],
  ]
  const hitStage = stageRules.find(([, re]) => re.test(q))
  if (hitStage) { f.stage = hitStage[0]; f.labels.push(`in the "${hitStage[0]}" stage`) }
  else if (/\binterview/.test(q)) { f.stageGroup = 'Interview'; f.labels.push('in an interview stage') }

  // sub category first (more specific), then category
  const subs = new Set<string>(Object.values(SECTOR_CATEGORY_MAP).flat())
  cands.forEach(c => c.category && subs.add(c.category))
  const subHit = Array.from(subs)
    .sort((a, b) => b.length - a.length)
    .find(s => s !== 'Other' && new RegExp(`\\b${esc(norm(s))}(?:s|es)?\\b`).test(q))
  if (subHit) { f.sub = subHit; f.labels.push(`in sub category "${subHit}"`) }

  const sectors = new Set<string>(Object.keys(SECTOR_CATEGORY_MAP))
  cands.forEach(c => c.sector && sectors.add(c.sector))
  const secHit = Array.from(sectors).find(s => {
    const n = norm(s)
    if (n === 'other') return /\bother (category|sector)\b/.test(q)
    if (n.length <= 3) {
      // "it", "hr": only when clearly used as a category name, not as a normal word
      return new RegExp(`\\b${esc(n)}\\s+(sector|category|candidates?|cvs?|resumes?|department|field|people|profiles?)\\b|\\b(sector|category|in|under|from)\\s+${esc(n)}\\b(?!\\s+(the|a|an|my|our|your))`).test(q)
        && !(n === 'hr' && /\bhr (interview|round)/.test(q))
    }
    return new RegExp(`\\b${esc(n)}\\b`).test(q)
  })
  if (secHit && !subHit) { f.sector = secHit; f.labels.push(`in the "${secHit}" category`) }
  else if (secHit && subHit && norm(secHit) !== norm(subHit) && new RegExp(`\\b${esc(norm(secHit))}\\b`).test(q) && norm(secHit).length > 3) {
    f.sector = secHit; f.labels.push(`in the "${secHit}" category`)
  }

  // experience (checked before age so "3 years experience" is not read as an age)
  const expCmp = q.match(/(?:more than|over|above|at least|minimum|min|greater than|>=?)\s*(\d+)\s*\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/)
  const expLess = q.match(/(?:less than|under|below|at most|max|maximum|<=?)\s*(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/)
  const expEq = q.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/)
  if (expCmp) {
    const strict = /\b(more than|over|above|greater than)\b/.test(expCmp[0])
    f.exp = { min: Number(expCmp[1]) + (strict ? 0.0001 : 0) }
    f.labels.push(`with ${strict ? 'more than' : 'at least'} ${expCmp[1]} years of experience`)
  }
  else if (expLess) { f.exp = { max: Number(expLess[1]) }; f.labels.push(`with under ${expLess[1]} years of experience`) }
  else if (expEq) { f.exp = { min: Number(expEq[1]), max: Number(expEq[1]) }; f.labels.push(`with ${expEq[1]} years of experience`) }
  else if (/\b(fresher|freshers|no experience|nil experience)\b/.test(q)) { f.exp = { max: 0 }; f.labels.push('with no experience') }

  // age
  const ageWord = /\bage\b|aged|years? old|yrs? old|older|younger|\bold\b/.test(q)
  const between = q.match(/between\s*(\d+)\s*(?:and|to|-)\s*(\d+)/)
  const above = q.match(/(?:above|over|older than|greater than|more than|at least|>=?)\s*(\d+)(?!\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp))/)
  const below = q.match(/(?:below|under|younger than|less than|at most|<=?)\s*(\d+)(?!\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp))/)
  const exact = q.match(/\bage[d]?\s*(?:of|is|=|:)?\s*(\d{2})\b/) || q.match(/\b(\d{2})\s*(?:years?|yrs?)\s*old\b/) || q.match(/\b(\d{2})\s*(?:y\/o|yo)\b/)
  if (between && (ageWord || !f.exp)) {
    f.ageMin = Math.min(+between[1], +between[2]); f.ageMax = Math.max(+between[1], +between[2])
    f.labels.push(`aged ${f.ageMin}–${f.ageMax}`)
  } else if (exact) {
    f.ageMin = f.ageMax = Number(exact[1]); f.labels.push(`aged ${exact[1]}`)
  } else if ((ageWord || (above && +above[1] >= 14)) && above) { f.ageMin = Number(above[1]) + (/\b(above|over|older than|greater than|more than)\b/.test(above[0]) ? 1 : 0); f.labels.push(/\b(above|over|older than|greater than|more than)\b/.test(above[0]) ? `aged over ${above[1]}` : `aged ${above[1]} or more`) }
  else if ((ageWord || (below && +below[1] >= 14)) && below) { f.ageMax = Number(below[1]) - (/\b(below|under|younger than|less than)\b/.test(below[0]) ? 1 : 0); f.labels.push(/\b(below|under|younger than|less than)\b/.test(below[0]) ? `aged under ${below[1]}` : `aged ${below[1]} or less`) }

  // agent
  if (/\bagent/.test(q)) {
    const agents = Array.from(new Set(cands.map(c => (c.agent ?? '').toString().trim()).filter(a => a.length >= 2)))
    const hit = agents.sort((a, b) => b.length - a.length).find(a => q.includes(norm(a)))
    if (hit) { f.agent = hit; f.labels.push(`with agent "${hit}"`) }
  }

  // branch (admin only)
  if (ctx.isAdmin) {
    const hit = ctx.branches.find(b => new RegExp(`\\b${esc(norm(b.name))}\\b`).test(q) || new RegExp(`\\b${esc(norm(b.loginId))}\\b`).test(q))
    if (hit) { f.branch = hit.name; f.labels.push(`uploaded by ${hit.name}`) }
  }

  // time
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (/\btoday\b/.test(q)) { f.since = startOfDay; f.labels.push('uploaded today') }
  else if (/\byesterday\b/.test(q)) { f.since = new Date(startOfDay.getTime() - 86400000); f.labels.push('uploaded since yesterday') }
  else if (/this week|last 7 days|past week|last week|past 7 days/.test(q)) { f.since = new Date(Date.now() - 7 * 86400000); f.labels.push('uploaded in the last 7 days') }
  else if (/this month|last 30 days|past month|last month/.test(q)) { f.since = new Date(now.getFullYear(), now.getMonth(), 1); f.labels.push('uploaded this month') }

  return f
}

const hasFilters = (f: Filters) => f.labels.length > 0

function applyFilters(list: any[], f: Filters) {
  return list.filter(c => {
    const stage = c.recruitmentStage || 'Applied'
    if (f.stage && stage !== f.stage) return false
    if (f.stageGroup && !stage.includes('Interview')) return false
    if (f.sub && norm(c.category ?? '') !== norm(f.sub)) return false
    if (f.sector && norm(c.sector ?? '') !== norm(f.sector)) return false
    if (f.ageMin !== undefined && !(c.age != null && c.age >= f.ageMin)) return false
    if (f.ageMax !== undefined && !(c.age != null && c.age <= f.ageMax)) return false
    if (f.exp) {
      const e = expNumber(c)
      if (e === null && f.exp.max !== 0) return false
      const val = e ?? 0
      if (f.exp.min !== undefined && val < f.exp.min) return false
      if (f.exp.max !== undefined && val > f.exp.max) return false
    }
    if (f.agent && norm(c.agent ?? '') !== norm(f.agent)) return false
    if (f.branch && c.branchName !== f.branch) return false
    if (f.since && c.createdAt.getTime() < f.since.getTime()) return false
    return true
  })
}

const describe = (c: any, admin: boolean) =>
  [
    c.name,
    [c.sector, c.category].filter(Boolean).join(' › ') || 'No category',
    c.age != null ? `${c.age} yrs` : null,
    c.yearsOfExperience ? `exp: ${c.yearsOfExperience}` : null,
    c.recruitmentStage || 'Applied',
    admin ? c.branchName || 'Unassigned' : null,
  ].filter(Boolean).join(' · ')

// ── Answers ──────────────────────────────────────────────────────────────────

function vacancyAnswer(q: string, ctx: Ctx): string | null {
  const active = ctx.vacancies.filter(v => !v.expired)
  const expired = ctx.vacancies.filter(v => v.expired)
  const line = (v: Vacancy) =>
    `${v.title}${v.company ? ` (${v.company})` : ''}${v.location ? `, ${v.location}` : ''}${v.openings ? ` · ${plural(v.openings, 'opening')}` : ''}${v.closingDate ? ` · apply by ${fmtDate(v.closingDate)}` : ''}`

  // "which vacancy expires first / next / last"
  const soonest = /(expir|clos|end|deadline|due).*\b(first|next|earliest|soonest|nearest|sooner)\b|\b(first|next|earliest|soonest|nearest)\b.*(expir|clos|end|deadline|due)/.test(q)
  const furthest = /(expir|clos|end|deadline|due).*\b(last|latest|furthest|longest)\b|\b(last|latest|furthest|longest)\b.*(expir|clos|end|deadline|due)/.test(q)
  if (soonest || furthest) {
    const dated = active.filter(v => v.closingDate).sort((x, y) => (x.closingDate! < y.closingDate! ? -1 : 1))
    if (dated.length === 0) return active.length ? 'None of the active vacancies has a closing date set, so none of them expires.' : 'There are no active vacancy posters.'
    const v = soonest ? dated[0] : dated[dated.length - 1]
    const days = Math.ceil((new Date(`${v.closingDate}T23:59:59`).getTime() - Date.now()) / 86400000)
    const when = days <= 0 ? 'closes today' : days === 1 ? 'closes tomorrow' : `closes in ${days} days`
    const noDate = active.length - dated.length
    return `${soonest ? 'The next vacancy to expire' : 'The vacancy that stays open the longest'} is ${line(v)}. It ${when}, on ${fmtDate(v.closingDate!)}.` +
      (dated.length > 1 ? `\n\nAll closing dates, earliest first:\n${listLines(dated.map(line))}` : '') +
      (noDate ? `\n\n${plural(noDate, 'active vacancy', 'active vacancies')} ${noDate === 1 ? 'has' : 'have'} no closing date.` : '')
  }
  if (/expired|\bclosed\b|ended|\bpast\b/.test(q)) {
    if (!ctx.isAdmin) return `Expired vacancies are only visible to the admin. There ${active.length === 1 ? 'is' : 'are'} ${plural(active.length, 'active vacancy poster')} right now.`
    return expired.length === 0
      ? 'There are no expired vacancy posters.'
      : `There ${expired.length === 1 ? 'is' : 'are'} ${plural(expired.length, 'expired vacancy poster')}:\n${listLines(expired.map(line))}`
  }
  if (/closing soon|closes soon|about to close|ending soon|deadline/.test(q)) {
    const soon = active.filter(v => v.closingDate && new Date(v.closingDate).getTime() - Date.now() < 7 * 86400000)
    return soon.length === 0
      ? 'No active vacancy is closing in the next 7 days.'
      : `${plural(soon.length, 'vacancy')} closing within 7 days:\n${listLines(soon.map(line))}`
  }
  if (/how many (job )?openings|total openings|number of openings|positions/.test(q)) {
    const total = active.reduce((s, v) => s + (v.openings || 0), 0)
    return `The ${plural(active.length, 'active vacancy poster')} together advertise ${plural(total, 'opening')}.`
  }
  if (/latest|newest|recent|last posted|new\b/.test(q)) {
    const v = active[0]
    return v ? `The newest vacancy is: ${line(v)} (posted ${fmtDate(v.postedAt)}).` : 'No vacancy posters are active right now.'
  }

  // Superlatives about vacancies
  const withOpenings = active.filter(v => v.openings)
  if (/\b(most|highest|largest|biggest|maximum)\b.*openings|openings.*\b(most|highest|largest|maximum)\b/.test(q)) {
    if (withOpenings.length === 0) return 'None of the active vacancies lists a number of openings.'
    const top = [...withOpenings].sort((a, b) => (b.openings || 0) - (a.openings || 0))[0]
    return `${top.title}${top.company ? ` (${top.company})` : ''} has the most openings: ${top.openings}.`
  }
  if (/\b(least|fewest|lowest|smallest|minimum)\b.*openings|openings.*\b(least|fewest|lowest|smallest)\b/.test(q)) {
    if (withOpenings.length === 0) return 'None of the active vacancies lists a number of openings.'
    const low = [...withOpenings].sort((a, b) => (a.openings || 0) - (b.openings || 0))[0]
    return `${low.title}${low.company ? ` (${low.company})` : ''} has the fewest openings: ${low.openings}.`
  }
  if (/\b(oldest|earliest|first)\b.*\b(posted|vacancy|poster)\b|\b(posted|vacancy|poster)\b.*\b(oldest|earliest|first posted)\b/.test(q)) {
    const old = [...active].sort((a, b) => (a.postedAt < b.postedAt ? -1 : 1))[0]
    return old ? `The oldest active vacancy is ${line(old)}, posted on ${fmtDate(old.postedAt)}.` : 'No vacancy posters are active right now.'
  }
  // Anything more specific than "how many / list" goes to the AI instead of a generic list
  if (/\b(which|what|when|where|who|compare|company|location|title|details?)\b/.test(q) && !/\b(list|show|all|every)\b/.test(q)) return null

  const head = ctx.isAdmin
    ? `There ${active.length === 1 ? 'is' : 'are'} ${plural(active.length, 'active vacancy poster')}` +
      (expired.length ? ` (plus ${plural(expired.length, 'expired one')} only you can see)` : '') + '.'
    : `There ${active.length === 1 ? 'is' : 'are'} ${plural(active.length, 'active vacancy poster')} right now.`
  return active.length ? `${head}\n${listLines(active.map(line))}` : head
}

function branchAnswer(q: string, ctx: Ctx): string {
  if (!ctx.isAdmin) {
    return `You are signed in as the branch "${ctx.session.name}" (${ctx.session.loginId}). You can see only the CVs your branch uploaded: ${plural(ctx.candidates.length, 'CV')}.`
  }
  const b = ctx.branches
  const unassigned = ctx.candidates.filter(c => !c.branchName).length
  if (/most|highest|top|best|maximum/.test(q) && b.length) {
    const top = [...b].sort((x, y) => y.cvs - x.cvs)[0]
    if (top.cvs === 0) return `No branch has uploaded a CV yet.${unassigned ? ` The ${plural(unassigned, 'CV')} in the system ${unassigned === 1 ? 'is an older upload' : 'are older uploads'} with no branch.` : ''}`
    return `${top.name} has uploaded the most CVs: ${top.cvs}.`
  }
  if (/least|lowest|fewest|minimum/.test(q) && b.length) {
    const low = [...b].sort((x, y) => x.cvs - y.cvs)[0]
    return `${low.name} has uploaded the fewest CVs: ${low.cvs}.`
  }
  if (/disabled|inactive|blocked/.test(q)) {
    const d = b.filter(x => !x.active)
    return d.length ? `${plural(d.length, 'branch', 'branches')} disabled: ${d.map(x => x.name).join(', ')}.` : 'No branch is disabled.'
  }
  const active = b.filter(x => x.active).length
  const rows = b.map(x => `• ${x.name} (${x.loginId})${x.active ? '' : ' [disabled]'}: ${plural(x.cvs, 'CV')}`)
  if (unassigned) rows.push(`• Older CVs with no branch: ${unassigned}`)
  return `There ${b.length === 1 ? 'is' : 'are'} ${plural(b.length, 'branch', 'branches')} (${active} active, ${b.length - active} disabled).\n${rows.join('\n')}`
}

function profileAnswer(found: any[], ctx: Ctx): string {
  return found.slice(0, 3).map(c => {
    const lines = [
      `${c.name}`,
      `• Category: ${c.sector || 'Not specified'}`,
      `• Sub category: ${c.category || 'Not specified'}`,
      `• Age: ${c.age ?? 'Not specified'}`,
      `• Experience: ${c.yearsOfExperience || 'Not specified'}`,
      `• Agent: ${c.agent || 'Not specified'}`,
      `• Stage: ${c.recruitmentStage || 'Applied'}`,
      ctx.isAdmin ? `• Uploaded by: ${c.branchName || 'Unassigned (older upload)'}` : null,
      `• Uploaded on: ${fmtDate(c.createdAt)}`,
      `• Saved file${(c.resumes ?? []).length === 1 ? '' : 's'}: ${(c.resumes ?? []).map((r: any) => r.fileName).join(', ') || 'none'}`,
    ].filter(Boolean)
    return lines.join('\n')
  }).join('\n\n') + (found.length > 3 ? `\n\n…and ${found.length - 3} more matches.` : '')
}

function summaryAnswer(ctx: Ctx): string {
  const { candidates: c } = ctx
  const active = ctx.vacancies.filter(v => !v.expired).length
  const week = c.filter(x => x.createdAt.getTime() >= Date.now() - 7 * 86400000).length
  const parts = [
    `Here is the current picture${ctx.isAdmin ? ' across all branches' : ` for ${ctx.session.name}`}:`,
    `• Total CVs: ${c.length} (${week} added in the last 7 days)`,
    `• Active vacancy posters: ${active}${ctx.isAdmin ? `, expired: ${ctx.vacancies.length - active}` : ''}`,
    ctx.isAdmin ? `• Branches: ${ctx.branches.length}` : null,
    `• Saved job descriptions: ${ctx.jobTitles.length}`,
    '',
    'By stage:',
    breakdown(STAGES.map(s => [s, c.filter(x => (x.recruitmentStage || 'Applied') === s).length] as [string, number]).filter(([, n]) => n > 0)) || '• No CVs yet',
    '',
    'By category:',
    breakdown(groupCount(c, x => x.sector)) || '• No CVs yet',
  ].filter(x => x !== null)
  return parts.join('\n')
}

// ── Entry point ──────────────────────────────────────────────────────────────

export async function answerAppQuestion(session: Session, question: string): Promise<string | null> {
  const q = norm(question.replace(/[?!.]+$/g, ''))
  if (!q) return null

  if (/^(hi|hello|hey|help|what can you (do|answer)|how can you help|options|menu)\b/.test(q) || /what (can|do) you (do|know)/.test(q)) {
    return ASSISTANT_HELP
  }
  if (/\b(who am i|my role|my account|logged in as|my branch)\b/.test(q)) {
    return session.role === 'ADMIN'
      ? `You are signed in as ${session.name} (${session.loginId}) with admin access to every branch's CVs.`
      : `You are signed in as the branch "${session.name}" (${session.loginId}). You can see only your own branch's CVs.`
  }

  // "How do I ...", "where can I ...", "who can ..." questions about using the app
  const howTo = guideAnswer(q, session.role === 'ADMIN')
  if (howTo && (looksLikeHowTo(q) || /\b(steps?|procedure|process|instructions?|guide)\b/.test(q))) return howTo

  const ctx = await loadCtx(session)

  // Vacancies / posters
  if (/vacanc|poster|hiring|job post|openings?\b|positions?\b/.test(q) && !/candidate|cvs?\b|resume/.test(q)) {
    return vacancyAnswer(q, ctx)
  }
  // Saved job descriptions (the Jobs page)
  if (/\bjobs?\b|job descriptions?|jobs page|recruitment jobs/.test(q) && !/candidate|cvs?\b|resume/.test(q)) {
    const t = ctx.jobTitles
    return t.length === 0
      ? 'No job descriptions have been saved on the Jobs page yet.'
      : `There ${t.length === 1 ? 'is' : 'are'} ${plural(t.length, 'saved job description')}:\n${listLines(t)}`
  }
  const f = parseFilters(q, ctx)
  // Branches (a question that names one specific branch and asks about its CVs is a candidate question)
  if (/\bbranch(es)?\b/.test(q) && !f.branch) {
    return branchAnswer(q, ctx)
  }
  if (/\b(summary|overview|statistics|stats|dashboard|everything|report|snapshot)\b/.test(q)) {
    return summaryAnswer(ctx)
  }

  const all = ctx.candidates
  const asksCount = /how many|count|number of|total|\bcount\b/.test(q)
  const asksList = /\b(list|show|who|which|name|names|give|display|find|see|get)\b/.test(q)
  const candidateWord = /candidate|\bcvs?\b|resume|applicant|people|profile|upload|person|staff|worker/.test(q)

  // A specific person
  if (!asksCount) {
    const STOP = new Set(['sample', 'resume', 'engineer', 'designer', 'developer', 'manager', 'analyst', 'candidate', 'candidates', 'with', 'from', 'that', 'this', 'what', 'about', 'tell', 'show', 'give', 'list', 'details', 'detail', 'profile'])
    const found = all.filter(c => {
      const n = norm(c.name)
      if (n.length >= 3 && q.includes(n)) return true
      return n.split(' ').some((t: string) => t.length >= 4 && !STOP.has(t) && new RegExp(`\\b${esc(t)}\\b`).test(q))
    })
    const exactFull = found.filter(c => norm(c.name).length >= 3 && q.includes(norm(c.name)))
    if (exactFull.length > 0) { found.length = 0; found.push(...exactFull) }
    if (found.length > 0 && !hasFilters(f)) {
      // Questions about what is written inside the CV belong to the CV-text AI
      if (/\b(say|says|said|mention|mentions|skills?|projects?|education|certifications?|worked|work history|knows?|languages?|summary|strengths?|weakness|suitable|fit|compare)\b/.test(q)) return null
      const answers: string[] = []
      for (const one of found.slice(0, 3)) {
        const field = [
          [/\bage\b|how old/, `${one.name} is ${one.age ?? 'not recorded'}${one.age != null ? ' years old' : ''}.`],
          [/sub ?categor/, `${one.name}'s sub category is ${one.category || 'not specified'}.`],
          [/categor|sector/, `${one.name}'s category is ${one.sector || 'not specified'}.`],
          [/experience/, `${one.name}'s experience: ${one.yearsOfExperience || 'not specified'}.`],
          [/\bagent\b/, `${one.name}'s agent: ${one.agent || 'not specified'}.`],
          [/stage|status/, `${one.name} is in the "${one.recruitmentStage || 'Applied'}" stage.`],
          [/\bfile\b|file name/, `${one.name}'s saved file: ${(one.resumes ?? []).map((r: any) => r.fileName).join(', ') || 'none'}.`],
          [/uploaded|upload date|when/, `${one.name} was uploaded on ${fmtDate(one.createdAt)}${ctx.isAdmin ? ` by ${one.branchName || 'an unassigned older upload'}` : ''}.`],
        ] as [RegExp, string][]
        const hit = field.find(([re]) => re.test(q))
        if (hit) answers.push(hit[1])
      }
      if (answers.length > 0) return answers.join('\n')
      return profileAnswer(found, ctx)
    }
  }

  // Distributions ("by category", "age wise", "which category has the most")
  const dim = (() => {
    if (/sub ?categor/.test(q)) return ['sub category', (c: any) => c.category] as const
    if (/\bcategor|\bsector/.test(q)) return ['category', (c: any) => c.sector] as const
    if (/\bage\b|age ?group|age ?wise/.test(q) && !f.ageMin && !f.ageMax) return ['age group', (c: any) => c.age == null ? null : c.age < 25 ? '18–24' : c.age < 35 ? '25–34' : c.age < 45 ? '35–44' : c.age < 55 ? '45–54' : '55+'] as const
    if (/experience/.test(q) && !f.exp) return ['experience', (c: any) => c.yearsOfExperience] as const
    if (/\bagents?\b/.test(q) && !f.agent) return ['agent', (c: any) => c.agent] as const
    if (/\b(stage|status|pipeline)\b/.test(q) && !f.stage && !f.stageGroup) return ['stage', (c: any) => c.recruitmentStage || 'Applied'] as const
    return null
  })()
  const wantsBreakdown = /\b(by|per|each|wise|breakdown|distribution|group|grouped|most|highest|top|least|lowest|fewest|common|popular|all)\b/.test(q) || /how many .*(categor|sector|agents?)/.test(q) || /(categories|sectors|agents|stages)\b/.test(q)
  if (dim && wantsBreakdown && !hasFilters(f)) {
    const [name, fn] = dim
    const rows = groupCount(all, fn)
    if (rows.length === 0) return 'There are no CVs yet.'
    if (/\b(most|highest|top|common|popular|largest|biggest)\b/.test(q)) return `The ${name} with the most CVs is ${rows[0][0]} (${rows[0][1]}).\n\n${breakdown(rows)}`
    if (/\b(least|lowest|fewest|smallest)\b/.test(q)) { const l = rows[rows.length - 1]; return `The ${name} with the fewest CVs is ${l[0]} (${l[1]}).\n\n${breakdown(rows)}` }
    return `CVs by ${name} (${all.length} in total):\n${breakdown(rows)}`
  }

  // Oldest / youngest / average age
  if (/\b(oldest|youngest|average age|mean age|avg age)\b/.test(q)) {
    const withAge = all.filter(c => c.age != null)
    if (withAge.length === 0) return 'No CV has an age recorded yet.'
    if (/average|mean|avg/.test(q)) return `The average age is ${(withAge.reduce((s, c) => s + c.age, 0) / withAge.length).toFixed(1)} years across ${plural(withAge.length, 'CV')}.`
    const pick = [...withAge].sort((a, b) => /oldest/.test(q) ? b.age - a.age : a.age - b.age)[0]
    return `The ${/oldest/.test(q) ? 'oldest' : 'youngest'} candidate is ${describe(pick, ctx.isAdmin)}.`
  }

  // Latest uploads
  if (/\b(latest|recent|recently|newest|last)\b.*\b(uploads?|uploaded|added|cvs?|candidates?|resumes?)\b|\b(uploads?|uploaded|added)\b.*\b(latest|recent|last)\b/.test(q) && !hasFilters(f)) {
    const m = q.match(/\b(\d+)\b/)
    const n = Math.min(Math.max(m ? Number(m[1]) : 5, 1), 20)
    return all.length === 0 ? 'There are no CVs yet.' : `The latest ${plural(Math.min(n, all.length), 'upload')}:\n${listLines(all.slice(0, n).map(c => `${describe(c, ctx.isAdmin)} (${fmtDate(c.createdAt)})`), n)}`
  }

  // Counts and lists with filters
  if (hasFilters(f) || candidateWord || asksCount) {
    if (!hasFilters(f) && !candidateWord && !/candidate|cv|resume/.test(q)) return null
    const matched = applyFilters(all, f)
    const scope = hasFilters(f) ? ` ${f.labels.join(' and ')}` : ''

    if (asksList && !asksCount) {
      return matched.length === 0
        ? `No CVs found${scope}.`
        : `${plural(matched.length, 'CV')}${scope}:\n${listLines(matched.map(c => describe(c, ctx.isAdmin)))}`
    }
    if (!hasFilters(f)) {
      const week = all.filter(c => c.createdAt.getTime() >= Date.now() - 7 * 86400000).length
      return `There ${all.length === 1 ? 'is' : 'are'} ${plural(all.length, 'candidate CV')} in total${ctx.isAdmin ? ' across all branches' : ' uploaded by your branch'}, ${week} of them added in the last 7 days.`
    }
    const head = `${matched.length === 0 ? 'No' : matched.length} ${matched.length === 1 ? 'CV' : 'CVs'}${scope}.`
    return matched.length && matched.length <= 10 ? `${head}\n${listLines(matched.map(c => describe(c, ctx.isAdmin)))}` : head
  }

  // Last resort: a loosely-worded question about how something works
  return guideAnswer(q, session.role === 'ADMIN')
}

// ── Open-ended questions: the AI answers from a snapshot of the app, never from guesses ──

export const NEEDS_CV_TEXT = 'NEEDS_CV_TEXT'

/**
 * For anything the fixed rules above can't answer. Gemini gets the app guide plus a snapshot of exactly the
 * data this login may see (upload fields only: no phone, email or CV text) and must stay inside it.
 * Returns NEEDS_CV_TEXT when the question is about what is written inside CVs, and null if the AI is unavailable.
 */
export async function answerWithAppContext(session: Session, question: string): Promise<string | null> {
  try {
    const ctx = await loadCtx(session)
    const active = ctx.vacancies.filter(v => !v.expired)
    const roster = ctx.candidates.slice(0, 300).map(c =>
      [
        `name=${c.name}`, `category=${c.sector || '-'}`, `sub=${c.category || '-'}`, `age=${c.age ?? '-'}`,
        `experience=${c.yearsOfExperience || '-'}`, `agent=${c.agent || '-'}`, `stage=${c.recruitmentStage || 'Applied'}`,
        ctx.isAdmin ? `branch=${c.branchName || 'unassigned'}` : null,
        `uploaded=${new Date(c.createdAt).toISOString().slice(0, 10)}`,
        `files=${(c.resumes ?? []).map((r: any) => r.fileName).join('|') || '-'}`,
      ].filter(Boolean).join('; ')
    )
    const vac = ctx.vacancies.map(v =>
      `${v.title}; company=${v.company || '-'}; location=${v.location || '-'}; openings=${v.openings ?? '-'}; closing=${v.closingDate || 'none'}; posted=${v.postedAt.slice(0, 10)}; ${v.expired ? 'EXPIRED' : 'active'}`
    )
    const prompt = `You are the assistant inside ResumeIQ, a recruitment CRM. Today is ${new Date().toISOString().slice(0, 10)}.
The signed-in user is ${ctx.isAdmin ? 'the ADMIN (sees every branch)' : `branch "${session.name}" (sees only its own CVs)`}.

Rules:
- Answer ONLY from the APP GUIDE and LIVE DATA below. Never invent numbers, names or features.
- Count and compute from LIVE DATA yourself, carefully. Be brief and direct, plain text, short bullet lines where helpful.
- If the question is about what is written INSIDE a CV (skills, projects, education, work history), reply with exactly ${NEEDS_CV_TEXT} and nothing else.
- If the answer is not in the guide or data, say you don't have that information in ResumeIQ. Do not guess.

APP GUIDE:
${GUIDE_TEXT}

LIVE DATA
Total CVs visible: ${ctx.candidates.length}
Active vacancy posters: ${active.length}${ctx.isAdmin ? `; expired: ${ctx.vacancies.length - active.length}` : ''}
Saved job descriptions: ${ctx.jobTitles.length}${ctx.isAdmin ? `\nBranches: ${ctx.branches.map(b => `${b.name} (${b.loginId}, ${b.active ? 'active' : 'disabled'}, ${b.cvs} CVs)`).join('; ') || 'none'}` : ''}
Stages in use: ${STAGES.join(', ')}
Vacancies:
${vac.join('\n') || '(none)'}
CVs (${roster.length} shown):
${roster.join('\n') || '(none)'}

QUESTION: ${question}
ANSWER:`

    const call = ai.models.generateContent({ model: 'gemini-flash-lite-latest', contents: prompt })
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000))
    const res = await Promise.race([call, timeout])
    const text = (res.text || '').trim()
    return text || null
  } catch (err) {
    console.error('App-context AI failed:', err)
    return null
  }
}

/** Long or multi-part questions are better served by the AI than by the fixed rules. */
export const isComplexQuestion = (question: string) => {
  const q = norm(question)
  return q.split(' ').length > 11 || /\bwhose\b|\bthan the\b|\bcompared? (to|with)\b|\bdifference between\b|\bwhich .* and .*\b(is|are|has|have)\b/.test(q)
}

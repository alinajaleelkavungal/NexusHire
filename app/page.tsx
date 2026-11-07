import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight, FileText, CalendarBlank, ChatText, CheckCircle,
  ArrowUpRight, Users
} from '@/components/icons'
import { getSession, listCandidatesFor } from '@/lib/auth'
import { listVacancies } from '@/lib/vacancies'
import VacancyBoard from '@/components/VacancyBoard'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Home · NexusHire' }

// Keep in sync with STAGES in app/board/page.tsx
const STAGES = [
  'Applied', 'Screening', 'Shortlisted', 'Interview Scheduled',
  'Technical Interview', 'HR Interview', 'Selected', 'Rejected',
]

const AVATAR_PALETTES = [
  { bg: 'bg-[#fdf3f0]', text: 'text-[#e85d3f]', border: 'border-[#fbe4de]' }, // Burnt Coral
  { bg: 'bg-[#fefcf3]', text: 'text-[#b58933]', border: 'border-[#fbedb8]' }, // Butter Yellow
  { bg: 'bg-[#f5f3f1]', text: 'text-[#24211f]', border: 'border-[#e8e4e0]' }, // Espresso
  { bg: 'bg-[#fdf6f0]', text: 'text-[#c85a32]', border: 'border-[#fce9dd]' }, // Terracotta
  { bg: 'bg-[#f3f6f1]', text: 'text-[#467335]', border: 'border-[#e2ebdc]' }, // Sage Olive
  { bg: 'bg-[#f4f6fa]', text: 'text-[#225178]', border: 'border-[#dde7f1]' }, // Warm Slate
]

function getAvatarPalette(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length]
}

export default async function HomePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Admin: every branch. Branch: only its own CVs.
  const candidates = await listCandidatesFor(session)
  const isAdmin = session.role === 'ADMIN'
  const vacancies = await listVacancies(true)

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const stageOf = (c: any) => c.recruitmentStage || 'Applied'
  const countStage = (stage: string) => candidates.filter(c => stageOf(c) === stage).length

  const stats = [
    {
      label: 'TOTAL CVS',
      value: candidates.length,
      colorClass: 'text-[#191614] dark:text-[#f3eee8]',
      subtitle: 'Candidate profiles'
    },
    {
      label: 'ADDED THIS WEEK',
      value: candidates.filter(c => c.createdAt.getTime() >= weekAgo).length,
      colorClass: 'text-[#e85d3f]',
      subtitle: 'New resumes'
    },
    {
      label: 'IN INTERVIEWS',
      value: candidates.filter(c => stageOf(c).includes('Interview')).length,
      colorClass: 'text-[#191614] dark:text-[#f3eee8]',
      subtitle: 'Active rounds'
    },
    {
      label: 'SELECTED',
      value: countStage('Selected'),
      colorClass: 'text-[#191614] dark:text-[#f3eee8]',
      subtitle: 'Final placement'
    },
  ]

  const recent = candidates.slice(0, 6)
  const maxStage = Math.max(1, ...STAGES.map(countStage))

  const byBranch = new Map<string, number>()
  if (isAdmin) {
    candidates.forEach(c => {
      const name = c.branchName || 'Unassigned'
      byBranch.set(name, (byBranch.get(name) || 0) + 1)
    })
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 select-none">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1">
            <span className="text-[10px] sm:text-[11px] font-mono tracking-[0.2em] uppercase font-bold text-[#e85d3f]">
              THE GLOBAL HUB FOR CROSS-BORDER MANPOWER
            </span>
          </div>
          <h1
            className="text-4xl sm:text-5xl font-black text-[#191614] dark:text-[#f3eee8] tracking-tight leading-none mt-1.5 mb-2 font-sans"
            style={{ fontFamily: 'var(--font-satoshi), sans-serif' }}
          >
            {greeting}, {session.name}.
          </h1>
          <p className="text-sm font-medium text-[#6b6257] dark:text-[#a89c8e]">
            {isAdmin
              ? "Recruitment overview across all branches."
              : "Here's an overview of the CVs your branch has uploaded."}
          </p>
        </div>

        <Link
          href="/candidates"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#181513] hover:bg-black text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-98"
        >
          <span>View candidates</span>
          <ArrowRight weight="bold" className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Modernist Stats Bar (Architectural 4-column divided grid) */}
      <div className="border-t border-b border-[#c8c0af] dark:border-[#3d3329] grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#c8c0af] dark:divide-[#3d3329]">
        {stats.map(s => (
          <div key={s.label} className="py-3 px-3 sm:px-5 flex flex-col justify-between">
            <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.16em] uppercase font-bold text-[#7a7062] dark:text-[#a89c8e]">
              {s.label}
            </span>
            <div className={`text-2xl sm:text-3xl font-black leading-none my-1.5 tabular-nums font-sans ${s.colorClass}`}>
              {s.value}
            </div>
            <span className="text-[11px] text-[#7a7062] dark:text-[#8a7f70] font-medium">
              {s.subtitle}
            </span>
          </div>
        ))}
      </div>

      {/* Vacancy Board */}
      <VacancyBoard vacancies={vacancies} isAdmin={isAdmin} candidates={candidates} />

      {/* Recent Uploads & Pipeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Uploads */}
        <section className="lg:col-span-3 vertix-card rounded-3xl p-6 shadow-[0_2px_14px_-3px_rgba(36,33,31,0.04)]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f0ece1] dark:border-[#2d241d]">
            <h2 className="text-sm font-bold text-[#24211f]">Recent candidate uploads</h2>
            <Link
              href="/candidates"
              className="text-xs font-semibold text-[#7e715f] hover:text-[#24211f] flex items-center gap-1 transition-colors"
            >
              See all <ArrowUpRight weight="bold" className="w-3 h-3" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <p className="text-xs font-medium text-[#a79a87] py-8 text-center">
              No CVs uploaded yet. Click &quot;Upload CV&quot; to add your first candidate.
            </p>
          ) : (
            <ul className="divide-y divide-[#f0ece1]">
              {recent.map(c => {
                const palette = getAvatarPalette(c.id)
                return (
                  <li key={c.id}>
                    <Link
                      href={`/candidates/${c.id}`}
                      className="flex items-center gap-3.5 py-3 hover:bg-[#faf8f5] -mx-2 px-3 rounded-2xl transition-colors group"
                    >
                      <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-xs border ${palette.bg} ${palette.text} ${palette.border}`}>
                        {c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#24211f] truncate group-hover:text-[#e85d3f] transition-colors">
                          {c.name}
                        </p>
                        <p className="text-[11px] font-medium text-[#7e715f] truncate mt-0.5">
                          {[c.sector, c.category].filter(Boolean).join(' · ') || 'No category'}
                          {isAdmin && ` · ${c.branchName || 'Unassigned'}`}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-[#a79a87] shrink-0">
                        {c.createdAt.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Pipeline Summary */}
        <section className="lg:col-span-2 vertix-card rounded-3xl p-6 shadow-[0_2px_14px_-3px_rgba(36,33,31,0.04)]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f0ece1] dark:border-[#2d241d]">
            <h2 className="text-sm font-bold text-[#24211f]">Recruitment pipeline</h2>
            <span className="text-[11px] font-semibold text-[#a79a87] dark:text-[#73675a]">
              {candidates.length} total
            </span>
          </div>

          <ul className="space-y-3.5">
            {STAGES.map(stage => {
              const n = countStage(stage)
              const isSelected = stage === 'Selected'
              const isRejected = stage === 'Rejected'
              const isInterview = stage.includes('Interview')
              const barColor = isRejected
                ? 'bg-[#aa2c1e]'
                : isSelected
                ? 'bg-[#e85d3f]'
                : isInterview
                ? 'bg-[#f4d06f]'
                : 'bg-[#24211f] dark:bg-white/70'

              return (
                <li key={stage}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[#423a30] dark:text-[#d4c9bd]">{stage}</span>
                    <span className="font-bold text-[#24211f] dark:text-[#f3eee8] tabular-nums">{n}</span>
                  </div>
                  <div className="h-2 bg-[#f0ece1] dark:bg-[#2d241d] overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${(n / maxStage) * 100}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      {/* Admin: CVs by Branch */}
      {isAdmin && byBranch.size > 0 && (
        <section className="vertix-card rounded-3xl p-6 shadow-[0_2px_14px_-3px_rgba(36,33,31,0.04)]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f0ece1] dark:border-[#2d241d]">
            <h2 className="text-sm font-bold text-[#24211f]">CVs by Branch</h2>
            <Link
              href="/admin/branches"
              className="text-xs font-semibold text-[#7e715f] dark:text-[#a89c8e] hover:text-[#24211f] dark:hover:text-white flex items-center gap-1 transition-colors"
            >
              Manage branches <ArrowUpRight weight="bold" className="w-3 h-3" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from(byBranch.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([name, n]) => (
                <li
                  key={name}
                  className="border border-[#e2dcce] dark:border-[#352c25] rounded-2xl p-4 bg-[#faf8f5] dark:bg-[#241c17] hover:bg-white dark:hover:bg-[#2c221c] transition-colors"
                >
                  <p className="text-2xl font-black text-[#24211f] dark:text-[#f3eee8] tabular-nums">{n}</p>
                  <p className="text-xs font-semibold text-[#423a30] dark:text-[#d4c9bd] truncate mt-0.5">{name}</p>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  )
}

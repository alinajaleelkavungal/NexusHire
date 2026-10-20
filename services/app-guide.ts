// "How does ResumeIQ work?" knowledge for the AI Assistant.
// Each entry: every group in `all` must match (a group is a regex), plus a role note where it matters.

interface Entry {
  topic: string
  all: RegExp[]
  answer: string
  adminOnly?: boolean
}

const STAGES = 'Applied, Screening, Shortlisted, Interview Scheduled, Technical Interview, HR Interview, Selected, Rejected'

const GUIDE: Entry[] = [
  {
    topic: 'upload',
    all: [/upload|add|new|create|submit|save/, /\b(cv|resume|candidate)s?\b/],
    answer:
      'To add a CV: open Candidates and click "Upload CV". Choose the file, then fill in all six fields: Name, Age (14–80), Category, Sub category, Experience and Agent. Every field is mandatory; "Nil" counts as an answer for Experience or Agent. Nothing is saved until you click "Submit & Save CV", and closing the window before that discards it. The file is stored privately in Backblaze B2, and the CV starts in the "Applied" stage. A branch login owns whatever it uploads.',
  },
  {
    topic: 'mandatory',
    all: [/mandatory|required|compulsory|must fill|which fields|what fields|details (do|to)/, /upload|cv|resume|candidate|form|fields?/],
    answer:
      'All six upload fields are mandatory: Name, Age (between 14 and 80), Category, Sub category, Experience and Agent. "Nil" is accepted as an answer when something does not apply. The Submit & Save CV button only saves once they are all filled.',
  },
  {
    topic: 'duplicate',
    all: [/duplicate|already (exists|uploaded)|same (cv|name|person)/],
    answer:
      'When you type a name in the upload form, ResumeIQ checks it when you leave the field and warns you if a CV with that name already exists. A branch login is only warned about duplicates among its own CVs.',
  },
  {
    topic: 'status',
    all: [/(change|update|set|move|edit|mark)/, /\b(status|stage)\b/],
    answer:
      `Open Candidates and use the status dropdown on the candidate's row; the change saves immediately. The stages are: ${STAGES}.`,
  },
  {
    topic: 'stages',
    all: [/\b(stages?|statuses|pipeline)\b/, /what|which|list|available|options|name/],
    answer: `The recruitment stages are: ${STAGES}. Every new CV starts as "Applied".`,
  },
  {
    topic: 'edit candidate',
    all: [/(edit|change|correct|fix|update|modify)/, /(candidate|cv|resume|details|name|age|category|experience|agent)/],
    answer:
      'On the Candidates page, click the small "Edit" next to a candidate to change their name, age, category, sub category, experience or agent. To change the status/stage, use the dropdown on the same row.',
  },
  {
    topic: 'delete candidate',
    all: [/(delete|remove)/, /(candidate|cv|resume)/],
    answer:
      'On the Candidates page click the bin icon on a row (you can also select several and delete in bulk). The CV file is removed from Backblaze as well. A branch login can only delete its own CVs. Deleting cannot be undone.',
  },
  {
    topic: 'view cv file',
    all: [/(open|view|download|see|read|preview)/, /(file|cv|resume|pdf|document)/],
    answer:
      'Click a candidate to open their profile, or find them with Search and click "Open CV". The file opens through a short-lived private link from Backblaze, so it cannot be shared publicly.',
  },
  {
    topic: 'search page',
    all: [/search/, /(how|where|work|use|what|find|page)/],
    answer:
      'The Search page finds CVs by anything entered at upload: name, age, category, sub category, experience, agent, or the saved file name (admins can also search by branch). Every word you type has to match something, so more words narrow the results. Results show the matching file with an "Open CV" link. Branch logins only search their own CVs.',
  },
  {
    topic: 'sectors',
    all: [/\bsectors?\b/, /(page|what|how|work|show|use|find|menu)/],
    answer:
      'Under "Browse by", the Sectors page groups CVs by category. Each sector bar has its own search box (file name or candidate name) and sub-category buttons: click one to see every CV under it. The search at the top searches across all sectors and opens the matching bars.',
  },
  {
    topic: 'age page',
    all: [/\bage\b/, /(page|menu|browse|group|bracket|what|how)/, /(page|menu|browse|bracket|group)/],
    answer:
      'Under "Browse by", the Age page groups CVs by the age entered at upload (18–24, 25–34, 35–44, 45–54, 55+, plus a group for CVs without an age). Click a bar to see its candidates; the search box also matches saved file names.',
  },
  {
    topic: 'experience page',
    all: [/experience/, /(page|menu|browse|group|what|how)/, /(page|menu|browse|group)/],
    answer:
      'Under "Browse by", the Experience page groups CVs by the experience entered at upload. Click a bar to see its candidates; the search box also matches saved file names.',
  },
  {
    topic: 'filters',
    all: [/(filter|narrow|sort)/, /(candidates?|cvs?|list)/],
    answer:
      'On the Candidates page, use the chips under the search box to filter by sector, by stage and (for admins) by branch. The search box matches name, skills, category, sub category and file name. Filters combine.',
  },
  {
    topic: 'vacancy post',
    all: [/(post|add|create|publish|new|upload)/, /(vacanc|poster|job post)/],
    answer:
      'Only the admin can post vacancies: on Home click "Post vacancy", enter a title (required) and optionally company, location, openings, closing date, details and a poster image (PNG, JPG or WebP). The closing date cannot be in the past. A new vacancy shows first and carries a NEW tag for 3 days.',
    adminOnly: true,
  },
  {
    topic: 'vacancy edit delete',
    all: [/(edit|change|update|delete|remove|take down)/, /(vacanc|poster)/],
    answer:
      'Only the admin can edit or delete vacancies, using the Edit and bin buttons at the top of the poster on Home. Branch logins can view vacancies but never see those buttons.',
  },
  {
    topic: 'vacancy visibility',
    all: [/(who|which|can|see|visible|branch|branches)/, /(vacanc|poster)/, /(see|view|visible|access|show)/],
    answer:
      'Every login sees the active vacancies on its Home page. Only the admin can post, edit or delete them, and only the admin sees expired ones.',
  },
  {
    topic: 'vacancy expiry',
    all: [/(expir|closing date|close|deadline|disappear|hidden)/, /(vacanc|poster|how|when|work)/],
    answer:
      'A vacancy stays active until its closing date has ended everywhere (so nobody sees it vanish early). After that it is hidden from branches and shown to the admin with an "Expired" tag. A vacancy with no closing date never expires. Admins can Edit it to extend the date.',
  },
  {
    topic: 'poster size',
    all: [/(size|ratio|dimension|image|fit|crop|enlarge|zoom|popup|pop up)/, /(vacanc|poster)/],
    answer:
      'The poster box is a fixed 4:3 frame, so any image size is scaled to fit without being cropped or changing the layout. Click an image poster to open it full size; click outside, press Esc or use the X to close.',
  },
  {
    topic: 'login roles',
    all: [/(role|roles|admin|branch|difference|types? of (user|login))/, /(difference|what|who|can|access|permission|login|user)/],
    answer:
      'There are two kinds of login. The admin sees every CV from every branch (with the branch tag and a branch filter) and can add branches, reset passwords, disable branches, post vacancies and delete sectors/categories. A branch login signs in with its branch ID and password and only ever sees the CVs its own branch uploaded.',
  },
  {
    topic: 'add branch',
    all: [/(add|create|new|make|register)/, /branch/],
    answer:
      'Admin only: open Branches in the left menu, click to add a branch, and set its name, branch ID and a password. Share the ID and password with that branch.',
    adminOnly: true,
  },
  {
    topic: 'reset branch password',
    all: [/(reset|forgot|forgotten|lost|recover)/, /(password|login)/],
    answer:
      'Admin only: open Branches and use "Reset password" on that branch to set a new one. Anyone who knows their current password can change it themselves from "Change password" in the left menu.',
  },
  {
    topic: 'disable branch',
    all: [/(disable|deactivate|block|suspend|enable|reactivate|turn off)/, /branch/],
    answer:
      'Admin only: on the Branches page you can disable a branch (it can no longer sign in, effective immediately) and enable it again later. Its CVs stay in the system.',
    adminOnly: true,
  },
  {
    topic: 'change password',
    all: [/(change|update|new|set)/, /password/],
    answer:
      'Click "Change password" at the bottom of the left menu, enter your current password and a new one. This works for both admin and branch logins.',
  },
  {
    topic: 'login',
    all: [/(log ?in|sign ?in|log ?out|sign ?out|session|expire.*login|logged out)/],
    answer:
      'Sign in with your admin or branch ID and password. Sessions last 12 hours, then you are asked to sign in again. Use "Sign out" at the bottom of the left menu to log out. After 5 wrong attempts within 15 minutes, sign-in is paused for a while.',
  },
  {
    topic: 'storage',
    all: [/(where|how|stored|storage|backblaze|b2|bucket|files? (are|is)|saved)/, /(file|cv|resume|stored|storage|backblaze|b2|bucket|poster)/],
    answer:
      'CV files and vacancy posters are stored in a private Backblaze B2 bucket. The app opens them through short-lived signed links, so they are never public. Candidate details live in the app database.',
  },
  {
    topic: 'jobs page',
    all: [/\bjobs?\b|job description|recruitment/, /(what|how|page|use|work|match|add|create)/],
    answer:
      'The Jobs page (under Recruitment) holds job descriptions. You can save a job and match it against your CVs to see the best-fitting candidates. Branch logins only match against their own CVs.',
  },
  {
    topic: 'assistant',
    all: [/(assistant|chatbot|chat bot|ai)/, /(what|how|can|do|use|ask|work)/],
    answer:
      'The AI Assistant answers questions about the app\'s live data (candidate counts, vacancy posters, stages, categories, ages, branches, a specific candidate) and explains how the app works. It only ever uses data your login is allowed to see.',
  },
  {
    topic: 'home',
    all: [/\bhome\b|dashboard|landing/, /(what|show|page|see|contain)/],
    answer:
      'Home shows the vacancy poster slider, four headline numbers (total CVs, added this week, in interviews, selected), your recent uploads, the pipeline by stage, and (for admins) CVs by branch.',
  },
  {
    topic: 'menu',
    all: [/(menu|sidebar|navigation|pages|sections|features)/, /(what|which|list|available|have|there)/],
    answer:
      'Left menu: Talent (Home, Candidates, Search, AI Assistant), Browse by (Sectors, Age, Experience), Recruitment (Jobs), and for admins Administration (Branches). At the bottom: Change password and Sign out.',
  },
  {
    topic: 'what is resumeiq',
    all: [/(what is|what's|about|purpose|explain)/, /(resumeiq|this app|this application|the app|this system|this tool)/],
    answer:
      'ResumeIQ is a recruitment CRM. Branches upload CVs with a few mandatory details, the admin sees everything from every branch, and everyone can search, filter, track candidates through hiring stages, view vacancy posters and ask the assistant questions.',
  },
]

export const GUIDE_TEXT = GUIDE.map(e => `- ${e.answer}`).join('\n')

export function guideAnswer(q: string, isAdmin: boolean): string | null {
  let best: { e: Entry; score: number } | null = null
  for (const e of GUIDE) {
    if (!e.all.every(re => re.test(q))) continue
    const score = e.all.length
    if (!best || score > best.score) best = { e, score }
  }
  if (!best) return null
  if (best.e.adminOnly && !isAdmin) {
    return `${best.e.answer}\n\n(You are signed in as a branch, so this is an admin-only action.)`
  }
  return best.e.answer
}

/** True for questions that are asking how something works, not asking for a number or a list. */
export const looksLikeHowTo = (q: string) =>
  /^(how (do|can|should|to|does|is|are)|how i|where|can i|can a|can the|can branch|can admin|why|who can|who is allowed|explain|tell me how|steps|which page|what happens)/.test(q) &&
  !/^how (many|much|old|long|often)\b/.test(q)

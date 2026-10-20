import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Users, UserPlus, CalendarCheck, BadgeCheck, ArrowRight, Store } from 'lucide-react'
import { getSession, listCandidatesFor } from '@/lib/auth'
import { listVacancies } from '@/lib/vacancies'
import VacancyBoard from '@/components/VacancyBoard'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Home · ResumeIQ' }

// Keep in sync with STAGES in app/board/page.tsx
const STAGES = [
  'Applied', 'Screening', 'Shortlisted', 'Interview Scheduled',
  'Technical Interview', 'HR Interview', 'Selected', 'Rejected',
]

export default async function HomePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Admin: every branch. Branch: only its own CVs.
  const candidates = await listCandidatesFor(session)
  const isAdmin = session.role === 'ADMIN'
  const vacancies = await listVacancies(isAdmin) // expired ones are admin-only

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const stageOf = (c: any) => c.recruitmentStage || 'Applied'
  const countStage = (stage: string) => candidates.filter(c => stageOf(c) === stage).length

  const stats = [
    { label: 'Total CVs', value: candidates.length, icon: Users, tone: 'bg-green-50 text-green-600' },
    { label: 'Added this week', value: candidates.filter(c => c.createdAt.getTime() >= weekAgo).length, icon: UserPlus, tone: 'bg-blue-50 text-blue-600' },
    { label: 'In interviews', value: candidates.filter(c => stageOf(c).includes('Interview')).length, icon: CalendarCheck, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Selected', value: countStage('Selected'), icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-600' },
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
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{greeting}, {session.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin ? "Here's everything across all branches." : "Here's an overview of the CVs your branch has uploaded."}
          </p>
        </div>
        <Link
          href="/candidates"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
        >
          View candidates <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <VacancyBoard vacancies={vacancies} isAdmin={isAdmin} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.tone}`}>
              <s.icon className="w-[18px] h-[18px]" />
            </span>
            <p className="text-3xl font-bold text-gray-900 mt-3">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Recent uploads</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No CVs yet. Upload your first one from the Candidates page.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recent.map(c => (
                <li key={c.id}>
                  <Link href={`/candidates/${c.id}`} className="flex items-center gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                    <span className="w-9 h-9 shrink-0 rounded-full bg-green-100 text-green-700 text-xs font-semibold flex items-center justify-center">
                      {c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {[c.sector, c.category].filter(Boolean).join(' · ') || 'No category'}
                        {isAdmin && ` · ${c.branchName || 'Unassigned'}`}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {c.createdAt.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Pipeline</h2>
          <ul className="space-y-3">
            {STAGES.map(stage => {
              const n = countStage(stage)
              return (
                <li key={stage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{stage}</span>
                    <span className="font-medium text-gray-900">{n}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stage === 'Rejected' ? 'bg-red-400' : 'bg-green-500'}`}
                      style={{ width: `${(n / maxStage) * 100}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      {isAdmin && byBranch.size > 0 && (
        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Store className="w-4 h-4" /> CVs by branch</h2>
            <Link href="/admin/branches" className="text-sm text-green-700 hover:underline">Manage branches</Link>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from(byBranch.entries()).sort((a, b) => b[1] - a[1]).map(([name, n]) => (
              <li key={name} className="border border-gray-200 rounded-lg px-4 py-3">
                <p className="text-xl font-bold text-gray-900">{n}</p>
                <p className="text-sm text-gray-500 truncate">{name}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

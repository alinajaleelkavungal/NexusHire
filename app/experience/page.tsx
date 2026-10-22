import { redirect } from 'next/navigation'
import { getSession, listCandidatesWithResumesFor } from '@/lib/auth'
import ExperienceGroupList from './ExperienceGroupList'

export const dynamic = 'force-dynamic'

export default async function ExperiencePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await getSession()
  const { q } = await searchParams
  if (!session) redirect('/login')

  // Admin: every branch's CVs. Branch: only the CVs it uploaded.
  const candidates = await listCandidatesWithResumesFor(session)

  return (
    <div className="w-full min-h-screen">
      <ExperienceGroupList initialCandidates={candidates} initialQuery={q ?? ''} />
    </div>
  )
}

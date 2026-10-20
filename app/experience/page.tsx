import { redirect } from 'next/navigation'
import { getSession, listCandidatesFor } from '@/lib/auth'
import ExperienceGroupList from './ExperienceGroupList'

export const dynamic = 'force-dynamic'

export default async function ExperiencePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Admin: every branch's CVs. Branch: only the CVs it uploaded.
  const candidates = await listCandidatesFor(session)

  return (
    <div className="w-full min-h-screen bg-white">
      <ExperienceGroupList initialCandidates={candidates} />
    </div>
  )
}

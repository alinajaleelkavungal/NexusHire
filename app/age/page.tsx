import { redirect } from 'next/navigation'
import { getSession, listCandidatesFor } from '@/lib/auth'
import AgeGroupList from './AgeGroupList'

export const dynamic = 'force-dynamic'

export default async function AgePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Admin: every branch's CVs. Branch: only the CVs it uploaded.
  const candidates = await listCandidatesFor(session)

  return (
    <div className="w-full min-h-screen bg-white">
      <AgeGroupList initialCandidates={candidates} />
    </div>
  )
}

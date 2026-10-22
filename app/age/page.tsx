import { redirect } from 'next/navigation'
import { getSession, listCandidatesWithResumesFor } from '@/lib/auth'
import AgeGroupList from './AgeGroupList'

export const dynamic = 'force-dynamic'

export default async function AgePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await getSession()
  const { q } = await searchParams
  if (!session) redirect('/login')

  // Admin: every branch's CVs. Branch: only the CVs it uploaded.
  const candidates = await listCandidatesWithResumesFor(session)

  return (
    <div className="w-full min-h-screen">
      <AgeGroupList initialCandidates={candidates} initialQuery={q ?? ''} />
    </div>
  )
}

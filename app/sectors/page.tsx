import { redirect } from 'next/navigation'
import { getSession, listCandidatesWithResumesFor } from '@/lib/auth'
import SectorGroupList from './SectorGroupList'

export const dynamic = 'force-dynamic'

export default async function SectorsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await getSession()
  const { q } = await searchParams
  if (!session) redirect('/login')

  // Admin: every branch's CVs. Branch: only the CVs it uploaded.
  const candidates = await listCandidatesWithResumesFor(session)

  return (
    <div className="w-full min-h-screen">
      <SectorGroupList initialCandidates={candidates} initialQuery={q ?? ''} />
    </div>
  )
}

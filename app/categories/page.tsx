import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getSession, listCandidatesFor } from '@/lib/auth'
import CategoryExplorer from '@/components/CategoryExplorer'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Category · ResumeIQ' }

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { q } = await searchParams

  // Admin: every branch's CVs. Branch: only the CVs it uploaded.
  const candidatesRaw = await listCandidatesFor(session)
  const resumes = await prisma.resume.findMany({
    where: { candidateId: { in: candidatesRaw.map(c => c.id) } },
    select: { id: true, candidateId: true, fileName: true },
  })
  const candidates = candidatesRaw.map(c => ({
    ...c,
    resumes: resumes.filter(r => r.candidateId === c.id),
  }))

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-6 min-h-screen">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-950 tracking-tight">Category</h1>
        <p className="text-sm font-medium text-gray-700 mt-1">
          Find out which category and sub category a CV belongs to, or see every CV under a sub category.
        </p>
      </div>

      <CategoryExplorer candidates={candidates} isAdmin={session.role === 'ADMIN'} initialQuery={q ?? ''} />
    </div>
  )
}

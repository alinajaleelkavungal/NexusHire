import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getSession, listCandidatesFor } from '@/lib/auth'
import CategoryExplorer from '@/components/CategoryExplorer'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Category · NexusHire' }

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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 min-h-screen select-none font-sans">
      <div>
        <div className="mb-1">
          <span className="text-[10px] sm:text-[11px] font-jakarta tracking-[0.2em] uppercase font-bold text-[#e85d3f]">
            MANPOWER CLASSIFICATION · SECTOR DIRECTORY
          </span>
        </div>
        <h1
          className="text-3xl sm:text-4xl font-black text-[#191614] dark:text-[#f3eee8] tracking-tight leading-none mt-1 mb-2 font-sans"
          style={{ fontFamily: 'var(--font-satoshi), sans-serif' }}
        >
          Categories
        </h1>
        <p className="text-sm font-medium text-[#6b6257] dark:text-[#a89c8e]">
          Find out which category and sub category a CV belongs to, or explore all candidates organized by trade.
        </p>
      </div>

      <CategoryExplorer candidates={candidates} isAdmin={session.role === 'ADMIN'} initialQuery={q ?? ''} />
    </div>
  )
}

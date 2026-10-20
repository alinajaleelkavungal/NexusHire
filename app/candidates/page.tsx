import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getSession, listCandidatesFor } from '@/lib/auth'
import CandidateDatabase from '@/components/CandidateDatabase'

export const dynamic = 'force-dynamic'

export default async function CandidatesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Admin: every branch's CVs. Branch: only the CVs it uploaded.
  const candidatesRaw = await listCandidatesFor(session)
  const allResumes = await prisma.resume.findMany({
    where: { candidateId: { in: candidatesRaw.map(c => c.id) } }
  })

  const candidates = candidatesRaw.map(c => ({
    ...c,
    resumes: allResumes.filter(r => r.candidateId === c.id)
  }))

  const jobs = await prisma.jobDescription.findMany({
    select: { company: true },
    distinct: ['company']
  })
  const jobCompanies = jobs.map(j => j.company).filter(Boolean) as string[]

  const savedCompanies = await prisma.company.findMany({
    select: { name: true }
  })
  const dbCompanies = savedCompanies.map(c => c.name)

  const savedSectors = await prisma.sector.findMany({
    select: { name: true }
  })
  const dbSectors = savedSectors.map(s => s.name)
  
  // Combine unique
  const availableCompanies = Array.from(new Set([...jobCompanies, ...dbCompanies]))

  return (
    <div className="w-full min-h-screen">
      <CandidateDatabase 
        initialCandidates={candidates} 
        availableCompanies={availableCompanies} 
        savedSectors={dbSectors}
        isAdmin={session.role === 'ADMIN'}
      />
    </div>
  )
}

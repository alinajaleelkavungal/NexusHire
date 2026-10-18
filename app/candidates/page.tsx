import prisma from '@/lib/prisma'
import CandidateDatabase from '@/components/CandidateDatabase'

export const dynamic = 'force-dynamic'

export default async function CandidatesPage() {
  // Use raw SQL to bypass the outdated Prisma Client which drops newly added columns
  const candidatesRaw = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM Candidate ORDER BY createdAt DESC`)
  const allResumes = await prisma.resume.findMany()
  
  const candidates = candidatesRaw.map(c => ({
    ...c,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
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
      />
    </div>
  )
}

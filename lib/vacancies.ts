import prisma from '@/lib/prisma'

// Raw SQL on purpose: the generated Prisma Client in this project is often stale.

export interface Vacancy {
  id: string
  title: string
  company: string | null
  location: string | null
  openings: number | null
  details: string | null
  hasImage: boolean
  closingDate: string | null // YYYY-MM-DD
  postedAt: string // ISO
  expired: boolean
}

const today = () => new Date().toISOString().slice(0, 10)

/** Newest first. Expired vacancies are hidden unless `includeExpired` (admin). */
export async function listVacancies(includeExpired: boolean): Promise<Vacancy[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM Vacancy ORDER BY createdAt DESC`)
  return rows
    .map(r => ({
      id: r.id,
      title: r.title,
      company: r.company ?? null,
      location: r.location ?? null,
      openings: r.openings == null ? null : Number(r.openings),
      details: r.details ?? null,
      hasImage: !!r.imageKey,
      closingDate: r.closingDate ?? null,
      postedAt: new Date(r.createdAt).toISOString(),
      expired: !!r.closingDate && r.closingDate < today(),
    }))
    .filter(v => includeExpired || !v.expired)
}

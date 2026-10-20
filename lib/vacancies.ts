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

/**
 * The closing date is a plain calendar date with no timezone, so a vacancy only counts as
 * expired once that date has ended *everywhere* (i.e. it is already the next day in UTC-12).
 * This stops a poster from being flagged early for staff whose clock is behind UTC.
 */
const latestOpenDate = () => new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString().slice(0, 10)
export const isExpired = (closingDate: string | null) => !!closingDate && closingDate < latestOpenDate()

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
      expired: isExpired(r.closingDate ?? null),
    }))
    .filter(v => includeExpired || !v.expired)
}

// ── Form validation shared by "post" and "edit" ──────────────────────────────

export const IMAGE_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export interface VacancyInput {
  title: string
  company: string | null
  location: string | null
  openings: number | null
  details: string | null
  closingDate: string | null
  image: File | null
  imageContentType: string | null
  removeImage: boolean
}

export function parseVacancyForm(form: FormData): { error: string } | { values: VacancyInput } {
  const text = (key: string) => String(form.get(key) ?? '').trim()

  const title = text('title')
  if (!title) return { error: 'Job title is required' }
  if (title.length > 120) return { error: 'Job title is too long (max 120 characters)' }

  const details = text('details')
  if (details.length > 1500) return { error: 'Details are too long (max 1500 characters)' }

  const openingsRaw = text('openings')
  const openings = openingsRaw ? Number(openingsRaw) : null
  if (openings !== null && (!Number.isInteger(openings) || openings < 1 || openings > 10000)) {
    return { error: 'Openings must be a whole number of 1 or more' }
  }

  const closingDate = text('closingDate')
  if (closingDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(closingDate) || Number.isNaN(Date.parse(closingDate))) {
      return { error: 'Closing date is not valid' }
    }
    if (isExpired(closingDate)) {
      return { error: 'Last date to apply cannot be in the past' }
    }
  }

  let image: File | null = null
  let imageContentType: string | null = null
  const file = form.get('image')
  if (file instanceof File && file.size > 0) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!IMAGE_TYPES[ext]) return { error: 'Poster must be a PNG, JPG or WEBP image' }
    if (file.size > MAX_IMAGE_BYTES) return { error: 'Poster image must be under 5 MB' }
    image = file
    imageContentType = IMAGE_TYPES[ext]
  }

  return {
    values: {
      title,
      company: text('company') || null,
      location: text('location') || null,
      openings,
      details: details || null,
      closingDate: closingDate || null,
      image,
      imageContentType,
      removeImage: text('removeImage') === '1',
    },
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { guardSession, listCandidatesWithResumesFor } from '@/lib/auth'

// Search runs on exactly what is entered in the upload form, plus the saved file name:
//   Name · Age · Category · Sub category · Experience · Agent · File name (· Branch, for admins)
// Every word typed must match at least one of those fields, so "nurse 25" narrows rather than widens.

interface Field {
  key: string
  label: string
  value: string
  weight: number
  exact?: boolean // numbers: whole-value match (age 25 must not match 125)
}

export async function GET(request: NextRequest) {
  try {
    const g = await guardSession()
    if (g.response) return g.response

    const q = (request.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase()
    if (!q) return NextResponse.json({ error: 'Search query (q) is required' }, { status: 400 })

    const words = q.split(/\s+/).filter(Boolean)
    const isAdmin = g.session.role === 'ADMIN'
    const candidates = await listCandidatesWithResumesFor(g.session)

    const results: any[] = []
    for (const c of candidates) {
      const files: { id: string; fileName: string }[] = (c.resumes ?? []).map((r: any) => ({ id: r.id, fileName: r.fileName }))
      const fields: Field[] = [
        { key: 'name', label: 'Name', value: c.name ?? '', weight: 5 },
        ...files.map((f, i) => ({ key: `file${i}`, label: 'File name', value: f.fileName ?? '', weight: 5 })),
        { key: 'age', label: 'Age', value: c.age != null ? String(c.age) : '', weight: 4, exact: true },
        { key: 'sector', label: 'Category', value: c.sector ?? '', weight: 4 },
        { key: 'category', label: 'Sub category', value: c.category ?? '', weight: 4 },
        { key: 'exp', label: 'Experience', value: c.yearsOfExperience ?? '', weight: 3 },
        { key: 'agent', label: 'Agent', value: c.agent ?? '', weight: 3 },
        ...(isAdmin ? [{ key: 'branch', label: 'Branch', value: c.branchName ?? '', weight: 1 }] : []),
      ]

      let score = 0
      const matched = new Set<string>()
      const matchedFiles = new Set<number>()
      let allWordsHit = true

      for (const w of words) {
        let hit = false
        for (const f of fields) {
          const v = f.value.toLowerCase()
          if (!v) continue
          const ok = f.exact ? v === w : v.includes(w)
          if (!ok) continue
          hit = true
          score += f.weight + (v === w ? 2 : 0)
          matched.add(f.label)
          if (f.key.startsWith('file')) matchedFiles.add(Number(f.key.slice(4)))
        }
        if (!hit) { allWordsHit = false; break }
      }
      if (!allWordsHit) continue

      // The file(s) that matched go first so the right CV is the one opened
      const ordered = [
        ...files.filter((_, i) => matchedFiles.has(i)),
        ...files.filter((_, i) => !matchedFiles.has(i)),
      ]

      results.push({
        candidateId: c.id,
        name: c.name,
        age: c.age ?? null,
        sector: c.sector ?? null,
        category: c.category ?? null,
        yearsOfExperience: c.yearsOfExperience ?? null,
        agent: c.agent ?? null,
        branchName: isAdmin ? c.branchName ?? null : null,
        stage: c.recruitmentStage || 'Applied',
        files: ordered,
        matchedFileIds: files.filter((_, i) => matchedFiles.has(i)).map(f => f.id),
        matchedFields: Array.from(matched),
        score,
      })
    }

    results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Search API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

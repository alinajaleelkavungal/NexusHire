'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, X, FileText, ChevronDown, ChevronRight, FolderTree } from 'lucide-react'

interface CategoryExplorerProps {
  candidates: any[]
  isAdmin?: boolean
  initialQuery?: string
}

interface Entry {
  candidateId: string
  candidateName: string
  fileName: string | null
  sector: string // "Category" in the upload form
  subCategory: string // "Sub Category" in the upload form
  stage: string
  branch: string | null
}

const UNCATEGORIZED = 'Uncategorized'
const NO_SUB = 'No sub category'

// Wraps the matching part of a string in <mark> so people can see why a row matched
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const i = text.toLowerCase().indexOf(query)
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-yellow-200 text-gray-900 rounded px-0.5">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  )
}

const byName = (a: string, b: string) =>
  a === UNCATEGORIZED || a === NO_SUB ? 1 : b === UNCATEGORIZED || b === NO_SUB ? -1 : a.localeCompare(b)

export default function CategoryExplorer({ candidates, isAdmin = false, initialQuery = '' }: CategoryExplorerProps) {
  const [search, setSearch] = useState(initialQuery)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  // Per-category search boxes (file name / candidate name inside that category only)
  const [sectorSearch, setSectorSearch] = useState<Record<string, string>>({})
  const q = search.trim().toLowerCase()

  // One entry per saved CV file
  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = []
    for (const c of candidates) {
      const base = {
        candidateId: c.id,
        candidateName: c.name,
        sector: c.sector || UNCATEGORIZED,
        subCategory: c.category || NO_SUB,
        stage: c.recruitmentStage || 'Applied',
        branch: c.branchName || null,
      }
      const files: any[] = c.resumes?.length ? c.resumes : [null]
      for (const r of files) out.push({ ...base, fileName: r?.fileName ?? null })
    }
    return out
  }, [candidates])

  // Matching rules:
  //  • a category name matches  → every CV in that category is shown
  //  • a sub category matches   → every CV in that sub category is shown
  //  • a file / candidate name  → just those CVs, grouped under their category › sub category
  const groups = useMemo(() => {
    const visible = entries.filter(e => {
      if (!q) return true
      return (
        e.sector.toLowerCase().includes(q) ||
        e.subCategory.toLowerCase().includes(q) ||
        (e.fileName?.toLowerCase().includes(q) ?? false) ||
        e.candidateName.toLowerCase().includes(q)
      )
    })
    const map = new Map<string, Map<string, Entry[]>>()
    for (const e of visible) {
      if (!map.has(e.sector)) map.set(e.sector, new Map())
      const subs = map.get(e.sector)!
      if (!subs.has(e.subCategory)) subs.set(e.subCategory, [])
      subs.get(e.subCategory)!.push(e)
    }
    return {
      total: visible.length,
      list: Array.from(map.entries())
        .sort(([a], [b]) => byName(a, b))
        .map(([sector, subs]) => ({
          sector,
          count: Array.from(subs.values()).reduce((n, l) => n + l.length, 0),
          subs: Array.from(subs.entries()).sort(([a], [b]) => byName(a, b)),
        })),
    }
  }, [entries, q])

  const toggle = (sector: string) =>
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(sector) ? next.delete(sector) : next.add(sector)
      return next
    })

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden />
        <input
          type="search"
          aria-label="Search categories"
          placeholder="Search by file name or sub category"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm transition-all [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 -mt-2">
        Type a <strong>file name</strong> to see which category and sub category that CV belongs to, or a{' '}
        <strong>sub category</strong> to list every CV under it.
      </p>

      <p className="text-sm font-medium text-gray-700" aria-live="polite">
        {groups.total} {groups.total === 1 ? 'CV' : 'CVs'} in {groups.list.length} {groups.list.length === 1 ? 'category' : 'categories'}
        {q && <span className="font-normal text-gray-500"> matching “{search.trim()}”</span>}
      </p>

      {groups.list.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16 px-6 border border-dashed border-gray-300 rounded-xl bg-white">
          <FolderTree className="w-10 h-10 text-gray-300 mb-3" aria-hidden />
          <p className="font-medium text-gray-900">Nothing found</p>
          <p className="text-sm text-gray-500 mt-1">
            {entries.length === 0 ? 'Upload a CV to start building categories.' : 'No file name or sub category matches your search.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-20">
          {groups.list.map(({ sector, count, subs }) => {
            const rawLocal = sectorSearch[sector] ?? ''
            const local = rawLocal.trim().toLowerCase()
            const hl = local || q
            const open = !!q || !!local || !collapsed.has(sector)
            const shownSubs = local
              ? subs
                  .map(([sub, list]) => [
                    sub,
                    list.filter(
                      e =>
                        (e.fileName?.toLowerCase().includes(local) ?? false) ||
                        e.candidateName.toLowerCase().includes(local)
                    ),
                  ] as [string, Entry[]])
                  .filter(([, list]) => list.length > 0)
              : subs
            const shownCount = shownSubs.reduce((n, [, l]) => n + l.length, 0)
            return (
              <section key={sector} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggle(sector)}
                  aria-expanded={open}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
                >
                  {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <FolderTree className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-gray-900 flex-1">
                    <span className="text-xs font-medium text-gray-400 mr-2">Category</span>
                    <Highlight text={sector} query={q} />
                  </span>
                  <span className="text-xs font-semibold bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
                    {count} {count === 1 ? 'CV' : 'CVs'}
                  </span>
                </button>

                <div className="relative px-5 pb-3">
                  <Search className="absolute left-8 top-1/2 -translate-y-1/2 -mt-1.5 w-4 h-4 text-gray-400" aria-hidden />
                  <input
                    type="search"
                    aria-label={`Search file names in ${sector}`}
                    placeholder={`Search file name in ${sector}`}
                    value={rawLocal}
                    onChange={e => setSectorSearch(prev => ({ ...prev, [sector]: e.target.value }))}
                    className="w-full pl-9 pr-9 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all [&::-webkit-search-cancel-button]:hidden"
                  />
                  {rawLocal && (
                    <button
                      onClick={() => setSectorSearch(prev => ({ ...prev, [sector]: '' }))}
                      aria-label={`Clear search in ${sector}`}
                      className="absolute right-8 top-1/2 -translate-y-1/2 -mt-1.5 p-1 text-gray-400 hover:text-gray-700 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {open && (
                  <div className="border-t border-gray-100">
                    {local && shownCount === 0 && (
                      <p className="px-5 py-6 text-center text-sm text-gray-500">
                        No file name in {sector} matches “{rawLocal.trim()}”.
                      </p>
                    )}
                    {shownSubs.map(([sub, list]) => (
                      <div key={sub} className="border-b last:border-b-0 border-gray-100">
                        <div className="flex items-center gap-2 px-5 py-2 bg-gray-50 text-sm">
                          <span className="text-xs font-medium text-gray-400">Sub category</span>
                          <span className="font-medium text-gray-800 flex-1">
                            <Highlight text={sub} query={q} />
                          </span>
                          <span className="text-xs text-gray-500">{list.length}</span>
                        </div>
                        <ul className="divide-y divide-gray-100">
                          {list.map((e, i) => (
                            <li key={`${e.candidateId}-${i}`}>
                              <Link
                                href={`/candidates/${e.candidateId}`}
                                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-green-50/40 transition-colors"
                              >
                                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                                <div className="flex-1 min-w-[200px]">
                                  <p className="text-sm font-medium text-gray-900 break-all">
                                    {e.fileName ? <Highlight text={e.fileName} query={hl} /> : <span className="text-gray-400">No file saved</span>}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    <Highlight text={e.candidateName} query={hl} />
                                    {isAdmin && e.branch && <span className="text-blue-600"> · {e.branch}</span>}
                                  </p>
                                </div>
                                {/* Where this CV lives, spelled out */}
                                <span className="text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded px-2 py-0.5">
                                  {e.sector} › {e.subCategory}
                                </span>
                                <span className="text-xs font-medium text-gray-600">{e.stage}</span>
                                <ChevronRight className="w-4 h-4 text-gray-300" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

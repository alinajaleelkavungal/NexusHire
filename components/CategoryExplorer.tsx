'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { MagnifyingGlass, X, FileText, CaretDown, CaretRight, TreeStructure, ArrowUpRight } from '@/components/icons'

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
      <mark className="bg-[#fae1cc] dark:bg-[#4a2818] text-[#191614] dark:text-[#f3eee8] rounded-xs px-1 font-bold">{text.slice(i, i + query.length)}</mark>
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
    <div className="space-y-6">
      {/* Modernist Search Input */}
      <div className="relative">
        <MagnifyingGlass weight="bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7f70] dark:text-[#a89c8e]" aria-hidden />
        <input
          type="search"
          aria-label="Search categories"
          placeholder="Search by file name, category, or sub category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-white dark:bg-[#1a1410] border border-[#c8c0af] dark:border-[#3a3028] text-[#191614] dark:text-[#f3eee8] placeholder-[#8a7f70] dark:placeholder-[#6b6055] rounded-sm focus:outline-none focus:border-[#191614] dark:focus:border-[#6b5e52] transition-all shadow-2xs [&::-webkit-search-cancel-button]:hidden font-sans"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[#8a7f70] hover:text-[#191614] dark:hover:text-white rounded-sm cursor-pointer"
          >
            <X weight="bold" className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs font-mono tracking-[0.14em] uppercase font-bold text-[#7a7062] dark:text-[#a89c8e]" aria-live="polite">
          {groups.total} {groups.total === 1 ? 'CV' : 'CVs'} in {groups.list.length} {groups.list.length === 1 ? 'category' : 'categories'}
          {q && <span className="opacity-70"> · matching &ldquo;{search.trim()}&rdquo;</span>}
        </p>
        <span className="text-[11px] font-mono text-[#8a7f70] dark:text-[#6b6055] uppercase">
          Hierarchical Trade Index
        </span>
      </div>

      {groups.list.length === 0 ? (
        <div className="border border-[#c8c0af] dark:border-[#3d3329] bg-white dark:bg-[#16110d] px-6 py-12 text-center rounded-sm">
          <TreeStructure weight="duotone" className="w-8 h-8 text-[#a89c8e] mx-auto mb-3" aria-hidden />
          <p className="font-bold text-[#191614] dark:text-[#f3eee8] font-sans">No matching categories found</p>
          <p className="text-xs font-mono uppercase tracking-wider text-[#8a7f70] dark:text-[#6b6055] mt-1">
            {entries.length === 0 ? 'Upload a CV to start populating sectors.' : 'Try a different keyword or file name.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 pb-20">
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
              <section key={sector} className="border border-[#c8c0af] dark:border-[#3d3329] bg-white dark:bg-[#16110d] rounded-sm overflow-hidden">
                {/* Sector Header */}
                <button
                  onClick={() => toggle(sector)}
                  aria-expanded={open}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-[#faf8f5] dark:hover:bg-[#1a1410] transition-colors cursor-pointer"
                >
                  {open ? (
                    <CaretDown weight="bold" className="w-3.5 h-3.5 text-[#191614] dark:text-[#f3eee8] shrink-0" />
                  ) : (
                    <CaretRight weight="bold" className="w-3.5 h-3.5 text-[#191614] dark:text-[#f3eee8] shrink-0" />
                  )}
                  <TreeStructure weight="bold" className="w-4 h-4 text-[#e85d3f] shrink-0" />
                  <div className="flex-1 min-w-0 flex items-baseline gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-[0.14em] font-bold text-[#7a7062] dark:text-[#a89c8e]">Category</span>
                    <span className="font-black text-sm sm:text-base text-[#191614] dark:text-[#f3eee8] font-sans truncate">
                      <Highlight text={sector} query={q} />
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold border border-[#c8c0af] dark:border-[#3d3329] bg-[#faf8f5] dark:bg-[#1f1a16] text-[#191614] dark:text-[#f3eee8] px-2.5 py-0.5 rounded-sm tabular-nums">
                    {count} {count === 1 ? 'CV' : 'CVs'}
                  </span>
                </button>

                {/* Sub-search inside category */}
                <div className="px-4 sm:px-5 pb-3">
                  <div className="relative">
                    <MagnifyingGlass weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8a7f70] dark:text-[#a89c8e]" aria-hidden />
                    <input
                      type="search"
                      aria-label={`Search file names in ${sector}`}
                      placeholder={`Filter files in ${sector}...`}
                      value={rawLocal}
                      onChange={e => setSectorSearch(prev => ({ ...prev, [sector]: e.target.value }))}
                      className="w-full pl-8 pr-8 py-1.5 text-xs bg-[#faf8f5] dark:bg-[#1a1410] border border-[#c8c0af] dark:border-[#3a3028] rounded-sm text-[#191614] dark:text-[#f3eee8] placeholder-[#8a7f70] dark:placeholder-[#6b6055] focus:outline-none focus:border-[#191614] dark:focus:border-[#6b5e52] transition-all font-sans [&::-webkit-search-cancel-button]:hidden"
                    />
                    {rawLocal && (
                      <button
                        onClick={() => setSectorSearch(prev => ({ ...prev, [sector]: '' }))}
                        aria-label={`Clear search in ${sector}`}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#8a7f70] hover:text-[#191614] dark:hover:text-white rounded-sm cursor-pointer"
                      >
                        <X weight="bold" className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {open && (
                  <div className="border-t border-[#c8c0af] dark:border-[#3d3329]">
                    {local && shownCount === 0 && (
                      <p className="px-5 py-6 text-center text-xs font-mono uppercase tracking-wider text-[#7a7062] dark:text-[#8a7f70]">
                        No file in {sector} matches &ldquo;{rawLocal.trim()}&rdquo;.
                      </p>
                    )}
                    {shownSubs.map(([sub, list]) => (
                      <div key={sub} className="border-b last:border-b-0 border-[#c8c0af] dark:border-[#3d3329]">
                        {/* Sub-category Header Bar */}
                        <div className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-[#faf8f5] dark:bg-[#15100c] border-b border-[#c8c0af]/60 dark:border-[#3d3329]/60">
                          <span className="text-[10px] font-mono uppercase tracking-[0.14em] font-bold text-[#7a7062] dark:text-[#a89c8e]">Sub category:</span>
                          <span className="font-bold text-xs sm:text-[13px] text-[#191614] dark:text-[#f3eee8] flex-1 font-sans">
                            <Highlight text={sub} query={q} />
                          </span>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#7a7062] dark:text-[#8a7f70] tabular-nums">
                            {list.length} {list.length === 1 ? 'record' : 'records'}
                          </span>
                        </div>

                        {/* Candidate list items */}
                        <ul className="divide-y divide-[#c8c0af]/60 dark:divide-[#3d3329]/60">
                          {list.map((e, i) => (
                            <li key={`${e.candidateId}-${i}`}>
                              <Link
                                href={`/candidates/${e.candidateId}`}
                                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 sm:px-5 py-3 hover:bg-[#faf8f5] dark:hover:bg-[#1a1410] transition-colors group"
                              >
                                <FileText weight="bold" className="w-4 h-4 text-[#e85d3f] shrink-0" />
                                <div className="flex-1 min-w-[200px]">
                                  <p className="text-xs sm:text-sm font-black text-[#191614] dark:text-[#f3eee8] group-hover:text-[#e85d3f] transition-colors break-all font-mono">
                                    {e.fileName ? <Highlight text={e.fileName} query={hl} /> : <span className="text-[#8a7f70] font-normal italic">No file saved</span>}
                                  </p>
                                  <p className="text-xs font-semibold text-[#7a7062] dark:text-[#8a7f70] mt-0.5">
                                    <Highlight text={e.candidateName} query={hl} />
                                    {isAdmin && e.branch && <span className="text-[#205282] dark:text-[#7bb0e0] font-mono font-bold"> · {e.branch}</span>}
                                  </p>
                                </div>
                                
                                {/* Breadcrumb spec tag */}
                                <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider border border-[#c8c0af] dark:border-[#3a3028] bg-[#faf8f5] dark:bg-[#1f1a16] text-[#6b6055] dark:text-[#a89c8e] px-2 py-0.5 rounded-sm">
                                  {e.sector} › {e.subCategory}
                                </span>
                                
                                <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#191614] dark:text-[#f3eee8]">
                                  {e.stage}
                                </span>
                                
                                <ArrowUpRight weight="bold" className="w-3.5 h-3.5 text-[#8a7f70] group-hover:text-[#191614] dark:group-hover:text-white transition-colors" />
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

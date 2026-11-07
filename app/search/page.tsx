'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { MagnifyingGlass, CircleNotch, FileText, X, ArrowRight, ArrowUpRight } from '@/components/icons'

interface SearchResult {
  candidateId: string
  name: string
  age: number | null
  sector: string | null
  category: string | null
  yearsOfExperience: string | null
  agent: string | null
  branchName: string | null
  stage: string
  files: { id: string; fileName: string }[]
  matchedFileIds: string[]
  matchedFields: string[]
}

// Highlights the typed words wherever they appear in a value
function Mark({ text, words }: { text: string; words: string[] }) {
  const valid = words.filter(Boolean)
  if (!valid.length) return <>{text}</>
  const re = new RegExp(`(${valid.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig')
  return (
    <>
      {text.split(re).map((part, i) =>
        valid.some(w => w.toLowerCase() === part.toLowerCase())
          ? <mark key={i} className="bg-[#fae1cc] dark:bg-[#4a2818] text-[#191614] dark:text-[#f3eee8] rounded-xs px-1 font-bold">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState('') // the query the shown results belong to
  const [error, setError] = useState('')
  const seq = useRef(0)

  const run = async (q: string) => {
    const text = q.trim()
    if (!text) {
      setResults([]); setSearched(''); setError(''); setSearching(false)
      return
    }
    const mine = ++seq.current
    setSearching(true)
    setError('')
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(text)}`)
      const data = await res.json().catch(() => ({}))
      if (mine !== seq.current) return // a newer search superseded this one
      if (!res.ok || !data.success) throw new Error(data.error || 'Search failed')
      setResults(data.results)
      setSearched(text)
    } catch (e: any) {
      if (mine !== seq.current) return
      setError(e.message || 'Search failed')
      setResults([])
    } finally {
      if (mine === seq.current) setSearching(false)
    }
  }

  // Search as you type
  useEffect(() => {
    const t = setTimeout(() => run(query), 250)
    return () => clearTimeout(t)
  }, [query])

  const words = searched.toLowerCase().split(/\s+/).filter(Boolean)

  const detail = (label: string, value: string | number | null, hit: boolean) =>
    value === null || value === '' ? (
      <div className="p-3 sm:p-3.5 min-w-0">
        <dt className="text-[9.5px] sm:text-[10px] font-jakarta font-bold uppercase tracking-[0.14em] text-[#7a7062] dark:text-[#8a7f70]">{label}</dt>
        <dd className="text-xs text-[#a89c8e] dark:text-[#5c5347] font-jakarta mt-0.5">—</dd>
      </div>
    ) : (
      <div className="p-3 sm:p-3.5 min-w-0">
        <dt className="text-[9.5px] sm:text-[10px] font-jakarta font-bold uppercase tracking-[0.14em] text-[#7a7062] dark:text-[#a89c8e]">{label}</dt>
        <dd className={`text-xs sm:text-[13px] truncate mt-0.5 ${hit ? 'text-[#191614] dark:text-[#f3eee8] font-black' : 'text-[#383127] dark:text-[#d4c9bd] font-medium'}`}>
          <Mark text={String(value)} words={words} />
        </dd>
      </div>
    )

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 min-h-screen select-none font-sans">
      {/* Header Row */}
      <div>
        <div className="mb-1">
          <span className="text-[10px] sm:text-[11px] font-jakarta tracking-[0.2em] uppercase font-bold text-[#e85d3f]">
            INTELLIGENT MANPOWER SEARCH
          </span>
        </div>
        <h1
          className="text-3xl sm:text-4xl font-black text-[#191614] dark:text-[#f3eee8] tracking-tight leading-none mt-1 mb-2 font-sans"
          style={{ fontFamily: 'var(--font-satoshi), sans-serif' }}
        >
          Search
        </h1>
        <p className="text-sm font-medium text-[#6b6257] dark:text-[#a89c8e]">
          Find any candidate by name, age, sector, experience, agent, or resume filename.
        </p>
      </div>

      {/* Modernist Search Form */}
      <form onSubmit={e => { e.preventDefault(); run(query) }} className="relative">
        <MagnifyingGlass weight="bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7f70] dark:text-[#a89c8e]" aria-hidden />
        <input
          type="search"
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search CVs"
          placeholder='e.g. "nurse 25", "software developer 3 years", agent or file name...'
          className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-white dark:bg-[#1a1410] border border-[#c8c0af] dark:border-[#3a3028] text-[#191614] dark:text-[#f3eee8] placeholder-[#8a7f70] dark:placeholder-[#6b6055] rounded-sm focus:outline-none focus:border-[#191614] dark:focus:border-[#6b5e52] transition-all shadow-2xs [&::-webkit-search-cancel-button]:hidden font-sans"
        />
        {searching ? (
          <CircleNotch weight="bold" className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#191614] dark:text-[#f3eee8]" aria-label="Searching" />
        ) : query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[#8a7f70] hover:text-[#191614] dark:hover:text-white rounded-sm cursor-pointer">
            <X weight="bold" className="w-3.5 h-3.5" />
          </button>
        )}
      </form>

      {error && (
        <div role="alert" className="text-xs font-jakarta font-bold uppercase tracking-wider text-[#aa2c1e] bg-[#fbf2f2] dark:bg-[#2a1616] border border-[#e0b4b4] dark:border-[#522525] p-3 rounded-sm">{error}</div>
      )}

      {!query.trim() && !error && (
        <div className="border border-[#c8c0af] dark:border-[#3d3329] bg-white dark:bg-[#16110d] px-6 py-12 text-center rounded-sm">
          <p className="text-xs font-jakarta uppercase tracking-[0.14em] text-[#7a7062] dark:text-[#a89c8e] font-bold">
            Type to search
          </p>
          <p className="text-xs text-[#8a7f70] dark:text-[#6b6055] mt-1.5 max-w-md mx-auto">
            Every word you enter has to match something on the candidate profile or CV, narrowing down the results in real-time.
          </p>
        </div>
      )}

      {searched && query.trim() && !error && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-jakarta tracking-[0.14em] uppercase font-bold text-[#7a7062] dark:text-[#a89c8e]" aria-live="polite">
            {results.length} {results.length === 1 ? 'CV' : 'CVs'} found for &ldquo;{searched}&rdquo;
          </p>
        </div>
      )}

      {searched && !searching && !error && results.length === 0 && query.trim() === searched && (
        <div className="border border-[#c8c0af] dark:border-[#3d3329] bg-white dark:bg-[#16110d] px-6 py-12 text-center rounded-sm">
          <p className="font-bold text-[#191614] dark:text-[#f3eee8] font-sans text-sm">No CV matches &ldquo;{searched}&rdquo;</p>
          <p className="text-xs font-jakarta uppercase tracking-wider text-[#8a7f70] dark:text-[#6b6055] mt-1">Check spelling or try searching with fewer words.</p>
        </div>
      )}

      {/* Results List - Architectural Divided Grid */}
      <div className="border border-[#c8c0af] dark:border-[#3d3329] divide-y divide-[#c8c0af] dark:divide-[#3d3329] bg-white dark:bg-[#16110d]">
        {results.map(r => {
          const hit = (label: string) => r.matchedFields.includes(label)
          return (
            <div key={r.candidateId} className="hover:bg-[#faf8f5] dark:hover:bg-[#1a1410] transition-colors">
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-black text-[#191614] dark:text-[#f3eee8] tracking-tight font-sans truncate">
                    <Mark text={r.name} words={words} />
                  </h2>
                  <p className="text-xs font-jakarta uppercase tracking-wider text-[#7a7062] dark:text-[#8a7f70] mt-1 flex items-center gap-2">
                    <span className="font-bold text-[#191614] dark:text-[#f3eee8]">{r.stage}</span>
                    {r.branchName && (
                      <>
                        <span className="opacity-40">·</span>
                        <span><Mark text={r.branchName} words={words} /></span>
                      </>
                    )}
                  </p>
                </div>
                <Link
                  href={`/candidates/${r.candidateId}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#181513] hover:bg-black text-white dark:bg-[#f3eee8] dark:text-[#191614] dark:hover:bg-white text-xs font-jakarta uppercase tracking-wider font-bold rounded-sm shadow-2xs transition-all"
                >
                  <span>View profile</span>
                  <ArrowUpRight weight="bold" className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Technical specs table */}
              <dl className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#c8c0af]/60 dark:divide-[#3d3329]/60 border-t border-[#c8c0af] dark:border-[#3d3329]">
                {detail('Age', r.age, hit('Age'))}
                {detail('Category', r.sector, hit('Category'))}
                {detail('Sub category', r.category, hit('Sub category'))}
                {detail('Experience', r.yearsOfExperience, hit('Experience'))}
                {detail('Agent', r.agent, hit('Agent'))}
              </dl>

              {/* Matched resume files */}
              {r.files.length > 0 && (
                <div className="border-t border-[#c8c0af] dark:border-[#3d3329] bg-[#faf8f5] dark:bg-[#15100c] px-4 sm:px-5 py-2.5 space-y-1">
                  {r.files.map(f => {
                    const isHit = r.matchedFileIds.includes(f.id)
                    return (
                      <a
                        key={f.id}
                        href={`/api/resume/file/${f.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center gap-2 text-xs font-jakarta rounded-sm px-2 py-1.5 -mx-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
                          isHit ? 'text-[#191614] dark:text-[#f3eee8] font-bold' : 'text-[#7a7062] dark:text-[#8a7f70]'
                        }`}
                      >
                        <FileText weight="bold" className="w-3.5 h-3.5 shrink-0 text-[#e85d3f]" />
                        <span className="break-all flex-1"><Mark text={f.fileName} words={words} /></span>
                        <span className="text-[11px] uppercase tracking-wider text-[#e85d3f] font-bold shrink-0">Open CV ↗</span>
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

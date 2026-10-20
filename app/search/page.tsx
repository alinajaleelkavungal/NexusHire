'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, Loader2, FileText, X, ArrowRight } from '@/components/icons'

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
          ? <mark key={i} className="bg-amber-200 text-gray-900 rounded-sm px-0.5">{part}</mark>
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
    value === null || value === '' ? null : (
      <div className="min-w-0">
        <dt className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-gray-400">{label}</dt>
        <dd className={`text-sm truncate ${hit ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
          <Mark text={String(value)} words={words} />
        </dd>
      </div>
    )

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Search</h1>
        <p className="text-sm text-gray-500 mt-1">
          Find a CV by anything entered when it was uploaded: name, age, category, sub category, experience, agent, or the saved file name.
        </p>
      </div>

      <form onSubmit={e => { e.preventDefault(); run(query) }} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden />
        <input
          type="search"
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search CVs"
          placeholder='e.g. "nurse 25", "software developer 3 years", an agent name or a file name'
          className="w-full pl-12 pr-11 py-3.5 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 [&::-webkit-search-cancel-button]:hidden"
        />
        {searching ? (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-green-600" aria-label="Searching" />
        ) : query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {error && (
        <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</div>
      )}

      {!query.trim() && !error && (
        <div className="border border-dashed border-gray-300 rounded-md bg-white px-6 py-10 text-center text-sm text-gray-500">
          Type to search. Every word you enter has to match something on the CV, so adding words narrows the list.
        </div>
      )}

      {searched && query.trim() && !error && (
        <p className="text-sm font-medium text-gray-700" aria-live="polite">
          {results.length} {results.length === 1 ? 'CV' : 'CVs'} found for “{searched}”
        </p>
      )}

      {searched && !searching && !error && results.length === 0 && query.trim() === searched && (
        <div className="border border-gray-300 rounded-md bg-white px-6 py-10 text-center">
          <p className="font-medium text-gray-900">No CV matches “{searched}”</p>
          <p className="text-sm text-gray-500 mt-1">Check the spelling or try fewer words.</p>
        </div>
      )}

      <ul className="space-y-3 pb-16">
        {results.map(r => {
          const hit = (label: string) => r.matchedFields.includes(label)
          return (
            <li key={r.candidateId} className="bg-white border border-gray-300 rounded-md">
              <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 truncate"><Mark text={r.name} words={words} /></h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.stage}{r.branchName && <> · <Mark text={r.branchName} words={words} /></>}
                  </p>
                </div>
                <Link href={`/candidates/${r.candidateId}`} className="inline-flex items-center gap-1 text-sm font-medium text-green-700 underline underline-offset-4 decoration-green-300 hover:decoration-green-700">
                  View profile <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-3 px-5 py-4">
                {detail('Age', r.age, hit('Age'))}
                {detail('Category', r.sector, hit('Category'))}
                {detail('Sub category', r.category, hit('Sub category'))}
                {detail('Experience', r.yearsOfExperience, hit('Experience'))}
                {detail('Agent', r.agent, hit('Agent'))}
              </dl>

              {r.files.length > 0 && (
                <div className="border-t border-gray-200 bg-gray-50 px-5 py-3 space-y-1.5">
                  {r.files.map(f => {
                    const isHit = r.matchedFileIds.includes(f.id)
                    return (
                      <a
                        key={f.id}
                        href={`/api/resume/file/${f.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center gap-2 text-sm rounded-sm px-2 py-1.5 -mx-2 hover:bg-green-50 ${isHit ? 'text-gray-900 font-medium' : 'text-gray-600'}`}
                      >
                        <FileText className="w-4 h-4 shrink-0 text-green-600" />
                        <span className="break-all flex-1"><Mark text={f.fileName} words={words} /></span>
                        <span className="text-xs text-green-700 shrink-0">Open CV</span>
                      </a>
                    )
                  })}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

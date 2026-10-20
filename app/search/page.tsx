'use client'

import { useState } from 'react'
import { Search, Loader2, Star, Briefcase, UserCircle } from '@/components/icons'

interface SearchResult {
  candidateId: string
  name: string
  skills: string[]
  category: string
  experienceLevel: string
  matchScore: number
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setSearching(true)
    setHasSearched(true)
    setResults([])

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setResults(data.results)
        }
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">AI Resume Search</h1>
        <p className="text-gray-500">
          Use natural language to find the perfect candidate. Try searching for specific skills, experience levels, or roles.
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <Search className="absolute left-4 w-6 h-6 text-gray-400" />
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g., "Senior React Developer with Python experience"'
            className="w-full pl-14 pr-32 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-0 outline-none transition-colors shadow-sm"
          />
          <button 
            type="submit"
            disabled={searching || !query.trim()}
            className="absolute right-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center"
          >
            {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
          </button>
        </form>
      </div>

      <div className="pt-8">
        {searching && (
          <div className="flex flex-col items-center justify-center space-y-4 py-12 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p>Scanning vector space for best matches...</p>
          </div>
        )}

        {!searching && hasSearched && results.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No candidates matched your search criteria.
          </div>
        )}

        {!searching && results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-6">Top Matches ({results.length})</h2>
            <div className="grid gap-4">
              {results.map((result, idx) => (
                <div key={idx} className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="bg-gray-100 p-3 rounded-full mt-1">
                      <UserCircle className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{result.name}</h3>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        {result.experienceLevel && (
                          <span className="flex items-center">
                            <Star className="w-4 h-4 mr-1 text-gray-400" />
                            {result.experienceLevel}
                          </span>
                        )}
                        {result.category && (
                          <span className="flex items-center">
                            <Briefcase className="w-4 h-4 mr-1 text-gray-400" />
                            {result.category}
                          </span>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {result.skills && result.skills.slice(0, 6).map((skill, i) => (
                          <span key={i} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium">
                            {skill}
                          </span>
                        ))}
                        {result.skills && result.skills.length > 6 && (
                          <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-xs font-medium">
                            +{result.skills.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-4">
                    <div className="bg-green-50 border border-green-100 px-4 py-2 rounded-lg text-center">
                      <span className="block text-xs text-green-700 font-semibold uppercase tracking-wider mb-1">Match Score</span>
                      <span className="text-2xl font-bold text-green-700">{(result.matchScore * 100).toFixed(0)}%</span>
                    </div>
                    <a href={`/candidates/${result.candidateId}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      View Full Profile &rarr;
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

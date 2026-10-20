'use client'

import { useState, useMemo } from 'react'
import { Briefcase, ChevronRight, FileText, Search } from '@/components/icons'
import { useRouter } from 'next/navigation'
import FileHit from '@/components/FileHit'

// True when the search text matches any saved CV file name of the candidate
const hasFileMatch = (c: any, q: string) =>
  (c.resumes ?? []).some((r: any) => r.fileName?.toLowerCase().includes(q))

export default function ExperienceGroupList({ initialCandidates, initialQuery = '' }: { initialCandidates: any[]; initialQuery?: string }) {
  const router = useRouter()
  const [expandedExp, setExpandedExp] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const searching = searchQuery.trim() !== ''

  const experienceOptions = ['Fresher', '1 year', '2 years', '3 years', '4 years', '5 years', '6 years', '7 years', '8 years', '9 years', '10+ years']

  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return initialCandidates
    const lowerQ = searchQuery.toLowerCase()
    return initialCandidates.filter(c => 
      c.name.toLowerCase().includes(lowerQ) ||
      hasFileMatch(c, lowerQ) ||
      
      (c.skills && c.skills.toLowerCase().includes(lowerQ)) ||
      (c.category && c.category.toLowerCase().includes(lowerQ)) ||
      (c.sector && c.sector.toLowerCase().includes(lowerQ))
    )
  }, [initialCandidates, searchQuery])

  const expGroups = useMemo(() => {
    const groups: Record<string, any[]> = {}
    
    // Initialize all hardcoded options
    experienceOptions.forEach(exp => {
      groups[exp] = []
    })

    filteredCandidates.forEach(c => {
      const exp = c.yearsOfExperience
      if (exp && exp.trim() !== '') {
        if (!groups[exp]) groups[exp] = []
        groups[exp].push(c)
      }
    })
    
    // Sort logic for strings like "1 year", "10+ years"
    return Object.entries(groups)
      .map(([exp, cands]) => ({
        exp,
        candidates: cands,
        // Calculate an integer value for sorting
        sortVal: exp === 'Fresher' ? 0 : (parseInt(exp.replace(/\D/g, '')) || 0)
      }))
      .sort((a, b) => a.sortVal - b.sortVal)
  }, [filteredCandidates])

  const unassigned = filteredCandidates.filter(c => !c.yearsOfExperience || c.yearsOfExperience.trim() === '')

  const getInitials = (name: string) => {
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Candidates by Experience</h1>
        <p className="text-gray-500 mt-2">Browse and manage your candidates grouped by their years of experience.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search by name, skill, file name or sub category..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
        />
      </div>

      <div className="space-y-6">
        {expGroups.filter(g => !searching || g.candidates.length > 0).map(group => (
          <div key={group.exp} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
            <div 
              onClick={() => setExpandedExp(expandedExp === group.exp ? null : group.exp)}
              className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{group.exp}</h3>
                  <p className="text-sm text-gray-500">{group.candidates.length} candidate{group.candidates.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${(searching || expandedExp === group.exp) ? 'rotate-90' : ''}`} />
            </div>

            {(searching || expandedExp === group.exp) && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-2">
                {group.candidates.map(candidate => (
                  <div 
                    key={candidate.id}
                    onClick={() => router.push(`/candidates/${candidate.id}`)}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-sm flex items-center justify-center text-orange-700 font-semibold bg-orange-100 flex-shrink-0">
                        {getInitials(candidate.name)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 group-hover:text-orange-600">{candidate.name}</h4>
                        <FileHit candidate={candidate} query={searchQuery} />
                        <p className="text-xs text-gray-500">{candidate.sector || 'No Sector'} · {candidate.category || 'No Category'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                       <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                         {candidate.recruitmentStage}
                       </span>
                       <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-orange-500" />
                    </div>
                  </div>
                ))}
                {group.candidates.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No candidates with this experience level yet.
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {unassigned.length > 0 && (
          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
            <div 
              onClick={() => setExpandedExp(expandedExp === 'unassigned' ? null : 'unassigned')}
              className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Experience Not Specified</h3>
                  <p className="text-sm text-gray-500">{unassigned.length} candidate{unassigned.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${(searching || expandedExp === 'unassigned') ? 'rotate-90' : ''}`} />
            </div>

            {(searching || expandedExp === 'unassigned') && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-2">
                {unassigned.map(candidate => (
                  <div 
                    key={candidate.id}
                    onClick={() => router.push(`/candidates/${candidate.id}`)}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-sm flex items-center justify-center text-gray-600 font-semibold bg-gray-200 flex-shrink-0">
                        {getInitials(candidate.name)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 group-hover:text-gray-600">{candidate.name}</h4>
                        <FileHit candidate={candidate} query={searchQuery} />
                        <p className="text-xs text-gray-500">{candidate.sector || 'No Sector'} · {candidate.category || 'No Category'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                       <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                         {candidate.recruitmentStage}
                       </span>
                       <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {expGroups.length === 0 && unassigned.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            No candidates found.
          </div>
        )}
      </div>
    </div>
  )
}

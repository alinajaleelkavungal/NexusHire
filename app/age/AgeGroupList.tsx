'use client'

import { useState, useMemo } from 'react'
import { Calendar, ChevronRight, FileText, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AgeGroupList({ initialCandidates }: { initialCandidates: any[] }) {
  const router = useRouter()
  const [expandedAge, setExpandedAge] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const ageBrackets = [
    { label: '18-24 Years', min: 18, max: 24 },
    { label: '25-34 Years', min: 25, max: 34 },
    { label: '35-44 Years', min: 35, max: 44 },
    { label: '45-54 Years', min: 45, max: 54 },
    { label: '55+ Years', min: 55, max: 999 }
  ]

  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return initialCandidates
    const lowerQ = searchQuery.toLowerCase()
    return initialCandidates.filter(c => 
      c.name.toLowerCase().includes(lowerQ) || 
      (c.skills && c.skills.toLowerCase().includes(lowerQ)) ||
      (c.category && c.category.toLowerCase().includes(lowerQ)) ||
      (c.sector && c.sector.toLowerCase().includes(lowerQ))
    )
  }, [initialCandidates, searchQuery])

  const ageGroups = useMemo(() => {
    const groups: Record<string, any[]> = {}
    
    // Initialize all brackets
    ageBrackets.forEach(b => {
      groups[b.label] = []
    })

    filteredCandidates.forEach(c => {
      const age = c.age
      if (age !== null && age !== undefined) {
        const bracket = ageBrackets.find(b => age >= b.min && age <= b.max)
        if (bracket) {
          groups[bracket.label].push(c)
        } else if (age < 18) {
          // Edge case
          if (!groups['Under 18']) groups['Under 18'] = []
          groups['Under 18'].push(c)
        }
      }
    })
    
    return Object.entries(groups)
      .map(([label, cands]) => ({
        label,
        candidates: cands,
        sortVal: ageBrackets.findIndex(b => b.label === label)
      }))
      .sort((a, b) => a.sortVal - b.sortVal)
  }, [filteredCandidates])

  const unassigned = filteredCandidates.filter(c => c.age === null || c.age === undefined)

  const getInitials = (name: string) => {
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Candidates by Age</h1>
        <p className="text-gray-500 mt-2">Browse and manage your candidates grouped by their age.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search candidates by name, skill, or role..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
      </div>

      <div className="space-y-6">
        {ageGroups.map(group => (
          <div key={group.label} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
            <div 
              onClick={() => setExpandedAge(expandedAge === group.label ? null : group.label as any)}
              className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{group.label}</h3>
                  <p className="text-sm text-gray-500">{group.candidates.length} candidate{group.candidates.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedAge === group.label ? 'rotate-90' : ''}`} />
            </div>

            {expandedAge === group.label && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-2">
                {group.candidates.map(candidate => (
                  <div 
                    key={candidate.id}
                    onClick={() => router.push(`/candidates/${candidate.id}`)}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-blue-700 font-semibold bg-blue-100 flex-shrink-0">
                        {getInitials(candidate.name)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 group-hover:text-blue-600">{candidate.name}</h4>
                        <p className="text-xs text-gray-500">{candidate.sector || 'No Sector'} · {candidate.category || 'No Category'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                       <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                         {candidate.recruitmentStage}
                       </span>
                       <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                    </div>
                  </div>
                ))}
                {group.candidates.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No candidates in this age bracket yet.
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {unassigned.length > 0 && (
          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
            <div 
              onClick={() => setExpandedAge(expandedAge === 'unassigned' ? null : 'unassigned')}
              className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Age Not Specified</h3>
                  <p className="text-sm text-gray-500">{unassigned.length} candidate{unassigned.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedAge === 'unassigned' ? 'rotate-90' : ''}`} />
            </div>

            {expandedAge === 'unassigned' && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-2">
                {unassigned.map(candidate => (
                  <div 
                    key={candidate.id}
                    onClick={() => router.push(`/candidates/${candidate.id}`)}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 font-semibold bg-gray-200 flex-shrink-0">
                        {getInitials(candidate.name)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 group-hover:text-blue-600">{candidate.name}</h4>
                        <p className="text-xs text-gray-500">{candidate.sector || 'No Sector'} · {candidate.category || 'No Category'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                       <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                         {candidate.recruitmentStage}
                       </span>
                       <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {ageGroups.length === 0 && unassigned.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            No candidates found.
          </div>
        )}
      </div>
    </div>
  )
}

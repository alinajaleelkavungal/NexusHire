'use client'

import { useState, useMemo } from 'react'
import { LayoutGrid, ChevronRight, FileText, Code, Stethoscope, Settings, Briefcase, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import FileHit from '@/components/FileHit'
import { SECTOR_CATEGORY_MAP } from '@/config/sector-categories'

// True when the search text matches any saved CV file name of the candidate
const hasFileMatch = (c: any, q: string) =>
  (c.resumes ?? []).some((r: any) => r.fileName?.toLowerCase().includes(q))

export default function SectorGroupList({ initialCandidates, initialQuery = '' }: { initialCandidates: any[]; initialQuery?: string }) {
  const router = useRouter()
  const [expandedSector, setExpandedSector] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const searching = searchQuery.trim() !== ''
  // Per-sector search boxes (file name / candidate name inside that sector only)
  const [barSearch, setBarSearch] = useState<Record<string, string>>({})
  const localQ = (key: string) => (barSearch[key] ?? '').trim().toLowerCase()
  // Selected sub category chip per sector (null / missing = all)
  const [subSel, setSubSel] = useState<Record<string, string | null>>({})
  const inBar = (list: any[], key: string) => {
    const lq = localQ(key)
    const sub = subSel[key]
    return list.filter(c =>
      (!sub || (c.category || 'Other') === sub) &&
      (!lq || c.name.toLowerCase().includes(lq) || hasFileMatch(c, lq))
    )
  }
  // All sub categories of a sector: the configured ones plus any custom ones already in use
  const subsFor = (key: string, list: any[]) => {
    const set = new Set<string>(SECTOR_CATEGORY_MAP[key] ?? [])
    list.forEach(c => set.add(c.category || 'Other'))
    return Array.from(set)
  }
  const subChips = (key: string, list: any[]) => {
    const subs = subsFor(key, list)
    if (subs.length <= 1) return null
    const chip = (active: boolean) =>
      `px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
        active ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-700'
      }`
    return (
      <div className="flex flex-wrap gap-2 px-6 pb-4" role="group" aria-label={`Sub categories of ${key}`}>
        <button onClick={() => setSubSel(p => ({ ...p, [key]: null }))} aria-pressed={!subSel[key]} className={chip(!subSel[key])}>
          All ({list.length})
        </button>
        {subs.map(s => {
          const n = list.filter(c => (c.category || 'Other') === s).length
          return (
            <button key={s} onClick={() => setSubSel(p => ({ ...p, [key]: p[key] === s ? null : s }))} aria-pressed={subSel[key] === s} className={chip(subSel[key] === s)}>
              {s} ({n})
            </button>
          )
        })}
      </div>
    )
  }
  // Called as a plain function (not <Component/>) so typing never remounts the input
  const barSearchBox = (k: string, label: string) => (
    <div className="relative px-6 pb-4">
      <Search className="absolute left-9 top-1/2 -translate-y-1/2 -mt-2 w-4 h-4 text-gray-400" aria-hidden />
      <input
        type="search"
        aria-label={`Search file names in ${label}`}
        placeholder={`Search file name in ${label}`}
        value={barSearch[k] ?? ''}
        onChange={e => setBarSearch(prev => ({ ...prev, [k]: e.target.value }))}
        className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all [&::-webkit-search-cancel-button]:hidden"
      />
    </div>
  )

  const allSectors = Object.keys(SECTOR_CATEGORY_MAP)

  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return initialCandidates
    const lowerQ = searchQuery.toLowerCase()
    return initialCandidates.filter(c => 
      c.name.toLowerCase().includes(lowerQ) ||
      hasFileMatch(c, lowerQ) ||
      
      (c.skills && c.skills.toLowerCase().includes(lowerQ)) ||
      (c.category && c.category.toLowerCase().includes(lowerQ))
    )
  }, [initialCandidates, searchQuery])

  const sectorGroups = useMemo(() => {
    const groups: Record<string, any[]> = {}
    
    // Initialize all hardcoded sectors
    allSectors.forEach(s => {
      groups[s] = []
    })

    filteredCandidates.forEach(c => {
      const sector = c.sector || c.category // Fallback
      if (sector && groups[sector] !== undefined) {
        groups[sector].push(c)
      } else if (sector && sector !== 'Uncategorized') {
        // If it's a legacy or custom sector not in the map
        if (!groups[sector]) groups[sector] = []
        groups[sector].push(c)
      }
    })
    
    return Object.entries(groups)
      .map(([sector, cands]) => ({
        sector,
        candidates: cands,
        icon: sector.toLowerCase().includes('software') || sector.toLowerCase().includes('it') ? Code :
              sector.toLowerCase().includes('health') || sector.toLowerCase().includes('medical') ? Stethoscope :
              sector.toLowerCase().includes('mechanic') || sector.toLowerCase().includes('engineer') ? Settings :
              sector.toLowerCase().includes('finance') || sector.toLowerCase().includes('sales') ? Briefcase :
              FileText
      }))
      .sort((a, b) => b.candidates.length - a.candidates.length) // Sort by most populated
  }, [filteredCandidates, allSectors])

  const unassigned = filteredCandidates.filter(c => {
    const sector = c.sector || c.category
    return !sector || sector === 'Uncategorized'
  })

  const getInitials = (name: string) => {
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Candidates by Sector</h1>
        <p className="text-gray-500 mt-2">Browse and manage your candidates grouped by their professional sector.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search by name, skill, file name or sub category..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
        />
      </div>

      <div className="space-y-6">
        {sectorGroups.filter(g => !searching || g.candidates.length > 0).map(group => {
          const shown = inBar(group.candidates, group.sector)
          const open = searching || !!localQ(group.sector) || !!subSel[group.sector] || expandedSector === group.sector
          return (
          <div key={group.sector} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
            <div 
              onClick={() => setExpandedSector(expandedSector === group.sector ? null : group.sector)}
              className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                  <group.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{group.sector}</h3>
                  <p className="text-sm text-gray-500">{group.candidates.length} candidate{group.candidates.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${(searching || expandedSector === group.sector) ? 'rotate-90' : ''}`} />
            </div>
            {barSearchBox(group.sector, group.sector)}
            {subChips(group.sector, group.candidates)}

            {open && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-2">
                {shown.map(candidate => (
                  <div 
                    key={candidate.id}
                    onClick={() => router.push(`/candidates/${candidate.id}`)}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-green-700 font-semibold bg-green-100 flex-shrink-0">
                        {getInitials(candidate.name)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 group-hover:text-green-600">{candidate.name}</h4>
                        <FileHit candidate={candidate} query={localQ(group.sector) || searchQuery} />
                        <p className="text-xs text-gray-500">{candidate.sector || 'No Sector'} · {candidate.category || 'No Category'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                       <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                         {candidate.recruitmentStage}
                       </span>
                       <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-green-500" />
                    </div>
                  </div>
                ))}
                
                {shown.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    {subSel[group.sector] && !localQ(group.sector) ? `No CVs under ${subSel[group.sector]} yet.` : localQ(group.sector) ? `No file name in ${group.sector} matches “${barSearch[group.sector].trim()}”.` : 'No candidates in this sector yet.'}
                  </div>
                )}
              </div>
            )}
          </div>
          )
        })}

        {unassigned.length > 0 && (
          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
            <div 
              onClick={() => setExpandedSector(expandedSector === 'unassigned' ? null : 'unassigned')}
              className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Uncategorized</h3>
                  <p className="text-sm text-gray-500">{unassigned.length} candidate{unassigned.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${(searching || expandedSector === 'unassigned') ? 'rotate-90' : ''}`} />
            </div>
            {barSearchBox('unassigned', 'Uncategorized')}

            {(searching || !!localQ('unassigned') || expandedSector === 'unassigned') && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-2">
                {inBar(unassigned, 'unassigned').map(candidate => (
                  <div 
                    key={candidate.id}
                    onClick={() => router.push(`/candidates/${candidate.id}`)}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 font-semibold bg-gray-200 flex-shrink-0">
                        {getInitials(candidate.name)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 group-hover:text-gray-600">{candidate.name}</h4>
                        <FileHit candidate={candidate} query={localQ('unassigned') || searchQuery} />
                        <p className="text-xs text-gray-500">Uncategorized</p>
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
      </div>
    </div>
  )
}

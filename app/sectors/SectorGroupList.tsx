'use client'

import { useState, useMemo } from 'react'
import { SquaresFour, CaretRight, FileText, Code, Stethoscope, Gear, Briefcase, MagnifyingGlass, X, ArrowUpRight } from '@/components/icons'
import { useRouter } from 'next/navigation'
import FileHit from '@/components/FileHit'
import { SECTOR_CATEGORY_MAP } from '@/config/sector-categories'

// Warm architectural avatar palettes matching the rest of the application
const AVATAR_PALETTES = [
  { bg: 'bg-[#fdf3f0] dark:bg-[#2b1712]', text: 'text-[#e85d3f]', border: 'border-[#fbe4de] dark:border-[#4a241b]' },
  { bg: 'bg-[#fefcf3] dark:bg-[#2b2512]', text: 'text-[#b58933]', border: 'border-[#fbedb8] dark:border-[#4a3e1b]' },
  { bg: 'bg-[#f5f3f1] dark:bg-[#221e1b]', text: 'text-[#24211f] dark:text-[#f3eee8]', border: 'border-[#e8e4e0] dark:border-[#3a3430]' },
  { bg: 'bg-[#fdf6f0] dark:bg-[#2b1b12]', text: 'text-[#c85a32]', border: 'border-[#fce9dd] dark:border-[#4a2c1b]' },
  { bg: 'bg-[#f3f6f1] dark:bg-[#172514]', text: 'text-[#467335]', border: 'border-[#e2ebdc] dark:border-[#243d20]' },
  { bg: 'bg-[#f4f6fa] dark:bg-[#15202b]', text: 'text-[#225178]', border: 'border-[#dde7f1] dark:border-[#1e3447]' },
]

function getAvatarPalette(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length]
}

const getStatusStyle = (status: string) => {
  const s = status?.toLowerCase() || ''
  if (s === 'rejected') return 'border-[#e0b4b4] dark:border-[#522525] bg-[#fbf2f2] dark:bg-[#2a1616] text-[#aa2c1e] dark:text-[#f87171]'
  if (s.includes('interview')) return 'border-[#d6cba8] dark:border-[#4d4220] bg-[#fdfaf0] dark:bg-[#27210e] text-[#9c7816] dark:text-[#facc15]'
  if (s === 'selected') return 'border-[#c4dec4] dark:border-[#224422] bg-[#f2f8f2] dark:bg-[#142614] text-[#22632e] dark:text-[#4ade80]'
  if (s === 'shortlisted') return 'border-[#dcd0f0] dark:border-[#3b2d55] bg-[#f8f5fd] dark:bg-[#201730] text-[#7144b8] dark:text-[#c084fc]'
  if (s === 'screening') return 'border-[#e6d8c3] dark:border-[#4d3a1f] bg-[#fdf9f3] dark:bg-[#291e10] text-[#ad6800] dark:text-[#fbbf24]'
  return 'border-[#c8c0af] dark:border-[#3d3329] bg-[#faf8f5] dark:bg-[#1f1a16] text-[#5c5347] dark:text-[#d4c9bd]'
}

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
    return (
      <div className="flex flex-wrap gap-1.5 px-4 sm:px-5 pb-3.5" role="group" aria-label={`Sub categories of ${key}`}>
        <button
          onClick={() => setSubSel(p => ({ ...p, [key]: null }))}
          aria-pressed={!subSel[key]}
          className={`px-3 py-1.5 rounded-sm text-[11px] font-jakarta tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
            !subSel[key]
              ? 'bg-[#191614] text-white dark:bg-[#f3eee8] dark:text-[#191614] font-bold shadow-2xs'
              : 'bg-white dark:bg-[#1f1a16] border border-[#c8c0af] dark:border-[#3d3329] text-[#7a7062] dark:text-[#a89c8e] hover:bg-[#faf8f5] dark:hover:bg-[#251f1a] font-medium'
          }`}
        >
          All ({list.length})
        </button>
        {subs.map(s => {
          const n = list.filter(c => (c.category || 'Other') === s).length
          const active = subSel[key] === s
          return (
            <button
              key={s}
              onClick={() => setSubSel(p => ({ ...p, [key]: p[key] === s ? null : s }))}
              aria-pressed={active}
              className={`px-3 py-1.5 rounded-sm text-[11px] font-jakarta tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-[#191614] text-white dark:bg-[#f3eee8] dark:text-[#191614] font-bold shadow-2xs'
                  : 'bg-white dark:bg-[#1f1a16] border border-[#c8c0af] dark:border-[#3d3329] text-[#7a7062] dark:text-[#a89c8e] hover:bg-[#faf8f5] dark:hover:bg-[#251f1a] font-medium'
              }`}
            >
              {s} ({n})
            </button>
          )
        })}
      </div>
    )
  }

  // Called as a plain function so typing never remounts the input
  const barSearchBox = (k: string, label: string) => (
    <div className="relative px-4 sm:px-5 pb-3">
      <MagnifyingGlass weight="bold" className="absolute left-7 top-1/2 -translate-y-1/2 -mt-1.5 w-3.5 h-3.5 text-[#8a7f70] dark:text-[#a89c8e]" aria-hidden />
      <input
        type="search"
        aria-label={`Search file names in ${label}`}
        placeholder={`Search file name in ${label}...`}
        value={barSearch[k] ?? ''}
        onChange={e => setBarSearch(prev => ({ ...prev, [k]: e.target.value }))}
        className="w-full pl-8 pr-8 py-1.5 text-xs bg-[#faf8f5] dark:bg-[#1a1410] border border-[#c8c0af] dark:border-[#3a3028] rounded-sm text-[#191614] dark:text-[#f3eee8] placeholder-[#8a7f70] dark:placeholder-[#6b6055] focus:outline-none focus:border-[#191614] dark:focus:border-[#6b5e52] transition-all font-sans [&::-webkit-search-cancel-button]:hidden"
      />
      {barSearch[k] && (
        <button
          onClick={() => setBarSearch(prev => ({ ...prev, [k]: '' }))}
          className="absolute right-7 top-1/2 -translate-y-1/2 -mt-1.5 p-0.5 text-[#8a7f70] hover:text-[#191614] dark:hover:text-white rounded-sm cursor-pointer"
        >
          <X weight="bold" className="w-3 h-3" />
        </button>
      )}
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
    
    // Initialize all configured sectors
    allSectors.forEach(s => {
      groups[s] = []
    })

    filteredCandidates.forEach(c => {
      const sector = c.sector || c.category // Fallback
      if (sector && groups[sector] !== undefined) {
        groups[sector].push(c)
      } else if (sector && sector !== 'Uncategorized') {
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
              sector.toLowerCase().includes('mechanic') || sector.toLowerCase().includes('engineer') ? Gear :
              sector.toLowerCase().includes('finance') || sector.toLowerCase().includes('sales') ? Briefcase :
              FileText
      }))
      .sort((a, b) => b.candidates.length - a.candidates.length)
  }, [filteredCandidates, allSectors])

  const unassigned = filteredCandidates.filter(c => {
    const sector = c.sector || c.category
    return !sector || sector === 'Uncategorized'
  })

  const getInitials = (name: string) => {
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 font-sans select-none min-h-screen">
      {/* Header Row */}
      <div>
        <div className="mb-1">
          <span className="text-[10px] sm:text-[11px] font-jakarta tracking-[0.2em] uppercase font-bold text-[#e85d3f]">
            MANPOWER CLASSIFICATION · SECTOR DIRECTORY
          </span>
        </div>
        <h1
          className="text-3xl sm:text-4xl font-black text-[#191614] dark:text-[#f3eee8] tracking-tight leading-none mt-1 mb-2 font-sans"
          style={{ fontFamily: 'var(--font-satoshi), sans-serif' }}
        >
          Candidates by Category
        </h1>
        <p className="text-sm font-medium text-[#6b6257] dark:text-[#a89c8e]">
          Browse and manage your candidates grouped by their professional trade and category.
        </p>
      </div>

      {/* Modernist Architectural Search Bar */}
      <div className="relative">
        <MagnifyingGlass weight="bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7f70] dark:text-[#a89c8e]" />
        <input 
          type="search" 
          placeholder="Search by name, skill, file name or sub category..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white dark:bg-[#1a1410] border border-[#c8c0af] dark:border-[#3a3028] text-[#191614] dark:text-[#f3eee8] placeholder-[#8a7f70] dark:placeholder-[#6b6055] rounded-sm focus:outline-none focus:border-[#191614] dark:focus:border-[#6b5e52] transition-all shadow-2xs font-sans [&::-webkit-search-cancel-button]:hidden"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[#8a7f70] hover:text-[#191614] dark:hover:text-white rounded-sm cursor-pointer"
          >
            <X weight="bold" className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {sectorGroups.filter(g => !searching || g.candidates.length > 0).map(group => {
          const shown = inBar(group.candidates, group.sector)
          const open = searching || !!localQ(group.sector) || !!subSel[group.sector] || expandedSector === group.sector
          return (
            <div key={group.sector} className="border border-[#c8c0af] dark:border-[#3d3329] bg-white dark:bg-[#16110d] rounded-sm overflow-hidden">
              <div 
                onClick={() => setExpandedSector(expandedSector === group.sector ? null : group.sector)}
                className="px-4 sm:px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#faf8f5] dark:hover:bg-[#1a1410] transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-sm bg-[#faf8f5] dark:bg-[#1f1a16] border border-[#c8c0af] dark:border-[#3d3329] text-[#e85d3f] flex items-center justify-center shrink-0">
                    <group.icon weight="bold" className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-[#191614] dark:text-[#f3eee8] font-sans">{group.sector}</h3>
                    <p className="text-[10px] sm:text-[11px] font-jakarta tracking-wider uppercase font-semibold text-[#7a7062] dark:text-[#a89c8e]">
                      {group.candidates.length} {group.candidates.length === 1 ? 'candidate' : 'candidates'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] sm:text-[11px] font-jakarta font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border border-[#c8c0af] dark:border-[#3d3329] bg-[#faf8f5] dark:bg-[#1f1a16] text-[#191614] dark:text-[#f3eee8] tabular-nums">
                    {group.candidates.length}
                  </span>
                  <CaretRight weight="bold" className={`w-3.5 h-3.5 text-[#8a7f70] transition-transform duration-200 ${(searching || expandedSector === group.sector) ? 'rotate-90' : ''}`} />
                </div>
              </div>

              {barSearchBox(group.sector, group.sector)}
              {subChips(group.sector, group.candidates)}

              {open && (
                <div className="border-t border-[#c8c0af] dark:border-[#3d3329] bg-[#faf8f5] dark:bg-[#120d0a] p-3 sm:p-4 space-y-2">
                  {shown.map(candidate => {
                    const palette = getAvatarPalette(candidate.id)
                    return (
                      <div 
                        key={candidate.id}
                        onClick={() => router.push(`/candidates/${candidate.id}`)}
                        className="flex items-center justify-between p-3 bg-white dark:bg-[#16110d] border border-[#c8c0af] dark:border-[#3d3329] rounded-sm hover:border-[#191614] dark:hover:border-[#6b5e52] hover:bg-[#faf8f5] dark:hover:bg-[#1a1410] transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-sm shrink-0 flex items-center justify-center font-bold text-xs font-jakarta border ${palette.bg} ${palette.text} ${palette.border}`}>
                            {getInitials(candidate.name)}
                          </div>
                          <div>
                            <h4 className="font-black text-xs sm:text-sm text-[#191614] dark:text-[#f3eee8] group-hover:text-[#e85d3f] transition-colors font-sans">{candidate.name}</h4>
                            <FileHit candidate={candidate} query={localQ(group.sector) || searchQuery} />
                            <p className="text-[11px] font-jakarta text-[#7a7062] dark:text-[#a89c8e] uppercase tracking-wider mt-0.5">
                              {candidate.sector || 'No Category'} · {candidate.category || 'No Sub Category'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 text-[10px] font-jakarta font-bold tracking-wider uppercase rounded-sm border ${getStatusStyle(candidate.recruitmentStage || 'Applied')}`}>
                            {candidate.recruitmentStage}
                          </span>
                          <ArrowUpRight weight="bold" className="w-3.5 h-3.5 text-[#8a7f70] group-hover:text-[#191614] dark:group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    )
                  })}
                  
                  {shown.length === 0 && (
                    <div className="text-center py-8 text-xs font-jakarta uppercase tracking-wider text-[#7a7062] dark:text-[#8a7f70]">
                      {subSel[group.sector] && !localQ(group.sector)
                        ? `No CVs under ${subSel[group.sector]} yet.`
                        : localQ(group.sector)
                        ? `No file name in ${group.sector} matches “${barSearch[group.sector].trim()}”.`
                        : 'No candidates in this category yet.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {unassigned.length > 0 && (
          <div className="border border-[#c8c0af] dark:border-[#3d3329] bg-white dark:bg-[#16110d] rounded-sm overflow-hidden">
            <div 
              onClick={() => setExpandedSector(expandedSector === 'unassigned' ? null : 'unassigned')}
              className="px-4 sm:px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#faf8f5] dark:hover:bg-[#1a1410] transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-sm bg-[#faf8f5] dark:bg-[#1f1a16] border border-[#c8c0af] dark:border-[#3d3329] text-[#7a7062] dark:text-[#a89c8e] flex items-center justify-center shrink-0">
                  <FileText weight="bold" className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#191614] dark:text-[#f3eee8] font-sans">Uncategorized</h3>
                  <p className="text-[10px] sm:text-[11px] font-jakarta tracking-wider uppercase font-semibold text-[#7a7062] dark:text-[#a89c8e]">
                    {unassigned.length} {unassigned.length !== 1 ? 'candidates' : 'candidate'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] sm:text-[11px] font-jakarta font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border border-[#c8c0af] dark:border-[#3d3329] bg-[#faf8f5] dark:bg-[#1f1a16] text-[#191614] dark:text-[#f3eee8] tabular-nums">
                  {unassigned.length}
                </span>
                <CaretRight weight="bold" className={`w-3.5 h-3.5 text-[#8a7f70] transition-transform duration-200 ${(searching || expandedSector === 'unassigned') ? 'rotate-90' : ''}`} />
              </div>
            </div>
            {barSearchBox('unassigned', 'Uncategorized')}

            {(searching || !!localQ('unassigned') || expandedSector === 'unassigned') && (
              <div className="border-t border-[#c8c0af] dark:border-[#3d3329] bg-[#faf8f5] dark:bg-[#120d0a] p-3 sm:p-4 space-y-2">
                {inBar(unassigned, 'unassigned').map(candidate => {
                  const palette = getAvatarPalette(candidate.id)
                  return (
                    <div 
                      key={candidate.id}
                      onClick={() => router.push(`/candidates/${candidate.id}`)}
                      className="flex items-center justify-between p-3 bg-white dark:bg-[#16110d] border border-[#c8c0af] dark:border-[#3d3329] rounded-sm hover:border-[#191614] dark:hover:border-[#6b5e52] hover:bg-[#faf8f5] dark:hover:bg-[#1a1410] transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-sm shrink-0 flex items-center justify-center font-bold text-xs font-jakarta border ${palette.bg} ${palette.text} ${palette.border}`}>
                          {getInitials(candidate.name)}
                        </div>
                        <div>
                          <h4 className="font-black text-xs sm:text-sm text-[#191614] dark:text-[#f3eee8] group-hover:text-[#e85d3f] transition-colors font-sans">{candidate.name}</h4>
                          <FileHit candidate={candidate} query={localQ('unassigned') || searchQuery} />
                          <p className="text-[11px] font-jakarta text-[#7a7062] dark:text-[#a89c8e] uppercase tracking-wider mt-0.5">Uncategorized</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 text-[10px] font-jakarta font-bold tracking-wider uppercase rounded-sm border ${getStatusStyle(candidate.recruitmentStage || 'Applied')}`}>
                          {candidate.recruitmentStage}
                        </span>
                        <ArrowUpRight weight="bold" className="w-3.5 h-3.5 text-[#8a7f70] group-hover:text-[#191614] dark:group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

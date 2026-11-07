'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  Search, UploadCloud, ChevronRight, X, Loader2, Code, Stethoscope, Settings, Plus,
  FileText, ChevronDown, CheckCircle, AlertCircle, ArrowDownCircle, Pencil, Trash2,
  CheckSquare, Square, SquareCheck
} from '@/components/icons'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import UploadModal from './UploadModal'
import EditCandidateModal from './EditCandidateModal'

interface CandidateDatabaseProps {
  initialCandidates: any[]
  availableCompanies?: string[]
  savedSectors?: string[]
  isAdmin?: boolean
}

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

// Keep in sync with STAGES in app/board/page.tsx
const STAGE_OPTIONS = [
  'Applied', 'Screening', 'Shortlisted', 'Interview Scheduled',
  'Technical Interview', 'HR Interview', 'Selected', 'Rejected',
]

export default function CandidateDatabase({ initialCandidates, availableCompanies = [], savedSectors = [], isAdmin = false }: CandidateDatabaseProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlSector = searchParams.get('sector')
  const urlSearch = searchParams.get('search') || searchParams.get('q') || ''

  const [candidates, setCandidates] = useState(initialCandidates)
  const [search, setSearch] = useState(urlSearch)
  const [activeCategory, setActiveCategory] = useState<string | null>(urlSector || null)
  const [stageFilter, setStageFilter] = useState<string | null>(null)
  const [branchFilter, setBranchFilter] = useState<string | null>(null)

  useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('q')
    if (q !== null && q !== undefined) {
      setSearch(q)
    }
  }, [searchParams])

  // Admin only: which branch uploaded each CV. Legacy CVs (before logins existed) have no owner.
  const UNASSIGNED = 'Unassigned'
  const branchOf = (c: any): string => c.branchName || UNASSIGNED
  
  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  
  // Edit Modal State
  const [editingCandidate, setEditingCandidate] = useState<any>(null)
  
  // Sector Add States
  const [isAddingSector, setIsAddingSector] = useState(false)
  const [newSectorName, setNewSectorName] = useState('')
  const [manualSectors, setManualSectors] = useState<string[]>([])
  
  // Sector Edit States
  const [editingSector, setEditingSector] = useState<string | null>(null)
  const [editSectorName, setEditSectorName] = useState('')
  
  // Upload states
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [embedding, setEmbedding] = useState(false)
  const [progress, setProgress] = useState(0)

  // ── Bulk selection state ──────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatusDropdownOpen, setBulkStatusDropdownOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)

  // ── Dropdowns and Sorting state ──────────────────────────────────────────
  const [sectorDropdownOpen, setSectorDropdownOpen] = useState(false)
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest')

  const sectorDropdownRef = useRef<HTMLDivElement>(null)
  const branchDropdownRef = useRef<HTMLDivElement>(null)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sectorDropdownRef.current && !sectorDropdownRef.current.contains(e.target as Node)) {
        setSectorDropdownOpen(false)
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setBranchDropdownOpen(false)
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setSortDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Calculate sector statistics
  const sectors = useMemo(() => {
    const counts: Record<string, number> = {}
    
    // Seed with saved sectors from DB
    savedSectors.forEach(name => {
      counts[name] = 0
    })

    // Seed with manual empty sectors (optimistic UI)
    manualSectors.forEach(name => {
      counts[name] = 0
    })

    // Count from candidates
    candidates.forEach(c => {
      const sectorToCount = c.sector || c.category // Fallback for old data
      if (sectorToCount && sectorToCount !== 'Uncategorized') {
        counts[sectorToCount] = (counts[sectorToCount] || 0) + 1
      }
    })
    
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      icon: name.toLowerCase().includes('software') || name.toLowerCase().includes('developer') ? Code :
            name.toLowerCase().includes('health') || name.toLowerCase().includes('medical') ? Stethoscope :
            name.toLowerCase().includes('mechanic') || name.toLowerCase().includes('engineer') ? Settings :
            FileText
    }))
  }, [candidates, manualSectors, savedSectors])

  const availableBranches = useMemo(() => {
    return Array.from(new Set(candidates.map(branchOf))).filter(Boolean).sort()
  }, [candidates])

  // Candidates filtered by search, category, and branch (prior to stage filter)
  const baseFilteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    const terms = q.split(/\s+/).filter(t => t.length > 2)
    return candidates.filter(c => {
      const matchesSearch = !q || [
        c.name, c.skills, c.sector, c.category, c.company, c.recommendedRole,
        ...(c.resumes ?? []).map((r: any) => r.fileName)
      ].some(v => {
        if (!v) return false
        const s = String(v).toLowerCase()
        return s.includes(q) || q.includes(s) || (terms.length > 0 && terms.some(t => s.includes(t)))
      })

      const matchesCategory = activeCategory ? (c.sector === activeCategory || c.category === activeCategory) : true
      const matchesBranch = branchFilter ? branchOf(c) === branchFilter : true
      return matchesSearch && matchesCategory && matchesBranch
    })
  }, [candidates, search, activeCategory, branchFilter])

  // Dynamic counts for each stage based on current search / sector / branch
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { total: baseFilteredCandidates.length }
    STAGE_OPTIONS.forEach(stage => { counts[stage] = 0 })
    baseFilteredCandidates.forEach(c => {
      const stage = c.recruitmentStage || 'Applied'
      counts[stage] = (counts[stage] || 0) + 1
    })
    return counts
  }, [baseFilteredCandidates])

  // Filtered by stage
  const filteredCandidates = useMemo(() => {
    if (!stageFilter) return baseFilteredCandidates
    return baseFilteredCandidates.filter(c => (c.recruitmentStage || 'Applied') === stageFilter)
  }, [baseFilteredCandidates, stageFilter])

  // Sorted candidates
  const sortedCandidates = useMemo(() => {
    const list = [...filteredCandidates]
    if (sortBy === 'newest') {
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    if (sortBy === 'oldest') {
      return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }
    if (sortBy === 'name') {
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }
    return list
  }, [filteredCandidates, sortBy])

  const allFilteredSelected =
    sortedCandidates.length > 0 && sortedCandidates.every(c => selectedIds.has(c.id))

  const openUploadModal = () => {
    setIsUploadModalOpen(true)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
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

  const handleStageChange = async (candidateId: string, newStage: string) => {
    const previous = candidates.find(c => c.id === candidateId)?.recruitmentStage
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, recruitmentStage: newStage } : c))
    try {
      const res = await fetch(`/api/candidates/${candidateId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      router.refresh()
    } catch (err) {
      console.error('Failed to update stage', err)
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, recruitmentStage: previous } : c))
    }
  }

  // ── Selection Helpers ─────────────────────────────────────────────────────

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered
      setSelectedIds(prev => {
        const next = new Set(prev)
        sortedCandidates.forEach(c => next.delete(c.id))
        return next
      })
    } else {
      // Select all filtered
      setSelectedIds(prev => {
        const next = new Set(prev)
        sortedCandidates.forEach(c => next.add(c.id))
        return next
      })
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  // ── Bulk Action Handlers ──────────────────────────────────────────────────

  const handleBulkStatusChange = async (status: string) => {
    setBulkStatusDropdownOpen(false)
    if (selectedIds.size === 0) return
    setBulkLoading(true)

    const ids = Array.from(selectedIds)

    // Optimistic update
    setCandidates(prev => prev.map(c =>
      ids.includes(c.id) ? { ...c, recruitmentStage: status } : c
    ))
    clearSelection()

    try {
      await fetch('/api/candidate/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', candidateIds: ids, status })
      })
      router.refresh()
    } catch (err) {
      console.error('Bulk status update failed', err)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    if (!confirm(`Delete ${count} candidate${count > 1 ? 's' : ''}? This cannot be undone.`)) return

    setBulkLoading(true)
    const ids = Array.from(selectedIds)

    // Optimistic update
    setCandidates(prev => prev.filter(c => !ids.includes(c.id)))
    clearSelection()

    try {
      await fetch('/api/candidate/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', candidateIds: ids })
      })
      router.refresh()
    } catch (err) {
      console.error('Bulk delete failed', err)
    } finally {
      setBulkLoading(false)
    }
  }

  // --- Sector Management Logic ---
  
  const handleAddSectorSubmit = async (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    
    const val = newSectorName.trim();
    if (val && !sectors.find(s => s.name.toLowerCase() === val.toLowerCase())) {
      // Optimistic
      setManualSectors(prev => [...prev, val])
      setNewSectorName('')
      setIsAddingSector(false)
      
      try {
        await fetch('/api/sector/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: val })
        })
        router.refresh()
      } catch (err) {
        console.error("Failed to add sector", err)
      }
    } else {
      setNewSectorName('')
      setIsAddingSector(false)
    }
  }

  const handleDeleteSector = async (e: React.MouseEvent, sectorName: string) => {
    e.stopPropagation()
    
    // Optimistic UI Update
    setManualSectors(prev => prev.filter(s => s !== sectorName))
    setCandidates(prev => prev.map(c => 
      (c.sector === sectorName || c.category === sectorName) ? { ...c, sector: null, category: 'Uncategorized' } : c
    ))
    if (activeCategory === sectorName) setActiveCategory(null)

    try {
      await fetch('/api/sector/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectorName })
      })
      router.refresh()
    } catch (err) {
      console.error("Failed to delete sector", err)
    }
  }

  const startEditingSector = (e: React.MouseEvent, sectorName: string) => {
    e.stopPropagation()
    setEditingSector(sectorName)
    setEditSectorName(sectorName)
  }

  const handleEditSectorSubmit = async (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    
    const val = editSectorName.trim();
    const oldVal = editingSector;
    
    setEditingSector(null)
    
    if (val && oldVal && val !== oldVal) {
      // Optimistic UI Update
      setManualSectors(prev => {
        if (prev.includes(oldVal)) {
          return prev.map(s => s === oldVal ? val : s)
        } else {
          return [...prev, val]
        }
      })
      
      setCandidates(prev => prev.map(c => 
        (c.sector === oldVal || c.category === oldVal) ? { ...c, sector: val, category: val } : c
      ))
      
      if (activeCategory === oldVal) setActiveCategory(val)

      try {
        await fetch('/api/sector/rename', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldName: oldVal, newName: val })
        })
        router.refresh()
      } catch (err) {
        console.error("Failed to rename sector", err)
      }
    }
  }

  // --- Drag and Drop Candidate Logic ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, candidateId: string) => {
    e.dataTransfer.setData("candidateId", candidateId)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault() 
  }

  const handleDropToSector = async (e: React.DragEvent<HTMLDivElement>, sectorName: string) => {
    e.preventDefault()
    const candidateId = e.dataTransfer.getData("candidateId")
    if (!candidateId) return

    setCandidates(prev => prev.map(c => 
      c.id === candidateId ? { ...c, category: sectorName } : c
    ))

    try {
      await fetch('/api/candidate/update-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, category: sectorName })
      })
      router.refresh()
    } catch (err) {
      console.error("Failed to update candidate sector", err)
    }
  }
  
  // --- Candidate Deletion & Company Assignment ---
  
  const handleDeleteCandidate = async (e: React.MouseEvent, candidateId: string) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this candidate? This action cannot be undone.")) return;

    // Optimistic delete
    setCandidates(prev => prev.filter(c => c.id !== candidateId))

    try {
      await fetch('/api/candidate/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId })
      })
      router.refresh()
    } catch (err) {
      console.error("Failed to delete candidate", err)
    }
  }

  return (
    <>
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        onSuccess={() => router.refresh()} 
      />
      <EditCandidateModal 
        isOpen={!!editingCandidate} 
        onClose={() => setEditingCandidate(null)} 
        onSuccess={(updated) => {
          if (updated) {
            setCandidates(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
          }
          router.refresh()
        }} 
        candidate={editingCandidate}
      />
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 min-h-screen select-none">

      {/* Page Title & Kicker */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1">
            <span className="text-[10px] sm:text-[11px] font-jakarta tracking-[0.2em] uppercase font-bold text-[#e85d3f]">
              MANPOWER DATABASE · RESUME MANAGEMENT
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-black text-[#191614] dark:text-[#f3eee8] tracking-tight leading-none mt-1 mb-2 font-sans"
            style={{ fontFamily: 'var(--font-satoshi), sans-serif' }}
          >
            Candidates
          </h1>
          <p className="text-sm font-medium text-[#6b6257] dark:text-[#a89c8e]">
            Search, filter and manage every resume across branches in one place.
          </p>
        </div>
      </div>

      {/* ── Modernist Filter & Search Panel ── */}
      <div className="border border-[#c8c0af] dark:border-[#3d3329] bg-white dark:bg-[#16110d] p-4 sm:p-5 space-y-3.5 transition-colors">
        
        {/* Row 1: Search + Sector + Branch + Upload Button */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 sm:gap-3">
          
          {/* Search Input */}
          <div className="flex-1 min-w-[260px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7f70] dark:text-[#a89c8e]" aria-hidden />
            <input
              type="search"
              aria-label="Search candidates"
              placeholder="Search by name, skill, file name or sub category"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-transparent dark:bg-[#1a1410] border border-[#c8c0af] dark:border-[#3a3028] text-[#191614] dark:text-[#f3eee8] placeholder-[#8a7f70] dark:placeholder-[#6b6055] rounded-sm focus:outline-none focus:border-[#191614] dark:focus:border-[#6b5e52] transition-all [&::-webkit-search-cancel-button]:hidden font-sans"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#8a7f70] hover:text-[#191614] dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sector Dropdown */}
          <div className="relative shrink-0" ref={sectorDropdownRef}>
            <button
              onClick={() => { setSectorDropdownOpen(p => !p); setBranchDropdownOpen(false) }}
              className="bg-white dark:bg-[#1f1a16] border border-[#c8c0af] dark:border-[#3a3028] rounded-sm px-3.5 py-2 text-xs font-jakarta uppercase tracking-wider font-semibold text-[#191614] dark:text-[#f3eee8] flex items-center gap-1.5 hover:bg-[#faf8f5] dark:hover:bg-[#251f1a] transition-colors cursor-pointer shadow-2xs"
            >
              <span className="truncate max-w-[130px]">Sector: {activeCategory || 'All'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#8a7f70]" />
            </button>

            {sectorDropdownOpen && (
              <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-56 max-h-72 overflow-y-auto bg-white dark:bg-[#16110d] border border-[#c8c0af] dark:border-[#3d3329] rounded-sm shadow-xl p-1 z-40">
                <button
                  onClick={() => { setActiveCategory(null); setSectorDropdownOpen(false) }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-jakarta uppercase tracking-wider transition-colors cursor-pointer ${
                    !activeCategory ? 'bg-[#191614] text-white dark:bg-[#f3eee8] dark:text-[#191614] font-bold' : 'text-[#5c5347] dark:text-[#d4c9bd] hover:bg-[#faf8f5] dark:hover:bg-[#221a14]'
                  }`}
                >
                  <span>All sectors</span>
                  <span className="text-[10px] tabular-nums opacity-60">{candidates.length}</span>
                </button>
                {sectors.map(s => (
                  <button
                    key={s.name}
                    onClick={() => { setActiveCategory(activeCategory === s.name ? null : s.name); setSectorDropdownOpen(false) }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-jakarta uppercase tracking-wider transition-colors cursor-pointer ${
                      activeCategory === s.name ? 'bg-[#191614] text-white dark:bg-[#f3eee8] dark:text-[#191614] font-bold' : 'text-[#5c5347] dark:text-[#d4c9bd] hover:bg-[#faf8f5] dark:hover:bg-[#221a14]'
                    }`}
                  >
                    <span className="truncate max-w-[150px]">{s.name}</span>
                    <span className="text-[10px] tabular-nums opacity-60">{s.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Branch Dropdown */}
          <div className="relative shrink-0" ref={branchDropdownRef}>
            <button
              onClick={() => { setBranchDropdownOpen(p => !p); setSectorDropdownOpen(false) }}
              className="bg-white dark:bg-[#1f1a16] border border-[#c8c0af] dark:border-[#3a3028] rounded-sm px-3.5 py-2 text-xs font-jakarta uppercase tracking-wider font-semibold text-[#191614] dark:text-[#f3eee8] flex items-center gap-1.5 hover:bg-[#faf8f5] dark:hover:bg-[#251f1a] transition-colors cursor-pointer shadow-2xs"
            >
              <span className="truncate max-w-[130px]">Branch: {branchFilter || 'All'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#8a7f70]" />
            </button>

            {branchDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 max-h-72 overflow-y-auto bg-white dark:bg-[#16110d] border border-[#c8c0af] dark:border-[#3d3329] rounded-sm shadow-xl p-1 z-40">
                <button
                  onClick={() => { setBranchFilter(null); setBranchDropdownOpen(false) }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-jakarta uppercase tracking-wider transition-colors cursor-pointer ${
                    !branchFilter ? 'bg-[#191614] text-white dark:bg-[#f3eee8] dark:text-[#191614] font-bold' : 'text-[#5c5347] dark:text-[#d4c9bd] hover:bg-[#faf8f5] dark:hover:bg-[#221a14]'
                  }`}
                >
                  <span>All branches</span>
                  <span className="text-[10px] tabular-nums opacity-60">{candidates.length}</span>
                </button>
                {availableBranches.map(branch => (
                  <button
                    key={branch}
                    onClick={() => { setBranchFilter(branchFilter === branch ? null : branch); setBranchDropdownOpen(false) }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-jakarta uppercase tracking-wider transition-colors cursor-pointer ${
                      branchFilter === branch ? 'bg-[#191614] text-white dark:bg-[#f3eee8] dark:text-[#191614] font-bold' : 'text-[#5c5347] dark:text-[#d4c9bd] hover:bg-[#faf8f5] dark:hover:bg-[#221a14]'
                    }`}
                  >
                    <span className="truncate max-w-[140px]">{branch}</span>
                    <span className="text-[10px] tabular-nums opacity-60">
                      {candidates.filter(c => branchOf(c) === branch).length}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={openUploadModal}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-[#181513] hover:bg-black text-white dark:bg-[#f3eee8] dark:text-[#191614] dark:hover:bg-white text-xs sm:text-sm font-bold rounded-sm shadow-2xs hover:shadow transition-all shrink-0 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload CV</span>
          </button>
        </div>

        {/* Row 2: Stages Row (Horizontally scrollable with count badges) */}
        <div className="relative w-full overflow-x-auto pb-1 scroll-smooth [scrollbar-width:thin] [scrollbar-color:#c4b8aa_transparent]">
          <div className="flex items-center gap-1.5 whitespace-nowrap min-w-max py-0.5">
            {/* Any stage */}
            <button
              onClick={() => setStageFilter(null)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[11px] font-jakarta tracking-wider uppercase transition-all cursor-pointer ${
                !stageFilter
                  ? 'bg-[#191614] text-white dark:bg-[#f3eee8] dark:text-[#191614] font-bold shadow-2xs'
                  : 'bg-white dark:bg-[#1f1a16] border border-[#c8c0af] dark:border-[#3d3329] text-[#7a7062] dark:text-[#a89c8e] hover:bg-[#faf8f5] dark:hover:bg-[#251f1a] font-medium'
              }`}
            >
              <span>Any stage</span>
              <span className={`text-[10px] font-jakarta tabular-nums px-1 py-0.2 ${
                !stageFilter ? 'bg-white/20 text-white dark:bg-black/15 dark:text-[#191614]' : 'text-[#8a7f70] dark:text-[#8a7f70]'
              }`}>
                {stageCounts.total}
              </span>
            </button>

            {/* Stages */}
            {STAGE_OPTIONS.map(stage => {
              const count = stageCounts[stage] || 0
              const active = stageFilter === stage
              return (
                <button
                  key={stage}
                  onClick={() => setStageFilter(active ? null : stage)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[11px] font-jakarta tracking-wider uppercase transition-all cursor-pointer ${
                    active
                      ? 'bg-[#191614] text-white dark:bg-[#f3eee8] dark:text-[#191614] font-bold shadow-2xs'
                      : 'bg-white dark:bg-[#1f1a16] border border-[#c8c0af] dark:border-[#3d3329] text-[#7a7062] dark:text-[#a89c8e] hover:bg-[#faf8f5] dark:hover:bg-[#251f1a] font-medium'
                  }`}
                >
                  <span>{stage}</span>
                  <span className={`text-[10px] font-jakarta tabular-nums px-1 py-0.2 ${
                    active ? 'bg-white/20 text-white dark:bg-black/15 dark:text-[#191614]' : 'text-[#8a7f70] dark:text-[#8a7f70]'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Row 3: List Header (All candidates · 2 resumes + Newest first) */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-3">
          {/* Select All checkbox */}
          <button
            onClick={toggleSelectAll}
            className="text-[#7a7062] hover:text-[#191614] dark:text-[#8a7f70] dark:hover:text-white transition-colors cursor-pointer"
            aria-label={allFilteredSelected ? 'Deselect all' : 'Select all'}
            title={allFilteredSelected ? 'Deselect all' : 'Select all'}
          >
            {allFilteredSelected ? (
              <CheckSquare className="w-4 h-4 text-[#e85d3f]" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
          <h2 className="text-xs font-jakarta tracking-[0.14em] uppercase font-bold text-[#7a7062] dark:text-[#a89c8e]" aria-live="polite">
            {activeCategory || 'All candidates'}
            <span className="font-normal opacity-70"> · {sortedCandidates.length} {sortedCandidates.length === 1 ? 'resume' : 'resumes'}</span>
          </h2>
        </div>

        {/* Sort By Dropdown (Newest first) */}
        <div className="relative" ref={sortDropdownRef}>
          <button
            onClick={() => setSortDropdownOpen(prev => !prev)}
            className="bg-white dark:bg-[#1f1a16] border border-[#c8c0af] dark:border-[#3a3028] rounded-sm px-3 py-1.5 text-xs font-jakarta uppercase tracking-wider font-semibold text-[#191614] dark:text-[#f3eee8] flex items-center gap-2 hover:bg-[#faf8f5] dark:hover:bg-[#251f1a] transition-colors cursor-pointer shadow-2xs"
          >
            <span>{sortBy === 'newest' ? 'Newest first' : sortBy === 'oldest' ? 'Oldest first' : 'Name (A-Z)'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#8a7f70]" />
          </button>

          {sortDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-36 bg-white dark:bg-[#16110d] border border-[#c8c0af] dark:border-[#3d3329] rounded-sm shadow-xl p-1 z-30">
              <button
                onClick={() => { setSortBy('newest'); setSortDropdownOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs font-jakarta uppercase tracking-wider transition-colors cursor-pointer ${
                  sortBy === 'newest' ? 'bg-[#191614] text-white dark:bg-[#f3eee8] dark:text-[#191614] font-bold' : 'text-[#5c5347] dark:text-[#d4c9bd] hover:bg-[#faf8f5] dark:hover:bg-[#221a14]'
                }`}
              >
                Newest first
              </button>
              <button
                onClick={() => { setSortBy('oldest'); setSortDropdownOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs font-jakarta uppercase tracking-wider transition-colors cursor-pointer ${
                  sortBy === 'oldest' ? 'bg-[#191614] text-white dark:bg-[#f3eee8] dark:text-[#191614] font-bold' : 'text-[#5c5347] dark:text-[#d4c9bd] hover:bg-[#faf8f5] dark:hover:bg-[#221a14]'
                }`}
              >
                Oldest first
              </button>
              <button
                onClick={() => { setSortBy('name'); setSortDropdownOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs font-jakarta uppercase tracking-wider transition-colors cursor-pointer ${
                  sortBy === 'name' ? 'bg-[#191614] text-white dark:bg-[#f3eee8] dark:text-[#191614] font-bold' : 'text-[#5c5347] dark:text-[#d4c9bd] hover:bg-[#faf8f5] dark:hover:bg-[#221a14]'
                }`}
              >
                Name (A-Z)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Bulk Actions Toolbar ─────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-[#181513] text-white border border-[#3d3329] px-4 py-2.5 rounded-sm shadow-xl sticky top-3 z-30 font-jakarta text-xs">
          <span className="font-bold text-white bg-[#e85d3f] px-2 py-0.5 uppercase tracking-wider">
            {selectedIds.size} selected
          </span>

          {/* Change Status dropdown */}
          <div className="relative">
            <button
              onClick={() => setBulkStatusDropdownOpen(o => !o)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-sm text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Change Status
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {bulkStatusDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-[#16110d] text-[#191614] dark:text-[#f3eee8] rounded-sm shadow-xl border border-[#c8c0af] dark:border-[#3d3329] z-50 w-44 py-1 overflow-hidden font-jakarta text-xs">
                {STAGE_OPTIONS.map(stage => (
                  <button
                    key={stage}
                    onClick={() => handleBulkStatusChange(stage)}
                    className="w-full text-left px-3 py-1.5 uppercase hover:bg-[#faf8f5] dark:hover:bg-[#221a14] transition-colors cursor-pointer"
                  >
                    {stage}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Delete selected */}
          <button
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 bg-[#aa2c1e] hover:bg-red-700 px-3 py-1 rounded-sm text-xs uppercase tracking-wider transition-colors disabled:opacity-60 cursor-pointer"
          >
            {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete Selected
          </button>

          {/* Clear */}
          <button
            onClick={clearSelection}
            className="ml-auto text-gray-400 hover:text-white transition-colors p-1 rounded-sm cursor-pointer"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Candidate List - Architectural Divided Grid */}
      <div className="border border-[#c8c0af] dark:border-[#3d3329] divide-y divide-[#c8c0af] dark:divide-[#3d3329] bg-white dark:bg-[#16110d]">
        {sortedCandidates.map((candidate) => {
          const date = new Date(candidate.createdAt)
          const formattedDate = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}, ${date.toLocaleString('default', { hour: 'numeric', minute: 'numeric', hour12: true })}`
          const isSelected = selectedIds.has(candidate.id)
          const searchQ = search.trim().toLowerCase()
          const fileHit = searchQ ? (candidate.resumes ?? []).find((r: any) => r.fileName?.toLowerCase().includes(searchQ)) : null
          const palette = getAvatarPalette(candidate.id)
          
          return (
            <div 
              key={candidate.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, candidate.id)}
              className={`flex items-center justify-between max-lg:flex-wrap gap-y-3 p-4 hover:bg-[#faf8f5] dark:hover:bg-[#1a1410] transition-colors cursor-pointer active:cursor-grabbing group ${
                isSelected ? 'bg-[#f8f5f0] dark:bg-[#241c17]' : ''
              }`}
              onClick={() => router.push(`/candidates/${candidate.id}`)}
            >
              {/* Row checkbox */}
              <button
                onClick={(e) => toggleSelect(e, candidate.id)}
                aria-label={`${isSelected ? 'Deselect' : 'Select'} ${candidate.name}`}
                className={`mr-3 shrink-0 transition-colors ${
                  isSelected ? 'text-[#e85d3f]' : 'text-[#a89f8f] hover:text-[#191614] dark:hover:text-white'
                } ${selectedIds.size === 0 ? 'lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100' : 'opacity-100'}`}
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>

              <div 
                className="flex items-center gap-3.5 flex-1 min-w-0"
              >
                <div className={`w-10 h-10 rounded-sm shrink-0 flex items-center justify-center font-bold text-xs font-jakarta border ${palette.bg} ${palette.text} ${palette.border}`}>
                  {getInitials(candidate.name)}
                </div>

                <div className="flex flex-col min-w-0">
                  <h3 className="font-black text-sm sm:text-base text-[#191614] dark:text-[#f3eee8] group-hover:text-[#e85d3f] transition-colors tracking-tight font-sans">
                    <Link
                      href={`/candidates/${candidate.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline"
                    >
                      {candidate.name}
                    </Link>
                  </h3>
                  {fileHit && (
                    <p className="text-xs text-[#7a7062] dark:text-[#8a7f70] flex items-center gap-1 mt-0.5 break-all font-jakarta">
                      <FileText className="w-3 h-3 shrink-0" /> {fileHit.fileName}
                    </p>
                  )}
                  <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                    {candidate.sector && (
                      <span className="font-jakarta text-[10px] sm:text-[11px] uppercase tracking-wider border border-[#c8c0af] dark:border-[#3a3028] bg-[#faf8f5] dark:bg-[#1f1a16] text-[#6b6055] dark:text-[#a89c8e] px-2 py-0.5 rounded-sm">
                        <span className="text-[#a89c8e] dark:text-[#6b6055]">CAT:</span> {candidate.sector}
                      </span>
                    )}
                    {candidate.category && (
                      <span className="font-jakarta text-[10px] sm:text-[11px] uppercase tracking-wider border border-[#c8c0af] dark:border-[#3a3028] bg-[#faf8f5] dark:bg-[#1f1a16] text-[#6b6055] dark:text-[#a89c8e] px-2 py-0.5 rounded-sm">
                        <span className="text-[#a89c8e] dark:text-[#6b6055]">SUB:</span> {candidate.category}
                      </span>
                    )}
                    {candidate.yearsOfExperience && (
                      <span className="font-jakarta text-[10px] sm:text-[11px] uppercase tracking-wider border border-[#c8c0af] dark:border-[#3a3028] bg-[#faf8f5] dark:bg-[#1f1a16] text-[#6b6055] dark:text-[#a89c8e] px-2 py-0.5 rounded-sm">
                        {candidate.yearsOfExperience}
                      </span>
                    )}
                    {candidate.age && (
                      <span className="font-jakarta text-[10px] sm:text-[11px] uppercase tracking-wider border border-[#c8c0af] dark:border-[#3a3028] bg-[#faf8f5] dark:bg-[#1f1a16] text-[#6b6055] dark:text-[#a89c8e] px-2 py-0.5 rounded-sm">
                        {candidate.age} yrs
                      </span>
                    )}
                    {candidate.agent && (
                      <span className="font-jakarta text-[10px] sm:text-[11px] uppercase tracking-wider border border-[#c8c0af] dark:border-[#3a3028] bg-[#faf8f5] dark:bg-[#1f1a16] text-[#6b6055] dark:text-[#a89c8e] px-2 py-0.5 rounded-sm">
                        Agent: {candidate.agent}
                      </span>
                    )}
                    {isAdmin && (
                      <span className="font-jakarta text-[10px] sm:text-[11px] uppercase tracking-wider border border-[#b4c8dc] dark:border-[#22394e] bg-[#f0f6fb] dark:bg-[#142332] text-[#205282] dark:text-[#7bb0e0] px-2 py-0.5 rounded-sm font-semibold" title="Uploaded by">
                        {branchOf(candidate)}
                      </span>
                    )}
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCandidate(candidate);
                      }}
                      className="ml-1 text-[#8a7f70] hover:text-[#191614] dark:hover:text-white flex items-center gap-1 font-jakarta text-[10px] sm:text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
                      aria-label={`Edit details for ${candidate.name}`}
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
              
              <div 
                className="flex items-center gap-4 justify-end flex-wrap sm:flex-nowrap"
              >
                {/* Date / Time */}
                <div className="flex items-center text-[#8a7f70] dark:text-[#8a7f70] font-jakarta text-xs tabular-nums min-w-[120px]">
                  <ArrowDownCircle className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                  {formattedDate}
                </div>

                {/* Stage tag */}
                <div className="flex items-center">
                  <select
                    value={candidate.recruitmentStage || 'Applied'}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleStageChange(candidate.id, e.target.value)}
                    aria-label={`Status for ${candidate.name}`}
                    title="Change status"
                    className={`pl-2.5 pr-6 py-1 rounded-sm text-[11px] font-jakarta font-bold tracking-wider uppercase border cursor-pointer appearance-none bg-no-repeat bg-[right_0.4rem_center] bg-[length:0.6rem] bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='3'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] ${getStatusStyle(candidate.recruitmentStage || 'Applied')}`}
                  >
                    {[...new Set([candidate.recruitmentStage || 'Applied', ...STAGE_OPTIONS])].map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                   <button 
                     onClick={(e) => handleDeleteCandidate(e, candidate.id)}
                     className="p-1.5 text-[#8a7f70] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-sm transition-colors cursor-pointer"
                     title="Delete Candidate"
                     aria-label={`Delete ${candidate.name}`}
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                   </button>
                   <ChevronRight className="w-4 h-4 text-[#8a7f70] group-hover:text-[#191614] dark:group-hover:text-white transition-colors" />
                </div>

              </div>
            </div>
          )
        })}

        {sortedCandidates.length === 0 && (
          <div className="flex flex-col items-center text-center py-16 px-6 border border-[#c8c0af] dark:border-[#3d3329] bg-white dark:bg-[#16110d]">
            <Search className="w-8 h-8 text-[#a89c8e] mb-3" aria-hidden />
            <p className="font-bold text-[#191614] dark:text-[#f3eee8] font-sans">No candidates found</p>
            <p className="text-xs font-jakarta text-[#8a7f70] mt-1 mb-4 uppercase tracking-wider">
              {candidates.length === 0
                ? 'Upload your first CV to get started.'
                : 'Try a different search or clear your filters.'}
            </p>
            {candidates.length === 0 ? (
              <button onClick={openUploadModal} className="px-4 py-2 bg-[#181513] hover:bg-black text-white text-xs font-bold rounded-sm transition-colors cursor-pointer">
                Upload CV
              </button>
            ) : (
              <button
                onClick={() => { setSearch(''); setActiveCategory(null); setStageFilter(null); setBranchFilter(null) }}
                className="px-4 py-2 border border-[#c8c0af] dark:border-[#3d3329] hover:bg-[#faf8f5] dark:hover:bg-[#1f1a16] text-[#191614] dark:text-[#f3eee8] text-xs font-jakarta uppercase tracking-wider font-bold rounded-sm transition-colors cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  )
}

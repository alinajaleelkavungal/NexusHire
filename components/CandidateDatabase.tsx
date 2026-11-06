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

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        active
          ? 'bg-green-600 border-green-600 text-white shadow-sm'
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
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
    if (status?.toLowerCase() === 'rejected') return 'bg-red-100 text-red-700'
    if (status?.toLowerCase().includes('interview')) return 'bg-blue-100 text-blue-700'
    if (status?.toLowerCase() === 'selected') return 'bg-emerald-100 text-emerald-700'
    if (status?.toLowerCase() === 'shortlisted') return 'bg-purple-100 text-purple-700'
    if (status?.toLowerCase() === 'screening') return 'bg-yellow-100 text-yellow-700'
    return 'bg-gray-100 text-gray-700'
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
      <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-6 min-h-screen">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Candidates</h1>
        <p className="text-sm text-gray-500 mt-1">Search, filter and manage every resume in one place.</p>
      </div>

      {/* ── Unified Filter & Search Card (Exact alignment as requested) ── */}
      <div className="bg-white dark:bg-[#1e1814] border border-[#e2dcce] dark:border-[#352c25] rounded-3xl p-3.5 sm:p-4 shadow-[0_2px_12px_-2px_rgba(36,33,31,0.04)] dark:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.3)] space-y-3 transition-colors">
        
        {/* Row 1: Search + Sector + Branch + Upload Button */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 sm:gap-3">
          
          {/* Search Input */}
          <div className="flex-1 min-w-[260px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7e70] dark:text-[#a89c8e]" aria-hidden />
            <input
              type="search"
              aria-label="Search candidates"
              placeholder="Search by name, skill, file name or sub category"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 sm:py-3 bg-[#fbf9f5] dark:bg-[#261f1a] border border-[#eee8dd] dark:border-[#3a3028] rounded-2xl text-sm text-[#24211f] dark:text-[#f3eee8] placeholder-[#9c8e7d] dark:placeholder-[#827668] focus:outline-none focus:ring-2 focus:ring-[#1e4e2b] dark:focus:ring-[#2e7441] focus:border-transparent transition-all [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sector Dropdown */}
          <div className="relative shrink-0" ref={sectorDropdownRef}>
            <button
              onClick={() => { setSectorDropdownOpen(p => !p); setBranchDropdownOpen(false) }}
              className="bg-white dark:bg-[#241c17] border border-[#e2dcce] dark:border-[#352c25] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#342e29] dark:text-[#f3eee8] flex items-center gap-1.5 hover:bg-[#faf7f2] dark:hover:bg-[#2a221b] transition-colors cursor-pointer shadow-2xs"
            >
              <span className="truncate max-w-[130px]">Sector: {activeCategory || 'All'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#8a7e70]" />
            </button>

            {sectorDropdownOpen && (
              <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-56 max-h-72 overflow-y-auto bg-white dark:bg-[#1e1814] border border-[#e2dcce] dark:border-[#352c25] rounded-2xl shadow-xl p-1.5 z-40">
                <button
                  onClick={() => { setActiveCategory(null); setSectorDropdownOpen(false) }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer ${
                    !activeCategory ? 'bg-[#1e4e2b]/10 text-[#1e4e2b] font-semibold dark:bg-[#1e4e2b]/20 dark:text-green-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a221b]'
                  }`}
                >
                  <span>All sectors</span>
                  <span className="text-[11px] opacity-60">{candidates.length}</span>
                </button>
                {sectors.map(s => (
                  <button
                    key={s.name}
                    onClick={() => { setActiveCategory(activeCategory === s.name ? null : s.name); setSectorDropdownOpen(false) }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer ${
                      activeCategory === s.name ? 'bg-[#1e4e2b]/10 text-[#1e4e2b] font-semibold dark:bg-[#1e4e2b]/20 dark:text-green-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a221b]'
                    }`}
                  >
                    <span className="truncate max-w-[150px]">{s.name}</span>
                    <span className="text-[11px] opacity-60">{s.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Branch Dropdown */}
          <div className="relative shrink-0" ref={branchDropdownRef}>
            <button
              onClick={() => { setBranchDropdownOpen(p => !p); setSectorDropdownOpen(false) }}
              className="bg-white dark:bg-[#241c17] border border-[#e2dcce] dark:border-[#352c25] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#342e29] dark:text-[#f3eee8] flex items-center gap-1.5 hover:bg-[#faf7f2] dark:hover:bg-[#2a221b] transition-colors cursor-pointer shadow-2xs"
            >
              <span className="truncate max-w-[130px]">Branch: {branchFilter || 'All'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#8a7e70]" />
            </button>

            {branchDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 max-h-72 overflow-y-auto bg-white dark:bg-[#1e1814] border border-[#e2dcce] dark:border-[#352c25] rounded-2xl shadow-xl p-1.5 z-40">
                <button
                  onClick={() => { setBranchFilter(null); setBranchDropdownOpen(false) }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer ${
                    !branchFilter ? 'bg-[#1e4e2b]/10 text-[#1e4e2b] font-semibold dark:bg-[#1e4e2b]/20 dark:text-green-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a221b]'
                  }`}
                >
                  <span>All branches</span>
                  <span className="text-[11px] opacity-60">{candidates.length}</span>
                </button>
                {availableBranches.map(branch => (
                  <button
                    key={branch}
                    onClick={() => { setBranchFilter(branchFilter === branch ? null : branch); setBranchDropdownOpen(false) }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer ${
                      branchFilter === branch ? 'bg-[#1e4e2b]/10 text-[#1e4e2b] font-semibold dark:bg-[#1e4e2b]/20 dark:text-green-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a221b]'
                    }`}
                  >
                    <span className="truncate max-w-[140px]">{branch}</span>
                    <span className="text-[11px] opacity-60">
                      {candidates.filter(c => branchOf(c) === branch).length}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Upload Button (Kept prominent as requested) */}
          <button
            onClick={openUploadModal}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-[#1e4e2b] hover:bg-[#163b20] active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-sm hover:shadow transition-all shrink-0 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload CV</span>
          </button>
        </div>

        {/* Row 2: Stages Row (Horizontally scrollable with count badges) */}
        <div className="relative w-full overflow-x-auto pb-1.5 scroll-smooth [scrollbar-width:thin] [scrollbar-color:#c4b8aa_transparent]">
          <div className="flex items-center gap-2 whitespace-nowrap min-w-max py-0.5">
            {/* Any stage */}
            <button
              onClick={() => setStageFilter(null)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                !stageFilter
                  ? 'bg-[#1e4e2b] text-white shadow-xs'
                  : 'bg-white dark:bg-[#241c17] border border-[#e2dcce] dark:border-[#352c25] text-[#4a4237] dark:text-[#c4b8aa] hover:bg-[#faf7f2] dark:hover:bg-[#2a221b]'
              }`}
            >
              <span>Any stage</span>
              <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                !stageFilter ? 'bg-white/20 text-white' : 'text-[#8a7e70] dark:text-[#8a7e70]'
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
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#1e4e2b] text-white shadow-xs'
                      : 'bg-white dark:bg-[#241c17] border border-[#e2dcce] dark:border-[#352c25] text-[#4a4237] dark:text-[#c4b8aa] hover:bg-[#faf7f2] dark:hover:bg-[#2a221b]'
                  }`}
                >
                  <span>{stage}</span>
                  <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                    active ? 'bg-white/20 text-white' : 'text-[#8a7e70] dark:text-[#8a7e70]'
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
      <div className="flex justify-between items-center px-0.5">
        <div className="flex items-center gap-3">
          {/* Select All checkbox */}
          <button
            onClick={toggleSelectAll}
            className="text-gray-400 hover:text-[#1e4e2b] transition-colors cursor-pointer"
            aria-label={allFilteredSelected ? 'Deselect all' : 'Select all'}
            title={allFilteredSelected ? 'Deselect all' : 'Select all'}
          >
            {allFilteredSelected ? (
              <CheckSquare className="w-5 h-5 text-[#1e4e2b]" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>
          <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100" aria-live="polite">
            {activeCategory || 'All candidates'}
            <span className="font-normal text-gray-500 dark:text-gray-400"> · {sortedCandidates.length} {sortedCandidates.length === 1 ? 'resume' : 'resumes'}</span>
          </h2>
        </div>

        {/* Sort By Dropdown (Newest first) */}
        <div className="relative" ref={sortDropdownRef}>
          <button
            onClick={() => setSortDropdownOpen(prev => !prev)}
            className="bg-white dark:bg-[#241c17] border border-[#e2dcce] dark:border-[#352c25] rounded-xl px-3.5 py-1.5 text-xs font-semibold text-[#342e29] dark:text-[#f3eee8] flex items-center gap-2 hover:bg-[#faf7f2] dark:hover:bg-[#2a221b] transition-colors cursor-pointer shadow-2xs"
          >
            <span>{sortBy === 'newest' ? 'Newest first' : sortBy === 'oldest' ? 'Oldest first' : 'Name (A-Z)'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#8a7e70]" />
          </button>

          {sortDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-36 bg-white dark:bg-[#1e1814] border border-[#e2dcce] dark:border-[#352c25] rounded-xl shadow-lg p-1 z-30">
              <button
                onClick={() => { setSortBy('newest'); setSortDropdownOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  sortBy === 'newest' ? 'bg-[#1e4e2b]/10 text-[#1e4e2b] font-semibold dark:bg-[#1e4e2b]/20 dark:text-green-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a221b]'
                }`}
              >
                Newest first
              </button>
              <button
                onClick={() => { setSortBy('oldest'); setSortDropdownOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  sortBy === 'oldest' ? 'bg-[#1e4e2b]/10 text-[#1e4e2b] font-semibold dark:bg-[#1e4e2b]/20 dark:text-green-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a221b]'
                }`}
              >
                Oldest first
              </button>
              <button
                onClick={() => { setSortBy('name'); setSortDropdownOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  sortBy === 'name' ? 'bg-[#1e4e2b]/10 text-[#1e4e2b] font-semibold dark:bg-[#1e4e2b]/20 dark:text-green-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a221b]'
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
        <div className="flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg sticky top-3 z-30">
          <span className="text-sm font-semibold bg-green-500 text-white px-2.5 py-0.5 rounded-full">
            {selectedIds.size} selected
          </span>

          {/* Change Status dropdown */}
          <div className="relative">
            <button
              onClick={() => setBulkStatusDropdownOpen(o => !o)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              Change Status
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {bulkStatusDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white text-gray-900 rounded-xl shadow-xl border z-50 w-44 py-1 overflow-hidden">
                {STAGE_OPTIONS.map(stage => (
                  <button
                    key={stage}
                    onClick={() => handleBulkStatusChange(stage)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
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
            className="flex items-center gap-1.5 bg-red-500/90 hover:bg-red-500 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete Selected
          </button>

          {/* Clear */}
          <button
            onClick={clearSelection}
            className="ml-auto text-gray-400 hover:text-white transition-colors p-1 rounded"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Candidate List */}
      <div className="flex flex-col gap-3 pb-20">
        {sortedCandidates.map((candidate) => {
          const date = new Date(candidate.createdAt)
          const formattedDate = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}, ${date.toLocaleString('default', { hour: 'numeric', minute: 'numeric', hour12: true })}`
          const isSelected = selectedIds.has(candidate.id)
          const searchQ = search.trim().toLowerCase()
          const fileHit = searchQ ? (candidate.resumes ?? []).find((r: any) => r.fileName?.toLowerCase().includes(searchQ)) : null
          
          return (
            <div 
              key={candidate.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, candidate.id)}
              className={`flex items-center justify-between max-lg:flex-wrap gap-y-3 p-4 bg-white border rounded-xl hover:shadow-md hover:border-gray-300 transition-all cursor-pointer active:cursor-grabbing group ${
                isSelected ? 'border-green-400 bg-green-50/40 shadow-sm' : 'border-gray-200'
              }`}
              onClick={() => router.push(`/candidates/${candidate.id}`)}
            >
              {/* Row checkbox */}
              <button
                onClick={(e) => toggleSelect(e, candidate.id)}
                aria-label={`${isSelected ? 'Deselect' : 'Select'} ${candidate.name}`}
                className={`mr-3 flex-shrink-0 transition-colors ${
                  isSelected ? 'text-green-600' : 'text-gray-300 hover:text-gray-500'
                } ${selectedIds.size === 0 ? 'lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100' : 'opacity-100'}`}
              >
                {isSelected ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>

              <div 
                className="flex items-center gap-4 flex-1"
              >
                <div className="w-12 h-12 rounded-sm flex items-center justify-center text-green-700 font-semibold bg-green-100 flex-shrink-0">
                  {getInitials(candidate.name)}
                </div>

                <div className="flex flex-col">
                  <h3 className="font-semibold text-gray-900 text-base group-hover:text-green-700 transition-colors">
                    <Link
                      href={`/candidates/${candidate.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline"
                    >
                      {candidate.name}
                    </Link>
                  </h3>
                  {fileHit && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 break-all">
                      <FileText className="w-3 h-3 shrink-0" /> {fileHit.fileName}
                    </p>
                  )}
                  <div className="flex items-center flex-wrap gap-2 mt-1">
                    {candidate.sector && (
                      <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-xs text-gray-600"><span className="text-gray-400">Category:</span> {candidate.sector}</span>
                    )}
                    {candidate.category && (
                      <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-xs text-gray-600"><span className="text-gray-400">Sub category:</span> {candidate.category}</span>
                    )}
                    {candidate.yearsOfExperience && (
                      <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-xs text-gray-600">{candidate.yearsOfExperience}</span>
                    )}
                    {candidate.age && (
                      <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-xs text-gray-600">{candidate.age} yrs</span>
                    )}
                    {candidate.agent && (
                      <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-xs text-gray-600">Agent: {candidate.agent}</span>
                    )}
                    {isAdmin && (
                      <span className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs text-blue-700 font-medium" title="Uploaded by">
                        {branchOf(candidate)}
                      </span>
                    )}
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCandidate(candidate);
                      }}
                      className="ml-1 text-gray-400 hover:text-green-600 flex items-center gap-1 text-xs font-medium transition-colors"
                      aria-label={`Edit details for ${candidate.name}`}
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
              
              <div 
                className="flex items-center gap-4 justify-end flex-1"
              >
                {/* Date / Time */}
                <div className="flex items-center text-gray-500 text-sm min-w-[120px]">
                  <ArrowDownCircle className="w-4 h-4 mr-1.5 text-gray-400" />
                  {formattedDate}
                </div>

                {/* Stage tag */}
                <div className="flex items-center gap-3">
                  <select
                    value={candidate.recruitmentStage || 'Applied'}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleStageChange(candidate.id, e.target.value)}
                    aria-label={`Status for ${candidate.name}`}
                    title="Change status"
                    className={`pl-3 pr-7 py-1 rounded-full text-sm font-semibold border-0 cursor-pointer appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:0.7rem] bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='3'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] ${getStatusStyle(candidate.recruitmentStage || 'Applied')}`}
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
                     className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                     title="Delete Candidate"
                     aria-label={`Delete ${candidate.name}`}
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                   <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>

              </div>
            </div>
          )
        })}

        {sortedCandidates.length === 0 && (
          <div className="flex flex-col items-center text-center py-16 px-6 border border-dashed border-gray-300 rounded-xl bg-white">
            <Search className="w-10 h-10 text-gray-300 mb-3" aria-hidden />
            <p className="font-medium text-gray-900">No candidates found</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              {candidates.length === 0
                ? 'Upload your first CV to get started.'
                : 'Try a different search or clear your filters.'}
            </p>
            {candidates.length === 0 ? (
              <button onClick={openUploadModal} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">
                Upload CV
              </button>
            ) : (
              <button
                onClick={() => { setSearch(''); setActiveCategory(null); setStageFilter(null); setBranchFilter(null) }}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
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

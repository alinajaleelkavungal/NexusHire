'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Search, UploadCloud, ChevronRight, X, Loader2, Code, Stethoscope, Settings, Plus,
  FileText, ChevronDown, CheckCircle, AlertCircle, ArrowDownCircle, Pencil, Trash2,
  CheckSquare, Square, SquareCheck
} from 'lucide-react'
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

  const [candidates, setCandidates] = useState(initialCandidates)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(urlSector || null)
  const [stageFilter, setStageFilter] = useState<string | null>(null)
  const [branchFilter, setBranchFilter] = useState<string | null>(null)

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

  const filteredCandidates = candidates.filter(c => {
    // Matches name, skills, category, sub category and the saved CV file name(s)
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || [c.name, c.skills, c.sector, c.category, ...(c.resumes ?? []).map((r: any) => r.fileName)]
      .some(v => v && String(v).toLowerCase().includes(q))
    
    // Filter by activeCategory (which maps to sector now)
    const matchesCategory = activeCategory ? (c.sector === activeCategory || c.category === activeCategory) : true
    const matchesStage = stageFilter ? (c.recruitmentStage || 'Applied') === stageFilter : true
    const matchesBranch = branchFilter ? branchOf(c) === branchFilter : true
    return matchesSearch && matchesCategory && matchesStage && matchesBranch
  })

  const allFilteredSelected =
    filteredCandidates.length > 0 && filteredCandidates.every(c => selectedIds.has(c.id))

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
        filteredCandidates.forEach(c => next.delete(c.id))
        return next
      })
    } else {
      // Select all filtered
      setSelectedIds(prev => {
        const next = new Set(prev)
        filteredCandidates.forEach(c => next.add(c.id))
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
        onSuccess={() => router.refresh()} 
        candidate={editingCandidate}
      />
      <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-6 min-h-screen">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Candidates</h1>
        <p className="text-sm text-gray-500 mt-1">Search, filter and manage every resume in one place.</p>
      </div>

      {/* Top Bar */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden />
          <input
            type="search"
            aria-label="Search candidates"
            placeholder="Search by name, skill, file name or sub category"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm transition-all [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={openUploadModal}
          className="flex items-center px-5 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-xl text-white font-medium transition-colors shadow-sm whitespace-nowrap"
        >
          <UploadCloud className="w-5 h-5 sm:mr-2" />
          <span className="max-sm:sr-only">Upload CV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by sector">
          <FilterChip active={!activeCategory} onClick={() => setActiveCategory(null)}>All sectors</FilterChip>
          {sectors.map(s => (
            <FilterChip
              key={s.name}
              active={activeCategory === s.name}
              onClick={() => setActiveCategory(activeCategory === s.name ? null : s.name)}
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.name}
              <span className="text-xs opacity-70">{s.count}</span>
            </FilterChip>
          ))}
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by branch">
            <FilterChip active={!branchFilter} onClick={() => setBranchFilter(null)}>All branches</FilterChip>
            {Array.from(new Set(candidates.map(branchOf))).sort().map(branch => (
              <FilterChip
                key={branch}
                active={branchFilter === branch}
                onClick={() => setBranchFilter(branchFilter === branch ? null : branch)}
              >
                {branch}
                <span className="text-xs opacity-70">{candidates.filter(c => branchOf(c) === branch).length}</span>
              </FilterChip>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by stage">
          <FilterChip active={!stageFilter} onClick={() => setStageFilter(null)}>Any stage</FilterChip>
          {STAGE_OPTIONS.map(stage => (
            <FilterChip
              key={stage}
              active={stageFilter === stage}
              onClick={() => setStageFilter(stageFilter === stage ? null : stage)}
            >
              {stage}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* List Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {/* Select All checkbox */}
          <button
            onClick={toggleSelectAll}
            className="text-gray-400 hover:text-green-600 transition-colors"
            aria-label={allFilteredSelected ? 'Deselect all' : 'Select all'}
            title={allFilteredSelected ? 'Deselect all' : 'Select all'}
          >
            {allFilteredSelected ? (
              <CheckSquare className="w-5 h-5 text-green-600" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>
          <h2 className="text-base font-semibold text-gray-900" aria-live="polite">
            {activeCategory || 'All candidates'}
            <span className="font-normal text-gray-500"> · {filteredCandidates.length} {filteredCandidates.length === 1 ? 'resume' : 'resumes'}</span>
          </h2>
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
        {filteredCandidates.map((candidate) => {
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

        {filteredCandidates.length === 0 && (
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

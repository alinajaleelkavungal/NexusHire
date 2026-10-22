'use client'

import { useState, useMemo } from 'react'
import { Code, Stethoscope, Gear, Plus, FileText, PencilSimple, Trash } from '@/components/icons'
import { useRouter } from 'next/navigation'

export default function SectorsManager({ initialCandidates, savedSectors = [] }: { initialCandidates: { category: string | null }[], savedSectors?: string[] }) {
  const router = useRouter()
  const [candidates, setCandidates] = useState(initialCandidates)
  
  const [isAddingSector, setIsAddingSector] = useState(false)
  const [newSectorName, setNewSectorName] = useState('')
  const [manualSectors, setManualSectors] = useState<string[]>([])
  
  const [editingSector, setEditingSector] = useState<string | null>(null)
  const [editSectorName, setEditSectorName] = useState('')

  const sectors = useMemo(() => {
    const counts: Record<string, number> = {}
    
    // DB Saved
    savedSectors.forEach(name => { counts[name] = 0 })
    
    // Manual state
    manualSectors.forEach(name => { counts[name] = 0 })
    
    candidates.forEach(c => {
      if (c.category && c.category !== 'Uncategorized') {
        counts[c.category] = (counts[c.category] || 0) + 1
      }
    })
    
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      icon: name.toLowerCase().includes('software') || name.toLowerCase().includes('developer') ? Code :
            name.toLowerCase().includes('health') || name.toLowerCase().includes('medical') ? Stethoscope :
            name.toLowerCase().includes('mechanic') || name.toLowerCase().includes('engineer') ? Gear :
            FileText
    }))
  }, [candidates, manualSectors])

  const handleAddSectorSubmit = async (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    const val = newSectorName.trim();
    if (val && !sectors.find(s => s.name.toLowerCase() === val.toLowerCase())) {
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

  const handleDeleteSector = async (sectorName: string) => {
    setManualSectors(prev => prev.filter(s => s !== sectorName))
    setCandidates(prev => prev.map(c => c.category === sectorName ? { category: 'Uncategorized' } : c))

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

  const handleEditSectorSubmit = async (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    const val = editSectorName.trim();
    const oldVal = editingSector;
    setEditingSector(null)
    
    if (val && oldVal && val !== oldVal) {
      setManualSectors(prev => prev.includes(oldVal) ? prev.map(s => s === oldVal ? val : s) : [...prev, val])
      setCandidates(prev => prev.map(c => c.category === oldVal ? { category: val } : c))

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

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Category Management</h1>
        <p className="text-gray-700 font-medium mt-2">Create, rename, or delete categories used to organize candidates.</p>
      </div>

      <div className="flex flex-wrap gap-4">
        {sectors.map((sector) => (
          <div 
            key={sector.name}
            className="group relative p-6 rounded-xl border border-gray-200 bg-white w-full sm:w-[calc(50%-8px)] md:w-[calc(33.333%-11px)]"
          >
            {editingSector === sector.name ? (
              <div className="flex flex-col h-full justify-center">
                <input 
                  autoFocus
                  type="text"
                  value={editSectorName}
                  onChange={(e) => setEditSectorName(e.target.value)}
                  onKeyDown={handleEditSectorSubmit}
                  onBlur={handleEditSectorSubmit}
                  className="w-full bg-white border border-green-300 rounded-md px-3 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-4">
                  <sector.icon weight="bold" className="w-8 h-8 text-green-700" />
                  <span className="text-3xl font-black text-gray-950">{sector.count}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-950 leading-tight">
                  {sector.name}
                </h3>

                <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingSector(sector.name)
                      setEditSectorName(sector.name)
                    }}
                    className="p-1.5 bg-gray-50 rounded-md shadow-sm border border-gray-200 text-gray-500 hover:text-blue-500"
                  >
                    <PencilSimple weight="bold" className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteSector(sector.name)}
                    className="p-1.5 bg-gray-50 rounded-md shadow-sm border border-gray-200 text-gray-500 hover:text-red-500"
                  >
                    <Trash weight="bold" className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        
        {isAddingSector ? (
           <div className="p-6 rounded-xl border border-dashed border-green-400 bg-green-50 w-full sm:w-[calc(50%-8px)] md:w-[calc(33.333%-11px)]">
              <input 
                autoFocus
                type="text"
                placeholder="New sector name..."
                value={newSectorName}
                onChange={(e) => setNewSectorName(e.target.value)}
                onKeyDown={handleAddSectorSubmit}
                onBlur={handleAddSectorSubmit}
                className="w-full bg-white border border-green-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-3 text-center">Press Enter to save</p>
           </div>
        ) : (
          <div 
            onClick={() => setIsAddingSector(true)}
            className="p-6 rounded-xl border border-dashed border-green-300 bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-green-50 transition-colors w-full sm:w-[calc(50%-8px)] md:w-[calc(33.333%-11px)] min-h-[120px]"
          >
            <Plus weight="bold" className="w-8 h-8 text-green-600 mb-2" />
            <span className="text-sm font-medium text-gray-500">Create New Sector</span>
          </div>
        )}
      </div>
    </div>
  )
}

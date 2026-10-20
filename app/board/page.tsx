'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { UserCircle, Loader2, GripVertical } from '@/components/icons'
import Link from 'next/link'

const STAGES = [
  'Applied',
  'Screening',
  'Shortlisted',
  'Interview Scheduled',
  'Technical Interview',
  'HR Interview',
  'Selected',
  'Rejected'
]

interface KanbanCandidate {
  id: string
  name: string
  category: string | null
  recruitmentStage: string
  priority: string
}

export default function KanbanBoard() {
  const [candidates, setCandidates] = useState<KanbanCandidate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCandidates()
  }, [])

  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/candidates')
      const data = await res.json()
      if (data.success) {
        setCandidates(data.candidates)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result

    if (!destination) return

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return
    }

    const newStage = destination.droppableId
    
    // Optimistic UI update
    setCandidates(prev => 
      prev.map(c => c.id === draggableId ? { ...c, recruitmentStage: newStage } : c)
    )

    try {
      await fetch(`/api/candidates/${draggableId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      })
    } catch (e) {
      console.error('Failed to update stage', e)
      // Revert if failed
      fetchCandidates()
    }
  }

  const getCandidatesByStage = (stage: string) => {
    return candidates.filter(c => (c.recruitmentStage || 'Applied') === stage)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col bg-[#161616]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight">Recruitment Pipeline</h1>
        <p className="text-gray-400 mt-2">Drag and drop candidates across stages to track their progress.</p>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex space-x-4 h-full items-start min-w-max">
            {STAGES.map((stage) => {
              const columnCandidates = getCandidatesByStage(stage)
              return (
                <div key={stage} className="w-80 bg-[#1C1C1C] rounded-2xl flex flex-col max-h-full border border-[#333]">
                  <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#1A1A1A] rounded-t-2xl">
                    <h3 className="font-semibold text-gray-200">{stage}</h3>
                    <span className="bg-[#2A2A2A] text-gray-400 text-xs font-bold px-2 py-1 rounded-full">
                      {columnCandidates.length}
                    </span>
                  </div>
                  
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto p-3 space-y-3 ${snapshot.isDraggingOver ? 'bg-[#222]' : ''}`}
                      >
                        {columnCandidates.map((candidate, index) => (
                          <Draggable key={candidate.id} draggableId={candidate.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`bg-[#2A2A2A] p-4 rounded-xl shadow-sm border border-[#444] ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500/20 rotate-2' : 'hover:border-[#555]'} transition-all`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center space-x-2 min-w-0">
                                    <div 
                                      {...provided.dragHandleProps} 
                                      className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing p-1 -ml-1 rounded flex-shrink-0"
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <Link href={`/candidates/${candidate.id}`} className="font-semibold text-white hover:text-blue-400 line-clamp-1 break-all">
                                        {candidate.name}
                                      </Link>
                                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{candidate.category || 'Uncategorized'}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-3 flex justify-between items-center">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                                    candidate.priority === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                    candidate.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                    'bg-green-500/20 text-green-400 border border-green-500/30'
                                  }`}>
                                    {candidate.priority}
                                  </span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { CalendarBlank, ChatText, Clock, Plus, Trash, CircleNotch } from '@/components/icons'

interface WorkflowProps {
  candidateId: string
  currentStage: string
}

export default function CandidateWorkflow({ candidateId, currentStage }: WorkflowProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'interviews'>('timeline')
  
  const [activities, setActivities] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [interviews, setInterviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [newNote, setNewNote] = useState('')
  const [interviewForm, setInterviewForm] = useState({ interviewer: '', date: '', type: '' })

  useEffect(() => {
    fetchData()
  }, [candidateId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [actRes, notRes, intRes] = await Promise.all([
        fetch(`/api/candidates/${candidateId}/activity`),
        fetch(`/api/candidates/${candidateId}/notes`),
        fetch(`/api/candidates/${candidateId}/interviews`)
      ])
      
      const [actData, notData, intData] = await Promise.all([
        actRes.json(), notRes.json(), intRes.json()
      ])

      if (actData.success) setActivities(actData.activities)
      if (notData.success) setNotes(notData.notes)
      if (intData.success) setInterviews(intData.interviews)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return
    try {
      await fetch(`/api/candidates/${candidateId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote })
      })
      setNewNote('')
      fetchData()
    } catch (e) { console.error(e) }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await fetch(`/api/candidates/${candidateId}/notes?noteId=${noteId}`, {
        method: 'DELETE'
      })
      fetchData()
    } catch (e) { console.error(e) }
  }

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!interviewForm.date || !interviewForm.interviewer) return
    try {
      await fetch(`/api/candidates/${candidateId}/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interviewForm)
      })
      setInterviewForm({ interviewer: '', date: '', type: '' })
      fetchData()
    } catch (e) { console.error(e) }
  }

  return (
    <div className="bg-[#1C1C1C] rounded-xl shadow-sm border border-[#333] overflow-hidden mt-8 text-gray-200">
      <div className="flex border-b border-[#333]">
        <button onClick={() => setActiveTab('timeline')} className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          <Clock weight="bold" className="w-4 h-4 inline-block mr-2" /> Timeline
        </button>
        <button onClick={() => setActiveTab('notes')} className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          <ChatText weight="bold" className="w-4 h-4 inline-block mr-2" /> Notes
        </button>
        <button onClick={() => setActiveTab('interviews')} className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'interviews' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          <CalendarBlank weight="bold" className="w-4 h-4 inline-block mr-2" /> Interviews
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-12"><CircleNotch weight="bold" className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : (
          <>
            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="space-y-6">
                {activities.length === 0 ? <p className="text-gray-500">No activity recorded yet.</p> : (
                  <div className="relative border-l border-[#444] ml-3 space-y-8">
                    {activities.map((act) => (
                      <div key={act.id} className="pl-6 relative">
                        <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[6.5px] top-1.5 border-2 border-[#1C1C1C]"></div>
                        <p className="text-xs text-gray-500 mb-1">{format(new Date(act.createdAt), 'MMM d, yyyy h:mm a')}</p>
                        <h4 className="text-sm font-bold text-white">{act.action}</h4>
                        {act.description && <p className="text-sm text-gray-400 mt-1">{act.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div className="space-y-6">
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input 
                    type="text" 
                    value={newNote} 
                    onChange={e => setNewNote(e.target.value)} 
                    placeholder="Add a recruiter note..." 
                    className="flex-1 bg-[#2A2A2A] border border-[#444] rounded-lg px-4 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-500"
                  />
                  <button type="submit" disabled={!newNote.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    <Plus weight="bold" className="w-4 h-4" />
                  </button>
                </form>
                
                <div className="space-y-4">
                  {notes.map(note => (
                    <div key={note.id} className="bg-[#1A1A1A] p-4 rounded-xl border border-[#333] group flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-300">{note.content}</p>
                        <p className="text-xs text-gray-500 mt-2">{format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}</p>
                      </div>
                      <button onClick={() => handleDeleteNote(note.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash weight="bold" className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interviews Tab */}
            {activeTab === 'interviews' && (
              <div className="space-y-8">
                <form onSubmit={handleScheduleInterview} className="bg-[#1A1A1A] p-4 rounded-xl border border-[#333] grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Interviewer Name</label>
                    <input type="text" value={interviewForm.interviewer} onChange={e => setInterviewForm({...interviewForm, interviewer: e.target.value})} className="w-full bg-[#2A2A2A] border border-[#444] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Date & Time</label>
                    <input type="datetime-local" value={interviewForm.date} onChange={e => setInterviewForm({...interviewForm, date: e.target.value})} className="w-full bg-[#2A2A2A] border border-[#444] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Type (e.g. Technical)</label>
                    <div className="flex gap-2">
                      <input type="text" value={interviewForm.type} onChange={e => setInterviewForm({...interviewForm, type: e.target.value})} className="flex-1 bg-[#2A2A2A] border border-[#444] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500" required />
                      <button type="submit" className="bg-blue-600 text-white px-4 rounded-lg font-medium hover:bg-blue-700">Add</button>
                    </div>
                  </div>
                </form>

                <div className="space-y-4">
                  {interviews.length === 0 ? <p className="text-gray-500">No interviews scheduled.</p> : (
                    interviews.map(int => (
                      <div key={int.id} className="bg-[#1C1C1C] border border-[#333] rounded-xl p-4 flex justify-between items-center shadow-sm">
                        <div>
                          <h4 className="font-bold text-white">{int.type || 'Interview'} with {int.interviewer}</h4>
                          <p className="text-sm text-gray-400 mt-1">{format(new Date(int.date), 'MMMM d, yyyy h:mm a')}</p>
                        </div>
                        <span className="bg-[#0F3B6A] text-blue-300 text-xs font-bold px-3 py-1 rounded-full border border-[#164b85]">{int.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

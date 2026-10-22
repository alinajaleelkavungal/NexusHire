'use client'

import { useState, useEffect } from 'react'
import { X, CircleNotch } from '@/components/icons'
import { SECTOR_CATEGORY_MAP } from '@/config/sector-categories'

interface EditCandidateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  candidate: any
}

export default function EditCandidateModal({ isOpen, onClose, onSuccess, candidate }: EditCandidateModalProps) {
  const [formData, setFormData] = useState({
    age: '',
    sector: '',
    category: '',
    yearsOfExperience: '',
    agent: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (candidate) {
      setFormData({
        age: candidate.age ? candidate.age.toString() : '',
        sector: candidate.sector || '',
        category: candidate.category || '',
        yearsOfExperience: candidate.yearsOfExperience || '',
        agent: candidate.agent || ''
      })
    }
  }, [candidate])

  const sectors = Object.keys(SECTOR_CATEGORY_MAP)
  const categories = formData.sector ? SECTOR_CATEGORY_MAP[formData.sector] || [] : []
  const experienceOptions = ['Fresher', '1 year', '2 years', '3 years', '4 years', '5 years', '6 years', '7 years', '8 years', '9 years', '10+ years']

  const isFormValid = formData.agent.trim().length > 0

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/candidate/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate.id,
          ...formData
        })
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to update candidate' }))
        throw new Error(errData.details || errData.error || 'Failed to update candidate')
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error(err)
      alert("Error: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !candidate) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-gray-150">
          <h2 className="text-xl font-black text-gray-950 tracking-tight">Edit Candidate Details</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-950 rounded-full hover:bg-gray-100 transition-colors">
            <X weight="bold" className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">Age</label>
            <input
              type="number"
              className="w-full p-2.5 border border-gray-200/90 rounded-xl text-xs bg-white text-gray-950 focus:ring-2 focus:ring-gray-900 outline-none"
              value={formData.age}
              onChange={(e) => setFormData({...formData, age: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">Category</label>
            <select
              className="w-full p-2.5 border border-gray-200/90 rounded-xl text-xs bg-white text-gray-950 focus:ring-2 focus:ring-gray-900 outline-none"
              value={formData.sector}
              onChange={(e) => setFormData({...formData, sector: e.target.value, category: ''})}
            >
              <option value="">Select a category</option>
              <option value="Nil">Nil</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">Sub Category</label>
            <select
              className="w-full p-2.5 border border-gray-200/90 rounded-xl text-xs bg-white text-gray-950 focus:ring-2 focus:ring-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-400"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              disabled={!formData.sector}
            >
              <option value="">{formData.sector ? 'Select a sub category' : 'Select category first'}</option>
              <option value="Nil">Nil</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">Experience</label>
            <select
              className="w-full p-2.5 border border-gray-200/90 rounded-xl text-xs bg-white text-gray-950 focus:ring-2 focus:ring-gray-900 outline-none"
              value={formData.yearsOfExperience}
              onChange={(e) => setFormData({...formData, yearsOfExperience: e.target.value})}
            >
              <option value="">Select experience</option>
              <option value="Nil">Nil</option>
              {experienceOptions.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">Agent <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              className={`w-full p-2.5 border rounded-xl text-xs bg-white text-gray-950 focus:ring-2 outline-none ${
                formData.agent.trim() ? 'border-gray-200/90 focus:ring-gray-900' : 'border-red-400 focus:ring-red-400'
              }`}
              value={formData.agent}
              onChange={(e) => setFormData({...formData, agent: e.target.value})}
              placeholder="e.g. Agency or recruiter name"
            />
            {!formData.agent.trim() && <p className="text-[11px] text-red-600 mt-1">Agent is required</p>}
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-150 bg-gray-50/60 flex justify-end gap-2.5 rounded-b-3xl">
          <button
            onClick={onClose}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold py-2 px-5 rounded-full shadow-2xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isFormValid || saving}
            className="bg-gray-950 hover:bg-black text-white text-xs font-semibold py-2 px-5 rounded-full shadow-xs transition-colors flex items-center disabled:opacity-50"
          >
            {saving ? <CircleNotch weight="bold" className="w-3.5 h-3.5 mr-2 animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

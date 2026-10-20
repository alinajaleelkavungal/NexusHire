'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from '@/components/icons'
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
    yearsOfExperience: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (candidate) {
      setFormData({
        age: candidate.age ? candidate.age.toString() : '',
        sector: candidate.sector || '',
        category: candidate.category || '',
        yearsOfExperience: candidate.yearsOfExperience || ''
      })
    }
  }, [candidate])

  const sectors = Object.keys(SECTOR_CATEGORY_MAP)
  const categories = formData.sector ? SECTOR_CATEGORY_MAP[formData.sector] || [] : []
  const experienceOptions = ['Fresher', '1 year', '2 years', '3 years', '4 years', '5 years', '6 years', '7 years', '8 years', '9 years', '10+ years']

  const isFormValid = true // Allow empty or Nil submissions

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Edit Candidate Details</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
            <input
              type="number"
              className="w-full p-2 border rounded-md text-sm bg-white text-gray-900 focus:ring-1 focus:ring-green-500 outline-none"
              value={formData.age}
              onChange={(e) => setFormData({...formData, age: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
            <select
              className="w-full p-2 border rounded-md text-sm bg-white text-gray-900 focus:ring-1 focus:ring-green-500 outline-none"
              value={formData.sector}
              onChange={(e) => setFormData({...formData, sector: e.target.value, category: ''})}
            >
              <option value="">Select a sector</option>
              <option value="Nil">Nil</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              className="w-full p-2 border rounded-md text-sm bg-white text-gray-900 focus:ring-1 focus:ring-green-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              disabled={!formData.sector}
            >
              <option value="">{formData.sector ? 'Select a category' : 'Select sector first'}</option>
              <option value="Nil">Nil</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
            <select
              className="w-full p-2 border rounded-md text-sm bg-white text-gray-900 focus:ring-1 focus:ring-green-500 outline-none"
              value={formData.yearsOfExperience}
              onChange={(e) => setFormData({...formData, yearsOfExperience: e.target.value})}
            >
              <option value="">Select experience</option>
              <option value="Nil">Nil</option>
              {experienceOptions.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
        
        <div className="p-6 border-t bg-gray-50 flex justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="mr-3 bg-white border hover:bg-gray-50 text-gray-700 font-medium py-2 px-6 rounded-lg shadow-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isFormValid || saving}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors flex items-center disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

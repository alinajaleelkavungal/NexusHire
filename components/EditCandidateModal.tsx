'use client'

import { useState, useEffect } from 'react'
import { X, CircleNotch } from '@/components/icons'
import { SECTOR_CATEGORY_MAP } from '@/config/sector-categories'

interface EditCandidateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (updated?: any) => void
  candidate: any
}

const PIPELINE_STAGES = [
  'Applied',
  'Screening',
  'Shortlisted',
  'Interview Scheduled',
  'Technical Interview',
  'HR Interview',
  'Selected',
  'Rejected'
]

export default function EditCandidateModal({ isOpen, onClose, onSuccess, candidate }: EditCandidateModalProps) {
  const [formData, setFormData] = useState({
    age: '',
    sector: '',
    category: '',
    yearsOfExperience: '',
    agent: '',
    stage: 'Applied'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (candidate) {
      setFormData({
        age: candidate.age ? candidate.age.toString() : '',
        sector: candidate.sector || '',
        category: candidate.category || '',
        yearsOfExperience: candidate.yearsOfExperience || '',
        agent: candidate.agent || '',
        stage: candidate.recruitmentStage || candidate.stage || 'Applied'
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
          ...formData,
          recruitmentStage: formData.stage
        })
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to update candidate' }))
        throw new Error(errData.details || errData.error || 'Failed to update candidate')
      }
      const data = await res.json().catch(() => ({}))
      onSuccess(data.candidate)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="bg-white dark:bg-[#16110d] rounded-none w-full max-w-md shadow-2xl flex flex-col border border-[#c8c0af] dark:border-[#3d3329]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-[#c8c0af] dark:border-[#3d3329] bg-[#faf8f5] dark:bg-[#1f1a16]">
          <div>
            <span className="text-[10px] font-jakarta tracking-wider uppercase font-bold text-[#e85d3f]">CANDIDATE PROFILE</span>
            <h2 className="text-base font-bold text-[#191614] dark:text-[#f3eee8] font-sans">Edit Candidate Details</h2>
          </div>
          <button onClick={onClose} className="p-1 text-[#7a7062] hover:text-[#191614] dark:text-[#a89c8e] dark:hover:text-white rounded-none transition-colors cursor-pointer">
            <X weight="bold" className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-jakarta tracking-wider uppercase font-bold text-[#191614] dark:text-[#f3eee8] mb-1">Recruitment Stage / Pipeline</label>
            <select
              className="w-full p-2.5 border border-[#c8c0af] dark:border-[#3d3329] rounded-none text-xs bg-[#faf8f5] dark:bg-[#1a1410] text-[#191614] dark:text-[#f3eee8] focus:border-[#191614] dark:focus:border-[#f3eee8] outline-none font-medium"
              value={formData.stage}
              onChange={(e) => setFormData({...formData, stage: e.target.value})}
            >
              {PIPELINE_STAGES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-jakarta tracking-wider uppercase font-bold text-[#191614] dark:text-[#f3eee8] mb-1">Age</label>
            <input
              type="number"
              className="w-full p-2.5 border border-[#c8c0af] dark:border-[#3d3329] rounded-none text-xs bg-[#faf8f5] dark:bg-[#1a1410] text-[#191614] dark:text-[#f3eee8] focus:border-[#191614] dark:focus:border-[#f3eee8] outline-none"
              value={formData.age}
              onChange={(e) => setFormData({...formData, age: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-xs font-jakarta tracking-wider uppercase font-bold text-[#191614] dark:text-[#f3eee8] mb-1">Category</label>
            <select
              className="w-full p-2.5 border border-[#c8c0af] dark:border-[#3d3329] rounded-none text-xs bg-[#faf8f5] dark:bg-[#1a1410] text-[#191614] dark:text-[#f3eee8] focus:border-[#191614] dark:focus:border-[#f3eee8] outline-none"
              value={formData.sector}
              onChange={(e) => setFormData({...formData, sector: e.target.value, category: ''})}
            >
              <option value="">Select a category</option>
              <option value="Nil">Nil</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-jakarta tracking-wider uppercase font-bold text-[#191614] dark:text-[#f3eee8] mb-1">Sub Category</label>
            <select
              className="w-full p-2.5 border border-[#c8c0af] dark:border-[#3d3329] rounded-none text-xs bg-[#faf8f5] dark:bg-[#1a1410] text-[#191614] dark:text-[#f3eee8] focus:border-[#191614] dark:focus:border-[#f3eee8] outline-none disabled:opacity-50"
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
            <label className="block text-xs font-jakarta tracking-wider uppercase font-bold text-[#191614] dark:text-[#f3eee8] mb-1">Experience</label>
            <select
              className="w-full p-2.5 border border-[#c8c0af] dark:border-[#3d3329] rounded-none text-xs bg-[#faf8f5] dark:bg-[#1a1410] text-[#191614] dark:text-[#f3eee8] focus:border-[#191614] dark:focus:border-[#f3eee8] outline-none"
              value={formData.yearsOfExperience}
              onChange={(e) => setFormData({...formData, yearsOfExperience: e.target.value})}
            >
              <option value="">Select experience</option>
              <option value="Nil">Nil</option>
              {experienceOptions.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-jakarta tracking-wider uppercase font-bold text-[#191614] dark:text-[#f3eee8] mb-1">Agent <span className="text-[#e85d3f]">*</span></label>
            <input
              type="text"
              required
              className={`w-full p-2.5 border rounded-none text-xs bg-[#faf8f5] dark:bg-[#1a1410] text-[#191614] dark:text-[#f3eee8] focus:border-[#191614] dark:focus:border-[#f3eee8] outline-none ${
                formData.agent.trim() ? 'border-[#c8c0af] dark:border-[#3d3329]' : 'border-[#e85d3f]'
              }`}
              value={formData.agent}
              onChange={(e) => setFormData({...formData, agent: e.target.value})}
              placeholder="e.g. Agency or recruiter name"
            />
            {!formData.agent.trim() && <p className="text-[11px] text-[#aa2c1e] dark:text-[#f87171] mt-1">Agent is required</p>}
          </div>
        </div>
        
        <div className="p-5 border-t border-[#c8c0af] dark:border-[#3d3329] bg-[#faf8f5] dark:bg-[#1f1a16] flex justify-end gap-2.5 rounded-none">
          <button
            onClick={onClose}
            className="border border-[#c8c0af] dark:border-[#3d3329] bg-white dark:bg-[#16110d] hover:bg-[#faf8f5] dark:hover:bg-[#1f1a16] text-[#7a7062] dark:text-[#a89c8e] text-xs font-jakarta tracking-wider uppercase font-bold py-2 px-4 rounded-none transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isFormValid || saving}
            className="bg-[#181513] hover:bg-black text-white dark:bg-[#f3eee8] dark:text-[#191614] dark:hover:bg-white text-xs font-jakarta tracking-wider uppercase font-bold py-2 px-5 rounded-none transition-colors flex items-center disabled:opacity-50 cursor-pointer"
          >
            {saving ? <CircleNotch weight="bold" className="w-3.5 h-3.5 mr-2 animate-spin text-[#e85d3f]" /> : null}
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  )
}

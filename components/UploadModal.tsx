'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadSimple, FileText, X, CheckCircle, WarningCircle, CircleNotch, Warning } from '@/components/icons'
import { SECTOR_CATEGORY_MAP } from '@/config/sector-categories'
import Link from 'next/link'

type DuplicateWarning = {
  id: string
  name: string
  matchedOn: 'email' | 'name'
  dismissed?: boolean
}

type UploadItem = {
  id: string
  file: File
  status: 'PENDING' | 'UPLOADING' | 'ANALYZING' | 'EMBEDDING' | 'NEEDS_FORM' | 'FINALIZING' | 'COMPLETED' | 'ERROR'
  candidateId?: string
  suggestedSector?: string
  formData: {
    name: string
    age: string
    sector: string
    category: string
    yearsOfExperience: string
    agent: string
  }
  error?: string
  previewUrl: string
  showErrors: boolean
  duplicateWarning?: DuplicateWarning
}

const FIELD_LABELS = {
  name: 'Name',
  age: 'Age',
  sector: 'Category',
  category: 'Sub Category',
  yearsOfExperience: 'Experience',
  agent: 'Agent',
} as const

type FormErrors = Partial<Record<keyof UploadItem['formData'], string>>

function validateForm(f: UploadItem['formData']): FormErrors {
  const errors: FormErrors = {}
  for (const key of Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]) {
    if (!f[key].trim()) errors[key] = `${FIELD_LABELS[key]} is required`
  }
  if (!errors.age) {
    const age = Number(f.age)
    if (!Number.isInteger(age) || age < 14 || age > 80) errors.age = 'Enter a valid age (14–80)'
  }
  return errors
}

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [items, setItems] = useState<UploadItem[]>([])

  // Files stay in the browser until the user submits the form — nothing is
  // uploaded or saved before that.
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'NEEDS_FORM' as const,
      showErrors: false,
      formData: {
        name: '',
        age: '',
        sector: '',
        category: '',
        yearsOfExperience: '',
        agent: ''
      }
    }))
    setItems(prev => [...prev, ...newItems])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc']
    }
  })

  // Warn about a likely duplicate as soon as a name is typed (nothing is saved yet)
  const checkDuplicate = async (item: UploadItem) => {
    const name = item.formData.name.trim()
    if (!name) return
    try {
      const res = await fetch('/api/candidate/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      if (!res.ok) return
      const data = await res.json()
      updateItem(item.id, {
        duplicateWarning: data.duplicate
          ? { id: data.duplicate.id, name: data.duplicate.name, matchedOn: data.matchedOn }
          : undefined
      })
    } catch {
      // Non-critical: ignore duplicate check errors silently
    }
  }

  // Reset and release preview URLs whenever the modal closes
  useEffect(() => {
    if (!isOpen) {
      setItems(prev => {
        prev.forEach(i => URL.revokeObjectURL(i.previewUrl))
        return []
      })
    }
  }, [isOpen])

  const updateItem = (id: string, updates: Partial<UploadItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
  }

  const updateFormData = (id: string, field: keyof UploadItem['formData'], value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newFormData = { ...item.formData, [field]: value }
        if (field === 'sector') {
          newFormData.category = '' 
        }
        return { ...item, formData: newFormData }
      }
      return item
    }))
  }

  const removeFile = (id: string) => {
    setItems(prev => {
      prev.filter(i => i.id === id).forEach(i => URL.revokeObjectURL(i.previewUrl))
      return prev.filter(i => i.id !== id)
    })
  }

  // The CV is uploaded and the candidate is created only here, in one request
  const submitForm = async (item: UploadItem) => {
    if (Object.keys(validateForm(item.formData)).length > 0) {
      updateItem(item.id, { showErrors: true })
      return
    }

    updateItem(item.id, { status: 'FINALIZING', error: undefined })
    try {
      const body = new FormData()
      body.append('file', item.file)
      Object.entries(item.formData).forEach(([key, value]) => body.append(key, value.trim()))

      const res = await fetch('/api/resume/upload', { method: 'POST', body })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || errData.details || 'Upload failed')
      }
      updateItem(item.id, { status: 'COMPLETED' })
      onSuccess() // Update the dashboard in the background immediately
    } catch (err: any) {
      // Back to the form so the user can fix the problem and retry
      updateItem(item.id, { status: 'NEEDS_FORM', error: err.message })
    }
  }

  const sectors = Object.keys(SECTOR_CATEGORY_MAP)
  const experienceOptions = ['Fresher', '1 year', '2 years', '3 years', '4 years', '5 years', '6 years', '7 years', '8 years', '9 years', '10+ years']

  const allCompleted = items.length > 0 && items.every(i => i.status === 'COMPLETED')

  const handleClose = () => {
    const unsaved = items.filter(i => i.status === 'NEEDS_FORM' || i.status === 'FINALIZING').length
    if (unsaved > 0 && !confirm(
      `${unsaved} CV${unsaved > 1 ? 's have' : ' has'} not been submitted and will be discarded. Close anyway?`
    )) return
    const hasCompleted = items.some(i => i.status === 'COMPLETED')
    if (hasCompleted) {
      onSuccess()
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-gray-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-150 sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div>
            <h2 className="text-2xl font-black text-gray-950 tracking-tight">Upload CVs</h2>
            <p className="text-xs font-medium text-gray-500 mt-1">The CV is saved only after you fill in the details and submit.</p>
          </div>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-950 rounded-full hover:bg-gray-100 transition-colors">
            <X weight="bold" className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
              isDragActive ? 'border-gray-950 bg-gray-100/70 scale-99' : 'border-gray-300 hover:border-gray-900 bg-gray-50/60'
            }`}
          >
            <input {...getInputProps()} />
            <div className="w-12 h-12 rounded-full bg-white shadow-2xs border border-gray-200 flex items-center justify-center mx-auto mb-3 text-gray-600">
              <UploadSimple weight="bold" className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-950">Drag & drop files here</h3>
            <p className="text-xs font-medium text-gray-500 mt-1">or click to browse from your computer</p>
            <p className="text-[11px] font-semibold text-gray-400 mt-3">Supported formats: PDF, DOCX</p>
          </div>

          {items.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-bold text-gray-950">Uploaded Files ({items.length})</h4>
              
              {items.map((item) => {
                const isProcessing = ['PENDING', 'UPLOADING'].includes(item.status)
                const categories = item.formData.sector ? SECTOR_CATEGORY_MAP[item.formData.sector] || [] : []
                const errors = validateForm(item.formData)
                const isFormValid = Object.keys(errors).length === 0
                const inputClass = (field: keyof FormErrors) =>
                  `w-full p-2 border rounded-md text-sm bg-white text-[#24211f] outline-none focus:ring-2 ${
                    item.showErrors && errors[field]
                      ? 'border-[#f9dcd8] focus:ring-[#aa2c1e]/40'
                      : 'border-[#e2dcce] focus:ring-[#e85d3f]/40 focus:border-[#e85d3f]'
                  } disabled:bg-gray-100 disabled:text-gray-400`
                const fieldError = (field: keyof FormErrors) =>
                  item.showErrors && errors[field] ? (
                    <p className="text-xs text-[#aa2c1e] mt-1">{errors[field]}</p>
                  ) : null

                return (
                  <div key={item.id} className="bg-white border border-[#e2dcce] rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText weight="fill" className="h-6 w-6 text-[#e85d3f]" />
                        <div>
                          <p className="text-sm font-medium text-[#24211f]">{item.file.name}</p>
                          <p className="text-xs text-[#7e715f]">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {isProcessing && (
                          <div className="flex items-center text-xs text-[#225178] bg-[#f0f4f8] px-3 py-1 rounded-full font-medium">
                            <CircleNotch weight="bold" className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            {item.status === 'PENDING' && 'Waiting...'}
                            {item.status === 'UPLOADING' && 'Uploading...'}
                          </div>
                        )}
                        {item.status === 'COMPLETED' && (
                          <div className="flex items-center text-xs text-[#24211f] bg-[#fefcf3] border border-[#fbedb8] px-3 py-1 rounded-full font-medium">
                            <CheckCircle weight="fill" className="w-3.5 h-3.5 mr-1.5 text-[#b58933]" />
                            Completed
                          </div>
                        )}
                        {item.status === 'ERROR' && (
                          <div className="flex items-center text-xs text-[#aa2c1e] bg-[#fdf1ef] px-3 py-1 rounded-full font-medium" title={item.error}>
                            <WarningCircle weight="fill" className="w-3.5 h-3.5 mr-1.5" />
                            Error
                          </div>
                        )}
                        
                        {!['COMPLETED', 'FINALIZING', 'UPLOADING'].includes(item.status) && (
                          <button 
                            onClick={() => removeFile(item.id)}
                            className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                          >
                            <X weight="bold" className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {item.error && (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                        <WarningCircle weight="fill" className="w-4 h-4 flex-shrink-0 text-red-500" />
                        <span>{item.error}</span>
                      </div>
                    )}

                    {/* ── Duplicate Warning Banner ── */}
                    {item.duplicateWarning && !item.duplicateWarning.dismissed && (
                      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                        <Warning weight="fill" className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-amber-800">Possible duplicate detected</p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            Matched by <strong>{item.duplicateWarning.matchedOn}</strong> — an existing candidate named{' '}
                            <Link
                              href={`/candidates/${item.duplicateWarning.id}`}
                              target="_blank"
                              className="underline font-semibold hover:text-amber-900"
                            >
                              {item.duplicateWarning.name}
                            </Link>{' '}
                            may already be in the system.
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            updateItem(item.id, {
                              duplicateWarning: { ...item.duplicateWarning!, dismissed: true }
                            })
                          }
                          className="text-amber-400 hover:text-amber-600 flex-shrink-0"
                          title="Dismiss warning"
                        >
                          <X weight="bold" className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {item.status === 'NEEDS_FORM' && (
                      <div className="bg-gray-50 border rounded-lg overflow-hidden mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border-gray-200 h-[500px]">
                          {/* Left Side: Form */}
                          <div className="p-5 flex flex-col h-full overflow-y-auto">
                            <h5 className="text-sm font-bold text-gray-950 mb-4 border-b pb-2">Candidate Details <span className="text-xs font-semibold text-gray-700">(all fields required)</span></h5>
                            
                            <div className="space-y-4 flex-1">
                              <div>
                                <label className="block text-xs font-bold text-gray-800 mb-1">Name <span className="text-red-500">*</span></label>
                                <input
                                  type="text"
                                  required
                                  className={inputClass('name')}
                                  value={item.formData.name}
                                  onChange={(e) => updateFormData(item.id, 'name', e.target.value)}
                                  onBlur={() => checkDuplicate(item)}
                                  placeholder="e.g. John Smith"
                                />
                                {fieldError('name')}
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-gray-800 mb-1">Age <span className="text-red-500">*</span></label>
                                <input
                                  type="number"
                                  required
                                  min={14}
                                  max={80}
                                  className={inputClass('age')}
                                  value={item.formData.age}
                                  onChange={(e) => updateFormData(item.id, 'age', e.target.value)}
                                  placeholder="e.g. 28"
                                />
                                {fieldError('age')}
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-gray-800 mb-1">Category <span className="text-red-500">*</span></label>
                                <select
                                  required
                                  className={inputClass('sector')}
                                  value={item.formData.sector}
                                  onChange={(e) => updateFormData(item.id, 'sector', e.target.value)}
                                >
                                  <option value="">Select a sector</option>
                                  <option value="Nil">Nil</option>
                                  {sectors.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                                {fieldError('sector')}
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-gray-800 mb-1">Sub Category <span className="text-red-500">*</span></label>
                                <select
                                  required
                                  className={inputClass('category')}
                                  value={item.formData.category}
                                  onChange={(e) => updateFormData(item.id, 'category', e.target.value)}
                                  disabled={!item.formData.sector}
                                >
                                  <option value="">{item.formData.sector ? 'Select a category' : 'Select sector first'}</option>
                                  <option value="Nil">Nil</option>
                                  {categories.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                                {fieldError('category')}
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-gray-800 mb-1">Experience <span className="text-red-500">*</span></label>
                                <select
                                  required
                                  className={inputClass('yearsOfExperience')}
                                  value={item.formData.yearsOfExperience}
                                  onChange={(e) => updateFormData(item.id, 'yearsOfExperience', e.target.value)}
                                >
                                  <option value="">Select experience</option>
                                  <option value="Nil">Nil</option>
                                  {experienceOptions.map(e => (
                                    <option key={e} value={e}>{e}</option>
                                  ))}
                                </select>
                                {fieldError('yearsOfExperience')}
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-gray-800 mb-1">Agent <span className="text-red-500">*</span></label>
                                <input
                                  type="text"
                                  required
                                  className={inputClass('agent')}
                                  value={item.formData.agent}
                                  onChange={(e) => updateFormData(item.id, 'agent', e.target.value)}
                                  placeholder="e.g. Agency or recruiter name"
                                />
                                {fieldError('agent')}
                              </div>
                            </div>

                            <div className="mt-5 pt-4 border-t border-gray-150 flex justify-end">
                              <button
                                onClick={() => submitForm(item)}
                                aria-disabled={!isFormValid}
                                className={`w-full bg-[#24211f] hover:bg-black text-white font-bold py-2.5 px-6 text-xs rounded-full shadow-xs transition-all ${isFormValid ? '' : 'opacity-60'}`}
                              >
                                Submit & Save CV
                              </button>
                            </div>
                          </div>

                          {/* Right Side: CV Preview */}
                          <div className="bg-gray-200 h-[500px] hidden md:block">
                            <iframe 
                              src={item.previewUrl} 
                              className="w-full h-full border-none"
                              title="CV Preview"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {item.status === 'FINALIZING' && (
                      <div className="bg-[#faf8f5] border border-[#e2dcce] rounded-lg p-5 mt-4 flex items-center justify-center space-x-2 text-[#7e715f]">
                        <CircleNotch weight="bold" className="w-4 h-4 animate-spin text-[#e85d3f]" />
                        <span className="text-sm">Saving candidate details...</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-[#f0ece1] bg-[#faf8f5] flex justify-end sticky bottom-0 rounded-b-2xl z-10">
           {allCompleted ? (
             <button
               onClick={handleClose}
               className="bg-[#24211f] hover:bg-black text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors"
             >
               Done
             </button>
           ) : (
             <button
               onClick={handleClose}
               className="bg-white border border-[#e2dcce] hover:bg-gray-50 text-[#24211f] font-medium py-2 px-6 rounded-lg shadow-sm transition-colors"
             >
               Close
             </button>
           )}
        </div>
      </div>
    </div>
  )
}

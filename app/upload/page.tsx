'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, File as FileIcon, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { SECTOR_CATEGORY_MAP } from '@/config/sector-categories'
import { useRouter } from 'next/navigation'

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
  }
  error?: string
}

export default function UploadPage() {
  const [items, setItems] = useState<UploadItem[]>([])
  const router = useRouter()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: 'PENDING' as const,
      formData: {
        name: '',
        age: '',
        sector: '',
        category: '',
        yearsOfExperience: ''
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

  const processFile = async (item: UploadItem) => {
    updateItem(item.id, { status: 'UPLOADING' })
    const formData = new FormData()
    formData.append('file', item.file)

    try {
      const res = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const candidateId = data.candidate.id
      const resumeId = data.resume.id

      updateItem(item.id, { status: 'ANALYZING', candidateId })

      const analyzeRes = await fetch('/api/resume/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId })
      })
      if (!analyzeRes.ok) throw new Error('Analyze failed')
      
      const analyzeData = await analyzeRes.json()
      let suggestedSector = ''
      if (analyzeData.candidate && analyzeData.candidate.sector) {
        suggestedSector = analyzeData.candidate.sector
      }

      updateItem(item.id, { status: 'EMBEDDING' })

      const embedRes = await fetch('/api/resume/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId })
      })
      if (!embedRes.ok) throw new Error('Embed failed')

      updateItem(item.id, { 
        status: 'NEEDS_FORM', 
        suggestedSector,
        formData: { ...item.formData, sector: suggestedSector }
      })

    } catch (err: any) {
      updateItem(item.id, { status: 'ERROR', error: err.message })
    }
  }

  // Trigger processing for PENDING items
  useEffect(() => {
    const pendingItems = items.filter(i => i.status === 'PENDING')
    pendingItems.forEach(item => {
      processFile(item)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  const updateItem = (id: string, updates: Partial<UploadItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
  }

  const updateFormData = (id: string, field: keyof UploadItem['formData'], value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newFormData = { ...item.formData, [field]: value }
        if (field === 'sector') {
          newFormData.category = '' // Reset category when sector changes
        }
        return { ...item, formData: newFormData }
      }
      return item
    }))
  }

  const removeFile = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const submitForm = async (item: UploadItem) => {
    updateItem(item.id, { status: 'FINALIZING' })
    try {
      const res = await fetch('/api/candidate/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: item.candidateId,
          ...item.formData
        })
      })
      if (!res.ok) throw new Error('Failed to finalize')
      updateItem(item.id, { status: 'COMPLETED' })
    } catch (err: any) {
      updateItem(item.id, { status: 'ERROR', error: err.message })
    }
  }

  const sectors = Object.keys(SECTOR_CATEGORY_MAP)
  const experienceOptions = ['1 year', '2 years', '3 years', '4 years', '5 years', '6 years', '7 years', '8 years', '9 years', '10+ years']

  const allCompleted = items.length > 0 && items.every(i => i.status === 'COMPLETED')

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Upload Resumes</h1>
          <p className="text-gray-500 mt-2">Upload candidate resumes (PDF or DOCX) to automatically extract their profile.</p>
        </div>
        {allCompleted && (
          <button
            onClick={() => router.push('/candidates')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors"
          >
            View Candidates
          </button>
        )}
      </div>

      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700">Drag & drop files here</h3>
        <p className="text-sm text-gray-500 mt-2">or click to browse from your computer</p>
        <p className="text-xs text-gray-400 mt-4">Supported formats: PDF, DOCX (Max 10MB per file)</p>
      </div>

      {items.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700">Uploaded Files ({items.length})</h4>
          
          {items.map((item) => {
            const isProcessing = ['PENDING', 'UPLOADING', 'ANALYZING', 'EMBEDDING'].includes(item.status)
            const categories = item.formData.sector ? SECTOR_CATEGORY_MAP[item.formData.sector] || [] : []
            const isFormValid = item.formData.name && item.formData.age && item.formData.sector && item.formData.category && item.formData.yearsOfExperience

            return (
              <div key={item.id} className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileIcon className="h-6 w-6 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.file.name}</p>
                      <p className="text-xs text-gray-500">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {isProcessing && (
                      <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {item.status === 'PENDING' && 'Waiting...'}
                        {item.status === 'UPLOADING' && 'Uploading...'}
                        {item.status === 'ANALYZING' && 'AI Analyzing...'}
                        {item.status === 'EMBEDDING' && 'Embedding...'}
                      </div>
                    )}
                    {item.status === 'COMPLETED' && (
                      <div className="flex items-center text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Completed
                      </div>
                    )}
                    {item.status === 'ERROR' && (
                      <div className="flex items-center text-sm text-red-700 bg-red-50 px-3 py-1 rounded-full">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Error
                      </div>
                    )}
                    
                    {!['COMPLETED', 'FINALIZING', 'UPLOADING', 'ANALYZING', 'EMBEDDING'].includes(item.status) && (
                      <button 
                        onClick={() => removeFile(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Remove file"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>

                {item.status === 'NEEDS_FORM' && (
                  <div className="bg-gray-50 border rounded-lg p-5 mt-4">
                    <h5 className="text-sm font-semibold text-gray-800 mb-4 border-b pb-2">Candidate Details Required</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input
                          type="text"
                          className="w-full p-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          value={item.formData.name}
                          onChange={(e) => updateFormData(item.id, 'name', e.target.value)}
                          placeholder="e.g. John Smith"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                        <input
                          type="number"
                          min="18"
                          max="100"
                          className="w-full p-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          value={item.formData.age}
                          onChange={(e) => updateFormData(item.id, 'age', e.target.value)}
                          placeholder="e.g. 28"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sector * {item.suggestedSector && <span className="text-xs text-blue-600 ml-1 font-normal">(AI Suggested)</span>}</label>
                        <select
                          className="w-full p-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          value={item.formData.sector}
                          onChange={(e) => updateFormData(item.id, 'sector', e.target.value)}
                        >
                          <option value="">Select a sector</option>
                          {sectors.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                        <select
                          className="w-full p-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                          value={item.formData.category}
                          onChange={(e) => updateFormData(item.id, 'category', e.target.value)}
                          disabled={!item.formData.sector}
                        >
                          <option value="">{item.formData.sector ? 'Select a category' : 'Select sector first'}</option>
                          {categories.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Experience *</label>
                        <select
                          className="w-full p-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          value={item.formData.yearsOfExperience}
                          onChange={(e) => updateFormData(item.id, 'yearsOfExperience', e.target.value)}
                        >
                          <option value="">Select experience</option>
                          {experienceOptions.map(e => (
                            <option key={e} value={e}>{e}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <button
                        onClick={() => submitForm(item)}
                        disabled={!isFormValid}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Submit & Finalize
                      </button>
                    </div>
                  </div>
                )}
                
                {item.status === 'FINALIZING' && (
                  <div className="bg-gray-50 border rounded-lg p-5 mt-4 flex items-center justify-center space-x-2 text-gray-600">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <span>Saving candidate details...</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

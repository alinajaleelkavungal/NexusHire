'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Briefcase, MapPin, Loader2, FileText, ChevronRight } from '@/components/icons'

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [rawJD, setRawJD] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs')
      const data = await res.json()
      if (data.success) {
        setJobs(data.jobs)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rawJD.trim()) return

    setAnalyzing(true)
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawJD })
      })
      const data = await res.json()
      if (data.success) {
        setShowModal(false)
        setRawJD('')
        fetchJobs() // refresh list
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Job Matching</h1>
          <p className="text-gray-500 mt-2">Manage open roles and discover the best candidate matches using AI.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg shadow-sm transition-colors flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Job Description
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.length === 0 ? (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl bg-gray-50">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Jobs Found</h3>
              <p className="text-gray-500 mt-1">Upload or paste your first Job Description to start matching candidates.</p>
            </div>
          ) : (
            jobs.map(job => (
              <Link key={job.id} href={`/recruitment/jobs/${job.id}`}>
                <div className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1">{job.jobTitle}</h3>
                  <div className="flex items-center text-gray-500 text-sm mb-4">
                    <MapPin className="w-4 h-4 mr-1" />
                    {job.location || 'Remote / Unspecified'}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6 h-14 overflow-hidden">
                    {JSON.parse(job.requiredSkills || '[]').slice(0, 4).map((skill: string, i: number) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-blue-600 text-sm font-medium border-t pt-4">
                    <span>View Matches</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Add New Job Description</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleCreateJob} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 flex-1 overflow-y-auto">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Paste Job Description Text</label>
                <p className="text-sm text-gray-500 mb-4">Our AI will automatically parse the title, requirements, skills, and experience to build a semantic profile for matching.</p>
                <textarea 
                  value={rawJD}
                  onChange={e => setRawJD(e.target.value)}
                  placeholder="Paste the full job description here..."
                  className="w-full h-64 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-sm text-gray-900"
                  required
                />
              </div>
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={analyzing || !rawJD.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {analyzing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  {analyzing ? 'AI Analyzing...' : 'Analyze & Save JD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

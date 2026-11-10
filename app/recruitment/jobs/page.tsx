'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Jobs, MapPin, CircleNotch, FileText, ArrowRight, X, WarningCircle, Buildings } from '@/components/icons'

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [rawJD, setRawJD] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      console.error('Failed to fetch jobs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rawJD.trim()) return

    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawJD.trim() })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setShowModal(false)
        setRawJD('')
        fetchJobs() // refresh list
      } else {
        setError(data.error || 'Failed to analyze and save job description. Please try again.')
      }
    } catch (err: any) {
      console.error('Job creation error:', err)
      setError(err?.message || 'Network error occurred. Please check your connection and try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 select-none">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1">
            <span className="text-[10px] sm:text-[11px] font-jakarta tracking-[0.2em] uppercase font-bold text-[#e85d3f]">
              AI VACANCY MATCHING
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-black text-[#191614] dark:text-[#f3eee8] tracking-tight leading-none mt-1 mb-2 font-sans"
            style={{ fontFamily: 'var(--font-satoshi), sans-serif' }}
          >
            Job Descriptions
          </h1>
          <p className="text-sm font-medium text-[#6b6257] dark:text-[#a89c8e]">
            Manage open positions and match them against candidates in your CV database.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null)
            setShowModal(true)
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#181513] hover:bg-black text-white dark:bg-[#f3eee8] dark:text-[#191614] dark:hover:bg-white text-xs font-jakarta tracking-wider uppercase font-bold rounded-sm shadow-2xs hover:shadow transition-all active:scale-98 cursor-pointer"
        >
          <Plus weight="bold" className="w-3.5 h-3.5" />
          <span>Add Job Description</span>
        </button>
      </div>

      {/* Main Content Stage */}
      {loading ? (
        <div className="border border-[#c8c0af] dark:border-[#3d3329] bg-white dark:bg-[#16110d] p-16 flex flex-col items-center justify-center text-center rounded-sm">
          <CircleNotch weight="bold" className="w-6 h-6 animate-spin text-[#e85d3f] mb-3" />
          <p className="text-xs font-jakarta uppercase tracking-wider text-[#7a7062] dark:text-[#a89c8e]">Loading positions...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="border border-dashed border-[#c8c0af] dark:border-[#3d3329] bg-white dark:bg-[#16110d] p-16 text-center rounded-sm">
          <div className="w-12 h-12 rounded-sm bg-[#faf8f5] dark:bg-[#1f1a16] border border-[#c8c0af] dark:border-[#3d3329] text-[#e85d3f] flex items-center justify-center mx-auto mb-4">
            <FileText weight="bold" className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#191614] dark:text-[#f3eee8] mb-1 font-sans">No Job Descriptions Added</h3>
          <p className="text-xs text-[#7a7062] dark:text-[#a89c8e] max-w-md mx-auto mb-6">
            Paste an open job requirement or role title to automatically match against your candidate resumes.
          </p>
          <button
            onClick={() => {
              setError(null)
              setShowModal(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#181513] hover:bg-black text-white dark:bg-[#f3eee8] dark:text-[#191614] dark:hover:bg-white text-xs font-jakarta tracking-wider uppercase font-bold rounded-sm transition-all cursor-pointer"
          >
            <Plus weight="bold" className="w-3.5 h-3.5" />
            <span>Add First Job Description</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map(job => {
            let requiredSkills: string[] = []
            try {
              requiredSkills = JSON.parse(job.requiredSkills || '[]')
            } catch {
              requiredSkills = []
            }

            return (
              <Link key={job.id} href={`/recruitment/jobs/${job.id}`} className="group">
                <div className="border border-[#c8c0af] dark:border-[#3d3329] bg-white dark:bg-[#16110d] hover:border-[#191614] dark:hover:border-[#f3eee8] rounded-sm p-5 flex flex-col justify-between h-full transition-all group-hover:shadow-sm">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="w-9 h-9 rounded-sm bg-[#faf8f5] dark:bg-[#1f1a16] border border-[#c8c0af] dark:border-[#3d3329] text-[#e85d3f] flex items-center justify-center shrink-0">
                        <Jobs weight="bold" className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-jakarta tracking-wider uppercase font-semibold text-[#8a7f70] dark:text-[#6b6055] tabular-nums">
                        {new Date(job.createdAt).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#191614] dark:text-[#f3eee8] group-hover:text-[#e85d3f] transition-colors line-clamp-1 font-sans">
                      {job.jobTitle}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-[#7a7062] dark:text-[#a89c8e] mt-1.5 mb-4">
                      {job.company && (
                        <span className="flex items-center gap-1 truncate">
                          <Buildings weight="bold" className="w-3.5 h-3.5 text-[#8a7f70] shrink-0" />
                          <span className="truncate">{job.company}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1 truncate">
                        <MapPin weight="bold" className="w-3.5 h-3.5 text-[#8a7f70] shrink-0" />
                        <span className="truncate">{job.location || 'Remote / Unspecified'}</span>
                      </span>
                    </div>

                    {/* Skill Badges */}
                    {requiredSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4 max-h-16 overflow-hidden">
                        {requiredSkills.slice(0, 4).map((skill, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-jakarta tracking-wider uppercase font-semibold bg-[#faf8f5] dark:bg-[#1f1a16] border border-[#c8c0af] dark:border-[#3d3329] text-[#5d5244] dark:text-[#c4b5a3] px-2 py-0.5 rounded-sm"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#c8c0af] dark:border-[#3d3329] flex items-center justify-between text-xs font-jakarta tracking-wider uppercase font-bold text-[#191614] dark:text-[#f3eee8] group-hover:text-[#e85d3f] transition-colors">
                    <span>View Candidate Matches</span>
                    <ArrowRight weight="bold" className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Add Job Description Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#16110d] border border-[#c8c0af] dark:border-[#3d3329] rounded-sm shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 border-b border-[#c8c0af] dark:border-[#3d3329] flex justify-between items-center bg-[#faf8f5] dark:bg-[#1f1a16]">
              <div>
                <span className="text-[10px] font-jakarta tracking-wider uppercase font-bold text-[#e85d3f]">NEW POSITION</span>
                <h2 className="text-sm sm:text-base font-bold text-[#191614] dark:text-[#f3eee8] font-sans">Add Job Description</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#7a7062] hover:text-[#191614] dark:text-[#a89c8e] dark:hover:text-white p-1 rounded-sm transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X weight="bold" className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-4">
                {error && (
                  <div className="p-3 rounded-sm bg-[#fbf2f2] dark:bg-[#2a1616] border border-[#e0b4b4] dark:border-[#522525] text-[#aa2c1e] dark:text-[#f87171] text-xs font-medium flex items-center gap-2">
                    <WarningCircle weight="bold" className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-jakarta tracking-wider uppercase font-bold text-[#191614] dark:text-[#f3eee8] mb-1">
                    Paste Job Description or Role Details
                  </label>
                  <p className="text-xs text-[#7a7062] dark:text-[#a89c8e] mb-3">
                    Paste a full job specification or enter a role title (e.g. &quot;Eye Specialist Doctor with 3+ years experience in clinical ophthalmology&quot;). AI will structure and index it for candidate matching.
                  </p>

                  <textarea
                    value={rawJD}
                    onChange={e => {
                      setRawJD(e.target.value)
                      if (error) setError(null)
                    }}
                    placeholder="Paste the job description here, or enter role details (e.g., Job Title, Requirements, Skills, Location)..."
                    className="w-full h-64 p-4 border border-[#c8c0af] dark:border-[#3a3028] bg-[#faf8f5] dark:bg-[#1a1410] text-[#191614] dark:text-[#f3eee8] rounded-sm focus:outline-none focus:border-[#e85d3f] focus:ring-1 focus:ring-[#e85d3f]/30 resize-none text-sm font-sans placeholder:text-[#a89c8e] transition-all shadow-2xs"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-[#c8c0af] dark:border-[#3d3329] bg-[#faf8f5] dark:bg-[#1f1a16] flex justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={analyzing}
                  className="px-4 py-2 border border-[#c8c0af] dark:border-[#3d3329] rounded-sm text-xs font-jakarta tracking-wider uppercase font-bold text-[#7a7062] dark:text-[#a89c8e] hover:bg-white dark:hover:bg-[#251f1a] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={analyzing || !rawJD.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#181513] hover:bg-black text-white dark:bg-[#f3eee8] dark:text-[#191614] dark:hover:bg-white text-xs font-jakarta tracking-wider uppercase font-bold rounded-sm shadow-2xs hover:shadow transition-all disabled:opacity-50 cursor-pointer"
                >
                  {analyzing && <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin text-[#e85d3f]" />}
                  <span>{analyzing ? 'AI Analyzing & Saving...' : 'Analyze & Save JD'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

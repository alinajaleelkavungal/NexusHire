'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CircleNotch, ArrowLeft, Buildings, MapPin, Jobs, CaretDown, CaretUp, UserCircle, WarningCircle, CheckCircle, XCircle } from '@/components/icons'

export default function JobMatchDashboard() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [job, setJob] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchJobDetailsAndMatches()
    }
  }, [id])

  const fetchJobDetailsAndMatches = async () => {
    try {
      const jobRes = await fetch('/api/jobs')
      const jobData = await jobRes.json()
      if (jobData.success) {
        const foundJob = jobData.jobs.find((j: any) => j.id === id)
        if (foundJob) setJob(foundJob)
      }

      const matchRes = await fetch(`/api/jobs/${id}/matches`)
      const matchData = await matchRes.json()
      if (matchData.success) {
        setMatches(matchData.results || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 select-none">
        <div className="w-12 h-12 rounded-sm bg-[#faf8f5] dark:bg-[#1f1a16] border border-[#c8c0af] dark:border-[#3d3329] flex items-center justify-center">
          <CircleNotch weight="bold" className="w-6 h-6 text-[#e85d3f] animate-spin" />
        </div>
        <h2 className="text-base font-bold text-[#191614] dark:text-[#f3eee8] font-sans">AI Match Engine Running</h2>
        <p className="text-xs text-[#7a7062] dark:text-[#a89c8e]">Calculating semantic similarity and skill gap analysis across resumes...</p>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="p-8 text-center select-none">
        <h1 className="text-xl font-bold text-[#191614] dark:text-[#f3eee8] font-sans">Job Description Not Found</h1>
        <button
          onClick={() => router.push('/recruitment/jobs')}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 border border-[#c8c0af] dark:border-[#3d3329] rounded-sm text-xs font-jakarta tracking-wider uppercase font-bold text-[#191614] dark:text-[#f3eee8] hover:bg-[#faf8f5] dark:hover:bg-[#1a1410] transition-colors cursor-pointer"
        >
          <ArrowLeft weight="bold" className="w-3.5 h-3.5" />
          <span>Return to Jobs</span>
        </button>
      </div>
    )
  }

  let requiredSkills: string[] = []
  try {
    requiredSkills = JSON.parse(job.requiredSkills || '[]')
  } catch {
    requiredSkills = []
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 select-none">
      {/* Header */}
      <div>
        <Link
          href="/recruitment/jobs"
          className="text-xs font-jakarta tracking-wider uppercase font-bold text-[#7a7062] dark:text-[#a89c8e] hover:text-[#191614] dark:hover:text-[#f3eee8] inline-flex items-center gap-1.5 mb-3 transition-colors"
        >
          <ArrowLeft weight="bold" className="w-3.5 h-3.5" /> Back to Jobs
        </Link>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1
            className="text-2xl sm:text-3xl font-black text-[#191614] dark:text-[#f3eee8] tracking-tight leading-none font-sans"
            style={{ fontFamily: 'var(--font-satoshi), sans-serif' }}
          >
            AI Candidate Matcher
          </h1>
          <span className="text-xs font-jakarta uppercase tracking-wider text-[#e85d3f] font-bold">
            Semantic Vector Analysis
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Job Profile */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-[#16110d] p-5 sm:p-6 rounded-sm border border-[#c8c0af] dark:border-[#3d3329] sticky top-6">
            <span className="text-[10px] font-jakarta tracking-wider uppercase font-bold text-[#7a7062] dark:text-[#a89c8e] block mb-1">
              TARGET ROLE
            </span>
            <h2 className="text-lg font-bold text-[#191614] dark:text-[#f3eee8] mb-3 font-sans">{job.jobTitle}</h2>

            <div className="space-y-2 mb-5 pb-5 border-b border-[#c8c0af] dark:border-[#3d3329]">
              {job.company && (
                <div className="flex items-center text-xs font-medium text-[#7a7062] dark:text-[#a89c8e]">
                  <Buildings weight="bold" className="w-3.5 h-3.5 mr-2 text-[#8a7f70] shrink-0" />
                  <span>{job.company}</span>
                </div>
              )}
              {job.location && (
                <div className="flex items-center text-xs font-medium text-[#7a7062] dark:text-[#a89c8e]">
                  <MapPin weight="bold" className="w-3.5 h-3.5 mr-2 text-[#8a7f70] shrink-0" />
                  <span>{job.location}</span>
                </div>
              )}
              {job.employmentType && (
                <div className="flex items-center text-xs font-medium text-[#7a7062] dark:text-[#a89c8e]">
                  <Jobs weight="bold" className="w-3.5 h-3.5 mr-2 text-[#8a7f70] shrink-0" />
                  <span>{job.employmentType}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-[10px] font-jakarta uppercase tracking-wider font-bold text-[#7a7062] dark:text-[#a89c8e] mb-2">
                  Required Skills
                </h3>
                {requiredSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {requiredSkills.map((s: string, i: number) => (
                      <span
                        key={i}
                        className="text-[10px] font-jakarta uppercase tracking-wider font-semibold bg-[#faf8f5] dark:bg-[#1f1a16] border border-[#c8c0af] dark:border-[#3d3329] text-[#5d5244] dark:text-[#c4b5a3] px-2 py-0.5 rounded-sm"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8a7f70] italic">General role requirements</p>
                )}
              </div>

              <div>
                <h3 className="text-[10px] font-jakarta uppercase tracking-wider font-bold text-[#7a7062] dark:text-[#a89c8e] mb-1">
                  Experience
                </h3>
                <p className="text-xs font-semibold text-[#191614] dark:text-[#f3eee8]">
                  {job.minimumExperience || 'Flexible / Not specified'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Matches */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-[#c8c0af] dark:border-[#3d3329]">
            <h2 className="text-xs font-jakarta tracking-wider uppercase font-bold text-[#7a7062] dark:text-[#a89c8e]">
              Top Candidate Matches ({matches.length})
            </h2>
            <span className="text-[10px] font-jakarta uppercase tracking-wider text-[#8a7f70] dark:text-[#6b6055]">
              Ranked by AI Fit Score
            </span>
          </div>

          {matches.length === 0 ? (
            <div className="bg-white dark:bg-[#16110d] p-12 text-center rounded-sm border border-dashed border-[#c8c0af] dark:border-[#3d3329]">
              <WarningCircle weight="bold" className="w-10 h-10 text-[#a89c8e] mx-auto mb-3" />
              <h3 className="text-sm font-bold text-[#191614] dark:text-[#f3eee8] font-sans">No Suitable Matches Yet</h3>
              <p className="text-xs text-[#7a7062] dark:text-[#a89c8e] mt-1 max-w-sm mx-auto">
                Upload more resumes to your CV pool or adjust the job role criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map(match => (
                <div
                  key={match.candidateId}
                  className="bg-white dark:bg-[#16110d] rounded-sm border border-[#c8c0af] dark:border-[#3d3329] overflow-hidden transition-all hover:border-[#191614] dark:hover:border-[#f3eee8]"
                >
                  {/* Collapsed Card */}
                  <div
                    className="p-5 cursor-pointer flex items-start justify-between gap-4"
                    onClick={() => setExpandedMatch(expandedMatch === match.candidateId ? null : match.candidateId)}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-sm bg-[#faf8f5] dark:bg-[#1f1a16] border border-[#c8c0af] dark:border-[#3d3329] text-[#e85d3f] flex items-center justify-center shrink-0">
                        <UserCircle weight="bold" className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-[#191614] dark:text-[#f3eee8] font-sans">
                          {match.candidateName}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[#7a7062] dark:text-[#a89c8e]">
                          <span>{match.jobCategory || 'General'}</span>
                          <span className="opacity-40">·</span>
                          <span>{match.experienceLevel || 'Experience on record'}</span>
                        </div>

                        {/* Recommendation Badge */}
                        <div className="mt-2.5">
                          <span
                            className={`text-[10px] font-jakarta tracking-wider uppercase font-bold px-2 py-0.5 rounded-sm border ${
                              match.recommendationLabel === 'Highly Recommended'
                                ? 'border-[#c4dec4] dark:border-[#224422] bg-[#f2f8f2] dark:bg-[#142614] text-[#22632e] dark:text-[#4ade80]'
                                : match.recommendationLabel === 'Recommended'
                                ? 'border-[#c8d8ea] dark:border-[#1e344a] bg-[#f0f6fc] dark:bg-[#101e2a] text-[#205888] dark:text-[#60a5fa]'
                                : match.recommendationLabel === 'Potential Candidate'
                                ? 'border-[#ecdca8] dark:border-[#4d3e18] bg-[#fcf9ee] dark:bg-[#251e0c] text-[#8e6815] dark:text-[#facc15]'
                                : 'border-[#e0b4b4] dark:border-[#522525] bg-[#fbf2f2] dark:bg-[#2a1616] text-[#aa2c1e] dark:text-[#f87171]'
                            }`}
                          >
                            {match.recommendationLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <span className="block text-[10px] font-jakarta font-bold uppercase tracking-wider text-[#7a7062] dark:text-[#a89c8e] mb-0.5">
                          Match Score
                        </span>
                        <span
                          className={`text-2xl sm:text-3xl font-black tabular-nums font-sans ${
                            match.matchScore >= 80 ? 'text-[#22632e] dark:text-[#4ade80]' : match.matchScore >= 60 ? 'text-[#e85d3f]' : 'text-[#7a7062]'
                          }`}
                        >
                          {match.matchScore}%
                        </span>
                      </div>
                      {expandedMatch === match.candidateId ? (
                        <CaretUp weight="bold" className="w-4 h-4 text-[#7a7062]" />
                      ) : (
                        <CaretDown weight="bold" className="w-4 h-4 text-[#7a7062]" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content: AI Reasoning & Skill Gap */}
                  {expandedMatch === match.candidateId && (
                    <div className="border-t border-[#c8c0af] dark:border-[#3d3329] bg-[#faf8f5] dark:bg-[#1a1410] p-5 space-y-5">
                      <div>
                        <h4 className="text-[10px] font-jakarta font-bold uppercase tracking-wider text-[#7a7062] dark:text-[#a89c8e] mb-2.5">
                          AI Match Reasoning
                        </h4>
                        <ul className="space-y-1.5">
                          {(match.reasons || []).map((reason: string, i: number) => (
                            <li key={i} className="flex items-start text-xs text-[#191614] dark:text-[#f3eee8]">
                              <CheckCircle weight="fill" className="w-3.5 h-3.5 text-[#22632e] dark:text-[#4ade80] mr-2 mt-0.5 shrink-0" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-[10px] font-jakarta font-bold uppercase tracking-wider text-[#7a7062] dark:text-[#a89c8e] mb-2">
                            Skill Gap Analysis (Missing)
                          </h4>
                          {match.missingSkills && match.missingSkills.length > 0 ? (
                            <ul className="space-y-1">
                              {match.missingSkills.map((skill: string, i: number) => (
                                <li key={i} className="flex items-center text-xs text-[#aa2c1e] dark:text-[#f87171]">
                                  <XCircle weight="fill" className="w-3.5 h-3.5 mr-2 shrink-0" />
                                  <span>{skill}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-[#7a7062] dark:text-[#a89c8e] italic">No major skill gaps identified.</p>
                          )}
                        </div>

                        <div>
                          <h4 className="text-[10px] font-jakarta font-bold uppercase tracking-wider text-[#7a7062] dark:text-[#a89c8e] mb-2">
                            Recommended to Learn
                          </h4>
                          {match.recommendedSkillsToLearn && match.recommendedSkillsToLearn.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {match.recommendedSkillsToLearn.map((skill: string, i: number) => (
                                <span
                                  key={i}
                                  className="text-[10px] font-jakarta uppercase tracking-wider bg-white dark:bg-[#16110d] border border-[#c8c0af] dark:border-[#3d3329] text-[#7a7062] dark:text-[#a89c8e] px-2 py-0.5 rounded-sm"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-[#7a7062] dark:text-[#a89c8e] italic">None required.</p>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#c8c0af] dark:border-[#3d3329] flex justify-end">
                        <Link
                          href={`/candidates/${match.candidateId}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#181513] hover:bg-black text-white dark:bg-[#f3eee8] dark:text-[#191614] dark:hover:bg-white text-xs font-jakarta tracking-wider uppercase font-bold rounded-sm transition-all"
                        >
                          <span>View Full Candidate Profile</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

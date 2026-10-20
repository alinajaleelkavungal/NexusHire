'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowLeft, Building2, MapPin, Briefcase, ChevronDown, ChevronUp, UserCircle, Star, AlertCircle, CheckCircle2, XCircle } from '@/components/icons'

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
      // We can fetch the job list just to get the specific job details quickly
      const jobRes = await fetch('/api/jobs')
      const jobData = await jobRes.json()
      if (jobData.success) {
        const foundJob = jobData.jobs.find((j: any) => j.id === id)
        if (foundJob) setJob(foundJob)
      }

      const matchRes = await fetch(`/api/jobs/${id}/matches`)
      const matchData = await matchRes.json()
      if (matchData.success) {
        setMatches(matchData.results)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
          <Star className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">AI Match Engine Running</h2>
        <p className="text-gray-500">Calculating semantic similarity and analyzing skill gaps...</p>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Job Not Found</h1>
        <button onClick={() => router.push('/recruitment/jobs')} className="mt-4 text-blue-600 hover:underline">Return to Jobs</button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <Link href="/recruitment/jobs" className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Jobs
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">AI Candidate Matcher</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Job Profile */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border shadow-sm sticky top-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{job.jobTitle}</h2>
            
            <div className="space-y-3 mb-6">
              {job.company && (
                <div className="flex items-center text-gray-600 text-sm">
                  <Building2 className="w-4 h-4 mr-2 text-gray-400" /> {job.company}
                </div>
              )}
              {job.location && (
                <div className="flex items-center text-gray-600 text-sm">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" /> {job.location}
                </div>
              )}
              {job.employmentType && (
                <div className="flex items-center text-gray-600 text-sm">
                  <Briefcase className="w-4 h-4 mr-2 text-gray-400" /> {job.employmentType}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {JSON.parse(job.requiredSkills || '[]').map((s: string, i: number) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-1 rounded-md">{s}</span>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Experience</h3>
                <p className="text-sm text-gray-600">{job.minimumExperience || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Matches */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Matches ({matches.length})</h2>
          </div>

          {matches.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border shadow-sm">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Suitable Matches</h3>
              <p className="text-gray-500 mt-1">Upload more resumes to build your candidate pool.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <div key={match.candidateId} className="bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md">
                  {/* Collapsed Card */}
                  <div 
                    className="p-6 cursor-pointer flex items-start justify-between"
                    onClick={() => setExpandedMatch(expandedMatch === match.candidateId ? null : match.candidateId)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="bg-gray-100 p-3 rounded-full mt-1">
                        <UserCircle className="w-6 h-6 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{match.candidateName}</h3>
                        <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
                          <span>{match.jobCategory || 'Uncategorized'}</span>
                          <span>•</span>
                          <span>{match.experienceLevel || 'Unknown Experience'}</span>
                        </div>
                        
                        {/* Recommendation Badge */}
                        <div className="mt-3 inline-block">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            match.recommendationLabel === 'Highly Recommended' ? 'bg-green-100 text-green-700 border border-green-200' :
                            match.recommendationLabel === 'Recommended' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                            match.recommendationLabel === 'Potential Candidate' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                            'bg-red-100 text-red-700 border border-red-200'
                          }`}>
                            {match.recommendationLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <span className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Match Score</span>
                        <span className={`text-3xl font-bold ${match.matchScore >= 80 ? 'text-green-600' : match.matchScore >= 60 ? 'text-yellow-600' : 'text-gray-900'}`}>
                          {match.matchScore}%
                        </span>
                      </div>
                      {expandedMatch === match.candidateId ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded Content: AI Reasoning & Skill Gap */}
                  {expandedMatch === match.candidateId && (
                    <div className="border-t bg-gray-50 p-6 space-y-6">
                      
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">AI Match Reasoning</h4>
                        <ul className="space-y-2">
                          {match.reasons.map((reason: string, i: number) => (
                            <li key={i} className="flex items-start text-sm text-gray-700">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Skill Gap Analysis (Missing)</h4>
                          {match.missingSkills && match.missingSkills.length > 0 ? (
                            <ul className="space-y-2">
                              {match.missingSkills.map((skill: string, i: number) => (
                                <li key={i} className="flex items-center text-sm text-red-700">
                                  <XCircle className="w-4 h-4 text-red-500 mr-2" />
                                  {skill}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No major missing skills identified.</p>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Recommended to Learn</h4>
                          {match.recommendedSkillsToLearn && match.recommendedSkillsToLearn.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {match.recommendedSkillsToLearn.map((skill: string, i: number) => (
                                <span key={i} className="text-xs bg-gray-200 text-gray-700 font-medium px-2.5 py-1 rounded-md">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">None</p>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t flex justify-end">
                        <Link 
                          href={`/candidates/${match.candidateId}`}
                          className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-6 rounded-lg shadow-sm transition-colors text-sm"
                        >
                          View Full Candidate Profile
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

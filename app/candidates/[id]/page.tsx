import prisma from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { getSession, canAccessCandidate } from '@/lib/auth'
import { Mail, Phone, MapPin, ClipboardList, FileText, ExternalLink, Calendar, Briefcase, LayoutGrid } from '@/components/icons'

export default async function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession()
  if (!session) redirect('/login')
  // Other branches' candidates look exactly like missing ones
  if (!(await canAccessCandidate(session, id))) notFound()

  // Use raw SQL to bypass the outdated Prisma Client which drops newly added columns
  const candidatesRaw = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM Candidate WHERE id = ?`, id)
  
  if (!candidatesRaw || candidatesRaw.length === 0) {
    notFound()
  }

  const rawCandidate = candidatesRaw[0]
  const candidateResumes = await prisma.resume.findMany({ where: { candidateId: rawCandidate.id } })
  
  const candidate = {
    ...rawCandidate,
    createdAt: new Date(rawCandidate.createdAt),
    updatedAt: new Date(rawCandidate.updatedAt),
    resumes: candidateResumes
  }



  const uploadDate = new Date(candidate.createdAt).toLocaleString('default', { 
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true 
  })

  return (
    <div className="w-full h-full p-8 bg-gray-50 min-h-screen text-gray-900 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{candidate.name}</h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
              {candidate.email && (
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-1.5 text-gray-400" />
                  {candidate.email}
                </div>
              )}
              {candidate.phone && (
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-1.5 text-gray-400" />
                  {candidate.phone}
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1.5 text-gray-400" />
                  {candidate.location}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200">
              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
              Uploaded: {uploadDate}
            </div>
          </div>
        </div>

        {/* Main Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Intake Details */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center pb-4 border-b border-gray-100">
                <ClipboardList className="w-5 h-5 mr-2 text-green-600" />
                Intake Details
              </h2>
              
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1 flex items-center">
                    <Calendar className="w-4 h-4 mr-1.5 text-gray-400" />
                    Age
                  </p>
                  <p className="text-base text-gray-900 font-medium">{candidate.age ? `${candidate.age} Years Old` : 'Not Specified'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1 flex items-center">
                    <LayoutGrid className="w-4 h-4 mr-1.5 text-gray-400" />
                    Sector
                  </p>
                  <p className="text-base text-gray-900 font-medium">{candidate.sector || 'Not Specified'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1 flex items-center">
                    <FileText className="w-4 h-4 mr-1.5 text-gray-400" />
                    Job Category
                  </p>
                  <p className="text-base text-gray-900 font-medium">{candidate.category || 'Not Specified'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1 flex items-center">
                    <Briefcase className="w-4 h-4 mr-1.5 text-gray-400" />
                    Experience
                  </p>
                  <p className="text-base text-gray-900 font-medium">{candidate.yearsOfExperience || 'Not Specified'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Embedded CV */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-600" />
                  Candidate CV
                </h2>
                {candidate.resumes.length > 0 && (
                  <a 
                    href={`/api/resume/file/${candidate.resumes[0].id}`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors text-sm font-medium border border-green-200"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </a>
                )}
              </div>
              
              <div className="flex-1 min-h-[800px] bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                {candidate.resumes.length > 0 ? (
                  <iframe 
                    src={`/api/resume/file/${candidate.resumes[0].id}#toolbar=0`} 
                    className="w-full h-full min-h-[800px]"
                    title="CV Viewer"
                  />
                ) : (
                  <div className="w-full h-full min-h-[800px] flex flex-col items-center justify-center text-gray-400">
                    <FileText className="w-16 h-16 mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No CV Document Uploaded</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

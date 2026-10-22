import prisma from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { getSession, canAccessCandidate } from '@/lib/auth'
import { Envelope, Phone, MapPin, ClipboardText, FileText, ArrowSquareOut, CalendarBlank, Briefcase, SquaresFour } from '@/components/icons'

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
    <div className="w-full h-full p-4 sm:p-8 min-h-screen text-gray-950 font-sans select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="vertix-card bg-white rounded-3xl shadow-[0_2px_14px_-3px_rgba(0,0,0,0.04)] border border-gray-200/80 p-6 sm:p-8 flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-950 tracking-tight">{candidate.name}</h1>
            <div className="mt-2.5 flex flex-wrap gap-4 text-xs font-semibold text-gray-500">
              {candidate.email && (
                <div className="flex items-center">
                  <Envelope weight="bold" className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                  {candidate.email}
                </div>
              )}
              {candidate.phone && (
                <div className="flex items-center">
                  <Phone weight="bold" className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                  {candidate.phone}
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center">
                  <MapPin weight="bold" className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                  {candidate.location}
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="inline-flex items-center bg-gray-50 text-gray-700 px-4 py-1.5 rounded-full text-xs font-semibold border border-gray-200/90 shadow-2xs">
              <CalendarBlank weight="bold" className="w-3.5 h-3.5 mr-2 text-gray-400" />
              Uploaded: {uploadDate}
            </div>
          </div>
        </div>

        {/* Main Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Intake Details */}
          <div className="lg:col-span-1 space-y-6">
            <div className="vertix-card bg-white rounded-3xl shadow-[0_2px_14px_-3px_rgba(0,0,0,0.04)] border border-gray-200/80 p-6 sm:p-7">
              <h2 className="text-sm font-bold text-gray-950 mb-6 flex items-center pb-4 border-b border-gray-150">
                <ClipboardText weight="bold" className="w-4 h-4 mr-2 text-emerald-600" />
                Intake Details
              </h2>
              
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center">
                    <CalendarBlank weight="bold" className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                    Age
                  </p>
                  <p className="text-sm text-gray-950 font-bold">{candidate.age ? `${candidate.age} Years Old` : 'Not Specified'}</p>
                </div>
                
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center">
                    <SquaresFour weight="bold" className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                    Category
                  </p>
                  <p className="text-sm text-gray-950 font-bold">{candidate.sector || 'Not Specified'}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center">
                    <FileText weight="bold" className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                    Sub Category
                  </p>
                  <p className="text-sm text-gray-950 font-bold">{candidate.category || 'Not Specified'}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center">
                    <Briefcase weight="bold" className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                    Experience
                  </p>
                  <p className="text-sm text-gray-950 font-bold">{candidate.yearsOfExperience || 'Not Specified'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Embedded CV */}
          <div className="lg:col-span-2">
            <div className="vertix-card bg-white rounded-3xl shadow-[0_2px_14px_-3px_rgba(0,0,0,0.04)] border border-gray-200/80 p-6 sm:p-7 h-full flex flex-col">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-150">
                <h2 className="text-sm font-bold text-gray-950 flex items-center">
                  <FileText weight="bold" className="w-4 h-4 mr-2 text-emerald-600" />
                  Candidate CV
                </h2>
                {candidate.resumes.length > 0 && (
                  <a 
                    href={`/api/resume/file/${candidate.resumes[0].id}`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center px-4 py-1.5 bg-gray-950 hover:bg-black text-white rounded-full transition-colors text-xs font-semibold shadow-xs"
                  >
                    <ArrowSquareOut weight="bold" className="w-3.5 h-3.5 mr-1.5" />
                    Open in New Tab
                  </a>
                )}
              </div>
              
              <div className="flex-1 min-h-[800px] bg-gray-50 rounded-2xl border border-gray-200/80 overflow-hidden">
                {candidate.resumes.length > 0 ? (
                  <iframe 
                    src={`/api/resume/file/${candidate.resumes[0].id}#toolbar=0`} 
                    className="w-full h-full min-h-[800px]"
                    title="CV Viewer"
                  />
                ) : (
                  <div className="w-full h-full min-h-[800px] flex flex-col items-center justify-center text-gray-400">
                    <FileText className="w-16 h-16 mb-4 text-gray-300" />
                    <p className="text-sm font-medium">No CV Document Uploaded</p>
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

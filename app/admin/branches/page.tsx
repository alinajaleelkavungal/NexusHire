import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import BranchesManager from './BranchesManager'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Branches · ResumeIQ' }

export default async function BranchesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ADMIN') redirect('/candidates')

  return <BranchesManager />
}

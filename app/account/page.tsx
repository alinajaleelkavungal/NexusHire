import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import ChangePasswordForm from './ChangePasswordForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Account · ResumeIQ' }

export default async function AccountPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="p-4 sm:p-8 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-950 tracking-tight">Account</h1>
        <p className="text-sm font-medium text-gray-700 mt-1">
          Signed in as <strong className="text-gray-950 font-bold">{session.name}</strong> ({session.role === 'ADMIN' ? 'Admin' : `Branch ${session.loginId}`})
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  )
}

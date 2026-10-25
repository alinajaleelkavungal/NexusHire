import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import ChangePasswordForm from './ChangePasswordForm'
import ThemeSelector from './ThemeSelector'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Account Settings · NexusHire' }

export default async function AccountPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="p-4 sm:p-8 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#24211f] dark:text-[#f3eee8] tracking-tight">Account Settings</h1>
        <p className="text-sm font-medium text-[#7e715f] dark:text-[#a89c8e] mt-1">
          Signed in as <strong className="text-[#24211f] dark:text-[#f3eee8] font-bold">{session.name}</strong> ({session.role === 'ADMIN' ? 'Admin' : `Branch ${session.loginId}`})
        </p>
      </div>

      {/* Visual Theme & Appearance Selection */}
      <ThemeSelector />

      {/* Password Management */}
      <ChangePasswordForm />
    </div>
  )
}

import { Suspense } from 'react'
import LoginForm from './LoginForm'

export const metadata = { title: 'Sign in · NexusHire' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f5f0] p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}

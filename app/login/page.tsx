import { Suspense } from 'react'
import LoginForm from './LoginForm'

export const metadata = { title: 'Sign in · ResumeIQ' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}

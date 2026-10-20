'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Login failed')

      // Only follow same-site relative paths from ?next=
      const next = params.get('next')
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/candidates')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-sm p-8 space-y-5">
      <div className="flex flex-col items-center text-center">
        <span className="w-12 h-12 rounded-xl bg-green-600 text-white flex items-center justify-center shadow-sm mb-3">
          <Sparkles className="w-6 h-6" />
        </span>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ResumeIQ</h1>
        <p className="text-sm text-gray-500 mt-1">Sign in with your branch or admin ID</p>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label htmlFor="loginId" className="block text-sm font-medium text-gray-700 mb-1">ID</label>
        <input
          id="loginId"
          type="text"
          autoComplete="username"
          autoFocus
          required
          value={loginId}
          onChange={e => setLoginId(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(s => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

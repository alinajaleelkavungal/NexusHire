'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { CircleNotch, Eye, EyeSlash, WarningCircle } from '@/components/icons'

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
    <form onSubmit={submit} className="w-full max-w-md bg-white border border-[#e2dcce] rounded-3xl p-8 sm:p-9 space-y-5 shadow-[0_4px_24px_-4px_rgba(36,33,31,0.06)]">
      <div className="border-b border-[#f0ece1] pb-6 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start mb-3">
          <Image
            src="/logo.png"
            alt="NexusHire · The Global Hub for Cross-Border Manpower"
            width={240}
            height={52}
            priority
            className="h-11 w-auto object-contain"
          />
        </div>
        <p className="text-xs font-medium text-[#7e715f] mt-1">
          Sign in with your branch or admin ID
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 bg-[#fdf1ef] border border-[#f9dcd8] text-[#aa2c1e] text-sm px-3.5 py-2 rounded-xl">
          <WarningCircle weight="fill" className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label htmlFor="loginId" className="block text-xs font-bold text-[#423a30] mb-1.5 uppercase tracking-wider">ID</label>
        <input
          id="loginId"
          type="text"
          autoComplete="username"
          autoFocus
          required
          value={loginId}
          onChange={e => setLoginId(e.target.value)}
          className="w-full px-3.5 py-2.5 border border-[#e2dcce] rounded-xl text-[#24211f] focus:outline-none focus:ring-2 focus:ring-[#e85d3f]/40 focus:border-[#e85d3f] transition-all"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-xs font-bold text-[#423a30] mb-1.5 uppercase tracking-wider">Password</label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 pr-10 border border-[#e2dcce] rounded-xl text-[#24211f] focus:outline-none focus:ring-2 focus:ring-[#e85d3f]/40 focus:border-[#e85d3f] transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(s => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#a79a87] hover:text-[#24211f]"
          >
            {showPassword ? <EyeSlash weight="bold" className="w-4 h-4" /> : <Eye weight="bold" className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#24211f] hover:bg-black disabled:opacity-60 text-white font-bold py-3 rounded-full shadow-xs transition-colors"
      >
        {loading && <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />}
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

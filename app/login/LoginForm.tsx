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

      const next = params.get('next')
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/candidates')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="w-full flex flex-col">
      {/* Brand Header */}
      <div className="w-full text-left mb-6">
        <div className="inline-block mb-3">
          <Image
            src="/logo-dark.png"
            alt="NexusHire · The Global Hub for Cross-Border Manpower"
            width={320}
            height={70}
            priority
            unoptimized
            className="w-[270px] sm:w-[310px] h-auto object-contain drop-shadow-md"
          />
        </div>

        <p className="text-xs sm:text-[13px] font-normal text-[#8a7e70] mt-1">
          Sign in with your branch or admin ID
        </p>

        {/* Thin divider line matching screenshot */}
        <div className="w-full border-b border-[#352c25] mt-4" />
      </div>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center gap-2 bg-[#331815] border border-[#e85d3f]/40 text-[#f5a394] text-xs px-4 py-2.5 rounded-full shadow-sm animate-in fade-in"
        >
          <WarningCircle weight="fill" className="w-4 h-4 shrink-0 text-[#e85d3f]" />
          <span>{error}</span>
        </div>
      )}

      {/* ID Field */}
      <div className="mb-4">
        <label
          htmlFor="loginId"
          className="block text-[11px] font-bold text-[#9e9282] mb-2 uppercase tracking-[0.14em]"
        >
          ID
        </label>
        <div className="relative">
          <input
            id="loginId"
            type="text"
            autoComplete="username"
            autoFocus
            required
            placeholder="Enter your branch or admin ID"
            value={loginId}
            onChange={e => setLoginId(e.target.value)}
            className="w-full h-12 px-5 rounded-full bg-[#28201a]/95 text-white placeholder:text-[#665b4f] text-sm border border-[#3d3229] focus:outline-none focus:border-[#d95c3f] focus:ring-1 focus:ring-[#d95c3f]/50 transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]"
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="mb-6">
        <label
          htmlFor="password"
          className="block text-[11px] font-bold text-[#9e9282] mb-2 uppercase tracking-[0.14em]"
        >
          PASSWORD
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full h-12 px-5 pr-12 rounded-full bg-[#28201a]/95 text-white placeholder:text-[#665b4f] text-sm border border-[#3d3229] focus:outline-none focus:border-[#d95c3f] focus:ring-1 focus:ring-[#d95c3f]/50 transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(s => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[#786b5e] hover:text-white transition-colors cursor-pointer"
          >
            {showPassword ? (
              <EyeSlash weight="regular" className="w-4 h-4" />
            ) : (
              <Eye weight="regular" className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 flex items-center justify-center gap-2 rounded-full text-white text-sm font-semibold tracking-wide shadow-lg shadow-[#e85d3f]/25 hover:shadow-xl hover:shadow-[#e85d3f]/35 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
        style={{ backgroundColor: '#e85d3f' }}
      >
        {loading && <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />}
        <span>{loading ? 'Signing in…' : 'Sign in'}</span>
      </button>
    </form>
  )
}

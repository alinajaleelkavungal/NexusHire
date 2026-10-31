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
          {/* Light Mode Logo */}
          <Image
            src="/brand-logo.png"
            alt="NexusHire"
            width={300}
            height={60}
            priority
            unoptimized
            className="w-[240px] sm:w-[280px] h-auto object-contain drop-shadow-sm dark:hidden"
          />
          {/* Dark Mode Logo */}
          <Image
            src="/brand-logo-dark.png"
            alt="NexusHire"
            width={300}
            height={60}
            priority
            unoptimized
            className="w-[240px] sm:w-[280px] h-auto object-contain drop-shadow-md hidden dark:block"
          />
        </div>

        <p className="text-xs sm:text-[13px] font-normal text-[#73675a] dark:text-[#8a7e70] transition-colors mt-1">
          Sign in with your branch or admin ID
        </p>

        {/* Thin divider line */}
        <div className="w-full border-b border-[#e2dcce] dark:border-[#352c25] mt-4 transition-colors" />
      </div>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center gap-2 bg-[#fdf3f0] dark:bg-[#331815] border border-[#fbe4de] dark:border-[#e85d3f]/40 text-[#c84024] dark:text-[#f5a394] text-xs px-4 py-2.5 rounded-full shadow-sm animate-in fade-in transition-colors"
        >
          <WarningCircle weight="fill" className="w-4 h-4 shrink-0 text-[#e85d3f]" />
          <span>{error}</span>
        </div>
      )}

      {/* ID Field */}
      <div className="mb-4">
        <label
          htmlFor="loginId"
          className="block text-[11px] font-bold text-[#665a4c] dark:text-[#9e9282] mb-2 uppercase tracking-[0.14em] transition-colors"
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
            className="w-full h-12 px-5 rounded-full bg-white dark:bg-[#28201a]/95 text-[#24211f] dark:text-white placeholder:text-[#a09485] dark:placeholder:text-[#665b4f] text-sm border border-[#ded7cb] dark:border-[#3d3229] focus:outline-none focus:border-[#e85d3f] dark:focus:border-[#d95c3f] focus:ring-2 focus:ring-[#e85d3f]/25 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]"
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="mb-6">
        <label
          htmlFor="password"
          className="block text-[11px] font-bold text-[#665a4c] dark:text-[#9e9282] mb-2 uppercase tracking-[0.14em] transition-colors"
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
            className="w-full h-12 px-5 pr-12 rounded-full bg-white dark:bg-[#28201a]/95 text-[#24211f] dark:text-white placeholder:text-[#a09485] dark:placeholder:text-[#665b4f] text-sm border border-[#ded7cb] dark:border-[#3d3229] focus:outline-none focus:border-[#e85d3f] dark:focus:border-[#d95c3f] focus:ring-2 focus:ring-[#e85d3f]/25 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(s => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[#8a7e70] dark:text-[#786b5e] hover:text-[#24211f] dark:hover:text-white transition-colors cursor-pointer"
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
        className="w-full h-12 flex items-center justify-center gap-2 rounded-full text-white text-sm font-semibold tracking-wide active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 bg-[#e85d3f] hover:bg-[#eb6a4e]"
      >
        {loading && <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />}
        <span>{loading ? 'Signing in…' : 'Sign in'}</span>
      </button>
    </form>
  )
}

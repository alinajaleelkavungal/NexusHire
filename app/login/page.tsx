import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from '@/components/icons'
import { getSession } from '@/lib/auth'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Sign in · NexusHire' }

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect('/')

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden select-none bg-[#faf8f5] dark:bg-[#100d0b] transition-colors duration-300">
      {/* Light background radial gradient */}
      <div
        className="absolute inset-0 pointer-events-none opacity-100 dark:opacity-0 transition-opacity duration-300 z-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, #ffffff 0%, #faf6f0 45%, #ede6da 100%)',
        }}
      />

      {/* Dark background radial gradient */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-300 z-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 45%, #241b16 0%, #191310 50%, #100d0b 100%)',
        }}
      />

      {/* Translucent Watermark */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[15%] sm:translate-x-[10%] lg:translate-x-[5%] pointer-events-none select-none z-0">
        <Image
          src="/login-watermark.png"
          alt=""
          width={800}
          height={810}
          priority
          unoptimized
          className="w-[420px] sm:w-[580px] lg:w-[720px] xl:w-[820px] h-auto object-contain opacity-[0.035] dark:opacity-[0.045] invert dark:invert-0 transition-opacity"
        />
      </div>

      {/* Top Left Navigation Bar: Back button to return to appearance mode picker */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-5 sm:px-8 pt-5 sm:pt-7 flex items-center justify-between shrink-0">
        <Link
          href="/onboarding?step=2"
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 text-[#423a30] dark:text-[#dcd4c6] hover:text-black dark:hover:text-white border border-[#ded7cb] dark:border-white/15 backdrop-blur-md text-xs sm:text-[13px] font-medium transition-all active:scale-95 shadow-2xs group cursor-pointer"
          title="Change theme appearance"
          aria-label="Back to appearance selection"
        >
          <ArrowLeft weight="bold" className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:-translate-x-0.5 text-[#e85d3f]" />
          <span>Back</span>
        </Link>
      </header>

      {/* Center Content: Login Form */}
      <main className="relative z-10 w-full max-w-[420px] mx-auto px-6 py-4 flex flex-col justify-center my-auto">
        <Suspense>
          <LoginForm />
        </Suspense>
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 w-full text-center py-6 shrink-0">
        <p className="text-[11px] font-medium tracking-wide text-[#8a7e70] dark:text-[#6e6153] transition-colors">
          © 2026 NexusHire · The Global Hub for Cross-Border Manpower
        </p>
      </footer>
    </div>
  )
}

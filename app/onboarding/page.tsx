'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from '@/components/icons'

export default function OnboardingPage() {
  const router = useRouter()

  const handleComplete = () => {
    try {
      localStorage.removeItem('nexushire_onboarded')
      sessionStorage.removeItem('nexushire_splash_shown')
    } catch (_) {}
    router.push('/')
  }

  return (
    <div
      className="fixed inset-0 z-50 w-screen h-screen max-h-screen flex flex-col justify-between overflow-hidden select-none p-5 sm:p-8 lg:p-10"
      style={{
        background: 'radial-gradient(ellipse at 70% 45%, #2a201a 0%, #1c1512 45%, #100d0b 100%)',
      }}
    >
      {/* Warm ambient background glow */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-[#e85d3f]/8 blur-[130px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full flex items-center justify-between shrink-0 h-10 sm:h-12">
        <Link href="/" className="inline-block transition-transform hover:scale-[1.02] group">
          <Image
            src="/brand-logo-dark.png"
            alt="NexusHire"
            width={160}
            height={35}
            priority
            unoptimized
            className="h-7 sm:h-8 w-auto object-contain drop-shadow-md"
          />
        </Link>

        <button
          onClick={handleComplete}
          className="text-xs sm:text-sm font-medium transition-colors cursor-pointer px-4 py-1.5 rounded-full hover:bg-white/10 active:scale-95"
          style={{ color: '#a79a87' }}
          aria-label="Skip onboarding"
        >
          Skip
        </button>
      </header>

      {/* Center 2-Column Section: Single proper fit page, perfectly scaled */}
      <main className="relative z-10 w-full max-w-7xl mx-auto flex-1 min-h-0 flex items-center my-auto py-2 sm:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center w-full">
          {/* Left Column: Typography */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left max-w-2xl">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <span
                className="text-[10px] sm:text-xs font-bold tracking-[0.22em] uppercase"
                style={{ color: '#e85d3f' }}
              >
                01 — INTRODUCTION
              </span>
            </div>

            <h1
              className="text-2xl sm:text-4xl lg:text-[42px] xl:text-[48px] leading-[1.14] tracking-tight font-normal"
              style={{
                color: '#ffffff',
                fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
              }}
            >
              The global hub for<br />
              <span style={{ color: '#e85d3f' }}>cross-border manpower.</span>
            </h1>

            <p
              className="text-xs sm:text-sm leading-relaxed max-w-lg mt-3 sm:mt-5 font-normal"
              style={{ color: '#b5a898' }}
            >
              NexusHire connects startups, professionals and executives with the right talent — anywhere in the world.
            </p>
          </div>

          {/* Right Column: Crystal-Clear Signature Framed Monogram Emblem */}
          <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-[#e85d3f]/14 blur-[70px] rounded-full scale-90 pointer-events-none" />
              <Image
                src="/onboarding-emblem.png"
                alt="NexusHire Signature Monogram"
                width={420}
                height={420}
                priority
                unoptimized
                className="w-[200px] sm:w-[260px] lg:w-[300px] xl:w-[340px] max-h-[46vh] h-auto object-contain relative z-10 drop-shadow-[0_12px_36px_rgba(0,0,0,0.65)] transform hover:scale-[1.01] transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Bar: Single Proper Fit Page (No 01/03 pagination, Next button fully visible) */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-end shrink-0 pt-2 pb-1 sm:pb-2">
        <div className="flex-1" />

        <button
          onClick={handleComplete}
          className="inline-flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-white text-xs sm:text-sm font-semibold tracking-wide shadow-lg shadow-[#e85d3f]/25 hover:shadow-xl hover:shadow-[#e85d3f]/35 active:scale-95 transition-all cursor-pointer group"
          style={{ backgroundColor: '#e85d3f' }}
          aria-label="Continue to workspace"
        >
          <span>Next</span>
          <ArrowRight weight="bold" className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </footer>
    </div>
  )
}

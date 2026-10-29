'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight } from '@/components/icons'

interface SplashScreenProps {
  /** If true, forces the splash screen to display regardless of sessionStorage */
  forceShow?: boolean
  /** If true, keeps the splash screen open without auto-fading out (great for inspection/testing) */
  holdOpen?: boolean
  /** Callback fired after the complete sequence finishes */
  onComplete?: () => void
}

export default function SplashScreen({
  forceShow = false,
  holdOpen = false,
  onComplete,
}: SplashScreenProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [stage, setStage] = useState<'splash' | 'onboarding' | 'done'>('splash')
  const [progress, setProgress] = useState(15)
  const [isCrossFading, setIsCrossFading] = useState(false)
  const [fadeOutFinal, setFadeOutFinal] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Clean up any stale legacy lockout flags so onboarding always runs reliably
    try {
      localStorage.removeItem('nexushire_onboarded')
      localStorage.removeItem('nexushire_splash_shown')
      sessionStorage.removeItem('nexushire_splash_shown')
    } catch (_) {}

    // If we're already on dedicated /splash or /onboarding routes, don't overlay the global layout intro
    if ((pathname === '/splash' || pathname === '/onboarding') && !forceShow) {
      setStage('done')
      return
    }

    const searchParams = new URLSearchParams(window.location.search)
    const skipIntro = searchParams.get('skip') === '1' || searchParams.get('nointro') === '1'

    if (skipIntro && !forceShow) {
      setStage('done')
      if (onComplete) onComplete()
      return
    }

    // Step 1: Progress animation
    const t1 = setTimeout(() => setProgress(38), 100)
    const t2 = setTimeout(() => setProgress(72), 380)
    const t3 = setTimeout(() => setProgress(94), 750)
    const t4 = setTimeout(() => setProgress(100), 1050)

    if (holdOpen) {
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
        clearTimeout(t4)
      }
    }

    // Step 2: Seamlessly transition from Splash to Onboarding screen
    const tNext = setTimeout(() => {
      setIsCrossFading(true)
      setTimeout(() => {
        setStage('onboarding')
        setIsCrossFading(false)
      }, 350)
    }, 1450)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
      clearTimeout(tNext)
    }
  }, [forceShow, holdOpen, pathname, onComplete])

  const finishOnboarding = () => {
    try {
      localStorage.removeItem('nexushire_onboarded')
      sessionStorage.removeItem('nexushire_splash_shown')
    } catch (_) {}

    setFadeOutFinal(true)
    setTimeout(() => {
      setStage('done')
      if (onComplete) onComplete()
    }, 500)
  }

  if (stage === 'done') return null

  const content = (
    <div
      aria-label="NexusHire Launch Screen"
      role="status"
      className={`fixed inset-0 z-[9999999] w-screen h-screen max-h-screen select-none overflow-hidden transition-opacity duration-500 ease-out ${
        fadeOutFinal ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse at 70% 45%, #2a201a 0%, #1c1512 45%, #100d0b 100%)',
      }}
    >
      {/* ── STAGE 1: SPLASH SCREEN ────────────────────────── */}
      {stage === 'splash' && (
        <div
          className={`w-full h-full flex flex-col items-center justify-center transition-opacity duration-350 ease-out ${
            isCrossFading ? 'opacity-0 scale-98' : 'opacity-100 scale-100'
          }`}
        >
          {/* Warm center ambient glow */}
          <div className="absolute w-[460px] h-[460px] rounded-full bg-[#e85d3f]/8 blur-[120px] pointer-events-none" />

          {/* Center Stage */}
          <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-xl w-full">
            {/* Dark Brand Logo */}
            <div className="transform transition-all duration-700 ease-out">
              <Image
                src="/brand-logo-dark.png"
                alt="NexusHire"
                width={360}
                height={72}
                priority
                unoptimized
                className="w-[260px] sm:w-[320px] h-auto object-contain drop-shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
              />
            </div>

            {/* Progress Bar & Subtitle */}
            <div className="mt-8 sm:mt-10 flex flex-col items-center w-full">
              {/* Progress Track */}
              <div className="w-36 sm:w-44 h-[2px] bg-white/12 rounded-full overflow-hidden relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
                {/* Active Fill */}
                <div
                  className="h-full bg-gradient-to-r from-[#e85d3f] via-[#ed7e66] to-[#f4d06f] rounded-full shadow-[0_0_10px_rgba(232,93,63,0.8)]"
                  style={{
                    width: `${progress}%`,
                    transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </div>

              {/* Subtitle */}
              <span className="text-[9px] sm:text-[10px] font-semibold tracking-[0.28em] text-[#a79a87]/90 uppercase mt-3">
                Loading Workspace
              </span>
            </div>
          </div>

          {/* Version Footer */}
          <div className="absolute bottom-5 sm:bottom-7 text-center">
            <span className="text-[10px] font-medium tracking-widest text-[#7e715f]/70">
              Version 1.0.0
            </span>
          </div>
        </div>
      )}

      {/* ── STAGE 2: ONBOARDING SCREEN (Single Proper Fit Page - No Scrolling) ─────── */}
      {stage === 'onboarding' && (
        <div className="w-full h-full max-h-screen flex flex-col justify-between p-5 sm:p-8 lg:p-10 overflow-hidden animate-in fade-in duration-500 ease-out">
          {/* Ambient backlight */}
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-[#e85d3f]/8 blur-[130px] pointer-events-none" />

          {/* Top Header */}
          <header className="relative z-10 w-full flex items-center justify-between shrink-0 h-10 sm:h-12">
            <div className="inline-block">
              <Image
                src="/brand-logo-dark.png"
                alt="NexusHire"
                width={160}
                height={35}
                priority
                unoptimized
                className="h-7 sm:h-8 w-auto object-contain drop-shadow-md"
              />
            </div>

            <button
              onClick={finishOnboarding}
              className="text-xs sm:text-sm font-medium transition-colors cursor-pointer px-4 py-1.5 rounded-full hover:bg-white/10 active:scale-95"
              style={{ color: '#a79a87' }}
              aria-label="Skip onboarding"
            >
              Skip
            </button>
          </header>

          {/* Center 2-Column Main - Perfectly Proportionate & Contained */}
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

              {/* Right Column: Crystal-Clear Signature Framed Monogram Artwork */}
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

          {/* Bottom Bar: Clean Single Fit Page (No 01/03 pagination, Next button fully visible) */}
          <footer className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-end shrink-0 pt-2 pb-1 sm:pb-2">
            <div className="flex-1" />

            <button
              onClick={finishOnboarding}
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-white text-xs sm:text-sm font-semibold tracking-wide shadow-lg shadow-[#e85d3f]/25 hover:shadow-xl hover:shadow-[#e85d3f]/35 active:scale-95 transition-all cursor-pointer group"
              style={{ backgroundColor: '#e85d3f' }}
              aria-label="Continue to workspace"
            >
              <span>Next</span>
              <ArrowRight weight="bold" className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </footer>
        </div>
      )}
    </div>
  )

  if (mounted && typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }

  return content
}

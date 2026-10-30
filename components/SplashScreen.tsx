'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight } from '@/components/icons'
import OnboardingFlow from '@/components/OnboardingFlow'

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
  const isDedicatedIntroRoute = (pathname === '/splash' || pathname === '/onboarding') && !forceShow
  const [mounted, setMounted] = useState(false)
  const [stage, setStage] = useState<'splash' | 'onboarding' | 'done'>('splash')
  const [progress, setProgress] = useState(15)
  const [isCrossFading, setIsCrossFading] = useState(false)
  const [fadeOutFinal, setFadeOutFinal] = useState(false)

  useEffect(() => {
    if (isDedicatedIntroRoute) {
      setStage('done')
      return
    }

    const searchParams = new URLSearchParams(window.location.search)
    const urlForce = searchParams.get('splash') === '1' || searchParams.get('intro') === '1'
    const skipIntro = searchParams.get('skip') === '1' || searchParams.get('nointro') === '1'

    if (skipIntro && !forceShow) {
      setStage('done')
      if (onComplete) onComplete()
      return
    }

    const hasSeenSplash = sessionStorage.getItem('nexushire_splash_shown') === 'true'
    const hasCompletedOnboarding = localStorage.getItem('nexushire_onboarded') === 'true'

    if (hasSeenSplash && hasCompletedOnboarding && !forceShow && !urlForce) {
      setStage('done')
      if (onComplete) onComplete()
      return
    }

    setMounted(true)

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
      sessionStorage.setItem('nexushire_splash_shown', 'true')
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
      localStorage.setItem('nexushire_onboarded', 'true')
      sessionStorage.setItem('nexushire_splash_shown', 'true')
    } catch (_) {}

    setFadeOutFinal(true)
    setTimeout(() => {
      setStage('done')
      if (onComplete) onComplete()
    }, 500)
  }

  if (isDedicatedIntroRoute || stage === 'done') return null

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

      {/* ── STAGE 2: ONBOARDING SCREEN (Multi-Step Flow with Introduction and Appearance) ── */}
      {stage === 'onboarding' && (
        <OnboardingFlow onComplete={finishOnboarding} onSkip={finishOnboarding} />
      )}
    </div>
  )

  if (mounted && typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }

  return null
}

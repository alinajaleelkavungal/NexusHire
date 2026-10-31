'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, Sun, Moon, Check } from '@/components/icons'
import { useTheme } from '@/components/ThemeProvider'

interface OnboardingFlowProps {
  onComplete: () => void
  onSkip?: () => void
}

export default function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const { theme, setTheme } = useTheme()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nexushire_theme') as 'light' | 'dark' | null
      if (stored === 'light' || stored === 'dark') {
        setSelectedTheme(stored)
      } else if (theme) {
        setSelectedTheme(theme)
      }
    } catch (_) {}

    try {
      if (typeof window !== 'undefined') {
        const search = new URLSearchParams(window.location.search)
        if (search.get('step') === '2' || search.get('step') === 'appearance') {
          setStep(2)
        }
      }
    } catch (_) {}
  }, [theme])

  const handleSelectTheme = (t: 'light' | 'dark') => {
    setSelectedTheme(t)
    setTheme(t)
    try {
      localStorage.setItem('nexushire_theme', t)
    } catch (_) {}
  }

  const handleNext = () => {
    if (step === 1) {
      setStep(2)
    } else {
      // Step 2 completes onboarding
      handleSelectTheme(selectedTheme)
      onComplete()
    }
  }

  const handleSkip = () => {
    if (onSkip) {
      onSkip()
    } else {
      onComplete()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 w-screen h-screen max-h-screen flex flex-col justify-between overflow-hidden select-none p-5 sm:p-8 lg:p-10 animate-in fade-in duration-300 ease-out"
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
          onClick={handleSkip}
          className="text-xs sm:text-sm font-medium transition-colors cursor-pointer px-4 py-1.5 rounded-full hover:bg-white/10 active:scale-95"
          style={{ color: '#a79a87' }}
          aria-label="Skip onboarding"
        >
          Skip
        </button>
      </header>

      {/* Center Main Stage */}
      <main className="relative z-10 w-full max-w-7xl mx-auto flex-1 min-h-0 flex items-center my-auto py-2 sm:py-4">
        {step === 1 ? (
          /* ── STEP 1: INTRODUCTION ────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center w-full animate-in fade-in slide-in-from-right-4 duration-300">
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

            {/* Right Column: Signature Framed Monogram Emblem */}
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
        ) : (
          /* ── STEP 2: APPEARANCE (CHOOSE YOUR LOOK) ───────────── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center w-full animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Left Column: Typography */}
            <div className="lg:col-span-5 flex flex-col justify-center text-left max-w-xl">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <span
                  className="text-[10px] sm:text-xs font-bold tracking-[0.22em] uppercase"
                  style={{ color: '#e85d3f' }}
                >
                  02 — APPEARANCE
                </span>
              </div>

              <h1
                className="text-3xl sm:text-4xl lg:text-[46px] xl:text-[50px] leading-[1.12] tracking-tight font-normal"
                style={{
                  color: '#ffffff',
                  fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
                }}
              >
                Choose your<br />
                <span style={{ color: '#e85d3f' }}>look.</span>
              </h1>

              <p
                className="text-xs sm:text-sm leading-relaxed max-w-sm mt-3 sm:mt-5 font-normal"
                style={{ color: '#b5a898' }}
              >
                Pick light or dark mode — you can switch any time from the sidebar or settings.
              </p>
            </div>

            {/* Right Column: Two Interactive Device Cards */}
            <div className="lg:col-span-7 flex items-center justify-center lg:justify-end gap-4 sm:gap-6 w-full">
              {/* Option 1: Light Mode Preview Card */}
              <div
                onClick={() => handleSelectTheme('light')}
                className="w-[170px] xs:w-[190px] sm:w-[220px] lg:w-[230px] xl:w-[245px] flex flex-col cursor-pointer group"
              >
                <div
                  className={`w-full h-[230px] sm:h-[270px] lg:h-[295px] rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 transition-all duration-300 relative overflow-hidden flex gap-2 sm:gap-2.5 bg-[#fcfaf6] ${
                    selectedTheme === 'light'
                      ? 'border-2 border-[#e85d3f] scale-[1.02]'
                      : 'border border-white/10 hover:border-white/25 opacity-75 hover:opacity-100'
                  }`}
                >
                  {/* Miniature Sidebar */}
                  <div className="w-5 sm:w-6 flex flex-col items-center gap-2 pt-1 border-r border-[#ece6d9] pr-1 shrink-0">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#e85d3f]/15 border border-[#e85d3f]/40 flex items-center justify-center text-[7px] font-bold text-[#e85d3f]">
                      N
                    </div>
                    <div className="w-3 h-3 rounded-full bg-[#e85d3f] shadow-xs" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#d0c6b6]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#d0c6b6]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#d0c6b6]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#d0c6b6] mt-auto" />
                  </div>

                  {/* Miniature Dashboard Content */}
                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    <div className="h-3 rounded-full bg-[#efe9dd] w-3/4" />

                    <div className="bg-white border border-[#ece6d9] rounded-xl p-2 sm:p-2.5 space-y-1.5 shadow-2xs">
                      <div className="h-2 rounded-full bg-[#423a30] w-1/2" />
                      <div className="h-1.5 rounded-full bg-[#c0b4a4] w-3/4" />
                      <div className="h-4 sm:h-5 rounded-md bg-[#e85d3f] w-14 sm:w-16 mt-1.5" />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-white border border-[#ece6d9] rounded-lg p-1.5 space-y-1">
                        <div className="h-1.5 rounded-full bg-[#6a5e50] w-1/2" />
                        <div className="h-1.5 rounded-full bg-[#d0c6b6] w-3/4" />
                      </div>
                      <div className="bg-white border border-[#ece6d9] rounded-lg p-1.5 space-y-1">
                        <div className="h-1.5 rounded-full bg-[#6a5e50] w-1/2" />
                        <div className="h-1.5 rounded-full bg-[#d0c6b6] w-3/4" />
                      </div>
                    </div>

                    <div className="bg-white border border-[#ece6d9] rounded-xl p-2 sm:p-2.5 mt-auto space-y-1.5">
                      <div className="h-1.5 rounded-full bg-[#b8ac9c] w-full" />
                      <div className="h-1.5 rounded-full bg-[#dcd4c6] w-4/5" />
                    </div>
                  </div>
                </div>

                {/* Radio Selector Row */}
                <div className="flex items-start gap-2.5 pt-3 text-left">
                  <div
                    className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center transition-colors shrink-0 ${
                      selectedTheme === 'light' ? 'bg-[#e85d3f] text-white' : 'border border-white/40'
                    }`}
                  >
                    {selectedTheme === 'light' && <Check weight="bold" className="w-2.5 h-2.5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Sun
                        weight="bold"
                        className={`w-4 h-4 ${selectedTheme === 'light' ? 'text-[#e85d3f]' : 'text-[#a79a87]'}`}
                      />
                      <span className="text-xs sm:text-sm font-semibold text-white">Light mode</span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-[#a79a87] mt-0.5 leading-tight">
                      Bright and clean for daytime use.
                    </p>
                  </div>
                </div>
              </div>

              {/* Option 2: Dark Mode Preview Card */}
              <div
                onClick={() => handleSelectTheme('dark')}
                className="w-[170px] xs:w-[190px] sm:w-[220px] lg:w-[230px] xl:w-[245px] flex flex-col cursor-pointer group"
              >
                <div
                  className={`w-full h-[230px] sm:h-[270px] lg:h-[295px] rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 transition-all duration-300 relative overflow-hidden flex gap-2 sm:gap-2.5 bg-[#14100e] ${
                    selectedTheme === 'dark'
                      ? 'border-2 border-[#e85d3f] scale-[1.02]'
                      : 'border border-white/10 hover:border-white/25 opacity-75 hover:opacity-100'
                  }`}
                >
                  {/* Miniature Dark Sidebar */}
                  <div className="w-5 sm:w-6 flex flex-col items-center gap-2 pt-1 border-r border-[#241c17] pr-1 shrink-0">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#e85d3f]/15 border border-[#e85d3f]/40 flex items-center justify-center text-[7px] font-bold text-[#e85d3f]">
                      N
                    </div>
                    <div className="w-3 h-3 rounded-full bg-[#e85d3f] shadow-xs" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3d3229]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3d3229]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3d3229]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3d3229] mt-auto" />
                  </div>

                  {/* Miniature Dark Dashboard Content */}
                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    <div className="h-3 rounded-full bg-[#241c17] w-3/4" />

                    <div className="bg-[#201813] border border-[#352c25] rounded-xl p-2 sm:p-2.5 space-y-1.5 shadow-2xs">
                      <div className="h-2 rounded-full bg-[#ded6cc] w-1/2" />
                      <div className="h-1.5 rounded-full bg-[#6a5e50] w-3/4" />
                      <div className="h-4 sm:h-5 rounded-md bg-[#e85d3f] w-14 sm:w-16 mt-1.5" />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-[#201813] border border-[#352c25] rounded-lg p-1.5 space-y-1">
                        <div className="h-1.5 rounded-full bg-[#a89c8e] w-1/2" />
                        <div className="h-1.5 rounded-full bg-[#423429] w-3/4" />
                      </div>
                      <div className="bg-[#201813] border border-[#352c25] rounded-lg p-1.5 space-y-1">
                        <div className="h-1.5 rounded-full bg-[#a89c8e] w-1/2" />
                        <div className="h-1.5 rounded-full bg-[#423429] w-3/4" />
                      </div>
                    </div>

                    <div className="bg-[#201813] border border-[#352c25] rounded-xl p-2 sm:p-2.5 mt-auto space-y-1.5">
                      <div className="h-1.5 rounded-full bg-[#524438] w-full" />
                      <div className="h-1.5 rounded-full bg-[#332820] w-4/5" />
                    </div>
                  </div>
                </div>

                {/* Radio Selector Row */}
                <div className="flex items-start gap-2.5 pt-3 text-left">
                  <div
                    className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center transition-colors shrink-0 ${
                      selectedTheme === 'dark' ? 'bg-[#e85d3f] text-white' : 'border border-white/40'
                    }`}
                  >
                    {selectedTheme === 'dark' && <Check weight="bold" className="w-2.5 h-2.5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Moon
                        weight="bold"
                        className={`w-4 h-4 ${selectedTheme === 'dark' ? 'text-[#e85d3f]' : 'text-[#a79a87]'}`}
                      />
                      <span className="text-xs sm:text-sm font-semibold text-white">Dark mode</span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-[#a79a87] mt-0.5 leading-tight">
                      Easy on the eyes, great in low light.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Bar: Stepper & Next Button */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-between shrink-0 pt-2 pb-1 sm:pb-2">
        {/* Left Side: Step Tracker matching screenshot */}
        <div className="flex items-center gap-3">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#a79a87] hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer mr-2"
              aria-label="Back to previous step"
            >
              <ArrowLeft weight="bold" className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          {/* Stepper lines: ― ▬ ―  02 / 03 */}
          <div className="flex items-center gap-1.5">
            <span
              className={`transition-all rounded-full ${
                step === 1 ? 'w-8 sm:w-10 h-1 bg-[#e85d3f]' : 'w-3.5 sm:w-4 h-0.5 bg-[#4a3f36]'
              }`}
            />
            <span
              className={`transition-all rounded-full ${
                step === 2 ? 'w-8 sm:w-10 h-1 bg-[#e85d3f]' : 'w-3.5 sm:w-4 h-0.5 bg-[#4a3f36]'
              }`}
            />
            <span className="w-3.5 sm:w-4 h-0.5 bg-[#4a3f36] rounded-full" />
          </div>

          <span className="text-[11px] sm:text-xs font-mono font-medium tracking-wider text-[#a79a87] ml-1">
            {step === 1 ? '01 / 03' : '02 / 03'}
          </span>
        </div>

        {/* Right Side: Next Action Button */}
        <button
          onClick={handleNext}
          className="inline-flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-white text-xs sm:text-sm font-semibold tracking-wide hover:bg-[#eb6a4e] active:scale-95 transition-all cursor-pointer group bg-[#e85d3f]"
          aria-label={step === 1 ? 'Next to appearance' : 'Complete onboarding'}
        >
          <span>Next</span>
          <ArrowRight weight="bold" className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </footer>
    </div>
  )
}

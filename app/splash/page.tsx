'use client'

import { useState } from 'react'
import SplashScreen from '@/components/SplashScreen'

export default function SplashPreviewPage() {
  const [key, setKey] = useState(1)
  const [mode, setMode] = useState<'idle' | 'play' | 'hold'>('hold')

  const playSplash = () => {
    setMode('play')
    setKey(k => k + 1)
  }

  const holdSplash = () => {
    setMode('hold')
    setKey(k => k + 1)
  }

  const closeSplash = () => {
    setMode('idle')
  }

  return (
    <div className="relative min-h-[calc(100vh-90px)] flex flex-col items-center justify-center p-6 text-center select-none">
      {mode === 'play' && (
        <SplashScreen
          key={key}
          forceShow={true}
          onComplete={() => setMode('idle')}
        />
      )}

      {mode === 'hold' && (
        <>
          <SplashScreen
            key={key}
            forceShow={true}
            holdOpen={true}
          />
          {/* Floating Exit Button for inspection mode */}
          <button
            onClick={closeSplash}
            className="fixed top-6 right-6 z-[99999999] px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/20 shadow-lg transition-all cursor-pointer"
          >
            Exit Preview ✕
          </button>
        </>
      )}

      <div className="max-w-md bg-white border border-[#e2dcce] rounded-3xl p-8 sm:p-10 shadow-[0_4px_24px_-4px_rgba(36,33,31,0.06)] space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-[#fdf3f0] border border-[#fbe4de] text-[#e85d3f] flex items-center justify-center mx-auto text-xl font-bold shadow-2xs">
          ⚡
        </div>
        <div>
          <h1 className="text-2xl font-black text-[#24211f] tracking-tight">
            Opening Splash Screen
          </h1>
          <p className="text-xs text-[#7e715f] font-medium mt-2 leading-relaxed">
            The opening splash screen displays the dark-mode brand logo, an animated progress track, and version identifier when visitors launch the app.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            onClick={playSplash}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#24211f] hover:bg-black text-white text-xs font-semibold tracking-wide shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
          >
            Play Splash Screen
          </button>

          <button
            onClick={holdSplash}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white hover:bg-[#f3efe9] text-[#24211f] border border-[#e2dcce] text-xs font-semibold tracking-wide shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            Inspect Design
          </button>
        </div>
      </div>
    </div>
  )
}

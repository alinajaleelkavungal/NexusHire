'use client'

import { useTheme } from '@/components/ThemeProvider'
import { Sun, Moon, CheckCircle } from '@/components/icons'

export default function ThemeSelector() {
  const { theme, isDark, setTheme } = useTheme()

  return (
    <section className="bg-white dark:bg-[#1e1814] border border-[#e2dcce] dark:border-[#352c25] rounded-3xl p-6 shadow-sm space-y-4 transition-colors">
      <div>
        <h2 className="text-base font-bold text-[#24211f] dark:text-[#f3eee8] flex items-center gap-2">
          Appearance & Theme
        </h2>
        <p className="text-xs text-[#7e715f] dark:text-[#a89c8e] mt-0.5">
          Choose your preferred interface theme. NexusHire remembers your preference automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
        {/* Light Mode Card */}
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-4 group ${
            !isDark
              ? 'border-[#e85d3f] bg-[#fffaf5] dark:bg-[#261e18]'
              : 'border-[#e2dcce] dark:border-[#352c25] hover:border-[#cdc3b2] dark:hover:border-[#4d3f35] bg-[#faf8f5]/60 dark:bg-[#231b16]'
          }`}
        >
          {/* Mockup Preview Light */}
          <div className="w-full h-24 rounded-xl bg-[#f5f1ea] border border-[#e4ded3] p-2.5 flex flex-col justify-between overflow-hidden shadow-2xs group-hover:scale-[1.01] transition-transform">
            <div className="flex items-center justify-between">
              <div className="w-4 h-4 rounded-full bg-[#e85d3f]" />
              <div className="flex items-center gap-1">
                <div className="w-8 h-2 rounded-full bg-[#ddd5c7]" />
                <div className="w-3 h-3 rounded-full bg-[#ddd5c7]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="w-16 h-2.5 rounded-md bg-[#24211f]" />
              <div className="w-24 h-2 rounded-md bg-[#c2b7a7]" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-10 h-3 rounded-full bg-white border border-[#e4ded3]" />
              <div className="w-12 h-3 rounded-full bg-white border border-[#e4ded3]" />
            </div>
          </div>

          {/* Details & Radio */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  !isDark
                    ? 'bg-[#fdf7df] text-[#b58933] shadow-xs'
                    : 'bg-black/5 dark:bg-white/10 text-[#73675a] dark:text-[#a89c8e]'
                }`}
              >
                <Sun weight="bold" className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#24211f] dark:text-[#f3eee8]">
                  Light Mode
                </span>
                <span className="text-[11px] text-[#7e715f] dark:text-[#a89c8e]">
                  Warm linen & charcoal
                </span>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                !isDark
                  ? 'border-[#e85d3f] bg-[#e85d3f] text-white shadow-xs'
                  : 'border-[#cdc3b2] dark:border-[#4d3f35] bg-transparent'
              }`}
            >
              {!isDark && <CheckCircle weight="fill" className="w-4 h-4" />}
            </div>
          </div>
        </button>

        {/* Dark Mode Card */}
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-4 group ${
            isDark
              ? 'border-[#e85d3f] bg-[#fffaf5] dark:bg-[#261e18]'
              : 'border-[#e2dcce] dark:border-[#352c25] hover:border-[#cdc3b2] dark:hover:border-[#4d3f35] bg-[#faf8f5]/60 dark:bg-[#231b16]'
          }`}
        >
          {/* Mockup Preview Dark */}
          <div className="w-full h-24 rounded-xl bg-[#181310] border border-[#352a22] p-2.5 flex flex-col justify-between overflow-hidden shadow-2xs group-hover:scale-[1.01] transition-transform">
            <div className="flex items-center justify-between">
              <div className="w-4 h-4 rounded-full bg-[#e85d3f]" />
              <div className="flex items-center gap-1">
                <div className="w-8 h-2 rounded-full bg-[#3d3128]" />
                <div className="w-3 h-3 rounded-full bg-[#3d3128]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="w-16 h-2.5 rounded-md bg-[#faf8f5]" />
              <div className="w-24 h-2 rounded-md bg-[#7a6a5d]" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-10 h-3 rounded-full bg-[#241c17] border border-[#352a22]" />
              <div className="w-12 h-3 rounded-full bg-[#241c17] border border-[#352a22]" />
            </div>
          </div>

          {/* Details & Radio */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  isDark
                    ? 'bg-[#331c17] text-[#e85d3f] shadow-xs'
                    : 'bg-black/5 dark:bg-white/10 text-[#73675a] dark:text-[#a89c8e]'
                }`}
              >
                <Moon weight="bold" className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#24211f] dark:text-[#f3eee8]">
                  Dark Mode
                </span>
                <span className="text-[11px] text-[#7e715f] dark:text-[#a89c8e]">
                  Deep espresso & amber
                </span>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                isDark
                  ? 'border-[#e85d3f] bg-[#e85d3f] text-white shadow-xs'
                  : 'border-[#cdc3b2] dark:border-[#4d3f35] bg-transparent'
              }`}
            >
              {isDark && <CheckCircle weight="fill" className="w-4 h-4" />}
            </div>
          </div>
        </button>
      </div>
    </section>
  )
}

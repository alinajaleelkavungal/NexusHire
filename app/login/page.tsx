import { Suspense } from 'react'
import Image from 'next/image'
import LoginForm from './LoginForm'

export const metadata = { title: 'Sign in · NexusHire' }

export default function LoginPage() {
  return (
    <div
      className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 45%, #241b16 0%, #191310 50%, #100d0b 100%)',
      }}
    >
      {/* Huge Translucent Watermark on the Right side */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[15%] sm:translate-x-[10%] lg:translate-x-[5%] pointer-events-none select-none z-0">
        <Image
          src="/login-watermark.png"
          alt=""
          width={800}
          height={810}
          priority
          unoptimized
          className="w-[420px] sm:w-[580px] lg:w-[720px] xl:w-[820px] h-auto object-contain opacity-[0.045]"
        />
      </div>

      {/* Top Balancer */}
      <div className="shrink-0 h-8 sm:h-12" />

      {/* Center Content: Login Form */}
      <main className="relative z-10 w-full max-w-[420px] mx-auto px-6 py-4 flex flex-col justify-center my-auto">
        <Suspense>
          <LoginForm />
        </Suspense>
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 w-full text-center py-6 shrink-0">
        <p className="text-[11px] font-medium tracking-wide text-[#6e6153]">
          © 2026 NexusHire · The Global Hub for Cross-Border Manpower
        </p>
      </footer>
    </div>
  )
}

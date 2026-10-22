'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MagnifyingGlass, ShieldCheck, Storefront } from '@/components/icons'

interface TopHeaderProps {
  user: {
    name: string
    loginId: string
    role: 'ADMIN' | 'BRANCH'
  }
}

export default function TopHeader({ user }: TopHeaderProps) {
  const pathname = usePathname()

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Candidates', href: '/candidates' },
    { label: 'AI Assistant', href: '/chat' },
    { label: 'Categories', href: '/sectors' },
    ...(user.role === 'ADMIN' ? [{ label: 'Branches', href: '/admin/branches' }] : []),
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="px-4 sm:px-8 pt-3 pb-1 select-none z-20 shrink-0">
      <div className="bg-white/95 backdrop-blur-md border border-[#e2dcce]/90 rounded-full shadow-[0_2px_14px_-2px_rgba(36,33,31,0.04)] px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
        {/* Brand Left */}
        <Link href="/" className="flex items-center gap-2 pl-1 group shrink-0">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#e85d3f] to-[#f4d06f] text-white flex items-center justify-center font-black text-xs shadow-xs">
            IQ
          </div>
          <span className="font-extrabold text-[15px] text-[#24211f] tracking-tight">
            Resume<span className="text-[#e85d3f]">IQ</span>
          </span>
        </Link>

        {/* Center Pill Navigation */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar">
          {navLinks.map((link) => {
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-[#24211f] text-white shadow-xs'
                    : 'text-[#24211f]/75 hover:text-[#24211f] hover:bg-[#f3efe9]'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Right Corner: Quick Actions & Profile Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/search"
            className="w-8 h-8 rounded-full border border-[#e2dcce] flex items-center justify-center text-[#24211f]/70 hover:text-[#24211f] hover:bg-[#f3efe9] transition-colors"
            title="Search candidates"
            aria-label="Search"
          >
            <MagnifyingGlass weight="bold" className="w-3.5 h-3.5" />
          </Link>


          {/* User Profile Badge */}
          <Link
            href="/account"
            title={`Logged in as ${user.name} (${user.loginId})`}
            className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[#faf8f5] border border-[#e2dcce] hover:border-[#cdc3b2] hover:bg-[#f3efe9] transition-all shadow-2xs"
          >
            <span className="w-6 h-6 rounded-full bg-[#e85d3f] text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
              {initials}
            </span>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-[#24211f] leading-tight truncate max-w-[120px]">
                {user.name}
              </p>
              <p className="text-[10px] text-[#7e715f] font-medium leading-none flex items-center gap-1 mt-0.5">
                {user.role === 'ADMIN' ? (
                  <>
                    <ShieldCheck weight="fill" className="w-2.5 h-2.5 text-[#e85d3f] inline" /> Admin
                  </>
                ) : (
                  <>
                    <Storefront weight="fill" className="w-2.5 h-2.5 text-[#e85d3f] inline" /> {user.loginId}
                  </>
                )}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
}

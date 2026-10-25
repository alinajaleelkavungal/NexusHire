'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
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
  const { isDark } = useTheme()

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
      <div className="bg-white/95 dark:bg-[#1e1814]/95 backdrop-blur-md border border-[#e2dcce]/90 dark:border-[#352c25]/90 rounded-full shadow-[0_2px_14px_-2px_rgba(36,33,31,0.04)] dark:shadow-[0_2px_14px_-2px_rgba(0,0,0,0.4)] px-3 sm:px-4 py-2 flex items-center justify-between gap-3 transition-colors">
        {/* Brand Left */}
        <Link href="/" className="flex items-center gap-2 pl-1 group shrink-0" title="NexusHire · The Global Hub for Cross-Border Manpower">
          <Image
            src={isDark ? "/logo-dark.png" : "/logo.png"}
            alt="NexusHire · The Global Hub for Cross-Border Manpower"
            width={170}
            height={37}
            priority
            className="h-8 sm:h-8.5 w-auto object-contain transition-transform group-hover:scale-[1.02]"
          />
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
                    ? 'bg-[#24211f] dark:bg-[#e85d3f] text-white shadow-xs'
                    : 'text-[#24211f]/75 dark:text-[#f3eee8]/75 hover:text-[#24211f] dark:hover:text-white hover:bg-[#f3efe9] dark:hover:bg-[#2a221b]'
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
            className="w-8 h-8 rounded-full border border-[#e2dcce] dark:border-[#352c25] flex items-center justify-center text-[#24211f]/70 dark:text-[#f3eee8]/70 hover:text-[#24211f] dark:hover:text-white hover:bg-[#f3efe9] dark:hover:bg-[#2a221b] transition-colors"
            title="Search candidates"
            aria-label="Search"
          >
            <MagnifyingGlass weight="bold" className="w-3.5 h-3.5" />
          </Link>

          {/* User Profile Badge */}
          <Link
            href="/account"
            title={`Logged in as ${user.name} (${user.loginId})`}
            className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[#faf8f5] dark:bg-[#241c17] border border-[#e2dcce] dark:border-[#352c25] hover:border-[#cdc3b2] dark:hover:border-[#4d3f35] hover:bg-[#f3efe9] dark:hover:bg-[#2c221c] transition-all shadow-2xs"
          >
            <span className="w-6 h-6 rounded-full bg-[#e85d3f] text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
              {initials}
            </span>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-[#24211f] dark:text-[#f3eee8] leading-tight truncate max-w-[120px]">
                {user.name}
              </p>
              <p className="text-[10px] text-[#7e715f] dark:text-[#a89c8e] font-medium leading-none flex items-center gap-1 mt-0.5">
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

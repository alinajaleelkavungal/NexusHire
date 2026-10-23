'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  House, Users, Briefcase, SignOut, Key, Storefront, SquaresFour,
  CalendarBlank, MagnifyingGlass, MagicWand, Buildings, Sun, Moon,
  type Icon,
} from '@/components/icons'

interface NavItem {
  name: string
  href: string
  icon: Icon
  section: string
}

interface SidebarUser {
  name: string
  loginId: string
  role: 'ADMIN' | 'BRANCH'
}

export default function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isDark, setIsDark] = useState(false)

  const navItems: NavItem[] = [
    { name: 'Home', href: '/', icon: House, section: 'Talent' },
    { name: 'Candidates', href: '/candidates', icon: Users, section: 'Talent' },
    { name: 'Search', href: '/search', icon: MagnifyingGlass, section: 'Talent' },
    { name: 'AI Assistant', href: '/chat', icon: MagicWand, section: 'Talent' },
    { name: 'Category', href: '/sectors', icon: SquaresFour, section: 'Browse' },
    { name: 'Age', href: '/age', icon: CalendarBlank, section: 'Browse' },
    { name: 'Experience', href: '/experience', icon: Briefcase, section: 'Browse' },
    { name: 'Jobs', href: '/recruitment/jobs', icon: Buildings, section: 'Recruitment' },
    ...(user.role === 'ADMIN'
      ? [{ name: 'Branches', href: '/admin/branches', icon: Storefront, section: 'Admin' }]
      : []),
  ]

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside className="w-18 shrink-0 h-full flex flex-col items-center justify-between py-4 px-2 select-none z-30 overflow-x-hidden">
      {/* Top Capsule: Theme / Brand toggle */}
      <div className="flex flex-col items-center gap-2">
        <Link
          href="/"
          className="w-11 h-11 rounded-2xl bg-white border border-[#e2dcce] shadow-xs flex items-center justify-center hover:scale-105 transition-transform group"
          title="ResumeIQ Home"
        >
          <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#e85d3f] to-[#f4d06f] text-white font-black text-xs flex items-center justify-center shadow-xs">
            R
          </span>
        </Link>

        {/* Theme pill button */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="w-8 h-14 rounded-full bg-white border border-[#e2dcce] shadow-2xs flex flex-col items-center justify-between p-1.5 hover:border-[#cdc3b2] transition-colors"
          title="Toggle mode"
          aria-label="Toggle mode"
        >
          <div className={`p-1 rounded-full transition-colors ${!isDark ? 'text-[#b58933] bg-[#fdf7df]' : 'text-gray-400'}`}>
            <Sun weight="bold" className="w-3.5 h-3.5" />
          </div>
          <div className={`p-1 rounded-full transition-colors ${isDark ? 'text-[#e85d3f] bg-[#fdf3f0]' : 'text-[#7e715f]'}`}>
            <Moon weight="bold" className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      {/* Middle Capsule: Main Navigation Dock */}
      <nav
        aria-label="Main Navigation"
        className="bg-white border border-[#e2dcce] rounded-full shadow-[0_4px_20px_-2px_rgba(36,33,31,0.05)] py-3 px-1.5 flex flex-col items-center gap-1.5 max-h-[calc(100vh-210px)] overflow-y-auto overflow-x-hidden no-scrollbar"
      >
        {navItems.map((item) => {
          const active = isActive(item.href)
          const IconComponent = item.icon
          return (
            <div key={item.href} className="relative group shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  active
                    ? 'bg-[#24211f] text-white shadow-md scale-102'
                    : 'text-[#24211f]/65 hover:text-[#24211f] hover:bg-[#f3efe9]'
                }`}
                aria-label={item.name}
              >
                <IconComponent weight={active ? 'fill' : 'bold'} className="w-4.5 h-4.5" />
              </Link>

              {/* Floating Tooltip */}
              <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#24211f] text-white text-[11px] font-semibold rounded-md shadow-lg opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all whitespace-nowrap z-50">
                {item.name}
                <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-1 border-4 border-transparent border-r-[#24211f]" />
              </div>
            </div>
          )
        })}
      </nav>

      {/* Bottom Capsule: User & Session Actions */}
      <div className="bg-white border border-[#e2dcce] rounded-full shadow-[0_4px_16px_-2px_rgba(36,33,31,0.04)] py-2.5 px-1.5 flex flex-col items-center gap-1.5">
        <div className="relative group">
          <Link
            href="/account"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              pathname === '/account'
                ? 'bg-[#24211f] text-white shadow-md'
                : 'text-[#24211f]/65 hover:text-[#24211f] hover:bg-[#f3efe9]'
            }`}
            aria-label="Account Settings"
          >
            <Key weight="bold" className="w-4.5 h-4.5" />
          </Link>
          <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#24211f] text-white text-[11px] font-semibold rounded-md shadow-lg opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all whitespace-nowrap z-50">
            Account Settings
            <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-1 border-4 border-transparent border-r-[#24211f]" />
          </div>
        </div>

        <div className="relative group">
          <button
            onClick={logout}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#24211f]/65 hover:text-[#e85d3f] hover:bg-[#fdf3f0] transition-all"
            aria-label="Sign Out"
          >
            <SignOut weight="bold" className="w-4.5 h-4.5" />
          </button>
          <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#e85d3f] text-white text-[11px] font-semibold rounded-md shadow-lg opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all whitespace-nowrap z-50">
            Sign Out
            <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-1 border-4 border-transparent border-r-[#e85d3f]" />
          </div>
        </div>
      </div>
    </aside>
  )
}

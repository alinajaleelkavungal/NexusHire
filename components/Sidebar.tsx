'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import {
  House, Users, Experience, SignOut, Key, Branches, SquaresFour,
  Age, MagnifyingGlass, Jobs,
  type Icon,
} from '@/components/icons'

interface NavItem {
  name: string
  href: string
  icon: Icon
  section: 'Workspace' | 'Operations'
  subtitle: string
}

interface SidebarUser {
  name: string
  loginId: string
  role: 'ADMIN' | 'BRANCH'
}

function SidebarToggleIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-transform duration-200"
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M9 3v18" />
      {expanded ? (
        <path d="m15 15-3-3 3-3" />
      ) : (
        <path d="m13 9 3 3-3 3" />
      )}
    </svg>
  )
}

export default function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isDark } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexushire_sidebar_expanded')
      if (saved !== null) {
        setIsExpanded(saved === 'true')
      }
    } catch (_) {}
  }, [])

  const toggleExpanded = () => {
    setIsExpanded(prev => {
      const next = !prev
      try {
        localStorage.setItem('nexushire_sidebar_expanded', String(next))
      } catch (_) {}
      return next
    })
  }

  const navItems: NavItem[] = [
    {
      name: 'Home',
      href: '/',
      icon: House,
      section: 'Workspace',
      subtitle: 'Recruitment dashboard',
    },
    {
      name: 'Candidates',
      href: '/candidates',
      icon: Users,
      section: 'Workspace',
      subtitle: 'Talent profiles & pipeline',
    },
    {
      name: 'Search',
      href: '/search',
      icon: MagnifyingGlass,
      section: 'Workspace',
      subtitle: 'Find candidates & CVs',
    },
    {
      name: 'Category',
      href: '/sectors',
      icon: SquaresFour,
      section: 'Operations',
      subtitle: 'Browse industry sectors',
    },
    {
      name: 'Age',
      href: '/age',
      icon: Age,
      section: 'Operations',
      subtitle: 'Filter by candidate age',
    },
    {
      name: 'Experience',
      href: '/experience',
      icon: Experience,
      section: 'Operations',
      subtitle: 'Years of work experience',
    },
    {
      name: 'Jobs',
      href: '/recruitment/jobs',
      icon: Jobs,
      section: 'Operations',
      subtitle: 'Active vacancies & postings',
    },
    ...(user.role === 'ADMIN'
      ? [{
          name: 'Branches',
          href: '/admin/branches',
          icon: Branches,
          section: 'Operations' as const,
          subtitle: 'Manage branch accounts',
        }]
      : []),
  ]

  const homeItem = navItems[0]
  const otherWorkspaceItems = navItems.filter(item => item.section === 'Workspace' && item.href !== '/')
  const operationsItems = navItems.filter(item => item.section === 'Operations')

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
    <aside
      className={`shrink-0 h-full bg-white dark:bg-[#1e1814] border-r border-[#e2dcce] dark:border-[#352c25] flex flex-col justify-between select-none z-30 transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-64' : 'w-16'
      } overflow-visible`}
    >
      {/* ────────────────────────────────────────────────────────── */}
      {/* EXPANDED SIDEBAR VIEW (Full grouped menu mode)            */}
      {/* ────────────────────────────────────────────────────────── */}
      {isExpanded ? (
        <div className="w-full h-full flex flex-col justify-between overflow-hidden">
          {/* Top Section: Navigation Header */}
          <div className="shrink-0 h-14 px-4 border-b border-[#e2dcce] dark:border-[#352c25] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Link
                href="/"
                className="w-8 h-8 rounded-lg bg-[#faf8f5] dark:bg-[#241c17] border border-[#e2dcce] dark:border-[#352c25] p-1 flex items-center justify-center hover:scale-105 transition-transform"
                title="NexusHire"
              >
                <Image
                  src={isDark ? "/brand-mark-dark.png" : "/brand-mark.png"}
                  alt="NexusHire"
                  width={22}
                  height={22}
                  priority
                  className="w-full h-full object-contain"
                />
              </Link>
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#73675a] dark:text-[#a89c8e] uppercase font-jakarta">
                Navigation
              </span>
            </div>

            {/* Collapse Button */}
            <button
              onClick={toggleExpanded}
              className="w-7 h-7 rounded-md border border-[#e2dcce] dark:border-[#352c25] text-[#7e715f] dark:text-[#a89c8e] hover:text-[#24211f] dark:hover:text-white hover:bg-[#f3efe9] dark:hover:bg-[#2a221b] flex items-center justify-center transition-colors cursor-pointer"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <SidebarToggleIcon expanded={true} />
            </button>
          </div>

          {/* Center Main Menu: Grouped sections with full labels */}
          <nav
            aria-label="Expanded Navigation"
            className="w-full flex-1 p-3 overflow-y-auto no-scrollbar flex flex-col justify-between space-y-4"
          >
            <div className="space-y-4">
              {/* Group 1: WORKSPACE */}
              <div className="space-y-1">
                <span className="block text-[10px] font-bold tracking-[0.18em] text-[#8a7e70] dark:text-[#73675a] px-3 pt-1 pb-1.5 uppercase font-jakarta">
                  Workspace
                </span>
                {[homeItem, ...otherWorkspaceItems].map((item) => {
                  const active = isActive(item.href)
                  const IconComponent = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                        active
                          ? 'bg-[#e85d3f] text-white'
                          : 'text-[#24211f]/75 dark:text-[#f3eee8]/75 hover:text-[#24211f] dark:hover:text-white hover:bg-[#f3efe9] dark:hover:bg-[#261f1a]'
                      }`}
                    >
                      <IconComponent weight={active ? 'fill' : 'bold'} className="w-4.5 h-4.5 shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="truncate">{item.name}</span>
                        {!active && (
                          <span className="text-[10px] text-[#8a7e70] dark:text-[#73675a] font-normal leading-none mt-0.5">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Group 2: OPERATIONS */}
              <div className="space-y-1 pt-3 border-t border-[#f0ece1] dark:border-[#2d241d]">
                <span className="block text-[10px] font-bold tracking-[0.18em] text-[#8a7e70] dark:text-[#73675a] px-3 pt-1 pb-1.5 uppercase font-jakarta">
                  Operations
                </span>
                {operationsItems.map((item) => {
                  const active = isActive(item.href)
                  const IconComponent = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                        active
                          ? 'bg-[#e85d3f] text-white'
                          : 'text-[#24211f]/75 dark:text-[#f3eee8]/75 hover:text-[#24211f] dark:hover:text-white hover:bg-[#f3efe9] dark:hover:bg-[#261f1a]'
                      }`}
                    >
                      <IconComponent weight={active ? 'fill' : 'bold'} className="w-4.5 h-4.5 shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="truncate">{item.name}</span>
                        {!active && (
                          <span className="text-[10px] text-[#8a7e70] dark:text-[#73675a] font-normal leading-none mt-0.5">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Group 3: ADMIN & USER ACTIONS */}
            <div className="space-y-1 pt-3 border-t border-[#f0ece1] dark:border-[#2d241d] shrink-0 mt-auto">
              <span className="block text-[10px] font-bold tracking-[0.18em] text-[#8a7e70] dark:text-[#73675a] px-3 pt-1 pb-1.5 uppercase font-jakarta">
                Admin
              </span>

              <Link
                href="/account"
                aria-current={pathname === '/account' ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  pathname === '/account'
                    ? 'bg-[#e85d3f] text-white'
                    : 'text-[#24211f]/75 dark:text-[#f3eee8]/75 hover:text-[#24211f] dark:hover:text-white hover:bg-[#f3efe9] dark:hover:bg-[#261f1a]'
                }`}
              >
                <Key weight="bold" className="w-4.5 h-4.5 shrink-0" />
                <span className="truncate">Account Settings</span>
              </Link>

              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-[#24211f]/75 dark:text-[#f3eee8]/75 hover:text-[#e85d3f] hover:bg-[#fdf3f0] dark:hover:bg-[#331c17] transition-all cursor-pointer"
              >
                <SignOut weight="bold" className="w-4.5 h-4.5 shrink-0" />
                <span className="truncate">Sign Out</span>
              </button>
            </div>
          </nav>
        </div>
      ) : (
        /* ────────────────────────────────────────────────────────── */
        /* MINIMIZED SINGLE BAR VIEW (Matching user reference layout)  */
        /* ────────────────────────────────────────────────────────── */
        <div className="w-full h-full flex flex-col justify-between overflow-visible">
          {/* Top Section: 1. Brand Logo Cell + 2. Top Home Item Cell */}
          <div className="flex flex-col items-center shrink-0 w-full">
            {/* Top Cell 1: Brand Monogram Logo */}
            <div className="relative group w-full h-14 border-b border-[#e2dcce] dark:border-[#352c25] flex items-center justify-center">
              <Link
                href="/"
                className="w-9 h-9 rounded-lg bg-[#faf8f5] dark:bg-[#241c17] border border-[#e2dcce] dark:border-[#352c25] flex items-center justify-center hover:scale-105 transition-all p-1.5 cursor-pointer shadow-2xs"
                title="NexusHire"
              >
                <Image
                  src={isDark ? "/brand-mark-dark.png" : "/brand-mark.png"}
                  alt="NexusHire"
                  width={22}
                  height={22}
                  priority
                  className="w-full h-full object-contain"
                />
              </Link>

              {/* Hover Tooltip Pill (aligned flush to the right of the single bar) */}
              <div className="pointer-events-none opacity-0 scale-95 origin-left group-hover:opacity-100 group-hover:scale-100 absolute left-full ml-3 top-1/2 -translate-y-1/2 h-[42px] w-max rounded-full bg-[#342e29]/95 dark:bg-[#342e29]/95 backdrop-blur-md border border-[#4f443b] text-white shadow-2xl shadow-black/60 z-50 flex items-center gap-2.5 pl-2 pr-4 transition-all duration-200 ease-out whitespace-nowrap">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 p-1">
                  <Image
                    src={isDark ? "/brand-mark-dark.png" : "/brand-mark.png"}
                    alt=""
                    width={18}
                    height={18}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col text-left whitespace-nowrap">
                  <span className="text-[12.5px] font-bold text-white tracking-tight leading-tight">NexusHire</span>
                  <span className="text-[10px] font-normal text-[#a89c8e] leading-tight mt-0.5">Global Manpower Hub</span>
                </div>
              </div>
            </div>

            {/* Top Cell 2: First Workspace Option (Home) with matching border-b divider */}
            <div className="relative group w-full h-14 border-b border-[#e2dcce] dark:border-[#352c25] flex items-center justify-center">
              {(() => {
                const active = isActive(homeItem.href)
                const IconComponent = homeItem.icon
                return (
                  <>
                    <Link
                      href={homeItem.href}
                      aria-current={active ? 'page' : undefined}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                        active
                          ? 'bg-[#e85d3f] text-white shadow-xs'
                          : 'text-[#24211f]/65 dark:text-[#f3eee8]/65 hover:text-[#24211f] dark:hover:text-white hover:bg-[#f3efe9] dark:hover:bg-[#261f1a]'
                      }`}
                      aria-label={homeItem.name}
                    >
                      <IconComponent weight={active ? 'fill' : 'bold'} className="w-4.5 h-4.5" />
                    </Link>

                    {/* Hover Tooltip Pill */}
                    <Link
                      href={homeItem.href}
                      className="pointer-events-none group-hover:pointer-events-auto opacity-0 scale-95 origin-left group-hover:opacity-100 group-hover:scale-100 absolute left-full ml-3 top-1/2 -translate-y-1/2 h-[42px] w-max rounded-full bg-[#342e29]/95 dark:bg-[#342e29]/95 backdrop-blur-md border border-[#4f443b] text-white shadow-2xl shadow-black/60 z-50 flex items-center gap-2.5 pl-2.5 pr-4 transition-all duration-200 ease-out whitespace-nowrap cursor-pointer hover:border-[#e85d3f]/60"
                    >
                      {active ? (
                        <div className="w-7 h-7 rounded-full bg-[#e85d3f] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <IconComponent weight="fill" className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 flex items-center justify-center shrink-0 text-[#d8cec3] group-hover:text-white">
                          <IconComponent weight="bold" className="w-4.5 h-4.5" />
                        </div>
                      )}
                      <div className="flex flex-col text-left whitespace-nowrap">
                        <span className="text-[12.5px] font-bold text-white tracking-tight leading-tight">
                          {homeItem.name}
                        </span>
                        <span className="text-[10px] font-normal text-[#9e9285] dark:text-[#a89c8e] leading-tight mt-0.5">
                          {homeItem.subtitle}
                        </span>
                      </div>
                    </Link>
                  </>
                )
              })()}
            </div>
          </div>

          {/* Middle Section: Remaining Navigation Items in Single Unified Column */}
          <nav
            aria-label="Compact Navigation"
            className="flex-1 py-3 flex flex-col items-center gap-1.5 overflow-y-auto no-scrollbar w-full"
          >
            {/* Workspace remaining items (Candidates, Search) */}
            {otherWorkspaceItems.map((item) => {
              const active = isActive(item.href)
              const IconComponent = item.icon
              return (
                <div key={item.href} className="relative w-full h-10 flex items-center justify-center group shrink-0">
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                      active
                        ? 'bg-[#e85d3f] text-white shadow-xs'
                        : 'text-[#24211f]/65 dark:text-[#f3eee8]/65 hover:text-[#24211f] dark:hover:text-white hover:bg-[#f3efe9] dark:hover:bg-[#261f1a]'
                    }`}
                    aria-label={item.name}
                  >
                    <IconComponent weight={active ? 'fill' : 'bold'} className="w-4.5 h-4.5" />
                  </Link>

                  {/* Hover Tooltip Pill */}
                  <Link
                    href={item.href}
                    className="pointer-events-none group-hover:pointer-events-auto opacity-0 scale-95 origin-left group-hover:opacity-100 group-hover:scale-100 absolute left-full ml-3 top-1/2 -translate-y-1/2 h-[42px] w-max rounded-full bg-[#342e29]/95 dark:bg-[#342e29]/95 backdrop-blur-md border border-[#4f443b] text-white shadow-2xl shadow-black/60 z-50 flex items-center gap-2.5 pl-2.5 pr-4 transition-all duration-200 ease-out whitespace-nowrap cursor-pointer hover:border-[#e85d3f]/60"
                  >
                    {active ? (
                      <div className="w-7 h-7 rounded-full bg-[#e85d3f] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <IconComponent weight="fill" className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 flex items-center justify-center shrink-0 text-[#d8cec3] group-hover:text-white">
                        <IconComponent weight="bold" className="w-4.5 h-4.5" />
                      </div>
                    )}
                    <div className="flex flex-col text-left whitespace-nowrap">
                      <span className="text-[12.5px] font-bold text-white tracking-tight leading-tight">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-normal text-[#9e9285] dark:text-[#a89c8e] leading-tight mt-0.5">
                        {item.subtitle}
                      </span>
                    </div>
                  </Link>
                </div>
              )
            })}

            {/* Subtle Group Divider */}
            <div className="w-8 h-px bg-[#e2dcce] dark:bg-[#352c25] my-1 shrink-0" />

            {/* Operations items (Category, Age, Experience, Jobs, Branches) */}
            {operationsItems.map((item) => {
              const active = isActive(item.href)
              const IconComponent = item.icon
              return (
                <div key={item.href} className="relative w-full h-10 flex items-center justify-center group shrink-0">
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                      active
                        ? 'bg-[#e85d3f] text-white shadow-xs'
                        : 'text-[#24211f]/65 dark:text-[#f3eee8]/65 hover:text-[#24211f] dark:hover:text-white hover:bg-[#f3efe9] dark:hover:bg-[#261f1a]'
                    }`}
                    aria-label={item.name}
                  >
                    <IconComponent weight={active ? 'fill' : 'bold'} className="w-4.5 h-4.5" />
                  </Link>

                  {/* Hover Tooltip Pill */}
                  <Link
                    href={item.href}
                    className="pointer-events-none group-hover:pointer-events-auto opacity-0 scale-95 origin-left group-hover:opacity-100 group-hover:scale-100 absolute left-full ml-3 top-1/2 -translate-y-1/2 h-[42px] w-max rounded-full bg-[#342e29]/95 dark:bg-[#342e29]/95 backdrop-blur-md border border-[#4f443b] text-white shadow-2xl shadow-black/60 z-50 flex items-center gap-2.5 pl-2.5 pr-4 transition-all duration-200 ease-out whitespace-nowrap cursor-pointer hover:border-[#e85d3f]/60"
                  >
                    {active ? (
                      <div className="w-7 h-7 rounded-full bg-[#e85d3f] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <IconComponent weight="fill" className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 flex items-center justify-center shrink-0 text-[#d8cec3] group-hover:text-white">
                        <IconComponent weight="bold" className="w-4.5 h-4.5" />
                      </div>
                    )}
                    <div className="flex flex-col text-left whitespace-nowrap">
                      <span className="text-[12.5px] font-bold text-white tracking-tight leading-tight">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-normal text-[#9e9285] dark:text-[#a89c8e] leading-tight mt-0.5">
                        {item.subtitle}
                      </span>
                    </div>
                  </Link>
                </div>
              )
            })}
          </nav>

          {/* Bottom Section: Account Settings + Sign Out + Pinned Toggle Cell */}
          <div className="flex flex-col items-center shrink-0 w-full">
            {/* Account Settings & Sign Out */}
            <div className="w-full pt-2 pb-2 border-t border-[#e2dcce] dark:border-[#352c25] flex flex-col items-center gap-1.5">
              {/* Account Settings */}
              <div className="relative w-full h-10 flex items-center justify-center group shrink-0">
                <Link
                  href="/account"
                  aria-current={pathname === '/account' ? 'page' : undefined}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    pathname === '/account'
                      ? 'bg-[#e85d3f] text-white shadow-xs'
                      : 'text-[#24211f]/70 dark:text-[#f3eee8]/70 hover:text-[#24211f] dark:hover:text-white hover:bg-[#f3efe9] dark:hover:bg-[#261f1a]'
                  }`}
                  title="Account Settings"
                  aria-label="Account Settings"
                >
                  <Key weight="bold" className="w-4.5 h-4.5" />
                </Link>

                {/* Hover Tooltip Pill */}
                <Link
                  href="/account"
                  className="pointer-events-none group-hover:pointer-events-auto opacity-0 scale-95 origin-left group-hover:opacity-100 group-hover:scale-100 absolute left-full ml-3 top-1/2 -translate-y-1/2 h-[42px] w-max rounded-full bg-[#342e29]/95 dark:bg-[#342e29]/95 backdrop-blur-md border border-[#4f443b] text-white shadow-2xl shadow-black/60 z-50 flex items-center gap-2.5 pl-2.5 pr-4 transition-all duration-200 ease-out whitespace-nowrap cursor-pointer hover:border-[#e85d3f]/60"
                >
                  <div className="w-7 h-7 flex items-center justify-center shrink-0 text-[#d8cec3] group-hover:text-white">
                    <Key weight="bold" className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex flex-col text-left whitespace-nowrap">
                    <span className="text-[12.5px] font-bold text-white tracking-tight leading-snug">Account Settings</span>
                    <span className="text-[10px] font-normal text-[#a89c8e] leading-tight mt-0.5">Profile & credentials</span>
                  </div>
                </Link>
              </div>

              {/* Sign Out Button */}
              <div className="relative w-full h-10 flex items-center justify-center group shrink-0">
                <button
                  onClick={logout}
                  className="w-9 h-9 rounded-lg text-[#24211f]/65 dark:text-[#f3eee8]/65 hover:text-[#e85d3f] hover:bg-[#fdf3f0] dark:hover:bg-[#331c17] transition-all flex items-center justify-center cursor-pointer"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <SignOut weight="bold" className="w-4.5 h-4.5" />
                </button>

                {/* Hover Tooltip Pill */}
                <div
                  onClick={logout}
                  className="pointer-events-none group-hover:pointer-events-auto opacity-0 scale-95 origin-left group-hover:opacity-100 group-hover:scale-100 absolute left-full ml-3 top-1/2 -translate-y-1/2 h-[42px] w-max rounded-full bg-[#342e29]/95 dark:bg-[#342e29]/95 backdrop-blur-md border border-[#4f443b] text-white shadow-2xl shadow-black/60 z-50 flex items-center gap-2.5 pl-2.5 pr-4 transition-all duration-200 ease-out whitespace-nowrap cursor-pointer hover:border-[#e85d3f]/60"
                >
                  <div className="w-7 h-7 flex items-center justify-center shrink-0 text-[#e85d3f]">
                    <SignOut weight="bold" className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex flex-col text-left whitespace-nowrap">
                    <span className="text-[12.5px] font-bold text-white tracking-tight leading-snug">Sign Out</span>
                    <span className="text-[10px] font-normal text-[#a89c8e] leading-tight mt-0.5">End current session</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom-most Pinned Cell: Expand Menu Toggle (matching bottom cell in reference image) */}
            <div className="relative group w-full h-14 border-t border-[#e2dcce] dark:border-[#352c25] flex items-center justify-center">
              <button
                onClick={toggleExpanded}
                className="w-full h-full flex items-center justify-center text-[#7e715f] dark:text-[#a89c8e] hover:text-[#24211f] dark:hover:text-white hover:bg-[#f3efe9] dark:hover:bg-[#2a221b] transition-colors cursor-pointer"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <SidebarToggleIcon expanded={false} />
              </button>

              {/* Hover Tooltip Pill */}
              <div
                onClick={toggleExpanded}
                className="pointer-events-none group-hover:pointer-events-auto opacity-0 scale-95 origin-left group-hover:opacity-100 group-hover:scale-100 absolute left-full ml-3 top-1/2 -translate-y-1/2 h-[42px] w-max rounded-full bg-[#342e29]/95 dark:bg-[#342e29]/95 backdrop-blur-md border border-[#4f443b] text-white shadow-2xl shadow-black/60 z-50 flex items-center gap-2.5 pl-2.5 pr-4 transition-all duration-200 ease-out whitespace-nowrap cursor-pointer hover:border-[#e85d3f]/60"
              >
                <div className="w-7 h-7 text-[#e85d3f] flex items-center justify-center shrink-0">
                  <SidebarToggleIcon expanded={false} />
                </div>
                <div className="flex flex-col text-left whitespace-nowrap">
                  <span className="text-[12.5px] font-bold text-white tracking-tight leading-tight">Expand Menu</span>
                  <span className="text-[10px] font-normal text-[#a89c8e] leading-tight mt-0.5">Click to view full sidebar</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

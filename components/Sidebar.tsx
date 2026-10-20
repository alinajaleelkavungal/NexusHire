'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, Users, Briefcase, LogOut, KeyRound, ShieldCheck, Store, LayoutGrid, Calendar, Search, MessageSquare, Building2,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Talent',
    items: [
      { name: 'Home', href: '/', icon: Home },
      { name: 'Candidates', href: '/candidates', icon: Users },
      { name: 'Search', href: '/search', icon: Search },
      { name: 'AI Assistant', href: '/chat', icon: MessageSquare },
    ],
  },
  {
    label: 'Browse by',
    items: [
      { name: 'Sectors', href: '/sectors', icon: LayoutGrid },
      { name: 'Age', href: '/age', icon: Calendar },
      { name: 'Experience', href: '/experience', icon: Briefcase },
    ],
  },
  {
    label: 'Recruitment',
    items: [{ name: 'Jobs', href: '/recruitment/jobs', icon: Building2 }],
  },
]

interface SidebarUser {
  name: string
  loginId: string
  role: 'ADMIN' | 'BRANCH'
}

const ADMIN_SECTION = {
  label: 'Administration',
  items: [{ name: 'Branches', href: '/admin/branches', icon: Store }],
}

export default function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const sections = user.role === 'ADMIN' ? [...NAV_SECTIONS, ADMIN_SECTION] : NAV_SECTIONS

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-200 text-gray-600 h-full flex flex-col py-5 px-3 max-md:w-16 max-md:px-2">
      <Link
        href="/candidates"
        className="flex items-baseline gap-0.5 px-3 mt-1 mb-9 max-md:px-0 max-md:justify-center"
        aria-label="ResumeIQ home"
      >
        <span className="text-xl font-extrabold text-gray-900 tracking-tight max-md:hidden">Resume</span>
        <span className="text-xl font-extrabold text-green-600 tracking-tight max-md:hidden">IQ</span>
        <span className="hidden max-md:block text-base font-extrabold text-gray-900">R<span className="text-green-600">IQ</span></span>
      </Link>

      <nav className="flex-1 overflow-y-auto space-y-6" aria-label="Main">
        {sections.map(section => (
          <div key={section.label}>
            <p className="px-3 mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 max-md:hidden">
              {section.label}
            </p>
            <ul className="space-y-px">
              {section.items.map(item => {
                const active = isActive(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.name}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 pl-3 pr-3 py-2 rounded-sm text-[13.5px] font-medium border-l-2 transition-colors max-md:justify-center ${
                        active
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="max-md:hidden">{item.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-200 pt-3 mt-3 space-y-px">
        <div className="flex items-center gap-2.5 px-3 py-2 max-md:justify-center">
          <span className="w-8 h-8 shrink-0 rounded-sm bg-green-100 text-green-700 flex items-center justify-center text-xs font-semibold">
            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 max-md:hidden">
            <p className="text-[13.5px] font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              {user.role === 'ADMIN' ? <><ShieldCheck className="w-3 h-3" /> Admin</> : <>Branch · {user.loginId}</>}
            </p>
          </div>
        </div>
        <Link
          href="/account"
          title="Change password"
          className="flex items-center gap-3 px-3 py-2 rounded-sm text-[13.5px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors max-md:justify-center"
        >
          <KeyRound className="w-[18px] h-[18px] shrink-0 text-gray-500" />
          <span className="max-md:hidden">Change password</span>
        </Link>
        <button
          onClick={logout}
          title="Sign out"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-[13.5px] font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors max-md:justify-center"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0 text-gray-500" />
          <span className="max-md:hidden">Sign out</span>
        </button>
      </div>
    </aside>
  )
}

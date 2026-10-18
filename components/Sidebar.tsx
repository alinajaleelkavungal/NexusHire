'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users, Briefcase, LayoutGrid, Calendar, Search, MessageSquare, Kanban, Building2, Sparkles,
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
      { name: 'Candidates', href: '/candidates', icon: Users },
      { name: 'Pipeline', href: '/board', icon: Kanban },
      { name: 'Search', href: '/search', icon: Search },
      { name: 'AI Assistant', href: '/chat', icon: MessageSquare },
    ],
  },
  {
    label: 'Recruitment',
    items: [{ name: 'Jobs', href: '/recruitment/jobs', icon: Building2 }],
  },
  {
    label: 'Browse by',
    items: [
      { name: 'Sectors', href: '/sectors', icon: LayoutGrid },
      { name: 'Age', href: '/age', icon: Calendar },
      { name: 'Experience', href: '/experience', icon: Briefcase },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-gray-200 h-full flex flex-col p-4 max-md:w-16 max-md:px-2">
      <Link
        href="/candidates"
        className="flex items-center gap-2.5 px-3 mt-2 mb-8 max-md:px-0 max-md:justify-center"
        aria-label="ResumeIQ home"
      >
        <span className="w-9 h-9 rounded-xl bg-green-600 text-white flex items-center justify-center shadow-sm">
          <Sparkles className="w-5 h-5" />
        </span>
        <span className="text-lg font-bold text-gray-900 tracking-tight max-md:hidden">ResumeIQ</span>
      </Link>

      <nav className="flex-1 overflow-y-auto space-y-6" aria-label="Main">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 max-md:hidden">
              {section.label}
            </p>
            <ul className="space-y-1">
              {section.items.map(item => {
                const active = isActive(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.name}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors max-md:justify-center ${
                        active
                          ? 'bg-green-50 text-green-700 ring-1 ring-green-100'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
    </aside>
  )
}

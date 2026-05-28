import Link from 'next/link'
import SignOutButton from './SignOutButton'

const NAV = [
  {
    group: 'Overview',
    items: [
      { href: '/dashboard', label: 'Home', color: '#f0f0f0', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    ]
  },
  {
    group: 'Tracking',
    items: [
      { href: '/dashboard/goals', label: 'Goals', color: '#6366f1', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
      { href: '/dashboard/calories', label: 'Calories', color: '#f43f5e', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
      { href: '/dashboard/sleep', label: 'Sleep & Energy', color: '#818cf8', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
      { href: '/dashboard/fitness', label: 'Fitness', color: '#f97316', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    ]
  },
  {
    group: 'Planning',
    items: [
      { href: '/dashboard/calendar', label: 'Calendar', color: '#14b8a6', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { href: '/dashboard/finance', label: 'Finance', color: '#22c55e', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/dashboard/chat', label: 'Assistant', color: '#a855f7', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    ]
  }
]

export default function DesktopSidebar({ email }: { email: string }) {
  return (
    <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col bg-[#0d0d0d] border-r border-[#161616]">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#161616]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-[#6366f1]/20">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm text-white">Life OS</p>
            <p className="text-[10px] text-[#4b5563]">Personal Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {NAV.map(group => (
          <div key={group.group}>
            <p className="text-[10px] font-semibold text-[#374151] uppercase tracking-wider px-2 mb-1.5">{group.group}</p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[#6b7280] hover:text-white hover:bg-[#161616] transition-all text-sm font-medium group"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-all group-hover:bg-opacity-20" style={{ backgroundColor: item.color + '15' }}>
                    <svg className="w-3.5 h-3.5 transition-colors" style={{ color: item.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                    </svg>
                  </div>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-[#161616]">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-lg bg-[#111111]">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {email.charAt(0).toUpperCase()}
          </div>
          <p className="text-[11px] text-[#6b7280] truncate">{email}</p>
        </div>
        <SignOutButton />
      </div>
    </aside>
  )
}

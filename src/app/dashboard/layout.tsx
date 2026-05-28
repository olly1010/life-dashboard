import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SignOutButton from './_components/SignOutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <aside className="w-52 flex-shrink-0 flex flex-col bg-[#0f0f0f] border-r border-[#1a1a1a]">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#6366f1]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#6366f1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-semibold text-sm text-white">Life Dashboard</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-medium text-[#3a3a3a] uppercase tracking-wider px-3 py-1.5">Tracking</p>
          <NavItem href="/dashboard/goals" color="#6366f1" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />}>Goals</NavItem>
          <NavItem href="/dashboard/calories" color="#f43f5e" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />}>Calories</NavItem>
          <NavItem href="/dashboard/sleep" color="#6366f1" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />}>Sleep & Energy</NavItem>

          <p className="text-[10px] font-medium text-[#3a3a3a] uppercase tracking-wider px-3 py-1.5 mt-2">Planning</p>
          <NavItem href="/dashboard/calendar" color="#14b8a6" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}>Calendar</NavItem>
          <NavItem href="/dashboard/chat" color="#a855f7" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />}>Assistant</NavItem>
        </nav>

        {/* User */}
        <div className="px-2 py-4 border-t border-[#1a1a1a]">
          <div className="px-2 py-1.5 mb-1">
            <p className="text-[11px] text-[#4b5563] truncate">{user.email}</p>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}

function NavItem({ href, icon, children, color }: { href: string; icon: React.ReactNode; children: React.ReactNode; color: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#6b7280] hover:text-white hover:bg-[#1a1a1a] transition-colors text-sm font-medium group">
      <svg className="w-4 h-4 flex-shrink-0 transition-colors group-hover:text-current" style={{ '--hover-color': color } as React.CSSProperties} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {icon}
      </svg>
      {children}
    </Link>
  )
}

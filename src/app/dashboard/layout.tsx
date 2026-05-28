import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MobileSidebar from './_components/MobileSidebar'
import DesktopSidebar from './_components/DesktopSidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-[#080808] overflow-hidden">
      <DesktopSidebar email={user.email ?? ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileSidebar email={user.email ?? ''} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

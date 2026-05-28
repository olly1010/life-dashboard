import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name = user.email?.split('@')[0] ?? 'there'

  const [
    { data: activeGoals },
    { data: meals },
    { data: targets },
    { data: lastSleep },
    { data: todayStimulants },
    { data: recentWorkout },
  ] = await Promise.all([
    supabase.from('goals').select('id').eq('user_id', user.id).eq('completed', false),
    supabase.from('meals').select('calories, protein, carbs, fat').eq('user_id', user.id).eq('date', today),
    supabase.from('daily_targets').select('calories, protein').eq('user_id', user.id).single(),
    supabase.from('sleep_logs').select('duration_hours, quality, wake_time').eq('user_id', user.id).order('date', { ascending: false }).limit(1).single(),
    supabase.from('stimulant_logs').select('caffeine_mg').eq('user_id', user.id).eq('date', today),
    supabase.from('workout_sessions').select('name, date, duration_minutes').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
  ])

  const totalCal = (meals ?? []).reduce((a, m) => a + m.calories, 0)
  const totalProtein = (meals ?? []).reduce((a, m) => a + m.protein, 0)
  const calTarget = targets?.calories ?? 2000
  const proteinTarget = targets?.protein ?? 150
  const totalCaffeine = (todayStimulants ?? []).reduce((a, s) => a + s.caffeine_mg, 0)
  const calPct = Math.min(100, (totalCal / calTarget) * 100)
  const proteinPct = Math.min(100, (totalProtein / proteinTarget) * 100)

  const CARDS = [
    { href: '/dashboard/goals', label: 'Goals', color: '#6366f1', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', stat: `${activeGoals?.length ?? 0} active`, sub: 'goals' },
    { href: '/dashboard/calories', label: 'Calories', color: '#f43f5e', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', stat: `${Math.round(totalCal)}`, sub: `of ${calTarget} kcal` },
    { href: '/dashboard/sleep', label: 'Sleep', color: '#818cf8', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z', stat: lastSleep?.duration_hours ? `${lastSleep.duration_hours}h` : '—', sub: 'last night' },
    { href: '/dashboard/fitness', label: 'Fitness', color: '#f97316', icon: 'M13 10V3L4 14h7v7l9-11h-7z', stat: recentWorkout?.name ?? 'No recent', sub: recentWorkout?.date === today ? 'today' : recentWorkout?.date ?? 'workout' },
    { href: '/dashboard/calendar', label: 'Calendar', color: '#14b8a6', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', stat: `${totalCaffeine}mg`, sub: 'caffeine today' },
    { href: '/dashboard/chat', label: 'Assistant', color: '#a855f7', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', stat: 'Ask me', sub: 'anything' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          {greeting}, <span className="capitalize">{name}</span>
        </h1>
        <p className="text-[#9ca3af] mt-1">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3">
          <p className="text-xs text-[#9ca3af] mb-1">Calories</p>
          <div className="flex items-end gap-1 mb-1.5">
            <p className="text-xl font-bold text-white">{Math.round(totalCal)}</p>
            <p className="text-xs text-[#6b7280] mb-0.5">/ {calTarget}</p>
          </div>
          <div className="h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${calPct}%` }} />
          </div>
        </div>
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3">
          <p className="text-xs text-[#9ca3af] mb-1">Protein</p>
          <div className="flex items-end gap-1 mb-1.5">
            <p className="text-xl font-bold text-white">{Math.round(totalProtein)}g</p>
            <p className="text-xs text-[#6b7280] mb-0.5">/ {proteinTarget}g</p>
          </div>
          <div className="h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${proteinPct}%` }} />
          </div>
        </div>
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3">
          <p className="text-xs text-[#9ca3af] mb-1">Sleep</p>
          <p className="text-xl font-bold text-white">{lastSleep?.duration_hours ?? '—'}<span className="text-sm text-[#6b7280]">{lastSleep ? 'h' : ''}</span></p>
          <p className="text-xs text-[#6b7280] mt-1">{lastSleep?.quality ? '★'.repeat(lastSleep.quality) : 'Not logged'}</p>
        </div>
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3">
          <p className="text-xs text-[#9ca3af] mb-1">Caffeine</p>
          <p className="text-xl font-bold text-white">{totalCaffeine}<span className="text-sm text-[#6b7280]">mg</span></p>
          <p className="text-xs text-[#6b7280] mt-1">{totalCaffeine > 400 ? '⚠ High' : totalCaffeine > 0 ? 'Today' : 'None today'}</p>
        </div>
      </div>

      {/* Nav cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CARDS.map(card => (
          <Link key={card.href} href={card.href}
            className="bg-[#111111] border border-[#1f1f1f] hover:border-[#2a2a2a] rounded-xl p-4 transition-all group hover:bg-[#141414]">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.color + '18' }}>
                <svg className="w-4 h-4" style={{ color: card.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={card.icon} />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#9ca3af] group-hover:text-white transition-colors">{card.label}</p>
            </div>
            <p className="text-2xl font-bold text-white">{card.stat}</p>
            <p className="text-xs text-[#6b7280] mt-0.5">{card.sub}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

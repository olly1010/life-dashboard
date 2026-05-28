import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendarClient from './_components/CalendarClient'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [{ data: sixthform }, { data: tasks }, { data: sleepLog }, { data: stimulants }] = await Promise.all([
    supabase.from('sixthform_schedule').select('*').eq('user_id', user.id).order('day_of_week').order('start_time'),
    supabase.from('calendar_events').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('sleep_logs').select('duration_hours,quality').eq('user_id', user.id).order('date', { ascending: false }).limit(1).single(),
    supabase.from('stimulant_logs').select('caffeine_mg,logged_time').eq('user_id', user.id).eq('date', today),
  ])

  return (
    <CalendarClient
      sixthform={sixthform ?? []}
      tasks={tasks ?? []}
      sleepData={sleepLog ?? null}
      todayStimulants={stimulants ?? []}
    />
  )
}

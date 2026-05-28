import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SleepClient from './_components/SleepClient'

export default async function SleepPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [{ data: sleepLogs }, { data: todayStimulants }, { data: allStimulants }] = await Promise.all([
    supabase.from('sleep_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(14),
    supabase.from('stimulant_logs').select('*').eq('user_id', user.id).eq('date', today).order('logged_time'),
    supabase.from('stimulant_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
  ])

  return <SleepClient sleepLogs={sleepLogs ?? []} todayStimulants={todayStimulants ?? []} allStimulants={allStimulants ?? []} />
}

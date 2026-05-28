import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GoalsClient from './_components/GoalsClient'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: goals } = await supabase
    .from('goals')
    .select('*, subtasks(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <GoalsClient goals={goals ?? []} />
}

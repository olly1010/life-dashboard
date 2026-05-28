import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CaloriesClient from './_components/CaloriesClient'

const DEFAULT_TARGETS = { calories: 2000, protein: 150, carbs: 250, fat: 65 }

export default async function CaloriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [{ data: meals }, { data: targetsRow }] = await Promise.all([
    supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('created_at', { ascending: true }),
    supabase
      .from('daily_targets')
      .select('*')
      .eq('user_id', user.id)
      .single(),
  ])

  const targets = targetsRow ?? DEFAULT_TARGETS

  return <CaloriesClient meals={meals ?? []} targets={targets} />
}

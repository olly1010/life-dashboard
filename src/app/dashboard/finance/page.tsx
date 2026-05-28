import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FinanceClient from './_components/FinanceClient'

export default async function FinancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: snapshots }, { data: transactions }] = await Promise.all([
    supabase.from('balance_snapshots').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
  ])

  return <FinanceClient snapshots={snapshots ?? []} transactions={transactions ?? []} />
}

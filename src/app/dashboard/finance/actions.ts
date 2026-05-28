'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addSnapshot(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('balance_snapshots').insert({
    user_id: user.id,
    date: formData.get('date') as string || new Date().toISOString().split('T')[0],
    balance: parseFloat(formData.get('balance') as string),
    notes: (formData.get('notes') as string) || null,
  })
  revalidatePath('/dashboard/finance')
}

export async function addTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('transactions').insert({
    user_id: user.id,
    date: formData.get('date') as string || new Date().toISOString().split('T')[0],
    name: formData.get('name') as string,
    amount: parseFloat(formData.get('amount') as string),
    type: formData.get('type') as string,
    category: (formData.get('category') as string) || 'general',
  })
  revalidatePath('/dashboard/finance')
}

export async function deleteTransaction(id: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/finance')
}

export async function deleteSnapshot(id: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('balance_snapshots').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/finance')
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function logSleep(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const bedtime = formData.get('bedtime') as string
  const wake_time = formData.get('wake_time') as string

  let duration_hours: number | null = null
  if (bedtime && wake_time) {
    const [bh, bm] = bedtime.split(':').map(Number)
    const [wh, wm] = wake_time.split(':').map(Number)
    let mins = (wh * 60 + wm) - (bh * 60 + bm)
    if (mins < 0) mins += 24 * 60
    duration_hours = Math.round((mins / 60) * 100) / 100
  }

  const date = formData.get('date') as string || new Date().toISOString().split('T')[0]

  await supabase.from('sleep_logs').upsert({
    user_id: user.id,
    date,
    bedtime: bedtime || null,
    wake_time: wake_time || null,
    duration_hours,
    quality: Number(formData.get('quality')) || null,
    notes: (formData.get('notes') as string) || null,
    source: 'manual',
  }, { onConflict: 'user_id,date' })

  revalidatePath('/dashboard/sleep')
}

export async function logStimulant(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('stimulant_logs').insert({
    user_id: user.id,
    date: new Date().toISOString().split('T')[0],
    logged_time: formData.get('logged_time') as string,
    name: formData.get('name') as string,
    caffeine_mg: Number(formData.get('caffeine_mg')) || 0,
  })

  revalidatePath('/dashboard/sleep')
}

export async function deleteStimulant(id: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('stimulant_logs').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/sleep')
}

export async function deleteSleep(id: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('sleep_logs').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/sleep')
}

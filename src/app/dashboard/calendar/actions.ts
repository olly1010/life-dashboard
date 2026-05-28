'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveSixthformSlot(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('sixthform_schedule').insert({
    user_id: user.id,
    day_of_week: Number(formData.get('day_of_week')),
    start_time: formData.get('start_time') as string,
    end_time: formData.get('end_time') as string,
    subject: formData.get('subject') as string,
    type: formData.get('type') as string,
  })

  revalidatePath('/dashboard/calendar')
}

export async function deleteSixthformSlot(id: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('sixthform_schedule').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/calendar')
}

export async function addTask(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('calendar_events').insert({
    user_id: user.id,
    title: formData.get('title') as string,
    duration_minutes: Number(formData.get('duration_minutes')) || 60,
    category: formData.get('category') as string || 'personal',
    priority: Number(formData.get('priority')) || 2,
    is_fixed: false,
  })

  revalidatePath('/dashboard/calendar')
}

export async function saveScheduledEvents(events: Array<{
  title: string; date: string; start_time: string; end_time: string; category: string; is_fixed: boolean
}>) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  for (const event of events) {
    await supabase.from('calendar_events').upsert({
      user_id: user.id,
      ...event,
      ai_scheduled: true,
    }, { onConflict: 'user_id,title,date' })
  }

  revalidatePath('/dashboard/calendar')
}

export async function deleteTask(id: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('calendar_events').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/calendar')
}

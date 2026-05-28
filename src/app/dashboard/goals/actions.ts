'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addGoal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('goals').insert({
    user_id: user.id,
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    target_date: (formData.get('target_date') as string) || null,
    category: (formData.get('category') as string) || 'personal',
  })

  revalidatePath('/dashboard/goals')
}

export async function toggleGoal(goalId: string, completed: boolean) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('goals').update({ completed }).eq('id', goalId).eq('user_id', user.id)
  revalidatePath('/dashboard/goals')
}

export async function deleteGoal(goalId: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('goals').delete().eq('id', goalId).eq('user_id', user.id)
  revalidatePath('/dashboard/goals')
}

export async function addSubtask(goalId: string, title: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('subtasks').insert({ goal_id: goalId, title })
  revalidatePath('/dashboard/goals')
}

export async function toggleSubtask(subtaskId: string, completed: boolean) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('subtasks').update({ completed }).eq('id', subtaskId)
  revalidatePath('/dashboard/goals')
}

export async function deleteSubtask(subtaskId: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('subtasks').delete().eq('id', subtaskId)
  revalidatePath('/dashboard/goals')
}

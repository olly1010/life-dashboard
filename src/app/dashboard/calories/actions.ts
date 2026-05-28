'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addMeal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('meals').insert({
    user_id: user.id,
    date: new Date().toISOString().split('T')[0],
    name: formData.get('name') as string,
    calories: Number(formData.get('calories')) || 0,
    protein: Number(formData.get('protein')) || 0,
    carbs: Number(formData.get('carbs')) || 0,
    fat: Number(formData.get('fat')) || 0,
  })

  revalidatePath('/dashboard/calories')
}

export async function deleteMeal(mealId: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('meals').delete().eq('id', mealId).eq('user_id', user.id)

  revalidatePath('/dashboard/calories')
}

export async function saveTargets(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('daily_targets').upsert({
    user_id: user.id,
    calories: Number(formData.get('calories')) || 2000,
    protein: Number(formData.get('protein')) || 150,
    carbs: Number(formData.get('carbs')) || 250,
    fat: Number(formData.get('fat')) || 65,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  revalidatePath('/dashboard/calories')
}

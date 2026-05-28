'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addExercise(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('exercises').insert({
    user_id: user.id,
    name: formData.get('name') as string,
    muscle_group: formData.get('muscle_group') as string,
    is_bodyweight: formData.get('is_bodyweight') === 'true',
  })
  revalidatePath('/dashboard/fitness')
}

export async function createTemplate(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data } = await supabase.from('workout_templates').insert({
    user_id: user.id,
    name: formData.get('name') as string,
  }).select().single()

  revalidatePath('/dashboard/fitness')
  return data
}

export async function deleteTemplate(id: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('workout_templates').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/fitness')
}

export async function startSession(templateId: string | null, name: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data } = await supabase.from('workout_sessions').insert({
    user_id: user.id,
    name,
    started_at: new Date().toISOString(),
    template_id: templateId || null,
  }).select().single()

  revalidatePath('/dashboard/fitness')
  return data
}

export async function endSession(sessionId: string, durationMinutes: number) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('workout_sessions').update({
    ended_at: new Date().toISOString(),
    duration_minutes: durationMinutes,
  }).eq('id', sessionId).eq('user_id', user.id)

  revalidatePath('/dashboard/fitness')
}

export async function addSet(sessionId: string, exerciseName: string, muscleGroup: string, reps: number, weightKg: number | null, isBodyweight: boolean) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: existing } = await supabase.from('workout_sets')
    .select('set_number').eq('session_id', sessionId).eq('exercise_name', exerciseName)
    .order('set_number', { ascending: false }).limit(1).single()

  await supabase.from('workout_sets').insert({
    session_id: sessionId,
    exercise_name: exerciseName,
    muscle_group: muscleGroup,
    set_number: (existing?.set_number ?? 0) + 1,
    reps,
    weight_kg: weightKg,
    is_bodyweight: isBodyweight,
  })
  revalidatePath('/dashboard/fitness')
}

export async function deleteSet(id: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('workout_sets').delete().eq('id', id)
  revalidatePath('/dashboard/fitness')
}

export async function logRun(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const distanceKm = parseFloat(formData.get('distance_km') as string) || null
  const durationMin = parseFloat(formData.get('duration_minutes') as string) || null
  const pace = distanceKm && durationMin ? Math.round((durationMin / distanceKm) * 100) / 100 : null

  await supabase.from('running_sessions').insert({
    user_id: user.id,
    date: formData.get('date') as string || new Date().toISOString().split('T')[0],
    distance_km: distanceKm,
    duration_minutes: durationMin,
    avg_pace_min_per_km: pace,
    avg_heart_rate: parseFloat(formData.get('avg_heart_rate') as string) || null,
    calories: parseInt(formData.get('calories') as string) || null,
    notes: (formData.get('notes') as string) || null,
    source: 'manual',
  })
  revalidatePath('/dashboard/fitness')
}

export async function deleteRun(id: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('running_sessions').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/fitness')
}

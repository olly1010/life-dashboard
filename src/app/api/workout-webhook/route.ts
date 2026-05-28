import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const body = await request.json()
  const date = new Date().toISOString().split('T')[0]

  const workouts = Array.isArray(body) ? body : [body]

  for (const w of workouts) {
    await supabase.from('workouts').insert({
      user_id: user?.id,
      date: w.startDate?.split('T')[0] ?? date,
      workout_type: w.workoutActivityType ?? w.type ?? null,
      duration_minutes: w.duration ?? null,
      active_calories: w.activeEnergyBurned ?? w.calories ?? null,
      distance_km: w.totalDistance ?? w.distanceKm ?? null,
      avg_heart_rate: w.averageHeartRate ?? null,
      max_heart_rate: w.maximumHeartRate ?? null,
      source: 'health_auto_export',
      raw_data: w,
    })
  }

  return NextResponse.json({ ok: true })
}

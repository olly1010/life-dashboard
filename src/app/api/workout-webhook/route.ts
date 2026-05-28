import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const userId = process.env.WEBHOOK_USER_ID
  if (!userId) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const body = await request.json()
  const date = new Date().toISOString().split('T')[0]

  const workouts = Array.isArray(body) ? body : body.workouts ?? [body]

  const inserts = workouts.map((w: Record<string, unknown>) => ({
    user_id: userId,
    date: (w.startDate as string)?.split('T')[0] ?? date,
    workout_type: w.workoutActivityType ?? w.type ?? null,
    duration_minutes: w.duration ?? null,
    active_calories: w.activeEnergyBurned ?? w.calories ?? null,
    distance_km: w.totalDistance ?? w.distanceKm ?? null,
    avg_heart_rate: w.averageHeartRate ?? null,
    max_heart_rate: w.maximumHeartRate ?? null,
    source: 'health_auto_export',
    raw_data: w,
  }))

  const { error } = await supabase.from('workouts').insert(inserts)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, count: inserts.length })
}

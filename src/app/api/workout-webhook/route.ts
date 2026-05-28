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

  // Health Auto Export format: body.data.workouts = [{name, start, end, duration, activeEnergyBurned, ...}]
  const workouts: Array<Record<string, unknown>> = body?.data?.workouts ?? []

  if (workouts.length === 0) {
    return NextResponse.json({ ok: true, count: 0, message: 'No workouts in payload' })
  }

  const inserts = workouts.map(w => {
    // start format: "2026-05-28 18:03:40 +0100" — grab just the date part
    const startStr = (w.start as string) ?? ''
    const date = startStr.split(' ')[0] ?? new Date().toISOString().split('T')[0]

    // duration is in seconds
    const durationMins = w.duration ? Math.round((w.duration as number) / 60) : null

    // activeEnergyBurned is { qty, units } in kJ — convert to kcal
    const energyObj = w.activeEnergyBurned as { qty: number; units: string } | null
    const activeCalories = energyObj?.qty ? Math.round(energyObj.qty * 0.239) : null

    return {
      user_id: userId,
      date,
      workout_type: w.name ?? null,
      duration_minutes: durationMins,
      active_calories: activeCalories,
      distance_km: null,
      avg_heart_rate: null,
      max_heart_rate: null,
      source: 'health_auto_export',
      raw_data: w,
    }
  })

  const { error } = await supabase.from('workouts').insert(inserts)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, count: inserts.length })
}

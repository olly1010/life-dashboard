import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const body = await request.json()

  // Health Auto Export sends data keyed by metric name
  const date = new Date().toISOString().split('T')[0]

  const record: Record<string, unknown> = {
    user_id: user?.id,
    date,
    source: 'health_auto_export',
    raw_data: body,
  }

  // Map Health Auto Export field names to our schema
  if (body.sleep?.asleep) record.sleep_hours = body.sleep.asleep
  if (body.sleep?.deep) record.deep_sleep_hours = body.sleep.deep
  if (body.sleep?.rem) record.rem_sleep_hours = body.sleep.rem
  if (body.heartRateVariability) record.hrv = body.heartRateVariability
  if (body.restingHeartRate) record.resting_hr = body.restingHeartRate
  if (body.stepCount) record.steps = body.stepCount
  if (body.activeEnergyBurned) record.active_calories = body.activeEnergyBurned

  await supabase.from('health_data').upsert(record, { onConflict: 'user_id,date' })

  return NextResponse.json({ ok: true })
}

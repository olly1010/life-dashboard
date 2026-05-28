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

  const record: Record<string, unknown> = {
    user_id: userId,
    date,
    source: 'health_auto_export',
    raw_data: body,
  }

  if (body.sleep?.asleep !== undefined) record.sleep_hours = body.sleep.asleep
  if (body.sleep?.deep !== undefined) record.deep_sleep_hours = body.sleep.deep
  if (body.sleep?.rem !== undefined) record.rem_sleep_hours = body.sleep.rem
  if (body.heartRateVariability !== undefined) record.hrv = body.heartRateVariability
  if (body.restingHeartRate !== undefined) record.resting_hr = body.restingHeartRate
  if (body.stepCount !== undefined) record.steps = body.stepCount
  if (body.activeEnergyBurned !== undefined) record.active_calories = body.activeEnergyBurned

  const { error } = await supabase
    .from('health_data')
    .upsert(record, { onConflict: 'user_id,date' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

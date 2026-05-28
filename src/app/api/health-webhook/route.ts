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

  // Health Auto Export format: body.data.metrics = [{name, units, data: [{qty, date}]}]
  const metrics: Array<{ name: string; units: string; data: Array<{ qty: number; date: string }> }> =
    body?.data?.metrics ?? []

  function getMetric(name: string) {
    return metrics.find(m => m.name === name)
  }

  function sumMetric(name: string) {
    const m = getMetric(name)
    if (!m) return null
    return m.data.reduce((a, d) => a + (d.qty ?? 0), 0)
  }

  function avgMetric(name: string) {
    const m = getMetric(name)
    if (!m || m.data.length === 0) return null
    return m.data.reduce((a, d) => a + (d.qty ?? 0), 0) / m.data.length
  }

  function lastMetric(name: string) {
    const m = getMetric(name)
    if (!m || m.data.length === 0) return null
    return m.data[m.data.length - 1].qty
  }

  // Convert kJ to kcal
  const activeEnergyKj = sumMetric('active_energy')
  const activeCalories = activeEnergyKj != null ? Math.round(activeEnergyKj * 0.239) : null

  const steps = sumMetric('step_count')
  const restingHr = lastMetric('resting_heart_rate')
  const hrv = avgMetric('heart_rate_variability_sdnn')

  // Sleep: look for sleep_analysis metric
  const sleepMetric = getMetric('sleep_analysis')
  let sleepHours: number | null = null
  let deepSleepHours: number | null = null
  let remSleepHours: number | null = null

  if (sleepMetric) {
    const asleep = sleepMetric.data.filter(d => (d as unknown as Record<string,string>).value === 'asleep' || (d as unknown as Record<string,string>).sleepStage === 'asleep')
    const deep = sleepMetric.data.filter(d => (d as unknown as Record<string,string>).value === 'deep' || (d as unknown as Record<string,string>).sleepStage === 'deep')
    const rem = sleepMetric.data.filter(d => (d as unknown as Record<string,string>).value === 'rem' || (d as unknown as Record<string,string>).sleepStage === 'rem')
    if (asleep.length > 0) sleepHours = Math.round(asleep.reduce((a, d) => a + d.qty, 0) * 10) / 10
    if (deep.length > 0) deepSleepHours = Math.round(deep.reduce((a, d) => a + d.qty, 0) * 10) / 10
    if (rem.length > 0) remSleepHours = Math.round(rem.reduce((a, d) => a + d.qty, 0) * 10) / 10
    // Fallback: total qty if no stage filtering
    if (!sleepHours && sleepMetric.data.length > 0) {
      sleepHours = Math.round(sleepMetric.data.reduce((a, d) => a + d.qty, 0) * 10) / 10
    }
  }

  const record = {
    user_id: userId,
    date,
    source: 'health_auto_export',
    raw_data: body,
    ...(steps != null && { steps: Math.round(steps) }),
    ...(activeCalories != null && { active_calories: activeCalories }),
    ...(restingHr != null && { resting_hr: restingHr }),
    ...(hrv != null && { hrv: Math.round(hrv * 10) / 10 }),
    ...(sleepHours != null && { sleep_hours: sleepHours }),
    ...(deepSleepHours != null && { deep_sleep_hours: deepSleepHours }),
    ...(remSleepHours != null && { rem_sleep_hours: remSleepHours }),
  }

  const { error } = await supabase
    .from('health_data')
    .upsert(record, { onConflict: 'user_id,date' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, extracted: { steps, activeCalories, restingHr, hrv, sleepHours } })
}

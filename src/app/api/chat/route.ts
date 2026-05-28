import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message } = await request.json()
  const today = new Date().toISOString().split('T')[0]

  // Fetch user's data for context
  const [
    { data: goals },
    { data: meals },
    { data: sleepLogs },
    { data: stimulants },
    { data: history },
    { data: targets },
    { data: healthData },
  ] = await Promise.all([
    supabase.from('goals').select('title, category, completed, target_date').eq('user_id', user.id).limit(20),
    supabase.from('meals').select('name, calories, protein, carbs, fat').eq('user_id', user.id).eq('date', today),
    supabase.from('sleep_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(7),
    supabase.from('stimulant_logs').select('*').eq('user_id', user.id).eq('date', today),
    supabase.from('chat_messages').select('role, content').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('daily_targets').select('*').eq('user_id', user.id).single(),
    supabase.from('health_data').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(7),
  ])

  const todayMacros = (meals ?? []).reduce((a, m) => ({
    cal: a.cal + m.calories, p: a.p + m.protein, c: a.c + m.carbs, f: a.f + m.fat
  }), { cal: 0, p: 0, c: 0, f: 0 })

  const lastSleep = sleepLogs?.[0]

  const systemPrompt = `You are the user's personal AI assistant integrated into their Life Dashboard. You have access to their real data. Be concise, friendly, and data-driven. Use their actual numbers when relevant.

TODAY: ${today}

GOALS (${goals?.length ?? 0} total):
${(goals ?? []).map(g => `- [${g.category}] ${g.title} ${g.completed ? '✓' : '○'} ${g.target_date ? `(due ${g.target_date})` : ''}`).join('\n')}

TODAY'S NUTRITION: ${Math.round(todayMacros.cal)} kcal / ${targets?.calories ?? 2000} target | P:${Math.round(todayMacros.p)}g C:${Math.round(todayMacros.c)}g F:${Math.round(todayMacros.f)}g

LAST 7 NIGHTS SLEEP:
${(sleepLogs ?? []).map(s => `- ${s.date}: ${s.duration_hours}h, quality ${s.quality}/5, HRV: ${s.hrv ?? 'N/A'}, RHR: ${s.resting_hr ?? 'N/A'}`).join('\n')}

TODAY'S STIMULANTS: ${(stimulants ?? []).map(s => `${s.name} (${s.caffeine_mg}mg at ${s.logged_time})`).join(', ') || 'None logged'}

RECENT HEALTH DATA (Apple Watch):
${(healthData ?? []).map(h => `- ${h.date}: ${h.sleep_hours}h sleep, HRV ${h.hrv}, RHR ${h.resting_hr}, ${h.steps} steps, ${h.active_calories} active cal`).join('\n')}

Answer the user's question using their data above. If asked for recommendations, be specific to their actual numbers. Keep responses under 200 words unless a detailed breakdown is needed.`

  // Save user message
  await supabase.from('chat_messages').insert({ user_id: user.id, role: 'user', content: message })

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...((history ?? []).reverse().map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))),
    { role: 'user' as const, content: message },
  ]

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 500,
  })

  const reply = response.choices[0].message.content ?? 'Sorry, I had trouble responding.'

  // Save assistant reply
  await supabase.from('chat_messages').insert({ user_id: user.id, role: 'assistant', content: reply })

  return NextResponse.json({ reply })
}

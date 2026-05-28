import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { food } = await request.json()
  if (!food) return NextResponse.json({ error: 'No food provided' }, { status: 400 })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `Estimate nutritional values for: "${food}". Assume a typical single serving. Return ONLY valid JSON with these exact keys: name (string, cleaned food name), calories (integer), protein (number, 1 decimal), carbs (number, 1 decimal), fat (number, 1 decimal). No markdown, no explanation.`
    }],
    response_format: { type: 'json_object' },
    max_tokens: 150,
  })

  const data = JSON.parse(response.choices[0].message.content!)
  return NextResponse.json(data)
}

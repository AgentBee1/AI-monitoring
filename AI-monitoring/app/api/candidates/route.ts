import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('ai_incident_monitoring')
    .select(`
      id,
      source_url,
      summary,
      status,
      created_at,
      updated_at,
      agents (
        id,
        agency_name,
        jurisdiction,
        country,
        website,
        risk_tier
      )
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })

  // If completed — delete it
  if (status === 'completed' || status === 'dismissed') {
    const { error } = await supabase
      .from('ai_incident_monitoring')
      .delete()
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ deleted: true })
  }

  // Otherwise update status
  const { error } = await supabase
    .from('ai_incident_monitoring')
    .update({ status })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

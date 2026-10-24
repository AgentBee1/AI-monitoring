import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'

const ALLOWED = new Set(['new', 'in_progress', 'completed', 'dismissed'])

// Leads are never deleted: the weekly sector scan skips URLs already in the table, so a deleted
// lead would be re-found and re-added. Dismissed leads are just hidden from the queue.
export async function PATCH(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await req.json().catch(() => ({}))
  if (!id || !ALLOWED.has(status)) {
    return NextResponse.json({ error: 'Missing id or invalid status' }, { status: 400 })
  }

  const { error } = await supabase
    .from('ai_sector_leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'

const EDGE_FUNCTION_URL = `${process.env.SUPABASE_URL}/functions/v1/agent-monitoring`
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dryRun, limit } = await req.json().catch(() => ({ dryRun: false, limit: null }))

  const params = new URLSearchParams()
  if (dryRun) params.set('dry_run', 'true')
  if (limit) params.set('limit', String(limit))

  const url = `${EDGE_FUNCTION_URL}${params.toString() ? '?' + params.toString() : ''}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  })

  const data = await response.json()
  return NextResponse.json(data)
}

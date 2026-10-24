import { supabase } from '@/lib/supabase'

export type LeadStatus = 'new' | 'in_progress' | 'completed' | 'dismissed'
export type LeadCategory = 'misconduct' | 'corporate' | 'partnership' | 'award' | 'new_entrant' | 'aggregator'

export interface MatchedAgent {
  id: string
  agency_name: string
  country: string | null
  risk_tier: string | null
  risk_tier_color: string | null
}

export interface Lead {
  id: string
  category: LeadCategory
  jurisdiction: string | null
  candidate_agent_name_raw: string | null
  match_confidence: 'confirmed' | 'likely' | 'unmatched'
  summary: string
  source_url: string
  status: LeadStatus
  created_at: string
  agent: MatchedAgent | null
  clients: string[] // client institutions that authorise the matched agent (or any of its variants)
}

// Client institutions per canonical agent id. Agents can have variant rows pointing at a
// canonical record, and client links live in BOTH link tables, so we check all of them.
async function getClientsByAgent(canonicalIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, Set<string>>()
  if (canonicalIds.length === 0) return new Map()

  const idList = canonicalIds.join(',')
  const { data: variants, error: vErr } = await supabase
    .from('agents')
    .select('id, canonical_agent_id')
    .or(`id.in.(${idList}),canonical_agent_id.in.(${idList})`)
  if (vErr) throw vErr

  const toCanonical = new Map<string, string>()
  for (const v of variants ?? []) toCanonical.set(v.id, v.canonical_agent_id ?? v.id)
  const variantIds = Array.from(toCanonical.keys())
  if (variantIds.length === 0) return new Map()

  const [a, b] = await Promise.all([
    supabase
      .from('agent_institution_links')
      .select('agent_id, is_active, institutions!inner(name, is_client, status)')
      .in('agent_id', variantIds),
    supabase
      .from('institution_agent_links')
      .select('agent_id, institutions!inner(name, is_client, status)')
      .in('agent_id', variantIds),
  ])
  if (a.error) throw a.error
  if (b.error) throw b.error

  const rows = [
    ...(a.data ?? []).filter((r: any) => r.is_active !== false),
    ...(b.data ?? []),
  ] as any[]

  for (const r of rows) {
    const inst = Array.isArray(r.institutions) ? r.institutions[0] : r.institutions
    if (!inst) continue
    const isClient = inst.is_client === true || inst.status === 'Client'
    if (!isClient) continue
    const canonical = toCanonical.get(r.agent_id)
    if (!canonical) continue
    if (!out.has(canonical)) out.set(canonical, new Set())
    out.get(canonical)!.add(inst.name)
  }

  return new Map(Array.from(out, ([k, v]) => [k, Array.from(v).sort()] as [string, string[]]))
}

export async function getLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('ai_sector_leads')
    .select(`
      id, category, jurisdiction, candidate_agent_name_raw, match_confidence,
      summary, source_url, status, created_at,
      agent:candidate_agent_id ( id, agency_name, country, risk_tier, risk_tier_color )
    `)
    .neq('status', 'dismissed')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw error

  const leads = (data ?? []).map((r: any) => ({
    ...r,
    agent: Array.isArray(r.agent) ? r.agent[0] ?? null : r.agent ?? null,
    clients: [] as string[],
  })) as Lead[]

  const agentIds = Array.from(new Set(leads.map(l => l.agent?.id).filter(Boolean) as string[]))
  const clientsByAgent = await getClientsByAgent(agentIds)
  for (const l of leads) {
    if (l.agent) l.clients = clientsByAgent.get(l.agent.id) ?? []
  }

  return leads
}

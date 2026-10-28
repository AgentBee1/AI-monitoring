import { supabase } from '@/lib/supabase'

export type LeadStatus = 'new' | 'in_progress' | 'completed' | 'dismissed'
export type LeadCategory = 'misconduct' | 'corporate' | 'partnership' | 'award' | 'new_entrant' | 'aggregator'

export interface MatchedAgent {
  id: string
  agency_name: string
  country: string | null
  risk_tier: string | null
  risk_tier_color: string | null
  website: string | null
}

export interface Lead {
  id: string
  category: LeadCategory
  jurisdiction: string | null
  candidate_agent_name_raw: string | null
  match_confidence: 'confirmed' | 'likely' | 'unmatched'
  summary: string
  agency_website: string | null // found by the scan for named agencies not in our agents table
  source_url: string
  status: LeadStatus
  created_at: string
  agent: MatchedAgent | null
  clients: string[] // client institutions that authorise the matched agent (or any of its variants)
  radarClients: string[] // client institutions with the agent on Risk Radar (linked, not authorised)
}

// Client institutions per canonical agent id, split into authorised and Risk Radar.
// Agents can have variant rows pointing at a canonical record, so all variants are checked.
// Single source of truth: institution_agent_links (link_type 'authorised' | 'linked').
type ClientSplit = { authorised: string[]; radar: string[] }

async function getClientsByAgent(canonicalIds: string[]): Promise<Map<string, ClientSplit>> {
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

  const { data, error } = await supabase
    .from('institution_agent_links')
    .select('agent_id, link_type, institutions!inner(name, status)')
    .in('agent_id', variantIds)
  if (error) throw error

  const auth = new Map<string, Set<string>>()
  const radar = new Map<string, Set<string>>()
  for (const r of (data ?? []) as any[]) {
    const inst = Array.isArray(r.institutions) ? r.institutions[0] : r.institutions
    if (!inst || inst.status !== 'Client') continue
    const canonical = toCanonical.get(r.agent_id)
    if (!canonical) continue
    const bucket = r.link_type === 'authorised' ? auth : radar
    if (!bucket.has(canonical)) bucket.set(canonical, new Set())
    bucket.get(canonical)!.add(inst.name)
  }

  const out = new Map<string, ClientSplit>()
  for (const id of Array.from(new Set(Array.from(auth.keys()).concat(Array.from(radar.keys()))))) {
    const a = auth.get(id) ?? new Set<string>()
    const r = Array.from(radar.get(id) ?? []).filter(n => !a.has(n)) // authorised wins
    out.set(id, { authorised: Array.from(a).sort(), radar: r.sort() })
  }
  return out
}

export async function getLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('ai_sector_leads')
    .select(`
      id, category, jurisdiction, candidate_agent_name_raw, match_confidence,
      summary, agency_website, source_url, status, created_at,
      agent:candidate_agent_id ( id, agency_name, country, risk_tier, risk_tier_color, website )
    `)
    .neq('status', 'dismissed')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw error

  const leads = (data ?? []).map((r: any) => ({
    ...r,
    agent: Array.isArray(r.agent) ? r.agent[0] ?? null : r.agent ?? null,
    clients: [] as string[],
    radarClients: [] as string[],
  })) as Lead[]

  const agentIds = Array.from(new Set(leads.map(l => l.agent?.id).filter(Boolean) as string[]))
  const clientsByAgent = await getClientsByAgent(agentIds)
  for (const l of leads) {
    const split = l.agent ? clientsByAgent.get(l.agent.id) : undefined
    if (split) { l.clients = split.authorised; l.radarClients = split.radar }
  }

  return leads
}

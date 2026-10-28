'use client'

import { useMemo, useRef, useState } from 'react'
import AppHeader from './AppHeader'
import type { Lead, LeadCategory, LeadStatus } from '@/lib/leads'

// ---------------------------------------------------------------------------
// Display config
// ---------------------------------------------------------------------------

const CATEGORIES: { id: LeadCategory; label: string; badge: string; dot: string }[] = [
  { id: 'misconduct', label: 'Misconduct', badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  { id: 'corporate', label: 'Corporate', badge: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  { id: 'partnership', label: 'Partnership', badge: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  { id: 'award', label: 'Award', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { id: 'new_entrant', label: 'New entrant', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  { id: 'aggregator', label: 'Aggregator', badge: 'bg-stone-100 text-stone-700 border-stone-300', dot: 'bg-stone-500' },
]
const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c])) as Record<LeadCategory, (typeof CATEGORIES)[number]>
const CATEGORY_ORDER = Object.fromEntries(CATEGORIES.map((c, i) => [c.id, i])) as Record<LeadCategory, number>

const JURISDICTIONS: Record<string, string> = {
  AU: 'Australia', CA: 'Canada', UK: 'United Kingdom', US: 'United States',
  CN: 'China', VN: 'Vietnam', BD: 'Bangladesh', NP: 'Nepal',
}

const STATUS_TABS: { id: Exclude<LeadStatus, 'dismissed'>; label: string }[] = [
  { id: 'new', label: 'To review' },
  { id: 'in_progress', label: 'Following up' },
  { id: 'completed', label: 'Done' },
]

const STATUS_VERB: Record<LeadStatus, string> = {
  new: 'Moved back to review',
  in_progress: 'Moved to following up',
  completed: 'Marked done',
  dismissed: 'Dismissed',
}

function domainOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

// Leads that touch a client's agent (authorised or Risk Radar) are the most important, then matched agents,
// then by category (misconduct first), then newest.
const touches = (l: Lead) => l.clients.length > 0 || l.radarClients.length > 0

function sortLeads(a: Lead, b: Lead) {
  const rank = (l: Lead) => (touches(l) ? 0 : l.agent ? 1 : 2)
  return rank(a) - rank(b)
    || CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]
    || b.created_at.localeCompare(a.created_at)
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

interface Toast { message: string; undo?: () => void }

export default function LeadsDashboard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [status, setStatus] = useState<Exclude<LeadStatus, 'dismissed'>>('new')
  const [category, setCategory] = useState<LeadCategory | 'all'>('all')
  const [matchedOnly, setMatchedOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { new: 0, in_progress: 0, completed: 0 }
    for (const l of leads) if (l.status in c) c[l.status]++
    return c
  }, [leads])

  const inStatus = useMemo(() => leads.filter(l => l.status === status), [leads, status])

  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const l of inStatus) c[l.category] = (c[l.category] ?? 0) + 1
    return c
  }, [inStatus])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return inStatus
      .filter(l => category === 'all' || l.category === category)
      .filter(l => !matchedOnly || !!l.agent)
      .filter(l => !q
        || l.summary.toLowerCase().includes(q)
        || (l.candidate_agent_name_raw ?? '').toLowerCase().includes(q)
        || (l.agent?.agency_name ?? '').toLowerCase().includes(q)
        || domainOf(l.source_url).includes(q))
      .sort(sortLeads)
  }, [inStatus, category, matchedOnly, query])

  const clientHits = inStatus.filter(touches).length
  const matched = inStatus.filter(l => !!l.agent).length

  function showToast(t: Toast) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(t)
    toastTimer.current = setTimeout(() => setToast(null), 6000)
  }

  async function patch(id: string, next: LeadStatus) {
    const res = await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: next }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText)
  }

  async function move(lead: Lead, next: LeadStatus) {
    const prev = lead.status
    const set = (s: LeadStatus) => setLeads(ls => ls.map(l => (l.id === lead.id ? { ...l, status: s } : l)))

    set(next) // optimistic
    try {
      await patch(lead.id, next)
      showToast({
        message: STATUS_VERB[next],
        undo: async () => {
          set(prev)
          setToast(null)
          try { await patch(lead.id, prev) } catch (e: any) { set(next); showToast({ message: `Undo failed: ${e.message}` }) }
        },
      })
    } catch (e: any) {
      set(prev)
      showToast({ message: `Couldn't save: ${e.message}` })
    }
  }

  const showGroups = category === 'all'
  const groups = showGroups
    ? CATEGORIES.map(c => ({ cat: c, items: visible.filter(l => l.category === c.id) })).filter(g => g.items.length)
    : [{ cat: CATEGORY_BY_ID[category as LeadCategory], items: visible }]

  // When grouping, keep client-linked leads in a pinned section on top so they're never missed.
  const pinned = showGroups ? visible.filter(touches) : []
  const pinnedIds = new Set(pinned.map(l => l.id))

  return (
    <div className="min-h-screen bg-stone-50">
      <AppHeader active="leads" subtitle="Sector scan · Weekly, Fri 6am" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Status tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {STATUS_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setStatus(t.id); setCategory('all') }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${
                status === t.id
                  ? 'bg-white border-stone-300 text-stone-900 shadow-sm'
                  : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-white/60'
              }`}
            >
              {t.label}
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded-full ${
                status === t.id ? 'bg-amber-100 text-amber-800' : 'bg-stone-200/70 text-stone-500'
              }`}>
                {statusCounts[t.id]}
              </span>
            </button>
          ))}

          <div className="ml-auto flex items-center gap-3 text-xs font-mono text-stone-500">
            {clientHits > 0 && (
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {clientHits} involve client agents
              </span>
            )}
            <span>{matched} matched</span>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl bg-white border border-stone-200 shadow-sm p-3 mb-6 flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={category === 'all'} onClick={() => setCategory('all')} label="All" count={inStatus.length} />
            {CATEGORIES.map(c => (
              <FilterChip
                key={c.id}
                active={category === c.id}
                onClick={() => setCategory(c.id)}
                label={c.label}
                count={categoryCounts[c.id] ?? 0}
                dot={c.dot}
              />
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1">
              <svg className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
              </svg>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search agency, summary or source"
                className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-9 pr-3 py-2 text-sm placeholder-stone-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-stone-600 select-none cursor-pointer px-1">
              <input
                type="checkbox"
                checked={matchedOnly}
                onChange={e => setMatchedOnly(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-400"
              />
              Matched to our agents only
            </label>
          </div>
        </div>

        {/* List */}
        {visible.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🐝</p>
            <p className="text-stone-500 text-sm">
              {inStatus.length === 0
                ? status === 'new' ? 'Nothing to review. The next scan runs Friday 6am.' : 'Nothing here yet.'
                : 'No leads match these filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {pinned.length > 0 && (
              <section>
                <SectionHeading label="Your clients' agents" count={pinned.length} dot="bg-amber-500" />
                <div className="space-y-3">
                  {pinned.map(l => <LeadCard key={l.id} lead={l} onMove={move} />)}
                </div>
              </section>
            )}
            {groups.map(g => {
              const items = g.items.filter(l => !pinnedIds.has(l.id))
              if (items.length === 0) return null
              return (
                <section key={g.cat.id}>
                  {showGroups && <SectionHeading label={g.cat.label} count={items.length} dot={g.cat.dot} />}
                  <div className="space-y-3">
                    {items.map(l => <LeadCard key={l.id} lead={l} onMove={move} />)}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 rounded-lg bg-stone-900 text-white text-sm px-4 py-3 shadow-lg">
          <span>{toast.message}</span>
          {toast.undo && (
            <button onClick={toast.undo} className="font-semibold text-brand-yellow hover:text-white">
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function FilterChip({ active, onClick, label, count, dot }: {
  active: boolean; onClick: () => void; label: string; count: number; dot?: string
}) {
  const empty = count === 0 && !active
  return (
    <button
      onClick={onClick}
      disabled={empty}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
        active
          ? 'bg-stone-900 text-white border-stone-900'
          : empty
            ? 'border-stone-200 text-stone-300 cursor-default'
            : 'border-stone-200 text-stone-600 hover:border-stone-400'
      }`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : dot} ${empty ? 'opacity-40' : ''}`} />}
      {label}
      <span className={`font-mono ${active ? 'text-stone-300' : 'text-stone-400'}`}>{count}</span>
    </button>
  )
}

function SectionHeading({ label, count, dot }: { label: string; count: number; dot: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-1">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</h2>
      <span className="text-xs font-mono text-stone-400">{count}</span>
    </div>
  )
}

function LeadCard({ lead, onMove }: { lead: Lead; onMove: (l: Lead, s: LeadStatus) => void }) {
  const cat = CATEGORY_BY_ID[lead.category]
  const name = lead.candidate_agent_name_raw
  const where = lead.jurisdiction ? (JURISDICTIONS[lead.jurisdiction] ?? lead.jurisdiction) : 'Global'
  const touchesClients = touches(lead)

  return (
    <article className={`rounded-xl border bg-white shadow-sm transition-all hover:shadow-md ${
      touchesClients ? 'border-amber-300 ring-1 ring-amber-100' : 'border-stone-200'
    }`}>
      <div className="p-4 sm:p-5">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 mb-2.5 text-xs">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border font-medium ${cat.badge}`}>
            {cat.label}
          </span>
          <span className="font-mono text-stone-400">{where}</span>
          <span className="text-stone-300">·</span>
          <span className="font-mono text-stone-400">{formatDate(lead.created_at)}</span>
        </div>

        {/* Agency */}
        <h3 className={`text-base font-semibold leading-snug mb-1 ${name ? 'text-stone-900' : 'text-stone-400 italic font-medium'}`}>
          {name ?? 'No single agency named'}
        </h3>

        {/* Match */}
        {lead.agent ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs mb-3">
            <span className="inline-flex items-center gap-1.5 text-stone-700">
              <span
                className="w-2 h-2 rounded-full border border-black/10"
                style={{ backgroundColor: lead.agent.risk_tier_color ?? '#d6d3d1' }}
                title={lead.agent.risk_tier ?? undefined}
              />
              In our database as <strong className="font-semibold">{lead.agent.agency_name}</strong>
            </span>
            <span className={`font-mono px-1.5 py-0.5 rounded ${
              lead.match_confidence === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {lead.match_confidence === 'confirmed' ? 'confirmed match' : 'likely match, check'}
            </span>
          </div>
        ) : lead.match_confidence === 'likely' ? (
          <p className="text-xs text-amber-700 mb-3">Several possible matches in our database — check by name.</p>
        ) : name ? (
          <p className="text-xs text-stone-400 mb-3">Not in our database</p>
        ) : <div className="mb-2" />}

        {touchesClients && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mb-3 text-xs text-amber-900">
            {lead.clients.length > 0 && (
              <div>
                <span className="font-semibold">Authorised by {lead.clients.length} client{lead.clients.length > 1 ? 's' : ''}:</span>{' '}
                {lead.clients.join(', ')}
              </div>
            )}
            {lead.radarClients.length > 0 && (
              <div className={lead.clients.length > 0 ? 'mt-1' : ''}>
                <span className="font-semibold">On Risk Radar of {lead.radarClients.length} client{lead.radarClients.length > 1 ? 's' : ''}:</span>{' '}
                {lead.radarClients.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        <p className="text-sm text-stone-600 leading-relaxed mb-3">{lead.summary}</p>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
          <a
            href={lead.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-700 hover:text-amber-900 min-w-0"
          >
            <span className="truncate max-w-[16rem]">{domainOf(lead.source_url)}</span>
            <svg className="w-3 h-3 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          <div className="flex items-center gap-1.5">
            {lead.status === 'new' && (
              <>
                <ActionButton onClick={() => onMove(lead, 'dismissed')}>Dismiss</ActionButton>
                <ActionButton primary onClick={() => onMove(lead, 'in_progress')}>Follow up</ActionButton>
              </>
            )}
            {lead.status === 'in_progress' && (
              <>
                <ActionButton onClick={() => onMove(lead, 'dismissed')}>Dismiss</ActionButton>
                <ActionButton success onClick={() => onMove(lead, 'completed')}>✓ Done</ActionButton>
              </>
            )}
            {lead.status === 'completed' && (
              <ActionButton onClick={() => onMove(lead, 'in_progress')}>Reopen</ActionButton>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

function ActionButton({ children, onClick, primary, success }: {
  children: React.ReactNode; onClick: () => void; primary?: boolean; success?: boolean
}) {
  const cls = primary
    ? 'bg-brand-yellow text-stone-900 hover:bg-brand-amber font-semibold'
    : success
      ? 'bg-emerald-500 text-white hover:bg-emerald-600 font-semibold'
      : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100 font-medium'
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${cls}`}>
      {children}
    </button>
  )
}

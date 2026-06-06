'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import CandidateCard from './CandidateCard'

interface Agent {
  id: string
  agency_name: string
  jurisdiction: string | null
  country: string | null
  website: string | null
  risk_tier: string
}

interface Candidate {
  id: string
  source_url: string
  summary: string
  status: 'new' | 'in_progress'
  created_at: string
  agents: Agent
}

interface Props {
  initialCandidates: Candidate[]
  newCount: number
  inProgressCount: number
}

type FilterTab = 'all' | 'new' | 'in_progress'

export default function MonitoringDashboard({ initialCandidates, newCount, inProgressCount }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterTab>('all')
  const [triggerLoading, setTriggerLoading] = useState(false)
  const [triggerResult, setTriggerResult] = useState<any>(null)
  const [showTriggerPanel, setShowTriggerPanel] = useState(false)

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  const filtered = initialCandidates.filter(c => {
    if (filter === 'all') return true
    return c.status === filter
  })

  async function runScan(dryRun: boolean) {
    setTriggerLoading(true)
    setTriggerResult(null)
    try {
      const res = await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun, limit: 3 }),
      })
      const data = await res.json()
      setTriggerResult(data)
      if (!dryRun) refresh()
    } catch (e: any) {
      setTriggerResult({ error: e.message })
    }
    setTriggerLoading(false)
  }

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: initialCandidates.length },
    { id: 'new', label: 'New', count: newCount },
    { id: 'in_progress', label: 'In Progress', count: inProgressCount },
  ]

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 sticky top-0 z-10 bg-white/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-yellow flex items-center justify-center text-base">
              🐝
            </div>
            <div>
              <h1 className="text-sm font-semibold text-stone-900 leading-none">AI Monitoring</h1>
              <p className="text-xs text-stone-400 font-mono mt-0.5">Red cohort · Fortnightly</p>
            </div>
          </div>
          <button
            onClick={() => setShowTriggerPanel(!showTriggerPanel)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 border border-stone-200 hover:border-stone-300 text-stone-600 hover:text-stone-900 text-xs font-medium transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
            </svg>
            Run scan
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Trigger panel */}
        {showTriggerPanel && (
          <div className="mb-8 rounded-xl border border-stone-200 bg-white shadow-sm p-5">
            <h2 className="text-sm font-semibold text-stone-800 mb-1">Manual Scan</h2>
            <p className="text-xs text-stone-500 mb-4">
              Runs a scan of the first 3 red agents. Use dry run to test without writing to the database.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => runScan(true)}
                disabled={triggerLoading}
                className="px-4 py-2 rounded-lg text-xs font-medium border border-stone-300 text-stone-600 hover:bg-stone-50 transition-all disabled:opacity-40"
              >
                {triggerLoading ? 'Running…' : 'Dry run'}
              </button>
              <button
                onClick={() => runScan(false)}
                disabled={triggerLoading}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-yellow text-stone-900 hover:bg-brand-amber transition-all disabled:opacity-40"
              >
                {triggerLoading ? 'Running…' : 'Run scan (live)'}
              </button>
            </div>
            {triggerResult && (
              <pre className="mt-4 text-xs font-mono text-stone-600 bg-stone-50 rounded-lg p-4 overflow-auto max-h-48 border border-stone-200">
                {JSON.stringify(triggerResult, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total', value: initialCandidates.length, color: 'text-stone-900' },
            { label: 'Awaiting review', value: newCount, color: 'text-red-500' },
            { label: 'In progress', value: inProgressCount, color: 'text-amber-500' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl bg-white border border-stone-200 shadow-sm px-5 py-4">
              <p className={`text-2xl font-bold ${stat.color} leading-none mb-1`}>{stat.value}</p>
              <p className="text-xs text-stone-400 font-mono">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-stone-200 pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px
                ${filter === tab.id
                  ? 'border-brand-amber text-stone-900'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
                }
              `}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`
                  text-xs font-mono px-1.5 py-0.5 rounded-full
                  ${filter === tab.id ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-400'}
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Candidates */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🐝</p>
            <p className="text-stone-400 text-sm">
              {filter === 'all' ? 'No candidates yet. Run a scan to get started.' : `No ${filter.replace('_', ' ')} candidates.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filter !== 'new' && filtered.filter(c => c.status === 'in_progress').map(c => (
              <CandidateCard key={c.id} candidate={c} onUpdate={refresh} />
            ))}
            {filter !== 'in_progress' && filtered.filter(c => c.status === 'new').map(c => (
              <CandidateCard key={c.id} candidate={c} onUpdate={refresh} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

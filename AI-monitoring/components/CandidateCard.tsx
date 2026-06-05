'use client'

import { useState } from 'react'

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
  candidate: Candidate
  onUpdate: () => void
}

export default function CandidateCard({ candidate, onUpdate }: Props) {
  const [loading, setLoading] = useState(false)

  const agent = candidate.agents
  const location = agent.jurisdiction || agent.country || 'Unknown location'
  const domain = (() => {
    try { return new URL(candidate.source_url).hostname.replace('www.', '') }
    catch { return candidate.source_url }
  })()

  const formattedDate = new Date(candidate.created_at).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric'
  })

  async function updateStatus(newStatus: string) {
    setLoading(true)
    await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: candidate.id, status: newStatus }),
    })
    onUpdate()
    setLoading(false)
  }

  const isNew = candidate.status === 'new'
  const isInProgress = candidate.status === 'in_progress'

  return (
    <div className={`
      relative rounded-xl border transition-all duration-200
      ${isInProgress
        ? 'bg-amber-950/20 border-amber-700/40'
        : 'bg-stone-900/60 border-stone-800/60 hover:border-stone-700/60'
      }
    `}>
      {/* Status pill */}
      <div className="absolute top-4 right-4">
        {isNew && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/60 border border-red-800/50 text-red-400 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            New
          </span>
        )}
        {isInProgress && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-700/50 text-amber-400 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            In Progress
          </span>
        )}
      </div>

      <div className="p-5">
        {/* Agent info */}
        <div className="mb-3 pr-24">
          <h3 className="font-semibold text-stone-100 text-base leading-tight">
            {agent.agency_name}
          </h3>
          <p className="text-stone-500 text-xs mt-0.5 font-mono">{location}</p>
        </div>

        {/* Summary */}
        <p className="text-stone-300 text-sm leading-relaxed mb-4">
          {candidate.summary}
        </p>

        {/* Source */}
        <a
          href={candidate.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-mono text-brand-yellow hover:text-brand-amber transition-colors mb-5 group"
        >
          <svg className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          {domain}
          <svg className="w-3 h-3 opacity-40 group-hover:opacity-80 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        {/* Divider */}
        <div className="border-t border-stone-800/60 pt-4 flex items-center justify-between">
          <span className="text-stone-600 text-xs font-mono">{formattedDate}</span>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isNew && (
              <>
                <button
                  onClick={() => updateStatus('dismissed')}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-all disabled:opacity-40"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => updateStatus('in_progress')}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-yellow text-stone-900 hover:bg-brand-amber transition-all disabled:opacity-40"
                >
                  Action Required
                </button>
              </>
            )}
            {isInProgress && (
              <>
                <button
                  onClick={() => updateStatus('dismissed')}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-all disabled:opacity-40"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => updateStatus('completed')}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-all disabled:opacity-40"
                >
                  ✓ Completed
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

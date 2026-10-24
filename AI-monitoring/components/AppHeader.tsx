import Link from 'next/link'

interface Props {
  active: 'findings' | 'leads'
  subtitle: string
  children?: React.ReactNode // right-hand actions
}

const NAV = [
  { id: 'findings', label: 'Agent findings', href: '/' },
  { id: 'leads', label: 'Sector leads', href: '/leads' },
] as const

export default function AppHeader({ active, subtitle, children }: Props) {
  return (
    <header className="border-b border-stone-200 sticky top-0 z-20 bg-white/85 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-brand-yellow flex items-center justify-center text-base">
            🐝
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-stone-900 leading-none">AI Monitoring</h1>
            <p className="text-xs text-stone-400 font-mono mt-0.5 truncate">{subtitle}</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-lg bg-stone-100 p-1">
          {NAV.map(item => (
            <Link
              key={item.id}
              href={item.href}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                active === item.id
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-2">{children}</div>
      </div>
    </header>
  )
}

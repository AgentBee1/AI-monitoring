import { redirect } from 'next/navigation'
import { isAuthenticated, COOKIE_NAME, PASSPHRASE } from '@/lib/auth'
import { cookies } from 'next/headers'

export default function LoginPage() {
  if (isAuthenticated()) redirect('/')

  async function login(formData: FormData) {
    'use server'
    const entered = formData.get('passphrase') as string
    if (entered === PASSPHRASE) {
      const cookieStore = cookies()
      cookieStore.set(COOKIE_NAME, PASSPHRASE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      })
      redirect('/')
    } else {
      redirect('/login?error=1')
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-yellow flex items-center justify-center shadow-sm">
            <span className="text-2xl">🐝</span>
          </div>
          <div className="text-center">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-stone-400 mb-1">AgentBee</p>
            <h1 className="text-xl font-semibold text-stone-900">AI Monitoring</h1>
          </div>
        </div>

        <form action={login} className="space-y-4">
          <input
            type="password"
            name="passphrase"
            placeholder="Enter passphrase"
            required
            autoFocus
            className="w-full bg-white border border-stone-300 rounded-lg px-4 py-3 text-stone-900 placeholder-stone-400 font-mono text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors shadow-sm"
          />
          <button
            type="submit"
            className="w-full bg-brand-yellow text-stone-900 font-semibold py-3 rounded-lg hover:bg-brand-amber transition-colors text-sm shadow-sm"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}

import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'ab_monitoring_auth'

// Every page and API route needs the passphrase cookie, except the login page itself.
export function middleware(req: NextRequest) {
  const passphrase = process.env.ADMIN_PASSPHRASE
  const token = req.cookies.get(COOKIE_NAME)?.value

  if (passphrase && token === passphrase) return NextResponse.next()

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.search = ''
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico).*)'],
}

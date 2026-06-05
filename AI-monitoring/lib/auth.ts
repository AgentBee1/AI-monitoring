import { cookies } from 'next/headers'

const PASSPHRASE = process.env.ADMIN_PASSPHRASE!
const COOKIE_NAME = 'ab_monitoring_auth'

export function isAuthenticated(): boolean {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  return token === PASSPHRASE
}

export { COOKIE_NAME, PASSPHRASE }

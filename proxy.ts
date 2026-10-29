import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session-token'

// First line of defence: anyone without a validly signed session cookie is sent to
// the login page (or gets a 401 for API calls). Real per-record authorization happens
// next to the data in each route (see lib/auth.ts).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)

  const isLogin = pathname === '/login'
  const isPublicPage = pathname === '/login' || pathname === '/onboarding' || pathname === '/splash'
  const isPublicApi = pathname === '/api/auth/login'

  if (isPublicApi) return NextResponse.next()

  if (isPublicPage) {
    if (isLogin && session) {
      return NextResponse.redirect(new URL('/candidates', request.url))
    }
    return NextResponse.next()
  }

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const url = new URL('/login', request.url)
    if (pathname !== '/') url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:png|jpg|jpeg|svg|ico|webp|gif)$).*)'],
}

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// If Supabase is unreachable (paused project, bad env vars, region latency),
// getSession() can hang on a token-refresh network call with no timeout,
// which takes down every route with a 504 MIDDLEWARE_INVOCATION_TIMEOUT.
// Fail fast instead: treat a slow/failed auth call as "no session".
const SESSION_TIMEOUT_MS = 3000

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  let session = null
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('supabase getSession timeout')), SESSION_TIMEOUT_MS)
      ),
    ])
    session = result.data.session
  } catch (err) {
    console.error('[middleware] auth check failed, treating as unauthenticated:', err)
  }

  const pathname = req.nextUrl.pathname

  if (!session && !pathname.startsWith('/login') && !pathname.startsWith('/forgot-password') && !pathname.startsWith('/reset-password')) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  if (session && pathname.startsWith('/login')) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/'
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}

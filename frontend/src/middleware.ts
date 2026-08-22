import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── Route Protection Middleware ──────────────────────
// Server-side guard for dashboard routes.
// Checks for the presence of auth cookies before allowing
// access to protected routes. If no cookie is found,
// the user is redirected to the landing page.
//
// Note: This is a first-pass check. The actual auth validation
// (JWT verification) still happens on the backend. This middleware
// prevents the flash of dashboard UI for unauthenticated users.

/** Routes that require authentication */
const PROTECTED_PREFIXES = ['/admin', '/wms', '/farmer'];

/** Routes that are always public */
const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/discover'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip non-protected routes
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for auth cookie (access_token is set by the backend as httpOnly cookie)
  const accessToken = request.cookies.get('access_token');
  const refreshToken = request.cookies.get('refresh_token');

  if (!accessToken && !refreshToken) {
    // No auth cookies — redirect to landing page with login prompt
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('auth', 'login');
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on dashboard routes, not on API routes, static files, etc.
  matcher: ['/admin/:path*', '/wms/:path*', '/farmer/:path*'],
};

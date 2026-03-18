import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const session = request.cookies.get('session')?.value;

  const protectedPaths = [
    '/dashboard',
    '/inventory',
    '/scan',
    '/activity',
    '/settings',
    '/reports',
    '/automation',
  ];

  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  if (isProtectedPath && !session) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  if (
    (request.nextUrl.pathname === '/sign-in' ||
      request.nextUrl.pathname === '/sign-up' ||
      request.nextUrl.pathname === '/') &&
    session
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

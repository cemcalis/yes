import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect admin pages (except login page)
  if (pathname.startsWith('/admin') && pathname !== '/admin/giris') {
    const adminToken = req.cookies.get('adminToken') || req.cookies.get('admin_token') || null;

    if (!adminToken) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/giris';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};

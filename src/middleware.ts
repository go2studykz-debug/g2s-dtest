import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'g2s_admin';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedAdmin = pathname.startsWith('/admin') && pathname !== '/admin';
  const isPdfApi = pathname === '/api/pdf';

  if (isProtectedAdmin || isPdfApi) {
    const session = request.cookies.get(SESSION_COOKIE)?.value;
    const token = process.env.ADMIN_SESSION_TOKEN;

    if (!session || !token || session !== token) {
      if (isPdfApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path+', '/api/pdf'],
};

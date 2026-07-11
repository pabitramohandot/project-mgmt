import { NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Bypass static assets, public assets, and auth routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.includes('.') // matches asset files like .svg, .png, etc.
  ) {
    return NextResponse.next();
  }

  // 2. Bypass GET requests to invoices page details and their GET API
  const isInvoicePageDetail = pathname.startsWith('/invoices/') && pathname !== '/invoices';
  const isInvoiceApiDetail = pathname.startsWith('/api/invoices/') && pathname !== '/api/invoices';

  if ((isInvoicePageDetail || isInvoiceApiDetail) && request.method === 'GET') {
    return NextResponse.next();
  }

  // 3. Verify the admin session cookie
  const token = request.cookies.get('admin_token')?.value;
  const payload = await verifyToken(token);

  if (!payload) {
    // If it's an API route, return 401 Unauthorized
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }
    // If it's a page route, redirect to /login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Enforce Super Admin protection
  const isSuperAdminRoute = pathname.startsWith('/superadmin') || pathname.startsWith('/api/superadmin');
  
  const isCompanyAdminException = payload.role === 'company_admin' && 
    (pathname === '/api/superadmin/roles' || pathname === '/api/superadmin/users');

  if (isSuperAdminRoute && payload.role !== 'superadmin' && !isCompanyAdminException) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 5. Append user headers for downstream consumption
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-username', payload.username || '');
  requestHeaders.set('x-user-id', payload.userId || '');
  requestHeaders.set('x-user-company-id', payload.companyId || '');
  requestHeaders.set('x-user-role', payload.role || '');

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // Run middleware on all paths except static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth-edge';

const PROTECTED = ['/dashboard', '/checkout', '/admin'];
const PUBLIC_CHECKOUT = ['/checkout/success', '/checkout/failed'];
const ADMIN_ONLY = ['/admin'];
const AUTH_PAGES = ['/login', '/register'];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Never intercept API routes with UI auth redirects
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isMaintenance = process.env.MAINTENANCE_MODE === 'true';
  const hasBypass = req.cookies.get('bypass')?.value === 'true' || session?.role === 'ADMIN';

  // Maintenance mode protection
  if (isMaintenance) {
    const isMaintenancePage = pathname === '/maintenance';
    const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
    const isLoginRoute = pathname === '/login';

    if (!hasBypass && !isMaintenancePage && !isAdminRoute && !isLoginRoute) {
      const url = req.nextUrl.clone();
      url.pathname = '/maintenance';
      url.search = '';
      return NextResponse.redirect(url);
    }
  } else if (pathname === '/maintenance') {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  const isProtected =
    PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) &&
    !PUBLIC_CHECKOUT.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAdminOnly = ADMIN_ONLY.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = ''; // Clear existing search params
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }

  if (isAdminOnly && session?.role !== 'ADMIN') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (AUTH_PAGES.includes(pathname) && session) {
    const url = req.nextUrl.clone();
    url.pathname = session.role === 'ADMIN' ? '/admin' : '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images|fonts).*)',
  ],
};

import { NextRequest, NextResponse } from 'next/server';
import { getPreferredLocale, isLocale } from './lib/i18n';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split('/')[1];
  const isInternal = pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.includes('.');

  if (!isInternal && !isLocale(firstSegment)) {
    const cookieLocale = request.cookies.get('bbox-locale')?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : getPreferredLocale(request.headers.get('accept-language'));
    const url = request.nextUrl.clone();
    url.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;
    return NextResponse.redirect(url);
  }

  if (!isInternal && isLocale(firstSegment)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${pathname.split('/').slice(2).join('/')}` || '/';
    const headers = new Headers(request.headers);
    headers.set('x-bbox-locale', firstSegment);
    headers.set('x-bbox-pathname', pathname);
    const response = NextResponse.rewrite(url, { request: { headers } });
    response.cookies.set('bbox-locale', firstSegment, { path: '/', maxAge: 31536000, sameSite: 'lax' });
    return response;
  }

  // Add CORS headers for every response
  const response = NextResponse.next();

  // Safari/iOS-specific CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  // Cache headers for images
  if (
    request.nextUrl.pathname.startsWith('/_next/image') ||
    request.nextUrl.pathname.includes('ipfs') ||
    request.nextUrl.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)
  ) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }

  // Extra headers for Safari
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths including API routes for upload size checking
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

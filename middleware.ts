import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Add CORS headers for every response
  const response = NextResponse.next();
  
  // Safari/iOS-specific CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // Cache headers for images
  if (request.nextUrl.pathname.startsWith('/_next/image') || 
      request.nextUrl.pathname.includes('ipfs') ||
      request.nextUrl.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)) {
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
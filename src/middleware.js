import { auth } from "@/auth";

/**
 * Global middleware for route protection in Next.js App Router.
 * Redirects unauthenticated users from protected dashboard routes to /login.
 */
export default auth((req) => {
  try {
    const isLoggedIn = !!req.auth;
    const path = req.nextUrl.pathname;

    // Define protected dashboard routes
    const isOnDashboard =
      path.startsWith('/dashboard') ||
      path.startsWith('/bookmarks') ||
      path.startsWith('/profile') ||
      path.startsWith('/community');

    if (isOnDashboard && !isLoggedIn) {
      console.info('[middleware] Redirecting unauthenticated user to /login', { path });
      return Response.redirect(new URL('/login', req.nextUrl));
    }
    // Allow request to proceed
    return undefined;
  } catch (error) {
    console.error('[middleware] Error in global middleware', error);
    // Fail-safe: allow request to proceed, but log error
    return undefined;
  }
});

// Only run middleware on non-static, non-API, non-image routes
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
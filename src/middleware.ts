import createIntlMiddleware from 'next-intl/middleware'

export default createIntlMiddleware({
  locales: ['bg'],
  defaultLocale: 'bg'
})

export const config = {
  matcher: [
    // Match all pathnames except for
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - sw.js (service worker file)
    // - manifest.json (web app manifest)
    // - static assets
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.ico|.*\\.webp).*)',
  ],
}

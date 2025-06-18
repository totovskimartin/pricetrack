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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { SidebarNavigation } from './sidebar-navigation'
import { Footer } from './footer'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  // Pages that should not have the sidebar (landing page, auth pages, test pages)
  const noSidebarPages = [
    '/bg',
    '/bg/login',
    '/bg/register',
    '/bg/auth-test',
    '/bg/test-db',
    '/bg/simple-login'
  ]
  const isNoSidebarPage = noSidebarPages.includes(pathname)

  // Pages that should not have the footer component (landing page has its own footer)
  const noFooterPages = ['/bg']
  const shouldShowFooter = !noFooterPages.includes(pathname)

  // Don't show sidebar on specific pages or when auth is loading or user is not authenticated
  const shouldShowSidebar = !isNoSidebarPage && !loading && user

  if (!shouldShowSidebar) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          {children}
        </main>
        {shouldShowFooter && <Footer />}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <SidebarNavigation />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0 ml-0">
        {/* Content Area */}
        <main className="flex-1 pt-16 lg:pt-0">
          <div className="lg:pl-0 pl-0">
            {children}
          </div>
        </main>
        {/* Footer */}
        {shouldShowFooter && <Footer />}
      </div>
    </div>
  )
}

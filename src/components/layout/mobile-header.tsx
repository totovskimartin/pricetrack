'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X, BarChart3 } from 'lucide-react'

interface MobileHeaderProps {
  isMenuOpen: boolean
  onMenuToggle: () => void
}

export function MobileHeader({ isMenuOpen, onMenuToggle }: MobileHeaderProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 lg:hidden bg-white/95 border-b border-gray-200 shadow-sm backdrop-blur-sm"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 min-h-[60px]">
        {/* Hamburger Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="p-2 hover:bg-gray-100 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
          onClick={onMenuToggle}
          aria-label={isMenuOpen ? "Затвори меню" : "Отвори меню"}
        >
          {isMenuOpen ? (
            <X className="h-6 w-6 text-gray-700" />
          ) : (
            <Menu className="h-6 w-6 text-gray-700" />
          )}
        </Button>

        {/* Logo */}
        <Link
          href="/bg/dashboard"
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity flex-1 justify-center"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900 leading-tight">PriceTrack</span>
            <span className="text-xs text-gray-500 leading-tight">България</span>
          </div>
        </Link>

        {/* Right side spacer to balance the layout */}
        <div className="min-w-[44px]"></div>
      </div>
    </header>
  )
}

'use client'

import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Mail, 
  Phone, 
  MapPin, 
  Heart,
  ShoppingCart,
  Users,
  Shield,
  FileText,
  HelpCircle
} from 'lucide-react'

export function Footer() {
  const { user } = useAuth()

  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">PriceTrack</h3>
                <p className="text-sm text-gray-400">България</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm">
              Следете цените на продуктите и пестете пари с най-добрата платформа за проследяване на цени в България.
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-500 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-pink-500 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Навигация</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/bg/products" className="text-gray-300 hover:text-white transition-colors text-sm flex items-center">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Продукти
                </Link>
              </li>
              <li>
                <Link href="/bg/supermarkets" className="text-gray-300 hover:text-white transition-colors text-sm flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Супермаркети
                </Link>
              </li>
              <li>
                <Link href="/bg/discussions" className="text-gray-300 hover:text-white transition-colors text-sm flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Дискусии
                </Link>
              </li>
              {user && (
                <>
                  <li>
                    <Link href="/bg/favorites" className="text-gray-300 hover:text-white transition-colors text-sm flex items-center">
                      <Heart className="h-4 w-4 mr-2" />
                      Любими
                    </Link>
                  </li>
                  <li>
                    <Link href="/bg/dashboard" className="text-gray-300 hover:text-white transition-colors text-sm flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Табло
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Support & Legal */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Поддръжка</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/bg/help" className="text-gray-300 hover:text-white transition-colors text-sm flex items-center">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Помощ
                </Link>
              </li>
              <li>
                <Link href="/bg/privacy" className="text-gray-300 hover:text-white transition-colors text-sm flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Поверителност
                </Link>
              </li>
              <li>
                <Link href="/bg/terms" className="text-gray-300 hover:text-white transition-colors text-sm flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Условия за ползване
                </Link>
              </li>
              <li>
                <Link href="/bg/contact" className="text-gray-300 hover:text-white transition-colors text-sm flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Контакти
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Контакти</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <a 
                  href="mailto:info@pricetrack.bg" 
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  info@pricetrack.bg
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <a 
                  href="tel:+359888123456" 
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  +359 888 123 456
                </a>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="text-gray-300 text-sm">
                  <p>София, България</p>
                  <p>бул. Витоша 1</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              © {currentYear} PriceTrack България. Всички права запазени.
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <Link href="/bg/privacy" className="text-gray-400 hover:text-white transition-colors">
                Поверителност
              </Link>
              <Link href="/bg/terms" className="text-gray-400 hover:text-white transition-colors">
                Условия
              </Link>
              <Link href="/bg/cookies" className="text-gray-400 hover:text-white transition-colors">
                Бисквитки
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

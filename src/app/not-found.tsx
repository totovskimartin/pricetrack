import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Home, ArrowLeft, Search } from 'lucide-react'

export default function GlobalNotFound() {
  return (
    <html lang="bg">
      <body>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto text-center">
              <Card className="shadow-lg">
                <CardContent className="py-12">
                  {/* 404 Icon */}
                  <div className="text-blue-600 text-8xl font-bold mb-6">
                    404
                  </div>
                  
                  {/* Error Message */}
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    Страницата не е намерена
                  </h1>
                  
                  <p className="text-gray-600 mb-8 text-lg">
                    Съжаляваме, но страницата която търсите не съществува или е премахната.
                  </p>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Link href="/bg">
                      <Button size="lg" className="w-full sm:w-auto">
                        <Home className="h-5 w-5 mr-2" />
                        Начална страница
                      </Button>
                    </Link>
                    
                    <Link href="/bg/products">
                      <Button variant="outline" size="lg" className="w-full sm:w-auto">
                        <Search className="h-5 w-5 mr-2" />
                        Разгледай продукти
                      </Button>
                    </Link>
                  </div>
                  
                  {/* Additional Help */}
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-4">
                      Ако смятате, че това е грешка, можете да:
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center items-center text-sm">
                      <Link href="/bg/contact" className="text-blue-600 hover:text-blue-800 underline">
                        Свържете се с нас
                      </Link>
                      <span className="hidden sm:inline text-gray-400">•</span>
                      <Link href="/bg/help" className="text-blue-600 hover:text-blue-800 underline">
                        Помощ и въпроси
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}

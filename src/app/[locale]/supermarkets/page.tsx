'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, ExternalLink, ArrowLeft } from 'lucide-react'

interface Supermarket {
  id: string
  name: string
  logo_url: string
  website_url: string
  location: string
  description: string
  created_at: string
}

export default function SupermarketsPage() {
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSupermarkets()
  }, [])

  const fetchSupermarkets = async () => {
    try {
      const { data, error } = await supabase
        .from('supermarkets')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) {
        return
      }

      setSupermarkets(data || [])
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Зареждане на супермаркетите...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto pl-16 pr-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Супермаркети</h1>
              <p className="text-gray-600">Сравнявайте цени в {supermarkets.length} водещи супермаркетски вериги</p>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {supermarkets.length} вериги
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        {/* Supermarkets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {supermarkets.map((supermarket) => (
            <Card key={supermarket.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    {supermarket.logo_url ? (
                      <img
                        src={supermarket.logo_url}
                        alt={supermarket.name}
                        className="w-12 h-12 object-contain"
                        onError={(e) => {
                          // Fallback to text if image fails to load
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          target.parentElement!.innerHTML = `<div class="text-2xl font-bold text-gray-400">${supermarket.name.charAt(0)}</div>`
                        }}
                      />
                    ) : (
                      <div className="text-2xl font-bold text-gray-400">
                        {supermarket.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{supermarket.name}</CardTitle>
                    <div className="flex items-center text-gray-500 text-sm mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {supermarket.location}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 mb-4">
                  {supermarket.description}
                </CardDescription>

                <div className="space-y-3">
                  {/* Website Link */}
                  {supermarket.website_url && (
                    <a
                      href={supermarket.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Посетете уебсайта
                    </a>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Link href={`/bg/products?supermarket=${supermarket.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        Виж продукти
                      </Button>
                    </Link>
                    <Link href={`/bg/supermarkets/${supermarket.id}`} className="flex-1">
                      <Button className="w-full">
                        Детайли
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>За супермаркетите</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Как работи сравнението?</h4>
                  <p className="text-gray-600 text-sm">
                    Събираме данни за цени от различни супермаркети и ги актуализираме редовно. 
                    Можете да сравнявате цени на същия продукт в различни магазини и да намирате 
                    най-добрите оферти.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Актуалност на данните</h4>
                  <p className="text-gray-600 text-sm">
                    Цените се обновяват ежедневно. Препоръчваме да проверявате актуалните цени 
                    в магазина преди покупка, тъй като промоциите и специалните оферти могат да 
                    променят цените.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <Link href="/bg/dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад към таблото
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

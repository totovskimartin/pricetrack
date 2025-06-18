'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpCircle, ShoppingCart, Heart, Bell, Users, Search, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <HelpCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Помощ и поддръжка</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Научете как да използвате PriceTrack България за да следите цени и да пестите пари
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Getting Started */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                Как да започнете
              </CardTitle>
              <CardDescription>
                Първи стъпки в PriceTrack България
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="text-sm font-medium">Регистрирайте се</p>
                    <p className="text-xs text-gray-500">Създайте безплатен акаунт за да започнете</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="text-sm font-medium">Търсете продукти</p>
                    <p className="text-xs text-gray-500">Използвайте търсачката за да намерите продукти</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="text-sm font-medium">Следете цени</p>
                    <p className="text-xs text-gray-500">Добавете продукти в любими и следете цените им</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2 text-green-500" />
                Основни функции
              </CardTitle>
              <CardDescription>
                Как да използвате различните функции
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <ShoppingCart className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Търсене на продукти</p>
                    <p className="text-xs text-gray-500">Намерете продукти по име, марка или категория</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Heart className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">Любими продукти</p>
                    <p className="text-xs text-gray-500">Запазете продукти за бързо сравнение</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Bell className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium">Ценови известия</p>
                    <p className="text-xs text-gray-500">Получавайте известия при промяна на цените</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Users className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Дискусии</p>
                    <p className="text-xs text-gray-500">Участвайте в дискусии за продукти</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Често задавани въпроси</CardTitle>
            <CardDescription>
              Отговори на най-често срещаните въпроси
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Как да следя цените на продукти?</h3>
                <p className="text-sm text-gray-600">
                  Намерете продукта който ви интересува, отидете на неговата страница и натиснете бутона "Следи цената". 
                  Ще получавате известия когато цената се промени.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Безплатна ли е услугата?</h3>
                <p className="text-sm text-gray-600">
                  Да, PriceTrack България е напълно безплатна услуга за всички потребители.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Колко често се обновяват цените?</h3>
                <p className="text-sm text-gray-600">
                  Цените се обновяват ежедневно от различните супермаркети и магазини.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Мога ли да добавя нови продукти?</h3>
                <p className="text-sm text-gray-600">
                  Да, можете да предложите нови продукти чрез формата за добавяне. Те ще бъдат прегледани от нашия екип преди публикуване.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Нужна ви е помощ?</CardTitle>
            <CardDescription>
              Свържете се с нас за допълнителна поддръжка
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <p className="text-gray-600 mb-4">
                Ако не намерихте отговор на вашия въпрос, не се колебайте да се свържете с нас.
              </p>
              <Link 
                href="/bg/contact" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Свържете се с нас
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Eye, Lock, Database, UserCheck, AlertTriangle } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Политика за поверителност</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Как събираме, използваме и защитаваме вашите лични данни
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Последна актуализация: {new Date().toLocaleDateString('bg-BG')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2 text-blue-500" />
                Въведение
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                PriceTrack България ("ние", "нашата компания") се ангажира да защитава поверителността на нашите потребители. 
                Тази политика за поверителност обяснява как събираме, използваме, съхраняваме и защитаваме вашата лична информация 
                когато използвате нашата услуга за проследяване на цени.
              </p>
            </CardContent>
          </Card>

          {/* Data Collection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2 text-green-500" />
                Какви данни събираме
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Лична информация</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>Име и фамилия (по избор)</li>
                    <li>Имейл адрес</li>
                    <li>Потребителско име</li>
                    <li>Парола (криптирана)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Данни за използването</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>Продукти които следите</li>
                    <li>Любими продукти</li>
                    <li>Коментари и дискусии</li>
                    <li>Настройки за известия</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Технически данни</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>IP адрес</li>
                    <li>Тип на браузъра</li>
                    <li>Операционна система</li>
                    <li>Данни за използването на сайта</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="h-5 w-5 mr-2 text-purple-500" />
                Как използваме вашите данни
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-gray-700">Използваме събраните данни за следните цели:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>Предоставяне на услугата за проследяване на цени</li>
                  <li>Изпращане на известия за промени в цените</li>
                  <li>Персонализиране на вашето потребителско изживяване</li>
                  <li>Подобряване на нашите услуги</li>
                  <li>Комуникация с вас относно вашия акаунт</li>
                  <li>Осигуряване на техническа поддръжка</li>
                  <li>Спазване на правни изисквания</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Data Protection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="h-5 w-5 mr-2 text-red-500" />
                Защита на данните
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-gray-700">Предприемаме следните мерки за защита на вашите данни:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>SSL криптиране на всички данни в транзит</li>
                  <li>Криптиране на чувствителни данни в базата данни</li>
                  <li>Редовни резервни копия</li>
                  <li>Ограничен достъп до личните данни</li>
                  <li>Редовни проверки за сигурност</li>
                  <li>Съответствие с GDPR изискванията</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* User Rights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                Вашите права
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-gray-700">Като потребител имате следните права:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li><strong>Право на достъп:</strong> Можете да поискате копие от вашите лични данни</li>
                  <li><strong>Право на корекция:</strong> Можете да поискате корекция на неточни данни</li>
                  <li><strong>Право на изтриване:</strong> Можете да поискате изтриване на вашите данни</li>
                  <li><strong>Право на ограничаване:</strong> Можете да ограничите обработката на данните</li>
                  <li><strong>Право на преносимост:</strong> Можете да поискате прехвърляне на данните</li>
                  <li><strong>Право на възражение:</strong> Можете да възразите срещу обработката</li>
                </ul>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    За да упражните някое от тези права, моля свържете се с нас на 
                    <a href="mailto:privacy@pricetrack.bg" className="font-medium underline ml-1">
                      privacy@pricetrack.bg
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cookies */}
          <Card>
            <CardHeader>
              <CardTitle>Бисквитки (Cookies)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                Използваме бисквитки за подобряване на вашето потребителско изживяване. Можете да управлявате 
                настройките за бисквитки в браузъра си. За повече информация вижте нашата 
                <a href="/bg/cookies" className="text-blue-600 hover:text-blue-800 underline ml-1">
                  политика за бисквитки
                </a>.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Контакт</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                Ако имате въпроси относно тази политика за поверителност или обработката на вашите лични данни, 
                моля свържете се с нас:
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-sm">
                  <strong>Имейл:</strong> 
                  <a href="mailto:privacy@pricetrack.bg" className="text-blue-600 hover:text-blue-800 underline ml-1">
                    privacy@pricetrack.bg
                  </a>
                </p>
                <p className="text-sm">
                  <strong>Адрес:</strong> бул. Витоша 1, София 1000, България
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

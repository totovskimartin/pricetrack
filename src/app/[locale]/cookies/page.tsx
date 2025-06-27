'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Cookie, Settings, Shield, BarChart3, Target } from 'lucide-react'

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <Cookie className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Политика за бисквитки</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Как използваме бисквитки за подобряване на вашето потребителско изживяване
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
          {/* What are Cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Cookie className="h-5 w-5 mr-2 text-blue-500" />
                Какво са бисквитките?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                Бисквитките са малки текстови файлове, които се съхраняват на вашето устройство (компютър, таблет или мобилен телефон) 
                когато посещавате уебсайт. Те помагат на уебсайта да &quot;запомни&quot; информация за вашето посещение,
                като предпочитания за език, настройки за влизане и други данни, които правят следващите ви посещения по-лесни 
                и сайта по-полезен за вас.
              </p>
            </CardContent>
          </Card>

          {/* Types of Cookies */}
          <Card>
            <CardHeader>
              <CardTitle>Видове бисквитки които използваме</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Essential Cookies */}
                <div className="border-l-4 border-red-400 pl-4">
                  <div className="flex items-center mb-2">
                    <Shield className="h-5 w-5 text-red-500 mr-2" />
                    <h3 className="font-semibold text-gray-900">Необходими бисквитки</h3>
                  </div>
                  <p className="text-gray-700 text-sm mb-2">
                    Тези бисквитки са необходими за правилното функциониране на сайта и не могат да бъдат изключени.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-4">
                    <li>Сесийни бисквитки за влизане в акаунта</li>
                    <li>Бисквитки за сигурност</li>
                    <li>Бисквитки за запазване на настройките</li>
                  </ul>
                </div>

                {/* Functional Cookies */}
                <div className="border-l-4 border-blue-400 pl-4">
                  <div className="flex items-center mb-2">
                    <Settings className="h-5 w-5 text-blue-500 mr-2" />
                    <h3 className="font-semibold text-gray-900">Функционални бисквитки</h3>
                  </div>
                  <p className="text-gray-700 text-sm mb-2">
                    Тези бисквитки подобряват функционалността на сайта и персонализират вашето изживяване.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-4">
                    <li>Запомняне на предпочитания за език</li>
                    <li>Запазване на настройки за известия</li>
                    <li>Персонализиране на интерфейса</li>
                  </ul>
                </div>

                {/* Analytics Cookies */}
                <div className="border-l-4 border-green-400 pl-4">
                  <div className="flex items-center mb-2">
                    <BarChart3 className="h-5 w-5 text-green-500 mr-2" />
                    <h3 className="font-semibold text-gray-900">Аналитични бисквитки</h3>
                  </div>
                  <p className="text-gray-700 text-sm mb-2">
                    Тези бисквитки ни помагат да разберем как посетителите използват сайта.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-4">
                    <li>Проследяване на посещения и страници</li>
                    <li>Анализ на поведението на потребителите</li>
                    <li>Подобряване на производителността на сайта</li>
                  </ul>
                </div>

                {/* Marketing Cookies */}
                <div className="border-l-4 border-purple-400 pl-4">
                  <div className="flex items-center mb-2">
                    <Target className="h-5 w-5 text-purple-500 mr-2" />
                    <h3 className="font-semibold text-gray-900">Маркетингови бисквитки</h3>
                  </div>
                  <p className="text-gray-700 text-sm mb-2">
                    Тези бисквитки се използват за показване на релевантни реклами.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-4">
                    <li>Персонализирани препоръки за продукти</li>
                    <li>Проследяване на ефективността на кампании</li>
                    <li>Социални медии интеграции</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Third Party Cookies */}
          <Card>
            <CardHeader>
              <CardTitle>Бисквитки от трети страни</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-gray-700">
                  Понякога използваме услуги от трети страни, които могат да поставят собствени бисквитки:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li><strong>Google Analytics:</strong> За анализ на трафика и поведението на потребителите</li>
                  <li><strong>Социални мрежи:</strong> За споделяне на съдържание в социалните мрежи</li>
                  <li><strong>Рекламни партньори:</strong> За показване на релевантни реклами</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Managing Cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2 text-blue-500" />
                Управление на бисквитките
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Можете да управлявате бисквитките по следните начини:
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Настройки на браузъра</h4>
                  <p className="text-sm text-blue-800 mb-2">
                    Повечето браузъри ви позволяват да контролирате бисквитките чрез настройките:
                  </p>
                  <ul className="list-disc list-inside text-blue-700 text-sm space-y-1 ml-4">
                    <li>Блокиране на всички бисквитки</li>
                    <li>Блокиране само на бисквитки от трети страни</li>
                    <li>Изтриване на съществуващи бисквитки</li>
                    <li>Получаване на известие преди поставяне на бисквитка</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Внимание:</strong> Блокирането на бисквитките може да повлияе на функционалността на сайта. 
                    Някои функции може да не работят правилно без бисквитки.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Browser Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Инструкции за различни браузъри</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-gray-700 mb-4">
                  Ето как можете да управлявате бисквитките в популярните браузъри:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <h4 className="font-semibold mb-2">Google Chrome</h4>
                    <p className="text-sm text-gray-600">
                      Настройки → Поверителност и сигурност → Бисквитки и други данни от сайтове
                    </p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <h4 className="font-semibold mb-2">Mozilla Firefox</h4>
                    <p className="text-sm text-gray-600">
                      Настройки → Поверителност и сигурност → Бисквитки и данни от сайтове
                    </p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <h4 className="font-semibold mb-2">Safari</h4>
                    <p className="text-sm text-gray-600">
                      Предпочитания → Поверителност → Управление на данните от уебсайтове
                    </p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <h4 className="font-semibold mb-2">Microsoft Edge</h4>
                    <p className="text-sm text-gray-600">
                      Настройки → Бисквитки и разрешения за сайтове → Управление и изтриване на бисквитки
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Контакт</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                Ако имате въпроси относно нашата политика за бисквитки, моля свържете се с нас:
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

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Users, AlertCircle, Scale, Shield, Ban } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Условия за ползване</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Правила и условия за използване на PriceTrack България
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
                <Scale className="h-5 w-5 mr-2 text-blue-500" />
                Въведение
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                Добре дошли в PriceTrack България. Тези условия за ползване ("Условия") уреждат вашето използване 
                на нашата уебсайт и услуги. Като използвате нашата платформа, вие се съгласявате да спазвате тези условия. 
                Ако не се съгласявате с някое от условията, моля не използвайте нашите услуги.
              </p>
            </CardContent>
          </Card>

          {/* Service Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-green-500" />
                Описание на услугата
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-gray-700">
                  PriceTrack България предоставя платформа за проследяване на цени на продукти от различни супермаркети и магазини в България.
                </p>
                <p className="text-gray-700">Нашите услуги включват:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Търсене и сравняване на цени на продукти</li>
                  <li>Проследяване на промени в цените</li>
                  <li>Известия за ценови промени</li>
                  <li>Дискусии и коментари за продукти</li>
                  <li>Персонални списъци с любими продукти</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* User Responsibilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-purple-500" />
                Отговорности на потребителя
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-gray-700">Като потребител се задължавате да:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>Предоставяте точна и актуална информация при регистрация</li>
                  <li>Поддържате сигурността на вашия акаунт и парола</li>
                  <li>Използвате услугата само за законни цели</li>
                  <li>Не нарушавате правата на други потребители</li>
                  <li>Не публикувате неподходящо или незаконно съдържание</li>
                  <li>Спазвате всички приложими закони и разпоредби</li>
                  <li>Не използвате автоматизирани системи за достъп до платформата</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Prohibited Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Ban className="h-5 w-5 mr-2 text-red-500" />
                Забранени дейности
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-gray-700">Следните дейности са строго забранени:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>Хакерски атаки или опити за неоторизиран достъп</li>
                  <li>Разпространение на вируси или злонамерен код</li>
                  <li>Спам или нежелана реклама</li>
                  <li>Нарушаване на авторски права</li>
                  <li>Публикуване на фалшива или подвеждаща информация</li>
                  <li>Използване на услугата за търговски цели без разрешение</li>
                  <li>Създаване на множество акаунти за заобикаляне на ограничения</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Data Accuracy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-orange-500" />
                Точност на данните
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-gray-700">
                  Полагаме усилия да предоставяме точна и актуална информация за цените, но не можем да гарантираме 
                  100% точност във всички случаи.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Важно:</strong> Цените могат да се променят без предизвестие. Винаги проверявайте 
                    актуалните цени в съответния магазин преди покупка.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Intellectual Property */}
          <Card>
            <CardHeader>
              <CardTitle>Интелектуална собственост</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                Всички права върху съдържанието, дизайна, логото и функционалността на PriceTrack България 
                принадлежат на нашата компания. Не можете да копирате, разпространявате или използвате 
                нашето съдържание без писмено разрешение.
              </p>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card>
            <CardHeader>
              <CardTitle>Ограничение на отговорността</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-gray-700">
                  PriceTrack България не носи отговорност за:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Неточности в цените или информацията за продуктите</li>
                  <li>Загуби възникнали от използването на услугата</li>
                  <li>Прекъсвания в услугата или технически проблеми</li>
                  <li>Действия на трети страни</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card>
            <CardHeader>
              <CardTitle>Прекратяване</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                Запазваме си правото да прекратим или ограничим достъпа ви до услугата при нарушение на тези условия. 
                Можете да прекратите акаунта си по всяко време чрез настройките на профила или като се свържете с нас.
              </p>
            </CardContent>
          </Card>

          {/* Changes to Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Промени в условията</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                Запазваме си правото да променяме тези условия по всяко време. При значителни промени ще ви уведомим 
                чрез имейл или известие на платформата. Продължаването на използването на услугата след промените 
                означава приемане на новите условия.
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
                За въпроси относно тези условия за ползване, моля свържете се с нас:
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-sm">
                  <strong>Имейл:</strong> 
                  <a href="mailto:legal@pricetrack.bg" className="text-blue-600 hover:text-blue-800 underline ml-1">
                    legal@pricetrack.bg
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

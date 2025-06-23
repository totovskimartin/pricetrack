'use client'

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Euro,
  BarChart3,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Star,
  Zap,
  Shield,
  Globe
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 backdrop-blur-sm bg-white/10 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  PriceTrack
                </h1>
                <p className="text-sm text-purple-200">България</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/bg/login">
                <Button variant="ghost" className="text-white hover:bg-white/20 border-white/30 text-sm sm:text-base px-2 sm:px-4">
                  Вход
                </Button>
              </Link>
              <Link href="/bg/register">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 text-sm sm:text-base px-2 sm:px-4">
                  Регистрация
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-600/20 backdrop-blur-sm border border-white/20 mb-8">
            <Sparkles className="h-4 w-4 text-yellow-400 mr-2" />
            <span className="text-sm font-medium text-white">Най-удобната платформа за проследяване на цени</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Следете цените
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              интелигентно
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-300 leading-relaxed">
            Открийте най-добрите цени в България с нашата модерна платформа.
            Проследявайте, сравнявайте и пестете пари преди преминаването към Евро.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/bg/register">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 group">
                Започнете безплатно
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/bg/login">
              <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg backdrop-blur-sm">
                Вече имам акаунт
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">10,000+</div>
              <div className="text-gray-400">Проследени продукти</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">5+</div>
              <div className="text-gray-400">Супермаркета</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">24/7</div>
              <div className="text-gray-400">Мониторинг</div>
            </div>
          </div>
        </div>



        {/* Features */}
        <div className="mt-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Защо да изберете PriceTrack?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Модерни функции, създадени за да ви помогнат да пестите пари и време
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Feature 1 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
              <Card className="relative bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300 group-hover:scale-105">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">
                    Автоматично Проследяване
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-300 leading-relaxed">
                    Системата следи цените 24/7 и ви уведомява за най-добрите оферти в реално време.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            {/* Feature 2 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
              <Card className="relative bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300 group-hover:scale-105">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">
                    Всички Магазини
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-300 leading-relaxed">
                    Сравнявайте цени от Lidl, Fantastico, Billa, Kaufland и още много други вериги.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            {/* Feature 3 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
              <Card className="relative bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300 group-hover:scale-105">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Euro className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">
                    BGN / EUR Конвертор
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-300 leading-relaxed">
                    Виждайте цените в лева и евро едновременно с актуалния официален курс.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            {/* Feature 4 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
              <Card className="relative bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300 group-hover:scale-105">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">
                    Активна Общност
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-300 leading-relaxed">
                    Споделяйте мнения и откриваите най-добрите оферти заедно с хиляди потребители.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Popular Supermarkets */}
        <div className="mt-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Поддържани супермаркети
            </h2>
            <p className="text-xl text-gray-300">
              Проследяваме цени от най-популярните вериги в България
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { name: 'Lidl', color: 'from-blue-500 to-blue-600' },
              { name: 'Fantastico', color: 'from-red-500 to-red-600' },
              { name: 'Billa', color: 'from-yellow-500 to-orange-600' },
              { name: 'Kaufland', color: 'from-green-500 to-green-600' },
              { name: 'T-Market', color: 'from-purple-500 to-purple-600' }
            ].map((supermarket) => (
              <div key={supermarket.name} className="group relative">
                <div className={`absolute inset-0 bg-gradient-to-r ${supermarket.color} rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity`}></div>
                <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center hover:bg-white/20 transition-all duration-300 group-hover:scale-105">
                  <div className={`w-12 h-12 bg-gradient-to-r ${supermarket.color} rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-white text-lg">{supermarket.name}</h3>
                  <div className="mt-2 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-400 mr-1" />
                    <span className="text-sm text-gray-300">Активен</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Защо хиляди българи ни избират?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Открийте предимствата на автоматичното проследяване на цени
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Benefit 1 */}
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Бързо и лесно</h3>
              <p className="text-gray-300 leading-relaxed">
                Намерете най-добрите цени за секунди. Нашата платформа е оптимизирана за скорост и удобство.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">100% Безплатно</h3>
              <p className="text-gray-300 leading-relaxed">
                Всички функции са напълно безплатни. Няма скрити такси или абонаменти.
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Винаги актуално</h3>
              <p className="text-gray-300 leading-relaxed">
                Данните се обновяват в реално време, за да получавате най-точната информация.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-32 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl blur opacity-30"></div>
            <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-12">
              <h2 className="text-4xl font-bold text-white mb-6">
                Готови да започнете да пестите?
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Присъединете се към хиляди българи, които вече пестят пари с PriceTrack
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/bg/register">
                  <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 group">
                    Започнете безплатно
                    <Star className="ml-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                  </Button>
                </Link>
                <p className="text-sm text-gray-400">
                  Без регистрационни такси • Без абонамент • Винаги безплатно
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-32 border-t border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">PriceTrack</h3>
                  <p className="text-sm text-purple-200">България</p>
                </div>
              </div>
              <p className="text-gray-300 max-w-md leading-relaxed">
                Най-удобната платформа за проследяване на цени в България.
                Пестете пари и време с нашата автоматична система.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Бързи връзки</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/bg/register" className="text-gray-300 hover:text-white transition-colors">
                    Регистрация
                  </Link>
                </li>
                <li>
                  <Link href="/bg/login" className="text-gray-300 hover:text-white transition-colors">
                    Вход
                  </Link>
                </li>
                <li>
                  <Link href="/bg/help" className="text-gray-300 hover:text-white transition-colors">
                    Помощ
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Правна информация</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/bg/privacy" className="text-gray-300 hover:text-white transition-colors">
                    Поверителност
                  </Link>
                </li>
                <li>
                  <Link href="/bg/terms" className="text-gray-300 hover:text-white transition-colors">
                    Условия
                  </Link>
                </li>
                <li>
                  <Link href="/bg/contact" className="text-gray-300 hover:text-white transition-colors">
                    Контакти
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2024 PriceTrack България. Всички права запазени.
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xs text-gray-500 bg-white/10 px-3 py-1 rounded-full">
                v0.3-beta
              </span>
              <span className="text-xs text-gray-500">
                Направено с ❤️ в България
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

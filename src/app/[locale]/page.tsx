import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, ShoppingCart, Euro } from 'lucide-react';

export default function HomePage() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                PriceTrack България
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/bg/login">
                <Button variant="outline">Вход</Button>
              </Link>
              <Link href="/bg/register">
                <Button>Регистрация</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            PriceTrack България
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Следете цените на продуктите преди преминаването към Евро
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <Link href="/bg/register">
                <Button size="lg" className="w-full">
                  Започнете сега
                </Button>
              </Link>
            </div>
          </div>
        </div>



        {/* Features */}
        <div className="mt-16">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Проследяване на цени
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Следете цените на любимите си продукти в реално време и получавайте известия за промени.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2 text-green-600" />
                  Всички супермаркети
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Сравнявайте цени между Lidl, Fantastico, Billa, Kaufland и други популярни вериги.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Euro className="h-5 w-5 mr-2 text-purple-600" />
                  BGN / EUR конвертор
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Виждайте цените в лева и евро едновременно с официалния обменен курс.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-orange-600" />
                  Общност
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Участвайте в дискусии и споделяйте мнения за цените с други потребители.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Popular Supermarkets */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            Поддържани супермаркети
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
            {['Lidl', 'Fantastico', 'Billa', 'Kaufland', 'T-Market'].map((supermarket) => (
              <div key={supermarket} className="bg-white rounded-lg shadow p-6 text-center">
                <h3 className="font-semibold text-gray-900">{supermarket}</h3>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-300">
            <p>&copy; 2024 PriceTrack България. Всички права запазени.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

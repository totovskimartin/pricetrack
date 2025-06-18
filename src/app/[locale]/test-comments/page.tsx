'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function TestCommentsPage() {
  const [tableExists, setTableExists] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    testDatabase()
  }, [])

  const testDatabase = async () => {
    setTesting(true)
    setError(null)
    
    try {
      // Test if product_comments table exists
      const { data, error } = await supabase
        .from('product_comments')
        .select('id')
        .limit(1)

      if (error) {
        if (error.code === '42P01') {
          setTableExists(false)
          setError('Таблицата product_comments не съществува. Моля, изпълнете миграцията.')
        } else {
          setTableExists(false)
          setError(`Грешка в базата данни: ${error.message}`)
        }
      } else {
        setTableExists(true)
      }
    } catch (err) {
      setTableExists(false)
      setError(`Неочаквана грешка: ${err}`)
    } finally {
      setTesting(false)
    }
  }

  const testCommentVotes = async () => {
    try {
      const { data, error } = await supabase
        .from('comment_votes')
        .select('id')
        .limit(1)

      if (error) {
        if (error.code === '42P01') {
          setError('Таблицата comment_votes не съществува. Моля, изпълнете миграцията.')
        } else {
          setError(`Грешка в таблицата comment_votes: ${error.message}`)
        }
      } else {
        setError('Таблицата comment_votes съществува и работи!')
      }
    } catch (err) {
      setError(`Грешка при тестване на comment_votes: ${err}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Тест на системата за коментари
          </h1>

          <div className="space-y-6">
            {/* Database Connection Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {testing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                  ) : tableExists === true ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  ) : tableExists === false ? (
                    <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                  )}
                  Статус на таблицата product_comments
                </CardTitle>
                <CardDescription>
                  Проверка дали таблицата за коментари съществува в базата данни
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tableExists === true && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800 font-medium">✅ Таблицата съществува!</p>
                      <p className="text-green-700 text-sm">Системата за коментари е готова за използване.</p>
                    </div>
                  )}
                  
                  {tableExists === false && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 font-medium">❌ Таблицата не съществува</p>
                      <p className="text-red-700 text-sm mb-3">
                        Моля, изпълнете SQL миграцията в Supabase dashboard:
                      </p>
                      <code className="block p-2 bg-gray-100 rounded text-xs">
                        supabase/migrations/021_simple_comments_system_fixed.sql
                      </code>
                    </div>
                  )}

                  {error && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 font-medium">⚠️ Грешка:</p>
                      <p className="text-yellow-700 text-sm">{error}</p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button onClick={testDatabase} disabled={testing}>
                      {testing ? 'Тестване...' : 'Тествай отново'}
                    </Button>
                    <Button variant="outline" onClick={testCommentVotes}>
                      Тествай comment_votes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Migration Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Инструкции за миграция</CardTitle>
                <CardDescription>
                  Как да активирате системата за коментари
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Стъпка 1: Отворете Supabase Dashboard</h4>
                    <p className="text-sm text-gray-600">
                      Влезте в вашия Supabase проект и отидете в SQL Editor
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold">Стъпка 2: Изпълнете миграцията</h4>
                    <p className="text-sm text-gray-600">
                      Копирайте и изпълнете съдържанието на файла:
                    </p>
                    <code className="block p-2 bg-gray-100 rounded text-sm">
                      supabase/migrations/021_simple_comments_system_fixed.sql
                    </code>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold">Стъпка 3: Тествайте</h4>
                    <p className="text-sm text-gray-600">
                      Натиснете "Тествай отново" за да проверите дали миграцията е успешна
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Функции на системата за коментари</CardTitle>
                <CardDescription>
                  Какво ще получите след активирането
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-green-600">✅ Основни функции</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Публикуване на коментари</li>
                      <li>• Like/Dislike система</li>
                      <li>• Автоматично броене на гласове</li>
                      <li>• Потребителски профили</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-blue-600">🔒 Сигурност</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Row Level Security (RLS)</li>
                      <li>• Потребителска автентикация</li>
                      <li>• Един глас на потребител</li>
                      <li>• Админ модерация</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

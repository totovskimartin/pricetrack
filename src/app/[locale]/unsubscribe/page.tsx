'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { CheckCircle, Mail, AlertCircle } from 'lucide-react'

interface UserInfo {
  email: string
  name: string
}

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [unsubscribeType, setUnsubscribeType] = useState('all')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchUserInfo()
    } else {
      setError('Невалиден линк за отписване')
    }
  }, [token])

  const fetchUserInfo = async () => {
    try {
      const response = await fetch(`/api/unsubscribe?token=${token}`)
      const data = await response.json()

      if (response.ok) {
        setUserInfo(data.user)
      } else {
        setError(data.error || 'Невалиден линк за отписване')
      }
    } catch (error) {
      console.error('Error fetching user info:', error)
      setError('Възникна грешка при зареждането')
    }
  }

  const handleUnsubscribe = async () => {
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          unsubscribe_type: unsubscribeType
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
      } else {
        setError(data.error || 'Възникна грешка при отписването')
      }
    } catch (error) {
      console.error('Error unsubscribing:', error)
      setError('Възникна грешка при отписването')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Успешно отписване
              </h2>
              <p className="text-gray-600 mb-6">
                Вие бяхте успешно отписани от избраните имейл известия.
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={() => window.location.href = '/bg/dashboard'}
                  className="w-full"
                >
                  Обратно към началото
                </Button>
                <p className="text-xs text-gray-500">
                  Можете да промените настройките си за имейли от профила си по всяко време.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Грешка
              </h2>
              <p className="text-gray-600 mb-6">
                {error}
              </p>
              <Button 
                onClick={() => window.location.href = '/bg/dashboard'}
                variant="outline"
                className="w-full"
              >
                Обратно към началото
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-xl">Отписване от имейли</CardTitle>
          <CardDescription>
            {userInfo ? (
              <>Здравейте, <strong>{userInfo.name}</strong> ({userInfo.email})</>
            ) : (
              'Зареждане...'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {userInfo && (
            <>
              <div>
                <Label className="text-base font-medium">
                  Какви имейли искате да спрете да получавате?
                </Label>
                <RadioGroup 
                  value={unsubscribeType} 
                  onValueChange={setUnsubscribeType}
                  className="mt-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="price_alerts" id="price_alerts" />
                    <Label htmlFor="price_alerts" className="text-sm">
                      Само известия за цени
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="marketing" id="marketing" />
                    <Label htmlFor="marketing" className="text-sm">
                      Само маркетингови имейли
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="text-sm">
                      Всички имейли от PriceTrack
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Важно:</p>
                    <p>
                      Ако се отпишете от известията за цени, няма да получавате 
                      уведомления когато цените на следените от вас продукти се променят.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={handleUnsubscribe}
                  disabled={loading}
                  className="w-full"
                  variant="destructive"
                >
                  {loading ? 'Отписване...' : 'Потвърди отписването'}
                </Button>
                <Button 
                  onClick={() => window.location.href = '/bg/dashboard'}
                  variant="outline"
                  className="w-full"
                >
                  Отказ
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Можете да промените настройките си за имейли от профила си по всяко време 
                вместо да се отписвате напълно.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Зареждане...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Mail, Settings, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AuthGuard } from '@/components/auth/auth-guard'

interface EmailPreferences {
  price_alerts_enabled: boolean
  admin_notifications_enabled: boolean
  marketing_emails_enabled: boolean
  email_frequency: 'immediate' | 'daily' | 'weekly' | 'never'
}

function EmailPreferencesContent() {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPreferences()
  }, [])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/email-preferences')
      const data = await response.json()

      if (response.ok) {
        setPreferences(data.preferences)
      } else {
        setError(data.error || 'Грешка при зареждането на настройките')
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
      setError('Възникна грешка при зареждането')
    } finally {
      setLoading(false)
    }
  }

  const updatePreferences = async (updates: Partial<EmailPreferences>) => {
    if (!preferences) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/email-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })

      const data = await response.json()

      if (response.ok) {
        setPreferences(data.preferences)
        setSuccess(true)
      } else {
        setError(data.error || 'Грешка при запазването на настройките')
      }
    } catch (error) {
      console.error('Error updating preferences:', error)
      setError('Възникна грешка при запазването')
    } finally {
      setSaving(false)
    }
  }

  const handleSwitchChange = (key: keyof EmailPreferences, value: boolean) => {
    if (!preferences) return
    
    const updates = { [key]: value }
    setPreferences({ ...preferences, [key]: value })
    updatePreferences(updates)
  }

  const handleFrequencyChange = (frequency: string) => {
    if (!preferences) return
    
    const updates = { email_frequency: frequency as EmailPreferences['email_frequency'] }
    setPreferences({ ...preferences, email_frequency: frequency as EmailPreferences['email_frequency'] })
    updatePreferences(updates)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Зареждане на настройките...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/bg/profile">
              <Button variant="outline" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Обратно към профила
              </Button>
            </Link>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Настройки за имейли
              </h1>
            </div>
            <p className="text-gray-600">
              Управлявайте какви имейл известия искате да получавате
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Настройките са запазени успешно
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {preferences && (
            <div className="space-y-6">
              {/* Email Frequency */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Честота на имейлите</span>
                  </CardTitle>
                  <CardDescription>
                    Изберете колко често искате да получавате имейл известия
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Label htmlFor="frequency">Честота</Label>
                    <Select 
                      value={preferences.email_frequency} 
                      onValueChange={handleFrequencyChange}
                      disabled={saving}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Веднага</SelectItem>
                        <SelectItem value="daily">Дневно резюме</SelectItem>
                        <SelectItem value="weekly">Седмично резюме</SelectItem>
                        <SelectItem value="never">Никога</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">
                      {preferences.email_frequency === 'immediate' && 'Ще получавате известия веднага след промяна в цените'}
                      {preferences.email_frequency === 'daily' && 'Ще получавате дневно резюме с всички промени'}
                      {preferences.email_frequency === 'weekly' && 'Ще получавате седмично резюме с всички промени'}
                      {preferences.email_frequency === 'never' && 'Няма да получавате имейл известия'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Типове известия</CardTitle>
                  <CardDescription>
                    Изберете какви типове имейли искате да получавате
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Price Alerts */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="price-alerts" className="text-base font-medium">
                        Известия за цени
                      </Label>
                      <p className="text-sm text-gray-500">
                        Получавайте известия когато цените на следените продукти се променят
                      </p>
                    </div>
                    <Switch
                      id="price-alerts"
                      checked={preferences.price_alerts_enabled}
                      onCheckedChange={(checked) => handleSwitchChange('price_alerts_enabled', checked)}
                      disabled={saving || preferences.email_frequency === 'never'}
                    />
                  </div>

                  <Separator />

                  {/* Admin Notifications */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="admin-notifications" className="text-base font-medium">
                        Системни известия
                      </Label>
                      <p className="text-sm text-gray-500">
                        Важни съобщения относно вашия акаунт и системата
                      </p>
                    </div>
                    <Switch
                      id="admin-notifications"
                      checked={preferences.admin_notifications_enabled}
                      onCheckedChange={(checked) => handleSwitchChange('admin_notifications_enabled', checked)}
                      disabled={saving}
                    />
                  </div>

                  <Separator />

                  {/* Marketing Emails */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="marketing-emails" className="text-base font-medium">
                        Маркетингови имейли
                      </Label>
                      <p className="text-sm text-gray-500">
                        Новини, съвети и специални оферти от PriceTrack
                      </p>
                    </div>
                    <Switch
                      id="marketing-emails"
                      checked={preferences.marketing_emails_enabled}
                      onCheckedChange={(checked) => handleSwitchChange('marketing_emails_enabled', checked)}
                      disabled={saving}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Полезна информация:</p>
                      <ul className="space-y-1 text-blue-700">
                        <li>• Можете да промените тези настройки по всяко време</li>
                        <li>• Системните известия са важни за сигурността на акаунта ви</li>
                        <li>• При избор "Никога" няма да получавате никакви имейли</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EmailPreferencesPage() {
  return (
    <AuthGuard>
      <EmailPreferencesContent />
    </AuthGuard>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  Settings, 
  ArrowLeft, 
  Bell, 
  Mail, 
  MessageCircle, 
  Heart, 
  TrendingDown,
  Save
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useNotifications } from '@/hooks/use-notifications'
import { useConfirmation } from '@/hooks/use-confirmation'
import type { NotificationPreferences } from '@/lib/notifications'

export default function NotificationSettingsPage() {
  const { user } = useAuth()
  const { preferences, updatePrefs } = useNotifications()
  const { showSuccess, showError, ConfirmationComponent } = useConfirmation()
  const [localPrefs, setLocalPrefs] = useState<Partial<NotificationPreferences>>({})
  const [saving, setSaving] = useState(false)

  // Initialize local preferences when data loads
  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences)
    }
  }, [preferences])

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      await updatePrefs(localPrefs)
      showSuccess('Настройките са запазени', 'Вашите настройки за известия бяха актуализирани успешно.')
    } catch (error) {
      showError('Грешка', 'Възникна грешка при запазването на настройките.')
    } finally {
      setSaving(false)
    }
  }

  const updateLocalPref = (key: keyof NotificationPreferences, value: any) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }))
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Влезте в профила си</h1>
          <p className="text-gray-600 mb-4">За да управлявате настройките си, моля влезте в профила си.</p>
          <Link href="/bg/login">
            <Button>Вход</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 lg:pt-8">
      <ConfirmationComponent />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex-1">
          <div className="flex items-center space-x-4 mb-2">
            <Link href="/bg/notifications">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Обратно към известия
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            <span>Настройки за известия</span>
          </h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Управлявайте как и кога да получавате известия
          </p>
        </div>
        <div className="flex-shrink-0">
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Запазва...' : 'Запази настройки'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* In-App Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Известия в приложението</span>
              </CardTitle>
              <CardDescription>
                Управлявайте кои известия да получавате в приложението
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MessageCircle className="h-4 w-4 text-blue-600" />
                  <div>
                    <Label htmlFor="app-replies">Отговори на коментари</Label>
                    <p className="text-sm text-gray-500">Когато някой отговори на вашия коментар</p>
                  </div>
                </div>
                <Switch
                  id="app-replies"
                  checked={localPrefs.app_comment_replies ?? true}
                  onCheckedChange={(checked) => updateLocalPref('app_comment_replies', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <Label htmlFor="app-discussion-replies">Коментари в дискусии</Label>
                    <p className="text-sm text-gray-500">Когато някой коментира във ваша дискусия</p>
                  </div>
                </div>
                <Switch
                  id="app-discussion-replies"
                  checked={localPrefs.app_discussion_replies ?? true}
                  onCheckedChange={(checked) => updateLocalPref('app_discussion_replies', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Heart className="h-4 w-4 text-red-600" />
                  <div>
                    <Label htmlFor="app-likes">Харесвания</Label>
                    <p className="text-sm text-gray-500">Когато някой хареса вашето съдържание</p>
                  </div>
                </div>
                <Switch
                  id="app-likes"
                  checked={localPrefs.app_likes ?? true}
                  onCheckedChange={(checked) => updateLocalPref('app_likes', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                  <div>
                    <Label htmlFor="app-prices">Промени в цени</Label>
                    <p className="text-sm text-gray-500">За продукти, които следите</p>
                  </div>
                </div>
                <Switch
                  id="app-prices"
                  checked={localPrefs.app_price_changes ?? true}
                  onCheckedChange={(checked) => updateLocalPref('app_price_changes', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="h-4 w-4 text-purple-600" />
                  <div>
                    <Label htmlFor="app-approvals">Одобрения</Label>
                    <p className="text-sm text-gray-500">Когато вашето съдържание бъде одобрено</p>
                  </div>
                </div>
                <Switch
                  id="app-approvals"
                  checked={localPrefs.app_approvals ?? true}
                  onCheckedChange={(checked) => updateLocalPref('app_approvals', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Имейл известия</span>
              </CardTitle>
              <CardDescription>
                Управлявайте кои известия да получавате по имейл
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MessageCircle className="h-4 w-4 text-blue-600" />
                  <div>
                    <Label htmlFor="email-replies">Отговори на коментари</Label>
                    <p className="text-sm text-gray-500">Когато някой отговори на вашия коментар</p>
                  </div>
                </div>
                <Switch
                  id="email-replies"
                  checked={localPrefs.email_comment_replies ?? true}
                  onCheckedChange={(checked) => updateLocalPref('email_comment_replies', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <Label htmlFor="email-discussion-replies">Коментари в дискусии</Label>
                    <p className="text-sm text-gray-500">Когато някой коментира във ваша дискусия</p>
                  </div>
                </div>
                <Switch
                  id="email-discussion-replies"
                  checked={localPrefs.email_discussion_replies ?? true}
                  onCheckedChange={(checked) => updateLocalPref('email_discussion_replies', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Heart className="h-4 w-4 text-red-600" />
                  <div>
                    <Label htmlFor="email-likes">Харесвания</Label>
                    <p className="text-sm text-gray-500">Когато някой хареса вашето съдържание</p>
                  </div>
                </div>
                <Switch
                  id="email-likes"
                  checked={localPrefs.email_likes ?? false}
                  onCheckedChange={(checked) => updateLocalPref('email_likes', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                  <div>
                    <Label htmlFor="email-prices">Промени в цени</Label>
                    <p className="text-sm text-gray-500">За продукти, които следите</p>
                  </div>
                </div>
                <Switch
                  id="email-prices"
                  checked={localPrefs.email_price_changes ?? true}
                  onCheckedChange={(checked) => updateLocalPref('email_price_changes', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="h-4 w-4 text-purple-600" />
                  <div>
                    <Label htmlFor="email-approvals">Одобрения</Label>
                    <p className="text-sm text-gray-500">Когато вашето съдържание бъде одобрено</p>
                  </div>
                </div>
                <Switch
                  id="email-approvals"
                  checked={localPrefs.email_approvals ?? true}
                  onCheckedChange={(checked) => updateLocalPref('email_approvals', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Price Change Thresholds */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Прагове за промени в цени</CardTitle>
            <CardDescription>
              Настройте кога да получавате известия за промени в цени
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="price-drop-threshold">Праг за намаление (%)</Label>
                <Input
                  id="price-drop-threshold"
                  type="number"
                  min="1"
                  max="100"
                  step="0.1"
                  value={localPrefs.price_drop_threshold_percent ?? 10}
                  onChange={(e) => updateLocalPref('price_drop_threshold_percent', parseFloat(e.target.value))}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Получавайте известия при намаление с поне този процент
                </p>
              </div>
              <div>
                <Label htmlFor="price-increase-threshold">Праг за увеличение (%)</Label>
                <Input
                  id="price-increase-threshold"
                  type="number"
                  min="1"
                  max="100"
                  step="0.1"
                  value={localPrefs.price_increase_threshold_percent ?? 20}
                  onChange={(e) => updateLocalPref('price_increase_threshold_percent', parseFloat(e.target.value))}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Получавайте известия при увеличение с поне този процент
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

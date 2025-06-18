'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'
import { updateAdminEmailPreferences } from '@/lib/admin-email-notifications'
import {
  Settings,
  Save,
  RefreshCw,
  MessageSquare,
  Package,
  Shield,
  Mail,
  Globe,
  AlertCircle
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Setting {
  id: string
  key: string
  value: string
  description: string
  type: 'string' | 'boolean' | 'number' | 'json'
  updated_at: string
  updated_by?: string
}

interface SettingGroup {
  title: string
  icon: React.ReactNode
  description: string
  settings: Setting[]
}

export default function SettingsManagement() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [emailPrefsLoading, setEmailPrefsLoading] = useState(false)

  useEffect(() => {
    fetchSettings()
    fetchEmailPreferences()
  }, [user])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('key')

      if (error) {
        console.error('Error fetching settings:', error)
        setMessage({ type: 'error', text: 'Грешка при зареждане на настройките' })
        return
      }

      setSettings(data || [])
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'Възникна неочаквана грешка' })
    } finally {
      setLoading(false)
    }
  }

  const fetchEmailPreferences = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('notification_preferences')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching email preferences:', error)
        return
      }

      const prefs = data?.notification_preferences || {}
      setEmailNotifications(prefs.email_admin_notifications !== false) // Default to true
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleEmailPreferenceChange = async (enabled: boolean) => {
    if (!user) return

    setEmailPrefsLoading(true)
    try {
      const success = await updateAdminEmailPreferences(user.id, enabled)

      if (success) {
        setEmailNotifications(enabled)
        setMessage({
          type: 'success',
          text: `Email известията са ${enabled ? 'включени' : 'изключени'}`
        })
      } else {
        setMessage({
          type: 'error',
          text: 'Грешка при обновяване на email настройките'
        })
      }
    } catch (error) {
      console.error('Error updating email preferences:', error)
      setMessage({
        type: 'error',
        text: 'Възникна неочаквана грешка'
      })
    } finally {
      setEmailPrefsLoading(false)
    }
  }

  const updateSetting = async (key: string, value: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('settings')
        .update({ 
          value, 
          updated_at: new Date().toISOString(),
          updated_by: user.id 
        })
        .eq('key', key)

      if (error) {
        console.error('Error updating setting:', error)
        setMessage({ type: 'error', text: `Грешка при обновяване на ${key}` })
        return false
      }

      // Update local state
      setSettings(prev => prev.map(setting => 
        setting.key === key 
          ? { ...setting, value, updated_at: new Date().toISOString() }
          : setting
      ))

      return true
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'Възникна неочаквана грешка' })
      return false
    }
  }

  const handleSaveAll = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // This would save all pending changes if we had a batch update system
      setMessage({ type: 'success', text: 'Всички настройки са запазени успешно!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Грешка при запазване на настройките' })
    } finally {
      setSaving(false)
    }
  }

  const renderSettingInput = (setting: Setting) => {
    const handleChange = async (newValue: string) => {
      await updateSetting(setting.key, newValue)
    }

    switch (setting.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={setting.value === 'true'}
              onCheckedChange={(checked) => handleChange(checked.toString())}
            />
            <span className="text-sm text-gray-600">
              {setting.value === 'true' ? 'Включено' : 'Изключено'}
            </span>
          </div>
        )
      
      case 'number':
        return (
          <Input
            type="number"
            value={setting.value}
            onChange={(e) => handleChange(e.target.value)}
            className="w-32"
          />
        )
      
      case 'json':
        return (
          <Textarea
            value={setting.value}
            onChange={(e) => handleChange(e.target.value)}
            rows={3}
            className="font-mono text-sm"
          />
        )
      
      default:
        return (
          <Input
            value={setting.value}
            onChange={(e) => handleChange(e.target.value)}
            className="max-w-md"
          />
        )
    }
  }

  const groupSettings = (): SettingGroup[] => {
    return [
      {
        title: 'Модерация на съдържание',
        icon: <Shield className="h-5 w-5" />,
        description: 'Настройки за одобряване на съдържание',
        settings: settings.filter(s => 
          s.key.includes('require_approval') || s.key.includes('anonymous')
        )
      },
      {
        title: 'Дискусии и коментари',
        icon: <MessageSquare className="h-5 w-5" />,
        description: 'Настройки за дискусии и коментари',
        settings: settings.filter(s => 
          s.key.includes('comment') || s.key.includes('discussion')
        ).filter(s => !s.key.includes('require_approval'))
      },
      {
        title: 'Продукти',
        icon: <Package className="h-5 w-5" />,
        description: 'Настройки за управление на продукти',
        settings: settings.filter(s => 
          s.key.includes('product') && !s.key.includes('require_approval')
        )
      },
      {
        title: 'Сайт и известия',
        icon: <Globe className="h-5 w-5" />,
        description: 'Общи настройки на сайта',
        settings: settings.filter(s => 
          s.key.includes('site_') || s.key.includes('email') || s.key.includes('notification')
        )
      }
    ].filter(group => group.settings.length > 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Зареждане на настройки...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Системни настройки</h2>
          <p className="text-gray-600">Конфигурация на системата и поведение</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchSettings} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обнови
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Email Notification Preferences */}
      <Card className="bg-white shadow-sm border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Email известия за администратори</span>
          </CardTitle>
          <CardDescription>
            Настройки за получаване на email известия при административни събития
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-4">
            <div className="flex-1 mr-4">
              <h4 className="font-medium text-gray-900 mb-1">
                Известия за предложения за цени
              </h4>
              <p className="text-sm text-gray-600">
                Получавайте email известие когато потребител предложи нова цена за продукт
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={emailNotifications}
                onCheckedChange={handleEmailPreferenceChange}
                disabled={emailPrefsLoading}
              />
              <span className="text-sm text-gray-600">
                {emailNotifications ? 'Включено' : 'Изключено'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Groups */}
      <div className="space-y-6">
        {groupSettings().map((group) => (
          <Card key={group.title} className="bg-white shadow-sm border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {group.icon}
                <span>{group.title}</span>
              </CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {group.settings.map((setting) => (
                  <div key={setting.key} className="flex items-start justify-between py-4 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1 mr-4">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">
                          {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {setting.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {setting.description}
                      </p>
                      {setting.updated_at && (
                        <p className="text-xs text-gray-500">
                          Последно обновено: {new Date(setting.updated_at).toLocaleDateString('bg-BG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {renderSettingInput(setting)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

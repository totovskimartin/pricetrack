'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Settings, 
  ArrowLeft, 
  User, 
  Save,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { getUserProfile } from '@/lib/user-utils'
import { supabase } from '@/lib/supabase'
import { useConfirmation } from '@/hooks/use-confirmation'

interface UserProfile {
  id: string
  email: string
  username: string
  full_name?: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  role: string
  is_active: boolean
  created_at: string
}

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { showSuccess, showError, ConfirmationComponent } = useConfirmation()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  // Form fields
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  const fetchUserProfile = async () => {
    if (!user) return

    try {
      setLoading(true)
      const userProfile = await getUserProfile(user.id)
      
      if (userProfile) {
        setProfile(userProfile)
        setUsername(userProfile.username || '')
        setFirstName(userProfile.first_name || '')
        setLastName(userProfile.last_name || '')
        setAvatarUrl(userProfile.avatar_url || '')
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setError('Възникна грешка при зареждането на профила')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    if (!username.trim()) {
      setError('Потребителското име е задължително')
      return false
    }

    if (username.length < 3) {
      setError('Потребителското име трябва да е поне 3 символа')
      return false
    }

    if (username.length > 20) {
      setError('Потребителското име не може да е повече от 20 символа')
      return false
    }

    // Username can only contain letters, numbers, and underscores
    const usernameRegex = /^[a-zA-Z0-9_]+$/
    if (!usernameRegex.test(username)) {
      setError('Потребителското име може да съдържа само букви, цифри и долна черта')
      return false
    }

    return true
  }

  const handleSave = async () => {
    if (!user || !profile) return

    setError('')
    if (!validateForm()) return

    setSaving(true)
    try {
      // Check if username is already taken (if changed)
      if (username !== profile.username) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .neq('id', user.id)
          .single()

        if (existingUser) {
          setError('Това потребителско име вече се използва')
          setSaving(false)
          return
        }
      }

      // Update user profile
      const { error } = await supabase
        .from('users')
        .update({
          username: username.trim(),
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          full_name: firstName.trim() && lastName.trim() 
            ? `${firstName.trim()} ${lastName.trim()}` 
            : (firstName.trim() || lastName.trim() || null),
          avatar_url: avatarUrl.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating profile:', error)
        setError('Възникна грешка при запазването на профила')
        return
      }

      // Update local state
      const updatedProfile = {
        ...profile,
        username: username.trim(),
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        full_name: firstName.trim() && lastName.trim() 
          ? `${firstName.trim()} ${lastName.trim()}` 
          : (firstName.trim() || lastName.trim() || null),
        avatar_url: avatarUrl.trim() || null
      }
      setProfile(updatedProfile)

      showSuccess('Профилът е запазен', 'Вашият профил беше актуализиран успешно.')
    } catch (error) {
      console.error('Error saving profile:', error)
      setError('Възникна неочаквана грешка')
    } finally {
      setSaving(false)
    }
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto pl-16 pr-4 sm:px-6 lg:px-8 py-8">
      <ConfirmationComponent />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/bg/dashboard">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Обратно към началото
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
                <Settings className="h-8 w-8 text-blue-600" />
                <span>Настройки на профила</span>
              </h1>
              <p className="text-gray-600 mt-1">Управлявайте информацията за вашия профил</p>
            </div>
          </div>
          {profile && (
            <Link href={`/bg/profile/${profile.username}`}>
              <Button variant="outline">
                <User className="h-4 w-4 mr-2" />
                Виж профил
              </Button>
            </Link>
          )}
        </div>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Профилна информация</CardTitle>
            <CardDescription>
              Актуализирайте вашата профилна информация. Потребителското име е видимо за всички потребители. Добавянето на име и фамилия помага на другите потребители да ви разпознават по-лесно.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Потребителско име *</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="ivan_petrov"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={saving}
                />
                <p className="text-xs text-gray-500">
                  3-20 символа, само букви, цифри и долна черта. Това е вашият уникален идентификатор.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Име</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Иван"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Фамилия</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Петров"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatarUrl">URL на аватар</Label>
                <Input
                  id="avatarUrl"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  disabled={saving}
                />
                <p className="text-xs text-gray-500">
                  Опционално. Линк към изображение за вашия аватар.
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Запазване...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Запази промените
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

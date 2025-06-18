'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Save, 
  Loader2, 
  AlertCircle,
  Shield,
  Calendar,
  Mail
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'

interface UserEditModalProps {
  user: any | null
  isOpen: boolean
  onClose: () => void
  onUserUpdated: () => void
  currentAdminId: string
}

export function UserEditModal({ 
  user, 
  isOpen, 
  onClose, 
  onUserUpdated, 
  currentAdminId 
}: UserEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Form fields
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [role, setRole] = useState<'user' | 'moderator' | 'admin' | 'super_admin'>('user')
  const [isActive, setIsActive] = useState(true)

  // Initialize form when user changes
  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setEmail(user.email || '')
      setFirstName(user.first_name || '')
      setLastName(user.last_name || '')
      setAvatarUrl(user.avatar_url || '')
      setRole(user.role || 'user')
      setIsActive(user.is_active ?? true)
      setError('')
    }
  }, [user])

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

    if (!email.trim()) {
      setError('Имейлът е задължителен')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Моля въведете валиден имейл адрес')
      return false
    }

    return true
  }

  const handleSave = async () => {
    if (!user) return

    setError('')
    if (!validateForm()) return

    setLoading(true)
    try {
      // Check if username is already taken (if changed)
      if (username !== user.username) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .neq('id', user.id)
          .single()

        if (existingUser) {
          setError('Това потребителско име вече се използва')
          setLoading(false)
          return
        }
      }

      // Check if email is already taken (if changed)
      if (email !== user.email) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .neq('id', user.id)
          .single()

        if (existingUser) {
          setError('Този имейл вече се използва')
          setLoading(false)
          return
        }
      }

      // Update user profile
      const { error } = await supabase
        .from('users')
        .update({
          username: username.trim(),
          email: email.trim(),
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          full_name: firstName.trim() && lastName.trim() 
            ? `${firstName.trim()} ${lastName.trim()}` 
            : (firstName.trim() || lastName.trim() || null),
          avatar_url: avatarUrl.trim() || null,
          role: role,
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating user:', error)
        setError('Възникна грешка при запазването на потребителя')
        return
      }

      // Log admin action
      await logAdminAction(
        currentAdminId,
        'edit_user',
        'user',
        user.id,
        {
          changes: {
            username: username !== user.username ? { from: user.username, to: username } : undefined,
            email: email !== user.email ? { from: user.email, to: email } : undefined,
            role: role !== user.role ? { from: user.role, to: role } : undefined,
            is_active: isActive !== user.is_active ? { from: user.is_active, to: isActive } : undefined
          }
        }
      )

      onUserUpdated()
      onClose()
    } catch (error) {
      console.error('Error saving user:', error)
      setError('Възникна неочаквана грешка')
    } finally {
      setLoading(false)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Супер Администратор'
      case 'admin': return 'Администратор'
      case 'moderator': return 'Модератор'
      default: return 'Потребител'
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive'
      case 'admin': return 'destructive'
      case 'moderator': return 'secondary'
      default: return 'outline'
    }
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Редактиране на потребител</span>
          </DialogTitle>
          <DialogDescription>
            Редактирайте информацията и настройките за потребителя
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* User Info */}
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-gray-900">@{user.username}</h3>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  <Shield className="h-3 w-3 mr-1" />
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Mail className="h-3 w-3 mr-1" />
                  {user.email}
                </div>
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(user.created_at).toLocaleDateString('bg-BG')}
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Потребителско име *</Label>
              <Input
                id="username"
                type="text"
                placeholder="ivan_petrov"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                3-20 символа, само букви, цифри и долна черта
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Имейл *</Label>
              <Input
                id="email"
                type="email"
                placeholder="ivan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
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
                  disabled={loading}
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
                  disabled={loading}
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
                disabled={loading}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="role">Роля</Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Изберете роля" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Потребител</SelectItem>
                  <SelectItem value="moderator">Модератор</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                  <SelectItem value="super_admin">Супер Администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">Статус на акаунта</Label>
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    isActive ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-900">
                      {isActive ? 'Активен акаунт' : 'Неактивен акаунт'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {isActive
                        ? 'Потребителят може да влиза в системата'
                        : 'Потребителят не може да влиза в системата'
                      }
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant={isActive ? "destructive" : "default"}
                  size="sm"
                  onClick={() => setIsActive(!isActive)}
                  disabled={loading}
                  className={`min-w-[120px] ${
                    isActive
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isActive ? 'Деактивирай' : 'Активирай'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Отказ
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

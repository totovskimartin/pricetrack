'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  MobileAdminModal,
  MobileFormField,
  MobileFormGrid,
  MobileFormActions
} from './mobile-admin-modal'
import {
  User,
  Mail,
  Shield,
  Calendar,
  Save,
  X
} from 'lucide-react'

interface MobileUserEditFormProps {
  isOpen: boolean
  onClose: () => void
  user: any
  onSave: (userData: any) => Promise<void>
  currentUser: any
}

export function MobileUserEditForm({
  isOpen,
  onClose,
  user,
  onSave,
  currentUser
}: MobileUserEditFormProps) {
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    username: user?.username || '',
    role: user?.role || 'user',
    is_active: user?.is_active ?? true
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const handleSubmit = async () => {
    setErrors({})
    
    // Basic validation
    const newErrors: { [key: string]: string } = {}
    
    if (!formData.email) {
      newErrors.email = 'Имейлът е задължителен'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Невалиден имейл адрес'
    }
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Пълното име е задължително'
    }
    
    if (formData.username && formData.username.length < 3) {
      newErrors.username = 'Потребителското име трябва да е поне 3 символа'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Error saving user:', error)
      setErrors({ general: 'Възникна грешка при запазването' })
    } finally {
      setLoading(false)
    }
  }

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      user: 'Потребител',
      moderator: 'Модератор',
      admin: 'Администратор',
      super_admin: 'Супер Администратор'
    }
    return labels[role] || role
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'default'
      case 'admin':
        return 'secondary'
      case 'moderator':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const canChangeRole = () => {
    if (!currentUser) return false
    if (currentUser.role === 'super_admin') return true
    if (currentUser.role === 'admin' && user?.role !== 'super_admin') return true
    return false
  }

  const canDeactivate = () => {
    if (!currentUser || !user) return false
    if (currentUser.id === user.id) return false // Can't deactivate self
    if (currentUser.role === 'super_admin') return true
    if (currentUser.role === 'admin' && user.role !== 'super_admin') return true
    return false
  }

  return (
    <MobileAdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Редактиране на потребител' : 'Нов потребител'}
      size="full"
      actions={
        <MobileFormActions>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Отказ
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Запазване...' : 'Запази'}
          </Button>
        </MobileFormActions>
      }
    >
      <div className="space-y-6">
        {/* User Info Header */}
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                {user ? 'Редактиране на потребител' : 'Нов потребител'}
              </h3>
              {user && (
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                  <Badge variant={user.is_active ? 'default' : 'destructive'}>
                    {user.is_active ? 'Активен' : 'Неактивен'}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}

        {/* Form Fields */}
        <div className="bg-white rounded-lg p-4 border">
          <h4 className="font-medium text-gray-900 mb-4">Основна информация</h4>
          
          <MobileFormGrid>
            <MobileFormField
              label="Пълно име"
              required
              error={errors.full_name}
            >
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Иван Петров"
                disabled={loading}
              />
            </MobileFormField>

            <MobileFormField
              label="Имейл адрес"
              required
              error={errors.email}
            >
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ivan@example.com"
                disabled={loading}
              />
            </MobileFormField>

            <MobileFormField
              label="Потребителско име"
              error={errors.username}
            >
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="ivan_petrov"
                disabled={loading}
              />
            </MobileFormField>
          </MobileFormGrid>
        </div>

        {/* Role and Status */}
        <div className="bg-white rounded-lg p-4 border">
          <h4 className="font-medium text-gray-900 mb-4">Роля и статус</h4>
          
          <MobileFormGrid>
            <MobileFormField
              label="Роля"
              error={errors.role}
            >
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                disabled={loading || !canChangeRole()}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Избери роля" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Потребител</SelectItem>
                  <SelectItem value="moderator">Модератор</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                  {currentUser?.role === 'super_admin' && (
                    <SelectItem value="super_admin">Супер Администратор</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </MobileFormField>

            <MobileFormField label="Статус на акаунта">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Активен акаунт</p>
                  <p className="text-xs text-gray-500">
                    {formData.is_active ? 'Потребителят може да влиза' : 'Потребителят не може да влиза'}
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  disabled={loading || !canDeactivate()}
                />
              </div>
            </MobileFormField>
          </MobileFormGrid>
        </div>

        {/* User Stats (if editing existing user) */}
        {user && (
          <div className="bg-white rounded-lg p-4 border">
            <h4 className="font-medium text-gray-900 mb-4">Статистики</h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{user._count?.products || 0}</p>
                <p className="text-gray-600">Продукти</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{user._count?.discussions || 0}</p>
                <p className="text-gray-600">Дискусии</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{user._count?.comments || 0}</p>
                <p className="text-gray-600">Коментари</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{user._count?.favorites || 0}</p>
                <p className="text-gray-600">Любими</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t text-xs text-gray-500">
              <div className="flex items-center justify-between">
                <span>Регистрация:</span>
                <span>{new Date(user.created_at).toLocaleDateString('bg-BG')}</span>
              </div>
              {user.last_login_at && (
                <div className="flex items-center justify-between mt-1">
                  <span>Последен вход:</span>
                  <span>{new Date(user.last_login_at).toLocaleDateString('bg-BG')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MobileAdminModal>
  )
}

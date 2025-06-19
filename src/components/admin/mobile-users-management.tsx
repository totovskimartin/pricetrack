'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Users,
  Shield,
  ShieldCheck,
  Crown,
  Calendar,
  Clock,
  Edit,
  MessageCircle,
  ShoppingCart,
  Heart,
  Trash2,
  ChevronRight,
  Filter
} from 'lucide-react'

interface MobileUsersManagementProps {
  users: any[]
  loading: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
  roleFilter: string
  setRoleFilter: (role: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
  activityFilter: string
  setActivityFilter: (activity: string) => void
  onEditUser: (user: any) => void
  onDeleteUser: (user: any) => void
  canDeleteUsers: (currentUser: any) => boolean
  currentUser: any
  formatDate: (date: string) => string
  formatRelativeTime: (date: string) => string
  getRoleIcon: (role: string) => React.ReactNode
  getRoleLabel: (role: string) => string
  getRoleBadgeVariant: (role: string) => any
}

export function MobileUsersManagement({
  users,
  loading,
  searchTerm,
  setSearchTerm,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  activityFilter,
  setActivityFilter,
  onEditUser,
  onDeleteUser,
  canDeleteUsers,
  currentUser,
  formatDate,
  formatRelativeTime,
  getRoleIcon,
  getRoleLabel,
  getRoleBadgeVariant
}: MobileUsersManagementProps) {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-600" />
            Потребители ({users.length})
          </h2>
          <p className="text-sm text-gray-600">Управление на акаунти</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-1"
        >
          <Filter className="h-4 w-4" />
          <span>Филтри</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Търси по име или имейл..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Роля</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Всички роли" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Всички роли</SelectItem>
                    <SelectItem value="user">Потребители</SelectItem>
                    <SelectItem value="moderator">Модератори</SelectItem>
                    <SelectItem value="admin">Админи</SelectItem>
                    <SelectItem value="super_admin">Супер Админи</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Статус</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Всички" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Всички</SelectItem>
                      <SelectItem value="active">Активни</SelectItem>
                      <SelectItem value="inactive">Неактивни</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Активност</Label>
                  <Select value={activityFilter} onValueChange={setActivityFilter}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Всички" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Всички</SelectItem>
                      <SelectItem value="today">Днес</SelectItem>
                      <SelectItem value="week">Тази седмица</SelectItem>
                      <SelectItem value="month">Този месец</SelectItem>
                      <SelectItem value="never">Никога</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Зареждане...</p>
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Няма намерени потребители</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name || user.email}
                        className="w-12 h-12 rounded-full object-cover border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center ${user.avatar_url ? 'hidden' : ''}`}>
                      <Users className="h-6 w-6 text-gray-500" />
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      {getRoleIcon(user.role)}
                      <h3 className="font-medium text-gray-900 truncate">
                        {user.username ? `@${user.username}` : (user.full_name || 'Без име')}
                      </h3>
                    </div>
                    
                    {user.full_name && user.username && (
                      <p className="text-sm text-gray-600 truncate">{user.full_name}</p>
                    )}
                    
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                        {getRoleLabel(user.role)}
                      </Badge>
                      <Badge
                        variant={user.is_active ? 'default' : 'destructive'}
                        className={`text-xs ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {user.is_active ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                      <div className="flex items-center space-x-1">
                        <ShoppingCart className="h-3 w-3 text-purple-600" />
                        <span className="font-medium text-purple-600">{user._count?.products || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-3 w-3 text-blue-600" />
                        <span className="font-medium text-blue-600">{user._count?.discussions || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-3 h-3 bg-green-600 rounded-full"></span>
                        <span className="font-medium text-green-600">{user._count?.comments || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Heart className="h-3 w-3 text-red-600" />
                        <span className="font-medium text-red-600">{user._count?.favorites || 0}</span>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(user.created_at)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {user.last_login_at ? formatRelativeTime(user.last_login_at) : 'Никога'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEditUser(user)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Редактирай
                      </Button>
                      
                      {canDeleteUsers(currentUser) && user.id !== currentUser?.id && user.role !== 'super_admin' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDeleteUser(user)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

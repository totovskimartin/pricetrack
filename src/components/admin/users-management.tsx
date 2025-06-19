'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { Button } from '@/components/ui/button'
import { UserEditModal } from './user-edit-modal'
import { UserDeleteModal } from './user-delete-modal'
import { MobileUsersManagement } from './mobile-users-management'
import { supabase } from '@/lib/supabase'
import { canDeleteUsers } from '@/lib/admin'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/ui/toast'
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
  Trash2
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface User {
  id: string
  email: string
  username: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  role: 'user' | 'moderator' | 'admin' | 'super_admin'
  is_active: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
  avatar_url: string | null
  _count?: {
    products: number
    discussions: number
    comments: number
    favorites: number
  }
}

export default function UsersManagement() {
  const { user: authUser } = useAuth()
  const { showToast, ToastComponent } = useToast()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activityFilter, setActivityFilter] = useState('all')
  const [isMobile, setIsMobile] = useState(false)

  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch current user's database record
  const fetchCurrentUser = async () => {
    if (!authUser?.id) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error) {
        console.error('Error fetching current user:', error)
        return
      }

      setCurrentUser(data)
    } catch (error) {
      console.error('Error fetching current user:', error)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchCurrentUser()
  }, [roleFilter, statusFilter, activityFilter, authUser?.id])

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...')
      let query = supabase
        .from('users')
        .select('id, email, username, full_name, first_name, last_name, role, is_active, created_at, updated_at, last_login_at, avatar_url')
        .order('created_at', { ascending: false })

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter)
      }

      if (statusFilter === 'active') {
        query = query.eq('is_active', true)
      } else if (statusFilter === 'inactive') {
        query = query.eq('is_active', false)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching users:', error)
        return
      }

      console.log('Fetched users:', data)

      // Get counts for each user (show all counts for admin, not just approved)
      const usersWithCounts = await Promise.all(
        (data || []).map(async (user) => {
          try {
            const [
              { count: productsCount },
              { count: discussionsCount },
              { count: commentsCount },
              { count: favoritesCount }
            ] = await Promise.all([
              supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('created_by', user.id),
              supabase
                .from('discussions')
                .select('*', { count: 'exact', head: true })
                .eq('created_by', user.id),
              supabase
                .from('discussion_comments')
                .select('*', { count: 'exact', head: true })
                .eq('created_by', user.id),
              supabase
                .from('user_products')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
            ])

            return {
              ...user,
              _count: {
                products: productsCount || 0,
                discussions: discussionsCount || 0,
                comments: commentsCount || 0,
                favorites: favoritesCount || 0
              }
            }
          } catch (error) {
            console.error(`Error fetching counts for user ${user.id}:`, error)
            return {
              ...user,
              _count: {
                products: 0,
                discussions: 0,
                comments: 0,
                favorites: 0
              }
            }
          }
        })
      )

      setUsers(usersWithCounts)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }





  const handleEditUser = (userToEdit: User) => {
    setEditingUser(userToEdit)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingUser(null)
  }

  const handleUserUpdated = () => {
    fetchUsers()
  }

  const handleDeleteUser = (userToDelete: User) => {
    setDeletingUser(userToDelete)
    setIsDeleteModalOpen(true)
  }

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setDeletingUser(null)
  }

  const handleUserDeleted = (deletedUsername: string) => {
    fetchUsers()
    showToast(`Потребителят @${deletedUsername} беше изтрит успешно`, 'success')
  }

  const filteredUsers = users.filter(u => {
    // Text search filter
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase()))

    // Role filter
    const matchesRole = roleFilter === 'all' || u.role === roleFilter

    // Status filter
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && u.is_active) ||
      (statusFilter === 'inactive' && !u.is_active)

    // Activity filter
    const matchesActivity = (() => {
      if (activityFilter === 'all') return true
      if (!u.last_login_at) return activityFilter === 'never'

      const lastLogin = new Date(u.last_login_at)
      const now = new Date()
      const diffInDays = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))

      switch (activityFilter) {
        case 'today': return diffInDays === 0
        case 'week': return diffInDays <= 7
        case 'month': return diffInDays <= 30
        case 'never': return false
        default: return true
      }
    })()

    return matchesSearch && matchesRole && matchesStatus && matchesActivity
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Преди момент'
    if (diffInSeconds < 3600) return `Преди ${Math.floor(diffInSeconds / 60)} мин`
    if (diffInSeconds < 86400) return `Преди ${Math.floor(diffInSeconds / 3600)} ч`
    if (diffInSeconds < 2592000) return `Преди ${Math.floor(diffInSeconds / 86400)} дни`

    return formatDate(dateString)
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Crown className="h-4 w-4" />
      case 'admin':
        return <ShieldCheck className="h-4 w-4" />
      case 'moderator':
        return <Shield className="h-4 w-4" />
      default:
        return <Users className="h-4 w-4" />
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Супер Админ'
      case 'admin':
        return 'Админ'
      case 'moderator':
        return 'Модератор'
      default:
        return 'Потребител'
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'default'
      case 'admin':
        return 'destructive'
      case 'moderator':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <>
        {ToastComponent}
        <MobileUsersManagement
          users={filteredUsers}
          loading={loading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          activityFilter={activityFilter}
          setActivityFilter={setActivityFilter}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
          canDeleteUsers={canDeleteUsers}
          currentUser={currentUser}
          formatDate={formatDate}
          formatRelativeTime={formatRelativeTime}
          getRoleIcon={getRoleIcon}
          getRoleLabel={getRoleLabel}
          getRoleBadgeVariant={getRoleBadgeVariant}
        />

        {/* Edit User Modal */}
        <UserEditModal
          user={editingUser}
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onUserUpdated={handleUserUpdated}
          currentAdminId={currentUser?.id || ''}
        />

        {/* Delete User Modal */}
        <UserDeleteModal
          user={deletingUser}
          isOpen={isDeleteModalOpen}
          onClose={handleCloseDeleteModal}
          onUserDeleted={handleUserDeleted}
          currentAdminId={currentUser?.id || ''}
        />
      </>
    )
  }

  // Desktop Layout
  return (
    <div className="space-y-6">
      {ToastComponent}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Управление на потребители</h2>
          {/* <p className="text-gray-600">Преглед и управление на потребителски акаунти</p> */}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Търси по имейл или име..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Филтрирай по роля" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всички роли</SelectItem>
                <SelectItem value="user">Потребители</SelectItem>
                <SelectItem value="moderator">Модератори</SelectItem>
                <SelectItem value="admin">Админи</SelectItem>
                <SelectItem value="super_admin">Супер Админи</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Филтрирай по статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всички статуси</SelectItem>
                <SelectItem value="active">Активни</SelectItem>
                <SelectItem value="inactive">Неактивни</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Последна активност" />
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
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Потребители ({filteredUsers.length})</span>
          </CardTitle>
          <CardDescription>
            {/* Управление на потребителски акаунти и роли */}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Зареждане...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Няма намерени потребители</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 sm:w-16">Аватар</TableHead>
                    <TableHead>Потребител</TableHead>
                    <TableHead className="hidden sm:table-cell">Роля</TableHead>
                    <TableHead className="hidden md:table-cell">Статус</TableHead>
                    <TableHead className="hidden lg:table-cell">Статистики</TableHead>
                    <TableHead className="hidden lg:table-cell">Регистрация</TableHead>
                    <TableHead className="hidden xl:table-cell">Последен вход</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow
                      key={u.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleEditUser(u)}
                    >
                      {/* Avatar */}
                      <TableCell>
                        <div className="flex-shrink-0">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.full_name || u.email}
                              className="w-10 h-10 rounded-full object-cover border"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center ${u.avatar_url ? 'hidden' : ''}`}>
                            <Users className="h-5 w-5 text-gray-500" />
                          </div>
                        </div>
                      </TableCell>

                      {/* User Info */}
                      <TableCell>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="sm:hidden">{getRoleIcon(u.role)}</span>
                            <div className="font-medium text-gray-900 truncate">
                              {u.username ? `@${u.username}` : (u.full_name || 'Без име')}
                            </div>
                          </div>
                          {u.full_name && u.username && (
                            <div className="text-sm text-gray-600 truncate">{u.full_name}</div>
                          )}
                          <div className="text-sm text-gray-500 truncate">{u.email}</div>
                          {/* Mobile-only role and status */}
                          <div className="sm:hidden flex flex-wrap gap-1 mt-1">
                            <Badge variant={getRoleBadgeVariant(u.role)} className="text-xs">
                              {getRoleLabel(u.role)}
                            </Badge>
                            <Badge
                              variant={u.is_active ? 'default' : 'destructive'}
                              className={`text-xs ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                            >
                              {u.is_active ? 'Активен' : 'Неактивен'}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>

                      {/* Role */}
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={getRoleBadgeVariant(u.role)} className="text-xs">
                          {getRoleLabel(u.role)}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="hidden md:table-cell">
                        <Badge
                          variant={u.is_active ? 'default' : 'destructive'}
                          className={`text-xs ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                        >
                          {u.is_active ? 'Активен' : 'Неактивен'}
                        </Badge>
                      </TableCell>

                      {/* Stats */}
                      <TableCell className="hidden lg:table-cell">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center space-x-1">
                            <ShoppingCart className="h-3 w-3 text-purple-600" />
                            <span className="font-medium text-purple-600">{u._count?.products || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="h-3 w-3 text-blue-600" />
                            <span className="font-medium text-blue-600">{u._count?.discussions || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="w-3 h-3 bg-green-600 rounded-full"></span>
                            <span className="font-medium text-green-600">{u._count?.comments || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Heart className="h-3 w-3 text-red-600" />
                            <span className="font-medium text-red-600">{u._count?.favorites || 0}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Registration Date */}
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(u.created_at)}
                          </div>
                        </div>
                      </TableCell>

                      {/* Last Login Date */}
                      <TableCell className="hidden xl:table-cell">
                        <div className="text-sm text-gray-500">
                          {u.last_login_at ? (
                            <div className="flex items-center" title={formatDate(u.last_login_at)}>
                              <Clock className="h-3 w-3 mr-1" />
                              {formatRelativeTime(u.last_login_at)}
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-400">
                              <Clock className="h-3 w-3 mr-1" />
                              Никога
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                          {/* Edit User */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditUser(u)
                            }}
                            className="text-gray-600 hover:text-gray-700 h-8 w-8 p-0 flex-shrink-0"
                            title="Редактирай"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          {/* Delete User - Only for Super Admins */}
                          {canDeleteUsers(currentUser) && u.id !== currentUser?.id && u.role !== 'super_admin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteUser(u)
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 flex-shrink-0"
                              title="Изтрий потребител"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <UserEditModal
        user={editingUser}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onUserUpdated={handleUserUpdated}
        currentAdminId={currentUser?.id || ''}
      />

      {/* Delete User Modal */}
      <UserDeleteModal
        user={deletingUser}
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onUserDeleted={handleUserDeleted}
        currentAdminId={currentUser?.id || ''}
      />
    </div>
  )
}

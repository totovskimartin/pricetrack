'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'
import { useAuth } from '@/components/providers/auth-provider'
import { useConfirmation } from '@/hooks/use-confirmation'
import {
  Search,
  Plus,
  Store,
  Trash2,
  Edit,
  Globe,
  ExternalLink
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'

interface Supermarket {
  id: string
  name: string
  slug: string
  logo_url?: string
  website_url?: string
  is_active: boolean
  created_at: string
  _count?: {
    products: number
  }
}

export default function SupermarketsManagement() {
  const { user } = useAuth()
  const { confirm, showSuccess, showError, ConfirmationComponent } = useConfirmation()
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchSupermarkets()
  }, [])

  const fetchSupermarkets = async () => {
    try {
      console.log('Fetching supermarkets...')
      const { data, error } = await supabase
        .from('supermarkets')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching supermarkets:', error)
        return
      }

      console.log('Fetched supermarkets:', data)

      // Get product counts for each supermarket
      const supermarketsWithCounts = await Promise.all(
        (data || []).map(async (supermarket) => {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('supermarket_id', supermarket.id)

          return {
            ...supermarket,
            _count: {
              products: count || 0
            }
          }
        })
      )

      console.log('Supermarkets with counts:', supermarketsWithCounts)
      setSupermarkets(supermarketsWithCounts)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (supermarketId: string, isActive: boolean) => {
    if (!user) return
    
    setActionLoading(supermarketId)
    try {
      const { error } = await supabase
        .from('supermarkets')
        .update({ is_active: isActive })
        .eq('id', supermarketId)

      if (error) {
        console.error('Error updating supermarket:', error)
        return
      }

      await logAdminAction(
        user.id, 
        isActive ? 'activate_supermarket' : 'deactivate_supermarket', 
        'supermarket', 
        supermarketId
      )
      await fetchSupermarkets()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (supermarketId: string) => {
    if (!user) return

    confirm(
      'Изтриване на супермаркет',
      'Сигурни ли сте, че искате да изтриете този супермаркет? Това ще премахне всички свързани продукти и данни. Действието не може да бъде отменено.',
      async () => {
        setActionLoading(supermarketId)
        try {
          const { error } = await supabase
            .from('supermarkets')
            .delete()
            .eq('id', supermarketId)

          if (error) {
            console.error('Error deleting supermarket:', error)
            showError('Грешка', 'Възникна грешка при изтриването на супермаркета.')
            return
          }

          await logAdminAction(user.id, 'delete_supermarket', 'supermarket', supermarketId)
          await fetchSupermarkets()
          showSuccess('Успех', 'Супермаркетът беше изтрит успешно.')
        } catch (error) {
          console.error('Error:', error)
          showError('Грешка', 'Възникна неочаквана грешка.')
        } finally {
          setActionLoading(null)
        }
      },
      {
        confirmText: 'Изтрий',
        cancelText: 'Отказ',
        type: 'error'
      }
    )
  }

  const filteredSupermarkets = supermarkets.filter(supermarket =>
    supermarket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supermarket.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      <ConfirmationComponent />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Управление на супермаркети</h2>
          <p className="text-gray-600">Добавяне, редактиране и управление на супермаркети</p>
        </div>
        <Link href="/bg/admin/supermarkets/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Добави супермаркет
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="bg-white shadow-sm border">
        <CardHeader>
          <CardTitle>Търсене</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Търси супермаркети..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Supermarkets List */}
      <Card className="bg-white shadow-sm border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Store className="h-5 w-5" />
            <span>Супермаркети ({filteredSupermarkets.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredSupermarkets.length === 0 ? (
            <div className="text-center py-8">
              <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Няма намерени супермаркети</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Лого</TableHead>
                    <TableHead>Супермаркет</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Продукти</TableHead>
                    <TableHead>Уебсайт</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSupermarkets.map((supermarket) => (
                    <TableRow
                      key={supermarket.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => window.open(`/bg/admin/supermarkets/${supermarket.id}/edit`, '_blank')}
                    >
                      {/* Logo */}
                      <TableCell>
                        <div className="flex-shrink-0">
                          {supermarket.logo_url ? (
                            <img
                              src={supermarket.logo_url}
                              alt={supermarket.name}
                              className="w-12 h-12 rounded-lg object-cover border"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center ${supermarket.logo_url ? 'hidden' : ''}`}>
                            <Store className="h-6 w-6 text-gray-500" />
                          </div>
                        </div>
                      </TableCell>

                      {/* Supermarket Name */}
                      <TableCell>
                        <div className="font-medium text-gray-900">
                          {supermarket.name}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={supermarket.is_active ? 'default' : 'secondary'}
                            className={`text-xs ${supermarket.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                          >
                            {supermarket.is_active ? 'Активен' : 'Неактивен'}
                          </Badge>
                          <div onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={supermarket.is_active}
                              onCheckedChange={(checked) => handleToggleActive(supermarket.id, checked)}
                              disabled={actionLoading === supermarket.id}
                              className="scale-75"
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* Products Count */}
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {supermarket._count?.products || 0} продукта
                        </Badge>
                      </TableCell>

                      {/* Website */}
                      <TableCell>
                        {supermarket.website_url ? (
                          <a
                            href={supermarket.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                          >
                            <Globe className="h-4 w-4" />
                            <span>Сайт</span>
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">Няма</span>
                        )}
                      </TableCell>

                      {/* Date */}
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {formatDate(supermarket.created_at)}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                          {/* View Website */}
                          {supermarket.website_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="text-blue-600 hover:text-blue-700 h-8 w-8 p-0"
                              title="Посети сайта"
                            >
                              <a href={supermarket.website_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}

                          {/* Edit Supermarket */}
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="text-gray-600 hover:text-gray-700 h-8 w-8 p-0"
                            title="Редактирай"
                          >
                            <Link href={`/bg/admin/supermarkets/${supermarket.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>

                          {/* Delete Supermarket */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(supermarket.id)
                            }}
                            disabled={actionLoading === supermarket.id}
                            className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                            title="Изтрий"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
    </div>
  )
}

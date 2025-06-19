'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'
import { useAuth } from '@/components/providers/auth-provider'
import { useConfirmation } from '@/hooks/use-confirmation'
import { MobileProductsManagement } from './mobile-products-management'
import {
  Search,
  Plus,
  Check,
  X,
  Trash2,
  Package,
  Eye,
  Edit,
  Filter,
  MoreHorizontal,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Product {
  id: string
  name: string
  slug: string
  description?: string
  category?: string
  brand?: string
  image_url?: string
  is_approved: boolean
  created_at: string
  created_by?: string
  created_by_user?: {
    full_name?: string
    email: string
  }
  supermarket?: {
    id: string
    name: string
  }
  latest_price?: {
    price_bgn: number
    price_eur: number | null
    created_at: string
    supermarkets?: {
      name: string
    }
  }
}

export default function ProductsManagement() {
  const { user } = useAuth()
  const { confirm, showSuccess, showError, ConfirmationComponent } = useConfirmation()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [statusFilter, categoryFilter])

  const fetchProducts = async () => {
    try {
      console.log('Fetching products with filters:', { statusFilter, categoryFilter })

      // First, get products without joins to see if basic query works
      let query = supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (statusFilter === 'approved') {
        query = query.eq('is_approved', true)
        console.log('Filtering for approved products')
      } else if (statusFilter === 'pending') {
        query = query.eq('is_approved', false)
        console.log('Filtering for pending products')
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter)
        console.log('Filtering by category:', categoryFilter)
      }

      const { data: productsData, error: productsError } = await query

      if (productsError) {
        console.error('Error fetching products:', productsError)
        return
      }

      console.log('Fetched products:', productsData)
      console.log('Pending products count:', productsData?.filter(p => !p.is_approved).length)
      console.log('Approved products count:', productsData?.filter(p => p.is_approved).length)

      // Now get user data and price data for each product
      const productsWithUsers = await Promise.all(
        (productsData || []).map(async (product) => {
          const promises = []

          // Get user data
          if (product.created_by) {
            promises.push(
              supabase
                .from('users')
                .select('full_name, email')
                .eq('id', product.created_by)
                .single()
            )
          } else {
            promises.push(Promise.resolve({ data: null }))
          }

          // Get latest price data
          promises.push(
            supabase
              .from('prices')
              .select(`
                price_bgn,
                price_eur,
                created_at,
                supermarkets(name)
              `)
              .eq('product_id', product.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
          )

          const [userResult, priceResult] = await Promise.all(promises)

          return {
            ...product,
            created_by_user: userResult.data,
            latest_price: priceResult.data
          }
        })
      )

      console.log('Products with user data:', productsWithUsers)
      setProducts(productsWithUsers)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (productId: string) => {
    if (!user) return
    
    setActionLoading(productId)
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_approved: true })
        .eq('id', productId)

      if (error) {
        console.error('Error approving product:', error)
        return
      }

      await logAdminAction(user.id, 'approve_product', 'product', productId)
      await fetchProducts()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (productId: string) => {
    if (!user) return

    confirm(
      'Отхвърляне на продукт',
      'Сигурни ли сте, че искате да отхвърлите този продукт? Това действие не може да бъде отменено.',
      async () => {
        setActionLoading(productId)
        try {
          const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId)

          if (error) {
            console.error('Error rejecting product:', error)
            showError('Грешка', 'Възникна грешка при отхвърлянето на продукта.')
            return
          }

          await logAdminAction(user.id, 'reject_product', 'product', productId)
          await fetchProducts()
          showSuccess('Успех', 'Продуктът беше отхвърлен успешно.')
        } catch (error) {
          console.error('Error:', error)
          showError('Грешка', 'Възникна неочаквана грешка.')
        } finally {
          setActionLoading(null)
        }
      },
      {
        confirmText: 'Отхвърли',
        cancelText: 'Отказ',
        type: 'warning'
      }
    )
  }

  const handleDelete = async (productId: string) => {
    if (!user) return

    confirm(
      'Изтриване на продукт',
      'Сигурни ли сте, че искате да изтриете този продукт? Това действие не може да бъде отменено и ще премахне всички свързани данни.',
      async () => {
        setActionLoading(productId)
        try {
          const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId)

          if (error) {
            console.error('Error deleting product:', error)
            showError('Грешка', 'Възникна грешка при изтриването на продукта.')
            return
          }

          await logAdminAction(user.id, 'delete_product', 'product', productId)
          await fetchProducts()
          showSuccess('Успех', 'Продуктът беше изтрит успешно.')
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

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.created_by_user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.created_by_user?.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <>
        <ConfirmationComponent />
        <MobileProductsManagement
          products={filteredProducts}
          loading={loading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onApprove={handleApprove}
          onReject={handleReject}
          onView={(product) => window.open(`/bg/products/${product.slug}`, '_blank')}
          formatDate={formatDate}
          formatPrice={(price: number, currency: string) => `${price.toFixed(2)} ${currency}`}
        />
      </>
    )
  }

  // Desktop Layout
  return (
    <div className="space-y-6">
      <ConfirmationComponent />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Управление на продукти</h2>
          <p className="text-gray-600">Добавяне, редактиране и одобряване на продукти</p>
          <div className="flex items-center space-x-4 mt-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Общо: {products.length}
            </Badge>
            <Badge variant="destructive" className="bg-orange-100 text-orange-800">
              Чакащи одобрение: {products.filter(p => !p.is_approved).length}
            </Badge>
            <Badge variant="default" className="bg-green-100 text-green-800">
              Одобрени: {products.filter(p => p.is_approved).length}
            </Badge>
          </div>
        </div>
        <Link href="/bg/admin/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Добави продукт
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Филтри</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Търсене</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Търси продукти..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Статус</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Всички статуси" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всички</SelectItem>
                  <SelectItem value="approved">Одобрени</SelectItem>
                  <SelectItem value="pending">Чакащи одобрение</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Категория</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Всички категории" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всички</SelectItem>
                  <SelectItem value="Хранителни стоки">Хранителни стоки</SelectItem>
                  <SelectItem value="Напитки">Напитки</SelectItem>
                  <SelectItem value="Месо и риба">Месо и риба</SelectItem>
                  <SelectItem value="Плодове и зеленчуци">Плодове и зеленчуци</SelectItem>
                  <SelectItem value="Млечни продукти">Млечни продукти</SelectItem>
                  <SelectItem value="Хлебни изделия">Хлебни изделия</SelectItem>
                  <SelectItem value="Замразени продукти">Замразени продукти</SelectItem>
                  <SelectItem value="Консерви">Консерви</SelectItem>
                  <SelectItem value="Сладкарски изделия">Сладкарски изделия</SelectItem>
                  <SelectItem value="Бебешки продукти">Бебешки продукти</SelectItem>
                  <SelectItem value="Домакински продукти">Домакински продукти</SelectItem>
                  <SelectItem value="Козметика">Козметика</SelectItem>
                  <SelectItem value="Други">Други</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end space-x-2">
              <Button variant="outline" onClick={fetchProducts} className="flex-1">
                Обнови
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  console.log('Testing database connection...')
                  const { data, error } = await supabase
                    .from('products')
                    .select('id, name, is_approved, created_at')
                    .order('created_at', { ascending: false })
                    .limit(10)

                  console.log('Raw products query result:', { data, error })

                  if (data) {
                    console.log('Total products found:', data.length)
                    console.log('Pending products:', data.filter(p => !p.is_approved))
                    console.log('Approved products:', data.filter(p => p.is_approved))
                  }
                }}
                className="flex-1"
              >
                Тест
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <Card className="bg-white shadow-sm border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Продукти ({filteredProducts.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Няма намерени продукти</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Снимка</TableHead>
                    <TableHead>Продукт</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Цена</TableHead>
                    <TableHead>Създаден от</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow
                      key={product.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => window.open(`/bg/admin/products/${product.id}/edit`, '_blank')}
                    >
                      {/* Product Image */}
                      <TableCell>
                        <div className="flex-shrink-0">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-lg border"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-12 h-12 bg-gray-200 rounded-lg border flex items-center justify-center ${product.image_url ? 'hidden' : ''}`}>
                            <Package className="h-6 w-6 text-gray-500" />
                          </div>
                        </div>
                      </TableCell>

                      {/* Product Name & Description */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">
                            {product.name}
                          </div>
                          {product.description && (
                            <div className="text-sm text-gray-500 line-clamp-2 max-w-xs">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        {product.category && (
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant={product.is_approved ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {product.is_approved ? 'Одобрен' : 'Чака одобрение'}
                        </Badge>
                      </TableCell>

                      {/* Price */}
                      <TableCell>
                        {product.latest_price ? (
                          <div className="text-sm">
                            <div className="font-medium text-green-600">
                              {product.latest_price.price_bgn} лв.
                            </div>
                            {product.latest_price.supermarkets && (
                              <div className="text-xs text-gray-500">
                                {product.latest_price.supermarkets.name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Няма цена</span>
                        )}
                      </TableCell>

                      {/* Created By */}
                      <TableCell>
                        {product.created_by_user ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              {product.created_by_user.full_name || 'Неизвестен'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {product.created_by_user.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Неизвестен</span>
                        )}
                      </TableCell>

                      {/* Date */}
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {formatDate(product.created_at)}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                          {!product.is_approved && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleApprove(product.id)
                                }}
                                disabled={actionLoading === product.id}
                                className="text-green-600 hover:text-green-700 h-8 w-8 p-0"
                                title="Одобри"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReject(product.id)
                                }}
                                disabled={actionLoading === product.id}
                                className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                title="Отхвърли"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {/* View Product */}
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="text-blue-600 hover:text-blue-700 h-8 w-8 p-0"
                            title="Виж продукта"
                          >
                            <Link href={`/bg/products/${product.slug}`} target="_blank">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>

                          {/* Edit Product */}
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="text-gray-600 hover:text-gray-700 h-8 w-8 p-0"
                            title="Редактирай"
                          >
                            <Link href={`/bg/admin/products/${product.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>

                          {/* Delete Product */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(product.id)
                            }}
                            disabled={actionLoading === product.id}
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

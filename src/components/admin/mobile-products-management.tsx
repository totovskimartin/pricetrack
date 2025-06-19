'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Package,
  Search,
  Filter,
  Check,
  X,
  Eye,
  Calendar,
  DollarSign,
  Store,
  AlertCircle
} from 'lucide-react'

interface MobileProductsManagementProps {
  products: any[]
  loading: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
  onApprove: (product: any) => void
  onReject: (product: any) => void
  onView: (product: any) => void
  formatDate: (date: string) => string
  formatPrice: (price: number, currency: string) => string
}

export function MobileProductsManagement({
  products,
  loading,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  onApprove,
  onReject,
  onView,
  formatDate,
  formatPrice
}: MobileProductsManagementProps) {
  const [showFilters, setShowFilters] = useState(false)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Одобрен</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Чака одобрение</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Отхвърлен</Badge>
      default:
        return <Badge variant="outline">Неизвестен</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Package className="h-5 w-5 mr-2 text-purple-600" />
            Продукти ({products.length})
          </h2>
          <p className="text-sm text-gray-600">Управление на каталога</p>
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
          placeholder="Търси продукти..."
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
                <label className="text-sm font-medium">Статус</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md bg-white text-sm"
                >
                  <option value="all">Всички</option>
                  <option value="pending">Чакащи одобрение</option>
                  <option value="approved">Одобрени</option>
                  <option value="rejected">Отхвърлени</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Зареждане...</p>
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Няма намерени продукти</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start space-x-3">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-16 h-16 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm leading-tight">
                        {product.name}
                      </h3>
                      
                      {product.brand && (
                        <p className="text-sm text-gray-600 mt-1">{product.brand}</p>
                      )}
                      
                      <div className="flex items-center space-x-2 mt-2">
                        {getStatusBadge(product.status)}
                        {product.category && (
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(product.created_at)}
                    </div>
                    <div className="flex items-center">
                      <Store className="h-3 w-3 mr-1" />
                      {product.supermarket?.name || 'Няма'}
                    </div>
                    {product.price && (
                      <div className="flex items-center">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {formatPrice(product.price, product.currency || 'BGN')}
                      </div>
                    )}
                    {product.created_by_user && (
                      <div className="flex items-center">
                        <span>от {product.created_by_user.full_name || product.created_by_user.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {product.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onView(product)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Виж
                    </Button>
                    
                    {product.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onApprove(product)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Одобри
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReject(product)}
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Отхвърли
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pending Items Alert */}
      {products.filter(p => p.status === 'pending').length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">
                  {products.filter(p => p.status === 'pending').length} продукта чакат одобрение
                </p>
                <p className="text-sm text-orange-600">
                  Прегледайте и одобрете или отхвърлете продуктите
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

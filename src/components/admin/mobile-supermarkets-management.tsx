'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Store,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Globe,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface MobileSupermarketsManagementProps {
  supermarkets: any[]
  loading: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
  onAdd: () => void
  onEdit: (supermarket: any) => void
  onDelete: (supermarket: any) => void
  formatDate: (date: string) => string
}

export function MobileSupermarketsManagement({
  supermarkets,
  loading,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  onAdd,
  onEdit,
  onDelete,
  formatDate
}: MobileSupermarketsManagementProps) {
  const [showFilters, setShowFilters] = useState(false)

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Активен
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">
        <AlertCircle className="h-3 w-3 mr-1" />
        Неактивен
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Store className="h-5 w-5 mr-2 text-green-600" />
            Супермаркети ({supermarkets.length})
          </h2>
          <p className="text-sm text-gray-600">Управление на веригите</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-1"
          >
            <Filter className="h-4 w-4" />
            <span>Филтри</span>
          </Button>
          <Button
            size="sm"
            onClick={onAdd}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Добави
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Търси супермаркети..."
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
                  <option value="active">Активни</option>
                  <option value="inactive">Неактивни</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supermarkets List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Зареждане...</p>
        </div>
      ) : supermarkets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Няма намерени супермаркети</p>
            <Button
              className="mt-4 bg-green-600 hover:bg-green-700 text-white"
              onClick={onAdd}
            >
              <Plus className="h-4 w-4 mr-2" />
              Добави първия супермаркет
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {supermarkets.map((supermarket) => (
            <Card key={supermarket.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900 text-sm leading-tight">
                          {supermarket.name}
                        </h3>
                        {getStatusBadge(supermarket.is_active)}
                      </div>
                      
                      {supermarket.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {supermarket.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm text-gray-600">
                    {supermarket.address && (
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="flex-1">{supermarket.address}</span>
                      </div>
                    )}
                    
                    {supermarket.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <a 
                          href={`tel:${supermarket.phone}`}
                          className="text-blue-600 hover:underline"
                        >
                          {supermarket.phone}
                        </a>
                      </div>
                    )}
                    
                    {supermarket.website && (
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <a 
                          href={supermarket.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate"
                        >
                          {supermarket.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                    
                    {supermarket.working_hours && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>{supermarket.working_hours}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  {supermarket._count && (
                    <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                      <div className="text-center">
                        <p className="font-medium text-gray-900">{supermarket._count.products || 0}</p>
                        <p>Продукти</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-gray-900">{supermarket._count.prices || 0}</p>
                        <p>Цени</p>
                      </div>
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(supermarket.created_at)}
                    </div>
                    {supermarket.created_by_user && (
                      <div>
                        от {supermarket.created_by_user.full_name || supermarket.created_by_user.email}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(supermarket)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Редактирай
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(supermarket)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {supermarkets.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <p className="font-medium text-green-800">
                  {supermarkets.filter(s => s.is_active).length}
                </p>
                <p className="text-green-600">Активни</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-green-800">
                  {supermarkets.filter(s => !s.is_active).length}
                </p>
                <p className="text-green-600">Неактивни</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

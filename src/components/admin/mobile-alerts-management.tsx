'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Bell,
  Search,
  Filter,
  Plus,
  Eye,
  Trash2,
  Calendar,
  User,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare
} from 'lucide-react'

interface MobileAlertsManagementProps {
  alerts: any[]
  loading: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
  typeFilter: string
  setTypeFilter: (type: string) => void
  onView: (alert: any) => void
  onDelete: (alert: any) => void
  onMarkAsRead: (alert: any) => void
  formatDate: (date: string) => string
  formatRelativeTime: (date: string) => string
}

export function MobileAlertsManagement({
  alerts,
  loading,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  onView,
  onDelete,
  onMarkAsRead,
  formatDate,
  formatRelativeTime
}: MobileAlertsManagementProps) {
  const [showFilters, setShowFilters] = useState(false)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  const getTypeBadge = (type: string) => {
    const configs = {
      error: { bg: 'bg-red-100', text: 'text-red-800', label: 'Грешка' },
      warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Предупреждение' },
      success: { bg: 'bg-green-100', text: 'text-green-800', label: 'Успех' },
      info: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Информация' }
    }
    
    const config = configs[type as keyof typeof configs] || configs.info
    
    return (
      <Badge className={`${config.bg} ${config.text} text-xs`}>
        {getTypeIcon(type)}
        <span className="ml-1">{config.label}</span>
      </Badge>
    )
  }

  const getStatusBadge = (isRead: boolean) => {
    return isRead ? (
      <Badge variant="outline" className="text-xs">
        Прочетено
      </Badge>
    ) : (
      <Badge className="bg-orange-100 text-orange-800 text-xs">
        Ново
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Bell className="h-5 w-5 mr-2 text-red-600" />
            Известия ({alerts.length})
          </h2>
          <p className="text-sm text-gray-600">Системни уведомления</p>
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
          placeholder="Търси известия..."
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Статус</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md bg-white text-sm"
                  >
                    <option value="all">Всички</option>
                    <option value="unread">Непрочетени</option>
                    <option value="read">Прочетени</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Тип</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md bg-white text-sm"
                  >
                    <option value="all">Всички</option>
                    <option value="error">Грешки</option>
                    <option value="warning">Предупреждения</option>
                    <option value="success">Успех</option>
                    <option value="info">Информация</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Зареждане...</p>
        </div>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Няма намерени известия</p>
            <p className="text-sm text-gray-400 mt-2">Известията се генерират автоматично от системата</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card 
              key={alert.id} 
              className={`hover:shadow-md transition-shadow ${
                !alert.is_read ? 'border-l-4 border-l-orange-500 bg-orange-50/30' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {getTypeBadge(alert.type)}
                        {getStatusBadge(alert.is_read)}
                      </div>
                      
                      <h3 className="font-medium text-gray-900 text-sm leading-tight">
                        {alert.title}
                      </h3>
                      
                      <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{formatRelativeTime(alert.created_at)}</span>
                        {alert.created_by_user && (
                          <>
                            <User className="h-3 w-3 ml-2" />
                            <span>{alert.created_by_user.full_name || alert.created_by_user.email}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  {alert.message && (
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {alert.message}
                    </p>
                  )}

                  {/* Metadata */}
                  {alert.metadata && (
                    <div className="bg-gray-50 rounded-lg p-3 text-xs">
                      <div className="flex items-center space-x-1 text-gray-500 mb-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>Допълнителна информация</span>
                      </div>
                      <pre className="text-gray-700 whitespace-pre-wrap font-mono text-xs">
                        {typeof alert.metadata === 'string' 
                          ? alert.metadata 
                          : JSON.stringify(alert.metadata, null, 2)
                        }
                      </pre>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onView(alert)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Виж
                    </Button>
                    
                    {!alert.is_read && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onMarkAsRead(alert)}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Прочети
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(alert)}
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
      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <p className="font-medium text-red-800">
                  {alerts.filter(a => !a.is_read).length}
                </p>
                <p className="text-red-600">Непрочетени</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-red-800">
                  {alerts.filter(a => a.is_read).length}
                </p>
                <p className="text-red-600">Прочетени</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

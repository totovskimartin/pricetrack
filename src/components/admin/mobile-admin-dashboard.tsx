'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  Package,
  Store,
  Clock,
  AlertCircle,
  TrendingUp,
  Check,
  X,
  Calendar,
  Activity
} from 'lucide-react'
import Link from 'next/link'

interface MobileAdminDashboardProps {
  stats: any
  pendingItems: any[]
  actionLoading: string | null
  onApprove: (item: any) => void
  onReject: (item: any) => void
  formatDate: (date: string) => string
  getTypeLabel: (type: string) => string
  getTypeColor: (type: string) => string
  getItemUrl: (item: any) => string
}

export function MobileAdminDashboard({
  stats,
  pendingItems,
  actionLoading,
  onApprove,
  onReject,
  formatDate,
  getTypeLabel,
  getTypeColor,
  getItemUrl
}: MobileAdminDashboardProps) {
  return (
    <div className="space-y-6 p-4">
      {/* Quick Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-blue-600" />
          Преглед на системата
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Потребители</p>
                  <p className="text-2xl font-bold text-blue-900">{stats?.totalUsers || 0}</p>
                  <p className="text-xs text-blue-600">{stats?.activeUsers || 0} активни</p>
                </div>
                <Users className="h-8 w-8 text-blue-600 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Продукти</p>
                  <p className="text-2xl font-bold text-purple-900">{stats?.totalProducts || 0}</p>
                  <p className="text-xs text-purple-600">В каталога</p>
                </div>
                <Package className="h-8 w-8 text-purple-600 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Супермаркети</p>
                  <p className="text-2xl font-bold text-green-900">{stats?.totalSupermarkets || 0}</p>
                  <p className="text-xs text-green-600">Регистрирани</p>
                </div>
                <Store className="h-8 w-8 text-green-600 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">Чакащи</p>
                  <p className="text-2xl font-bold text-orange-900">{stats?.pendingApprovals || 0}</p>
                  <p className="text-xs text-orange-600">За одобрение</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pending Approvals */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 text-orange-600" />
          Чакащи одобрения
        </h2>
        
        {pendingItems.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Няма чакащи одобрения</p>
              <p className="text-sm text-gray-400 mt-1">Всичко е актуално!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingItems.slice(0, 5).map((item) => (
              <Card key={`${item.type}-${item.id}`} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge className={getTypeColor(item.type)}>
                            {getTypeLabel(item.type)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                        <Link
                          href={getItemUrl(item)}
                          target="_blank"
                          className="block"
                        >
                          <h3 className="font-medium text-gray-900 text-sm leading-tight hover:text-blue-600 transition-colors">
                            {item.title}
                          </h3>
                        </Link>
                        {item.created_by_user && (
                          <p className="text-xs text-gray-500 mt-1">
                            от {item.created_by_user.full_name || item.created_by_user.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => onApprove(item)}
                        disabled={actionLoading === item.id}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Одобри
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onReject(item)}
                        disabled={actionLoading === item.id}
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Отхвърли
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {pendingItems.length > 5 && (
              <Card className="border-dashed">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-600">
                    И още {pendingItems.length - 5} елемента...
                  </p>
                  <Button variant="ghost" size="sm" className="mt-2">
                    Виж всички
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
            Скорошна активност
          </h2>
          
          <div className="space-y-3">
            {stats.recentActivity.slice(0, 3).map((activity: any) => (
              <Card key={activity.id}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.admin?.full_name || activity.admin?.email} • {formatDate(activity.created_at)}
                      </p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {activity.target_type}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

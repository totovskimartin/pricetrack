'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  MessageSquare,
  Search,
  Filter,
  Check,
  X,
  Eye,
  Calendar,
  User,
  MessageCircle,
  Heart,
  AlertTriangle
} from 'lucide-react'

interface MobileDiscussionsModerationProps {
  discussions: any[]
  loading: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
  categoryFilter: string
  setCategoryFilter: (category: string) => void
  onApprove: (discussion: any) => void
  onReject: (discussion: any) => void
  onView: (discussion: any) => void
  formatDate: (date: string) => string
}

export function MobileDiscussionsModeration({
  discussions,
  loading,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  onApprove,
  onReject,
  onView,
  formatDate
}: MobileDiscussionsModerationProps) {
  const [showFilters, setShowFilters] = useState(false)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Одобрена</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Чака одобрение</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Отхвърлена</Badge>
      default:
        return <Badge variant="outline">Неизвестен</Badge>
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'price-alert': 'bg-red-100 text-red-800',
      'product-review': 'bg-blue-100 text-blue-800',
      'shopping-tip': 'bg-green-100 text-green-800',
      'question': 'bg-purple-100 text-purple-800',
      'general': 'bg-muted text-muted-foreground'
    }
    return colors[category] || 'bg-muted text-muted-foreground'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-orange-600" />
            Дискусии ({discussions.length})
          </h2>
          <p className="text-sm text-muted-foreground">Модерация на съдържание</p>
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
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Търси дискусии..."
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
                  <label className="text-sm font-medium text-foreground">Статус</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full mt-1 p-2 border border-input rounded-md bg-background text-foreground text-sm"
                  >
                    <option value="all">Всички</option>
                    <option value="pending">Чакащи</option>
                    <option value="approved">Одобрени</option>
                    <option value="rejected">Отхвърлени</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground">Категория</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full mt-1 p-2 border border-input rounded-md bg-background text-foreground text-sm"
                  >
                    <option value="all">Всички</option>
                    <option value="price-alert">Ценови сигнал</option>
                    <option value="product-review">Ревю на продукт</option>
                    <option value="shopping-tip">Съвет за пазаруване</option>
                    <option value="question">Въпрос</option>
                    <option value="general">Общо</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discussions List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="text-muted-foreground mt-2">Зареждане...</p>
        </div>
      ) : discussions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Няма намерени дискусии</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {discussions.map((discussion) => (
            <Card key={discussion.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={getCategoryColor(discussion.category)}>
                          {discussion.category}
                        </Badge>
                        {getStatusBadge(discussion.status)}
                      </div>
                      
                      <h3 className="font-medium text-foreground text-sm leading-tight">
                        {discussion.title}
                      </h3>

                      <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{discussion.created_by_user?.full_name || discussion.created_by_user?.email || 'Анонимен'}</span>
                        <Calendar className="h-3 w-3 ml-2" />
                        <span>{formatDate(discussion.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Content Preview */}
                  {discussion.content && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {discussion.content}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center">
                      <MessageCircle className="h-3 w-3 mr-1" />
                      <span>{discussion.comment_count || 0} коментара</span>
                    </div>
                    <div className="flex items-center">
                      <Heart className="h-3 w-3 mr-1" />
                      <span>{discussion.like_count || 0} харесвания</span>
                    </div>
                    <div className="flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      <span>{discussion.views || 0} прегледа</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onView(discussion)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Виж
                    </Button>
                    
                    {discussion.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onApprove(discussion)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Одобри
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReject(discussion)}
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
      {discussions.filter(d => d.status === 'pending').length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">
                  {discussions.filter(d => d.status === 'pending').length} дискусии чакат модерация
                </p>
                <p className="text-sm text-orange-600">
                  Прегледайте съдържанието и вземете решение
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

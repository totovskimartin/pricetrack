'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'
import {
  MessageSquare,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Clock,
  User,
  Eye,
  ThumbsUp,
  MessageCircle,
  Heart
} from 'lucide-react'

interface Discussion {
  id: string
  title: string
  content: string
  category: string
  is_approved: boolean
  created_at: string
  created_by: string
  created_by_user?: {
    full_name?: string
    email: string
  }
  comment_count?: number
  like_count?: number
  views?: number
}

const categories = [
  'Общи',
  'Цени и промоции',
  'Качество на продукти',
  'Супермаркети',
  'Съвети за пазаруване',
  'Рецепти и готвене',
  'Здравословно хранене',
  'Бюджет и спестявания',
  'Други'
]

export default function DiscussionsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')

  useEffect(() => {
    fetchDiscussions()
  }, [categoryFilter, sortBy])

  const fetchDiscussions = async () => {
    try {
      let query = supabase
        .from('discussions')
        .select(`
          *,
          created_by_user:users!created_by(full_name, email)
        `)
        .eq('is_approved', true) // Only show approved discussions

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter)
      }

      // Apply sorting
      switch (sortBy) {
        case 'recent':
          query = query.order('created_at', { ascending: false })
          break
        case 'popular':
          query = query.order('views', { ascending: false })
          break
        case 'trending':
          query = query.order('like_count', { ascending: false })
          break
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching discussions:', error)
        return
      }

      setDiscussions(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDiscussions = discussions.filter(discussion =>
    discussion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discussion.content.toLowerCase().includes(searchTerm.toLowerCase())
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

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Общи': 'bg-gray-100 text-gray-800',
      'Цени и промоции': 'bg-green-100 text-green-800',
      'Качество на продукти': 'bg-blue-100 text-blue-800',
      'Супермаркети': 'bg-purple-100 text-purple-800',
      'Съвети за пазаруване': 'bg-yellow-100 text-yellow-800',
      'Рецепти и готвене': 'bg-orange-100 text-orange-800',
      'Здравословно хранене': 'bg-emerald-100 text-emerald-800',
      'Бюджет и спестявания': 'bg-indigo-100 text-indigo-800',
      'Други': 'bg-gray-100 text-gray-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Зареждане на дискусии...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto pl-16 pr-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <span>Дискусии</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Обсъждайте цени, продукти и споделяйте съвети за пазаруване
          </p>
        </div>
        {user && (
          <Link href="/bg/discussions/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Нова дискусия
            </Button>
          </Link>
        )}
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Търсене</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Търси в дискусии..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Категория</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Всички категории" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всички</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Сортиране</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Най-нови</SelectItem>
                  <SelectItem value="popular">Популярни</SelectItem>
                  <SelectItem value="trending">Актуални</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={fetchDiscussions} className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Обнови
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discussions List */}
      <div className="space-y-4">
        {filteredDiscussions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Няма намерени дискусии
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || categoryFilter !== 'all' 
                  ? 'Опитайте с различни критерии за търсене'
                  : 'Бъдете първият, който започва дискусия!'
                }
              </p>
              {user && (
                <Link href="/bg/discussions/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Започни дискусия
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredDiscussions.map((discussion) => (
            <Card key={discussion.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={getCategoryColor(discussion.category)}>
                        {discussion.category}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {formatDate(discussion.created_at)}
                      </span>
                    </div>
                    
                    <Link href={`/bg/discussions/${discussion.id}`}>
                      <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors mb-2">
                        {discussion.title}
                      </h3>
                    </Link>
                    
                    <p className="text-gray-600 mb-3 line-clamp-2">
                      {discussion.content.substring(0, 200)}
                      {discussion.content.length > 200 && '...'}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>
                          {discussion.created_by_user?.full_name ||
                           discussion.created_by_user?.email ||
                           'Анонимен'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{discussion.comment_count || 0} коментара</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{discussion.views || 0} прегледа</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Heart className="h-4 w-4" />
                        <span>{discussion.like_count || 0} харесвания</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Call to Action for Non-Authenticated Users */}
      {!user && (
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Присъединете се към общността
            </h3>
            <p className="text-gray-600 mb-4">
              Влезте в профила си, за да участвате в дискусии и споделяте мнения
            </p>
            <div className="space-x-2">
              <Link href="/bg/login">
                <Button>Вход</Button>
              </Link>
              <Link href="/bg/register">
                <Button variant="outline">Регистрация</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

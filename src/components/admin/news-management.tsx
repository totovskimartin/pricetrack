'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'
import { useAuth } from '@/components/providers/auth-provider'
import { useConfirmation } from '@/hooks/use-confirmation'
import { useToast } from '@/components/ui/toast'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Newspaper,
  Eye,
  EyeOff
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface NewsItem {
  id: string
  title: string
  content: string
  type: 'general' | 'announcement' | 'system' | 'euro_transition' | 'feature'
  priority: number
  is_active: boolean
  border_color: string
  text_color: string
  published_at: string
  expires_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  creator?: {
    full_name: string | null
    email: string
  }
}

export default function NewsManagement() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { ConfirmationComponent, confirm } = useConfirmation()

  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'general' as NewsItem['type'],
    priority: 0,
    is_active: true,
    border_color: 'blue',
    text_color: 'blue',
    published_at: new Date().toISOString().slice(0, 16),
    expires_at: ''
  })

  const newsTypes = [
    { value: 'general', label: 'Общи' },
    { value: 'announcement', label: 'Обявления' },
    { value: 'system', label: 'Системни' },
    { value: 'euro_transition', label: 'Евро преход' },
    { value: 'feature', label: 'Нови функции' }
  ]

  const colorOptions = [
    { value: 'blue', label: 'Синьо' },
    { value: 'yellow', label: 'Жълто' },
    { value: 'green', label: 'Зелено' },
    { value: 'red', label: 'Червено' },
    { value: 'purple', label: 'Лилаво' },
    { value: 'orange', label: 'Оранжево' }
  ]

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('news')
        .select(`
          *,
          creator:created_by(full_name, email)
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setNews(data || [])
    } catch (error) {
      console.error('Error fetching news:', error)
      showToast('Грешка при зареждане на новините', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const newsData = {
        ...formData,
        published_at: new Date(formData.published_at).toISOString(),
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        created_by: user?.id
      }

      if (editingNews) {
        const { error } = await supabase
          .from('news')
          .update(newsData)
          .eq('id', editingNews.id)

        if (error) throw error

        await logAdminAction(user?.id || '', 'update', 'news', editingNews.id, {
          title: formData.title
        })

        showToast('Новината е обновена успешно', 'success')
      } else {
        const { data, error } = await supabase
          .from('news')
          .insert([newsData])
          .select('id')
          .single()

        if (error) throw error

        await logAdminAction(user?.id || '', 'create', 'news', data?.id || 'unknown', {
          title: formData.title
        })

        showToast('Новината е създадена успешно', 'success')
      }

      setIsModalOpen(false)
      resetForm()
      fetchNews()
    } catch (error) {
      console.error('Error saving news:', error)
      showToast('Грешка при запазване на новината', 'error')
    }
  }

  const handleEdit = (newsItem: NewsItem) => {
    setEditingNews(newsItem)
    setFormData({
      title: newsItem.title,
      content: newsItem.content,
      type: newsItem.type,
      priority: newsItem.priority,
      is_active: newsItem.is_active,
      border_color: newsItem.border_color,
      text_color: newsItem.text_color,
      published_at: new Date(newsItem.published_at).toISOString().slice(0, 16),
      expires_at: newsItem.expires_at ? new Date(newsItem.expires_at).toISOString().slice(0, 16) : ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (newsItem: NewsItem) => {
    confirm(
      'Изтриване на новина',
      `Сигурни ли сте, че искате да изтриете новината "${newsItem.title}"?`,
      async () => {
        try {
          const { error } = await supabase
            .from('news')
            .delete()
            .eq('id', newsItem.id)

          if (error) throw error

          await logAdminAction(user?.id || '', 'delete', 'news', newsItem.id, {
            title: newsItem.title
          })

          showToast('Новината е изтрита успешно', 'success')
          fetchNews()
        } catch (error) {
          console.error('Error deleting news:', error)
          showToast('Грешка при изтриване на новината', 'error')
        }
      },
      {
        confirmText: 'Изтрий',
        cancelText: 'Отказ',
        type: 'error'
      }
    )
  }

  const toggleStatus = async (newsItem: NewsItem) => {
    try {
      const { error } = await supabase
        .from('news')
        .update({ is_active: !newsItem.is_active })
        .eq('id', newsItem.id)

      if (error) throw error

      await logAdminAction(user?.id || '', 'update', 'news', newsItem.id, {
        action: newsItem.is_active ? 'deactivated' : 'activated',
        title: newsItem.title
      })

      showToast(
        `Новината е ${newsItem.is_active ? 'деактивирана' : 'активирана'} успешно`,
        'success'
      )
      fetchNews()
    } catch (error) {
      console.error('Error toggling news status:', error)
      showToast('Грешка при промяна на статуса', 'error')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'general',
      priority: 0,
      is_active: true,
      border_color: 'blue',
      text_color: 'blue',
      published_at: new Date().toISOString().slice(0, 16),
      expires_at: ''
    })
    setEditingNews(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  // Filter news based on search and filters
  const filteredNews = news.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && item.is_active) ||
                         (statusFilter === 'inactive' && !item.is_active)
    const matchesType = typeFilter === 'all' || item.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('bg-BG')
  }

  const getTypeLabel = (type: string) => {
    return newsTypes.find(t => t.value === type)?.label || type
  }

  const getColorLabel = (color: string) => {
    return colorOptions.find(c => c.value === color)?.label || color
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ConfirmationComponent />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Управление на новини</h2>
          <p className="text-gray-600">Създаване и редактиране на новини за потребителите</p>
          <div className="flex items-center space-x-4 mt-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Общо: {news.length}
            </Badge>
            <Badge variant="default" className="bg-green-100 text-green-800">
              Активни: {news.filter(n => n.is_active).length}
            </Badge>
            <Badge variant="destructive" className="bg-red-100 text-red-800">
              Неактивни: {news.filter(n => !n.is_active).length}
            </Badge>
          </div>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Добави новина
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
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
                  placeholder="Търси новини..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Статус</label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всички</SelectItem>
                  <SelectItem value="active">Активни</SelectItem>
                  <SelectItem value="inactive">Неактивни</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Тип</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всички типове</SelectItem>
                  {newsTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setTypeFilter('all')
                }}
                className="w-full"
              >
                Изчисти филтрите
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* News Table */}
      <Card className="bg-white shadow-sm border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Newspaper className="h-5 w-5" />
            <span>Новини ({filteredNews.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Заглавие</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Приоритет</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Публикувана</TableHead>
                  <TableHead>Изтича</TableHead>
                  <TableHead>Създадена от</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNews.map((newsItem) => (
                  <TableRow key={newsItem.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900 truncate max-w-xs">
                          {newsItem.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {newsItem.content.substring(0, 60)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(newsItem.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={newsItem.priority > 5 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {newsItem.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(newsItem)}
                          className="p-1"
                        >
                          {newsItem.is_active ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                        <Badge
                          variant={newsItem.is_active ? "default" : "secondary"}
                          className={newsItem.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                        >
                          {newsItem.is_active ? 'Активна' : 'Неактивна'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(newsItem.published_at)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {newsItem.expires_at ? formatDate(newsItem.expires_at) : 'Никога'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {newsItem.creator?.full_name || newsItem.creator?.email || 'Неизвестен'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(newsItem)}
                          className="p-2"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(newsItem)}
                          className="p-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredNews.length === 0 && (
              <div className="text-center py-8">
                <Newspaper className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Няма намерени новини</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNews ? 'Редактиране на новина' : 'Създаване на новина'}
            </DialogTitle>
            <DialogDescription>
              {editingNews ? 'Редактирайте информацията за новината' : 'Създайте нова новина за потребителите'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Title */}
              <div>
                <Label htmlFor="title">Заглавие *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Въведете заглавие на новината"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <Label htmlFor="content">Съдържание *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Въведете съдържанието на новината"
                  rows={4}
                  required
                />
              </div>

              {/* Type and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Тип</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {newsTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Приоритет</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">По-високи числа = по-висок приоритет</p>
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="border_color">Цвят на рамката</Label>
                  <Select
                    value={formData.border_color}
                    onValueChange={(value) => setFormData({ ...formData, border_color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map(color => (
                        <SelectItem key={color.value} value={color.value}>
                          {color.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="text_color">Цвят на текста</Label>
                  <Select
                    value={formData.text_color}
                    onValueChange={(value) => setFormData({ ...formData, text_color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map(color => (
                        <SelectItem key={color.value} value={color.value}>
                          {color.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Publishing Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="published_at">Дата на публикуване *</Label>
                  <Input
                    id="published_at"
                    type="datetime-local"
                    value={formData.published_at}
                    onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expires_at">Дата на изтичане</Label>
                  <Input
                    id="expires_at"
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Оставете празно за никога</p>
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Активна новина</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Отказ
              </Button>
              <Button type="submit">
                {editingNews ? 'Обнови' : 'Създай'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

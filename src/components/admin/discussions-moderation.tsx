'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'
import { useAuth } from '@/components/providers/auth-provider'
import { invalidateDiscussionCache } from '@/lib/cache'
import { useConfirmation } from '@/hooks/use-confirmation'
import { useToast } from '@/components/providers/toast-provider'
import { UserAvatar } from '@/components/ui/user-link'
import { MobileDiscussionsModeration } from './mobile-discussions-moderation'
import {
  Search,
  Check,
  X,
  Trash2,
  MessageSquare,
  Filter,
  ExternalLink,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Discussion {
  id: string
  title: string
  content: string
  is_approved: boolean
  created_at: string
  created_by?: string
  category?: string
  slug?: string
  views?: number
  created_by_user?: {
    full_name?: string
    email: string
    username?: string
    avatar_url?: string
  }
  product?: {
    id: string
    name: string
  }
  _count?: {
    comments: number
  }
}

interface Comment {
  id: string
  content: string
  is_approved: boolean
  created_at: string
  created_by?: string
  created_by_user?: {
    full_name?: string
    email: string
    username?: string
    avatar_url?: string
  }
  discussion_id: string
}

export default function DiscussionsModeration() {
  const { user } = useAuth()
  const { confirm, ConfirmationComponent } = useConfirmation()
  const { showSuccess } = useToast()
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'discussions' | 'comments'>('discussions')
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

  const fetchDiscussions = useCallback(async () => {
    console.log('Starting fetchDiscussions with statusFilter:', statusFilter)
    setLoading(true)

    try {
      // First try a simple query to see if we can fetch discussions at all
      let query = supabase
        .from('discussions')
        .select(`
          *,
          created_by_user:users!created_by(full_name, email, username, avatar_url)
        `)
        .order('created_at', { ascending: false })

      if (statusFilter === 'pending') {
        query = query.eq('is_approved', false)
      } else if (statusFilter === 'approved') {
        query = query.eq('is_approved', true)
      }

      console.log('Executing query with statusFilter:', statusFilter)
      const { data, error } = await query

      console.log('Discussions query result:', {
        data,
        error,
        statusFilter,
        dataLength: data?.length,
        firstItem: data?.[0]
      })

      if (error) {
        console.error('Error fetching discussions:', error)
        setDiscussions([])
        return
      }

      // Get comment counts for each discussion
      const discussionsWithCounts = await Promise.all(
        (data || []).map(async (discussion) => {
          const { count } = await supabase
            .from('discussion_comments')
            .select('*', { count: 'exact', head: true })
            .eq('discussion_id', discussion.id)

          return {
            ...discussion,
            _count: {
              comments: count || 0
            }
          }
        })
      )

      setDiscussions(discussionsWithCounts)

      // If no discussions found, try a simple count query to see if any exist at all
      if (discussionsWithCounts.length === 0) {
        const { count, error: countError } = await supabase
          .from('discussions')
          .select('*', { count: 'exact', head: true })

        console.log('Total discussions count:', { count, countError })
      }

    } catch (error) {
      console.error('Error:', error)
      setDiscussions([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  const fetchComments = async (discussionId: string) => {
    setCommentsLoading(true)
    try {
      const { data, error } = await supabase
        .from('discussion_comments')
        .select(`
          *,
          created_by_user:users!created_by(full_name, email, username, avatar_url)
        `)
        .eq('discussion_id', discussionId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching comments:', error)
        setComments([])
        return
      }

      setComments(data || [])
    } catch (error) {
      console.error('Error:', error)
      setComments([])
    } finally {
      setCommentsLoading(false)
    }
  }

  const handleApproveDiscussion = async (discussionId: string) => {
    if (!user) return

    setActionLoading(discussionId)
    try {
      const { error } = await supabase
        .from('discussions')
        .update({ is_approved: true })
        .eq('id', discussionId)

      if (error) {
        console.error('Error approving discussion:', error)
        return
      }

      // Log the action (don't fail if logging fails)
      try {
        await logAdminAction(user.id, 'approve_discussion', 'discussion', discussionId)
      } catch (logError) {
        console.warn('Failed to log admin action:', logError)
      }

      invalidateDiscussionCache()
      await fetchDiscussions()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectDiscussion = async (discussionId: string) => {
    if (!user) return

    confirm(
      'Отхвърляне на дискусия',
      'Сигурни ли сте, че искате да отхвърлите тази дискусия? Тя ще бъде изтрита окончателно.',
      async () => {
        setActionLoading(discussionId)
        try {
          const { error } = await supabase
            .from('discussions')
            .delete()
            .eq('id', discussionId)

          if (error) {
            // Keep error logging for admin operations as they're important for monitoring
            console.error('Error rejecting discussion:', error)
            return
          }

          // Log the action (don't fail if logging fails)
          try {
            await logAdminAction(user.id, 'reject_discussion', 'discussion', discussionId)
          } catch (logError) {
            // Log admin action failures only in development
            if (process.env.NODE_ENV === 'development') {
              console.warn('Failed to log admin action:', logError)
            }
          }

          invalidateDiscussionCache()
          await fetchDiscussions()

          // Show success toast
          showSuccess('Дискусията е отхвърлена успешно')
        } catch (error) {
          console.error('Error:', error)
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

  const handleApproveComment = async (commentId: string) => {
    if (!user) return

    setActionLoading(commentId)
    try {
      const { error } = await supabase
        .from('discussion_comments')
        .update({ is_approved: true })
        .eq('id', commentId)

      if (error) {
        console.error('Error approving comment:', error)
        return
      }

      // Log the action (don't fail if logging fails)
      try {
        await logAdminAction(user.id, 'approve_comment', 'comment', commentId)
      } catch (logError) {
        console.warn('Failed to log admin action:', logError)
      }

      if (selectedDiscussion) {
        await fetchComments(selectedDiscussion.id)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectComment = async (commentId: string) => {
    if (!user) return

    confirm(
      'Отхвърляне на коментар',
      'Сигурни ли сте, че искате да отхвърлите този коментар? Той ще бъде изтрит окончателно.',
      async () => {
        setActionLoading(commentId)
        try {
          const { error } = await supabase
            .from('discussion_comments')
            .delete()
            .eq('id', commentId)

          if (error) {
            return
          }

          // Log the action (don't fail if logging fails)
          try {
            await logAdminAction(user.id, 'reject_comment', 'comment', commentId)
          } catch (logError) {
            // Failed to log admin action - continue silently
          }

          if (selectedDiscussion) {
            await fetchComments(selectedDiscussion.id)
          }

          // Show success toast
          showSuccess('Коментарът е отхвърлен успешно')
        } catch (error) {
          // Error handling - show user-friendly message
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

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return

    confirm(
      'Изтриване на коментар',
      'Сигурни ли сте, че искате да изтриете този коментар? Това действие е необратимо.',
      async () => {
        setActionLoading(commentId)
        try {
          const { error } = await supabase
            .from('discussion_comments')
            .delete()
            .eq('id', commentId)

          if (error) {
            console.error('Error deleting comment:', error)
            return
          }

          // Log the action (don't fail if logging fails)
          try {
            await logAdminAction(user.id, 'delete_comment', 'comment', commentId)
          } catch (logError) {
            console.warn('Failed to log admin action:', logError)
          }

          if (selectedDiscussion) {
            await fetchComments(selectedDiscussion.id)
          }

          // Show success toast
          showSuccess('Коментарът е изтрит успешно')
        } catch (error) {
          console.error('Error:', error)
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

  const handleDeleteDiscussion = async (discussionId: string) => {
    if (!user) return

    confirm(
      'Изтриване на дискусия',
      'Сигурни ли сте, че искате да изтриете тази дискусия? Това ще изтрие и всички коментари в нея. Това действие е необратимо.',
      async () => {
        setActionLoading(discussionId)
        try {
          // Delete the discussion (comments will be automatically deleted due to CASCADE)
          const { error } = await supabase
            .from('discussions')
            .delete()
            .eq('id', discussionId)

          if (error) {
            console.error('Error deleting discussion:', error)
            return
          }

          // Log the action (don't fail if logging fails)
          try {
            await logAdminAction(user.id, 'delete_discussion', 'discussion', discussionId)
          } catch (logError) {
            console.warn('Failed to log admin action:', logError)
          }

          // Invalidate cache and refresh discussions
          invalidateDiscussionCache()
          await fetchDiscussions()

          // Show success toast
          showSuccess('Дискусията е изтрита успешно')
        } catch (error) {
          console.error('Error:', error)
        } finally {
          setActionLoading(null)
        }
      },
      {
        confirmText: 'Изтрий дискусията',
        cancelText: 'Отказ',
        type: 'error'
      }
    )
  }

  const filteredDiscussions = discussions.filter(discussion =>
    discussion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discussion.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discussion.created_by_user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discussion.created_by_user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discussion.created_by_user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discussion.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (discussion.product?.name && discussion.product.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const filteredComments = comments.filter(comment =>
    comment.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comment.created_by_user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comment.created_by_user?.email.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleViewComments = (discussion: Discussion) => {
    setSelectedDiscussion(discussion)
    setViewMode('comments')
    fetchComments(discussion.id)
  }

  const handleBackToDiscussions = () => {
    setSelectedDiscussion(null)
    setViewMode('discussions')
    setComments([])
  }

  useEffect(() => {
    fetchDiscussions()
  }, [fetchDiscussions])

  // Mobile Layout
  if (isMobile && viewMode === 'discussions') {
    return (
      <>
        <ConfirmationComponent />
        <MobileDiscussionsModeration
          discussions={filteredDiscussions}
          loading={loading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categoryFilter="all"
          setCategoryFilter={() => {}}
          onApprove={handleApproveDiscussion}
          onReject={handleRejectDiscussion}
          onView={(discussion) => window.open(`/bg/discussions/${discussion.slug}`, '_blank')}
          formatDate={formatDate}
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
          <h2 className="text-2xl font-bold text-gray-900">
            {viewMode === 'discussions' ? 'Модерация на дискусии' : `Коментари в "${selectedDiscussion?.title}"`}
          </h2>
          <p className="text-gray-600">
            {viewMode === 'discussions'
              ? 'Преглед и управление на дискусии и техните коментари'
              : 'Преглед и управление на коментари в дискусията'
            }
          </p>
        </div>
        {viewMode === 'comments' && (
          <Button variant="outline" onClick={handleBackToDiscussions}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Обратно към дискусиите
          </Button>
        )}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Търсене</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={viewMode === 'discussions' ? "Търси дискусии..." : "Търси коментари..."}
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

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={viewMode === 'discussions' ? fetchDiscussions : () => selectedDiscussion && fetchComments(selectedDiscussion.id)}
                className="w-full"
              >
                Обнови
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discussions List */}
      {viewMode === 'discussions' && (
        <Card className="bg-white shadow-sm border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Дискусии ({filteredDiscussions.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredDiscussions.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Няма намерени дискусии</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дискусия</TableHead>
                      <TableHead>Продукт/Категория</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Автор</TableHead>
                      <TableHead>Коментари</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDiscussions.map((discussion) => (
                      <TableRow key={discussion.id} className="hover:bg-gray-50">
                        {/* Discussion Title & Content */}
                        <TableCell className="max-w-md">
                          <div className="space-y-1">
                            <Link
                              href={`/bg/discussions/${discussion.id}`}
                              target="_blank"
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              {discussion.title}
                            </Link>
                            <div className="text-sm text-gray-500 line-clamp-2">
                              {discussion.content}
                            </div>
                          </div>
                        </TableCell>

                        {/* Product/Category */}
                        <TableCell>
                          {discussion.product ? (
                            <Link
                              href={`/bg/products/${discussion.product.id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                              target="_blank"
                            >
                              {discussion.product.name}
                            </Link>
                          ) : discussion.category ? (
                            <Badge variant="outline" className="text-xs">
                              {discussion.category}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">Общо</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge
                            variant={discussion.is_approved ? 'default' : 'destructive'}
                            className={`text-xs ${discussion.is_approved ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}
                          >
                            {discussion.is_approved ? 'Одобрена' : 'Чака одобрение'}
                          </Badge>
                        </TableCell>

                        {/* Author */}
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <UserAvatar
                              user={discussion.created_by_user}
                              size="sm"
                              showName={false}
                              className="flex-shrink-0"
                            />
                            <div className="text-sm min-w-0">
                              <div className="font-medium truncate">
                                {discussion.created_by_user?.username ? `@${discussion.created_by_user.username}` : discussion.created_by_user?.full_name || 'Неизвестен'}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {discussion.created_by_user?.email || 'Няма имейл'}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Comments Count */}
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewComments(discussion)}
                            className="text-xs"
                          >
                            {discussion._count?.comments || 0} коментара
                          </Button>
                        </TableCell>

                        {/* Date */}
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {formatDate(discussion.created_at)}
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {!discussion.is_approved && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApproveDiscussion(discussion.id)}
                                  disabled={actionLoading === discussion.id}
                                  className="text-green-600 hover:text-green-700 h-8 w-8 p-0"
                                  title="Одобри"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectDiscussion(discussion.id)}
                                  disabled={actionLoading === discussion.id}
                                  className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                  title="Отхвърли"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}

                            {/* View Discussion */}
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="text-blue-600 hover:text-blue-700 h-8 w-8 p-0"
                              title="Виж дискусията"
                            >
                              <Link href={`/bg/discussions/${discussion.id}`} target="_blank">
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>

                            {/* View Comments */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewComments(discussion)}
                              disabled={actionLoading === discussion.id}
                              className="text-gray-600 hover:text-gray-700 h-8 w-8 p-0"
                              title="Виж коментарите"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>

                            {/* Delete Discussion */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteDiscussion(discussion.id)}
                              disabled={actionLoading === discussion.id}
                              className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                              title="Изтрий дискусията"
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
      )}

      {/* Comments List */}
      {viewMode === 'comments' && (
        <Card className="bg-white shadow-sm border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Коментари ({filteredComments.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {commentsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredComments.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Няма коментари в тази дискусия</p>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Коментар</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Автор</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComments.map((comment) => (
                    <TableRow key={comment.id} className="hover:bg-gray-50">
                      {/* Comment Content */}
                      <TableCell className="max-w-md">
                        <div className="text-sm text-gray-900 line-clamp-3">
                          {comment.content}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant={comment.is_approved ? 'default' : 'destructive'}
                          className={`text-xs ${comment.is_approved ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}
                        >
                          {comment.is_approved ? 'Одобрен' : 'Чака одобрение'}
                        </Badge>
                      </TableCell>

                      {/* Author */}
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <UserAvatar
                            user={comment.created_by_user}
                            size="sm"
                            showName={false}
                            className="flex-shrink-0"
                          />
                          <div className="text-sm min-w-0">
                            <div className="font-medium truncate">
                              {comment.created_by_user?.username ? `@${comment.created_by_user.username}` : comment.created_by_user?.full_name || 'Неизвестен'}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {comment.created_by_user?.email || 'Няма имейл'}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Date */}
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {formatDate(comment.created_at)}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {!comment.is_approved && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveComment(comment.id)}
                                disabled={actionLoading === comment.id}
                                className="text-green-600 hover:text-green-700 h-8 w-8 p-0"
                                title="Одобри"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectComment(comment.id)}
                                disabled={actionLoading === comment.id}
                                className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                title="Отхвърли"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {/* Delete Comment */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={actionLoading === comment.id}
                            className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                            title="Изтрий коментара"
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
      )}

      {/* Confirmation Modal */}
      <ConfirmationComponent />
    </div>
  )
}

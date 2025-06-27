'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserAvatar } from '@/components/ui/user-link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'
import { commentsRequireApproval } from '@/lib/settings'
import { useConfirmation } from '@/hooks/use-confirmation'
import { ensureUserExists } from '@/lib/user-utils'
import {
  ArrowLeft,
  MessageSquare,
  User,
  Clock,
  Send,
  ThumbsUp,
  ThumbsDown,
  Eye,
  AlertCircle,
  Reply,
  Heart,
  MessageCircle
} from 'lucide-react'

interface Discussion {
  id: string
  title: string
  content: string
  category: string
  created_at: string
  created_by: string
  created_by_user?: {
    full_name?: string
    email: string
    username?: string
    avatar_url?: string
  }
  views?: number
  like_count?: number
  comment_count?: number
}

interface Comment {
  id: string
  content: string
  created_at: string
  created_by: string
  created_by_user?: {
    full_name?: string
    email: string
    username?: string
    avatar_url?: string
  }
  is_approved: boolean
  parent_id?: string
  like_count?: number
  replies?: Comment[]
}

interface CommentThreadProps {
  comment: Comment
  user: any
  userCommentLikes: Set<string>
  onLike: (commentId: string) => void
  onReply: (commentId: string) => void
  replyingTo: string | null
  replyContent: string
  setReplyContent: (content: string) => void
  onSubmitReply: (e: React.FormEvent, parentId?: string) => void
  submittingComment: boolean
  formatDate: (date: string) => string
  commentsNeedApproval: boolean
  depth?: number
}

function CommentThread({
  comment,
  user,
  userCommentLikes,
  onLike,
  onReply,
  replyingTo,
  replyContent,
  setReplyContent,
  onSubmitReply,
  submittingComment,
  formatDate,
  commentsNeedApproval,
  depth = 0
}: CommentThreadProps) {
  const maxDepth = 3
  const isLiked = userCommentLikes.has(comment.id)

  return (
    <div className={`${depth > 0 ? 'ml-3 sm:ml-6 mt-3 border-l-2 border-gray-100 pl-3 sm:pl-4' : 'border-l-4 border-blue-100 pl-3 sm:pl-4'} bg-gray-50 rounded-r-lg p-3 sm:p-4`}>
      {/* Comment Header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <UserAvatar
            user={comment.created_by_user}
            size="md"
            showName={false}
            className="flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 text-sm truncate">
              {comment.created_by_user?.full_name ||
               comment.created_by_user?.email ||
               'Анонимен'}
            </div>
            <div className="text-xs text-gray-500">
              {formatDate(comment.created_at)}
            </div>
          </div>
        </div>

        {/* Comment Actions */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {user && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLike(comment.id)}
                className={`flex items-center space-x-1 text-xs px-2 py-1 h-auto ${
                  isLiked ? 'text-red-600 bg-red-50' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Heart className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">{comment.like_count || 0}</span>
              </Button>

              {depth < maxDepth && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReply(comment.id)}
                  className="flex items-center space-x-1 text-xs px-2 py-1 h-auto text-gray-500 hover:bg-gray-100"
                >
                  <Reply className="h-3 w-3" />
                  <span className="hidden sm:inline">Отговори</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Comment Content */}
      <div className="bg-white rounded-lg p-3 mb-3">
        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
          {comment.content}
        </p>
      </div>

      {/* Reply Form */}
      {replyingTo === comment.id && user && (
        <div className="bg-white rounded-lg p-3 mb-3 border-2 border-blue-200">
          <form onSubmit={(e) => onSubmitReply(e, comment.id)}>
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                Отговор на {comment.created_by_user?.full_name || comment.created_by_user?.email || 'Анонимен'}
              </label>
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Напишете вашия отговор..."
                rows={3}
                maxLength={1000}
                className="text-sm resize-none"
              />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs text-gray-500">
                  {commentsNeedApproval
                    ? 'Отговорите се модерират преди публикуване'
                    : 'Отговорът ще бъде публикуван веднага'
                  }
                </p>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onReply('')}
                    className="text-xs flex-1 sm:flex-none"
                  >
                    Отказ
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingComment || !replyContent.trim()}
                    size="sm"
                    className="text-xs flex-1 sm:flex-none"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">{submittingComment ? 'Изпращане...' : 'Публикувай отговор'}</span>
                    <span className="sm:hidden">{submittingComment ? 'Изпращане...' : 'Публикувай'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              user={user}
              userCommentLikes={userCommentLikes}
              onLike={onLike}
              onReply={onReply}
              replyingTo={replyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              onSubmitReply={onSubmitReply}
              submittingComment={submittingComment}
              formatDate={formatDate}
              commentsNeedApproval={commentsNeedApproval}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DiscussionPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth()
  const router = useRouter()
  const { showSuccess, showError, ConfirmationComponent } = useConfirmation()
  const [discussion, setDiscussion] = useState<Discussion | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set())
  const [userCommentLikes, setUserCommentLikes] = useState<Set<string>>(new Set())
  const [commentsNeedApproval, setCommentsNeedApproval] = useState(true)
  const viewIncrementedRef = useRef(false)
  const [discussionId, setDiscussionId] = useState<string | null>(null)

  // Resolve params on mount
  useEffect(() => {
    params.then(resolvedParams => {
      setDiscussionId(resolvedParams.id)
    })
  }, [params])

  useEffect(() => {
    if (!discussionId) return

    // Reset view increment flag when discussion ID changes
    viewIncrementedRef.current = false
    fetchDiscussion()
    fetchComments()
    checkApprovalSettings()
    if (user) {
      fetchUserLikes()
    }
  }, [discussionId, user])

  // Separate useEffect for view increment to prevent double counting
  useEffect(() => {
    if (discussion && !viewIncrementedRef.current) {
      viewIncrementedRef.current = true
      incrementViewCount(discussion.id)
    }
  }, [discussion])

  const checkApprovalSettings = async () => {
    const needsApproval = await commentsRequireApproval()
    setCommentsNeedApproval(needsApproval)
  }

  const fetchDiscussion = async () => {
    try {
      const { data, error } = await supabase
        .from('discussions')
        .select(`
          *,
          created_by_user:users!created_by(full_name, email, username, avatar_url)
        `)
        .eq('id', discussionId)
        .eq('is_approved', true)
        .single()

      if (error) {
        console.error('Error fetching discussion:', error)
        router.push('/bg/discussions')
        return
      }

      setDiscussion(data)
    } catch (error) {
      console.error('Error:', error)
      router.push('/bg/discussions')
    }
  }

  const incrementViewCount = async (discussionId: string) => {
    try {
      // Use SQL function to increment view count atomically
      const { data, error } = await supabase.rpc('increment_discussion_views', {
        discussion_id: discussionId
      })

      if (error) {
        console.error('Error incrementing view count:', error)
        // Fallback: try direct update
        await supabase
          .from('discussions')
          .update({ views: (discussion?.views || 0) + 1 })
          .eq('id', discussionId)
      }

      // Note: We don't update the local state to avoid showing the user
      // their own view increment, which provides better UX
    } catch (error) {
      console.error('Error incrementing view count:', error)
    }
  }

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('discussion_comments')
        .select(`
          *,
          created_by_user:users!created_by(full_name, email, username, avatar_url)
        `)
        .eq('discussion_id', discussionId)
        .eq('is_approved', true)
        .order('created_at', { ascending: true })

      if (!error && data) {
        // Organize comments into threads
        const threaded = organizeComments(data)
        setComments(threaded)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const organizeComments = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>()
    const rootComments: Comment[] = []

    // First pass: create map and initialize replies array
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    // Second pass: organize into threads
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id)
        if (parent) {
          parent.replies!.push(commentWithReplies)
        }
      } else {
        rootComments.push(commentWithReplies)
      }
    })

    return rootComments
  }

  const fetchUserLikes = async () => {
    if (!user || !discussionId) return

    try {
      // Fetch discussion likes
      const { data: discussionLikes } = await supabase
        .from('discussion_likes')
        .select('discussion_id')
        .eq('user_id', user.id)
        .eq('discussion_id', discussionId)

      if (discussionLikes && discussionLikes.length > 0) {
        setUserLikes(new Set([discussionId as string]))
      }

      // Fetch comment likes
      const { data: commentLikes } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', user.id)

      if (commentLikes) {
        setUserCommentLikes(new Set(commentLikes.map(like => like.comment_id)))
      }
    } catch (error) {
      console.error('Error fetching user likes:', error)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault()
    const content = parentId ? replyContent : newComment
    if (!user || !content.trim()) return

    setSubmittingComment(true)
    try {
      // Ensure user exists in the database
      const userExists = await ensureUserExists(user)
      if (!userExists) {
        showError('Грешка', 'Възникна проблем с потребителския профил. Моля, опитайте отново.')
        return
      }

      // Check if comments require approval
      const requiresApproval = await commentsRequireApproval()

      const { data, error } = await supabase
        .from('discussion_comments')
        .insert({
          discussion_id: discussionId,
          content: content.trim(),
          created_by: user.id,
          parent_id: parentId || null,
          is_approved: !requiresApproval // Auto-approve if setting is disabled
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating comment:', error)
        showError(
          'Грешка при добавяне на коментар',
          'Възникна проблем при добавянето на коментара. Моля, опитайте отново.'
        )
        return
      }

      if (parentId) {
        setReplyContent('')
        setReplyingTo(null)
      } else {
        setNewComment('')
      }

      if (requiresApproval) {
        showSuccess(
          'Коментарът е изпратен!',
          'Коментарът ви е изпратен за одобрение и ще бъде публикуван след преглед от модераторите.'
        )
      } else {
        showSuccess(
          'Коментарът е публикуван!',
          'Коментарът ви е публикуван успешно и вече е видим за всички потребители.'
        )
        // Refresh comments to show the new one
        await fetchComments()
      }
    } catch (error) {
      console.error('Error:', error)
      showError(
        'Неочаквана грешка',
        'Възникна неочаквана грешка. Моля, опитайте отново или се свържете с поддръжката.'
      )
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleLikeDiscussion = async () => {
    if (!user || !discussion) return

    try {
      const isLiked = userLikes.has(discussion.id)

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('discussion_likes')
          .delete()
          .eq('discussion_id', discussion.id)
          .eq('user_id', user.id)

        if (!error) {
          setUserLikes(prev => {
            const newSet = new Set(prev)
            newSet.delete(discussion.id)
            return newSet
          })
          setDiscussion(prev => prev ? { ...prev, like_count: (prev.like_count || 0) - 1 } : null)
        }
      } else {
        // Like
        const { error } = await supabase
          .from('discussion_likes')
          .insert({
            discussion_id: discussion.id,
            user_id: user.id
          })

        if (!error) {
          setUserLikes(prev => new Set([...prev, discussion.id]))
          setDiscussion(prev => prev ? { ...prev, like_count: (prev.like_count || 0) + 1 } : null)
        }
      }
    } catch (error) {
      console.error('Error toggling discussion like:', error)
    }
  }

  const handleLikeComment = async (commentId: string) => {
    if (!user) return

    try {
      const isLiked = userCommentLikes.has(commentId)

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)

        if (!error) {
          setUserCommentLikes(prev => {
            const newSet = new Set(prev)
            newSet.delete(commentId)
            return newSet
          })
          // Update comment like count in state
          updateCommentLikeCount(commentId, -1)
        }
      } else {
        // Like
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id
          })

        if (!error) {
          setUserCommentLikes(prev => new Set([...prev, commentId]))
          // Update comment like count in state
          updateCommentLikeCount(commentId, 1)
        }
      }
    } catch (error) {
      console.error('Error toggling comment like:', error)
    }
  }

  const updateCommentLikeCount = (commentId: string, delta: number) => {
    const updateComment = (comments: Comment[]): Comment[] => {
      return comments.map(comment => {
        if (comment.id === commentId) {
          return { ...comment, like_count: (comment.like_count || 0) + delta }
        }
        if (comment.replies) {
          return { ...comment, replies: updateComment(comment.replies) }
        }
        return comment
      })
    }
    setComments(updateComment)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: 'long',
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
            <p className="text-gray-600">Зареждане на дискусия...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Влезте в профила си</h1>
          <p className="text-gray-600 mb-4">За да видите дискусиите, моля влезте в профила си.</p>
          <Link href="/bg/login">
            <Button>Вход</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!discussion) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Дискусията не е намерена
            </h3>
            <p className="text-gray-600 mb-4">
              Дискусията може да е премахната или все още не е одобрена
            </p>
            <Link href="/bg/discussions">
              <Button>Обратно към дискусии</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 lg:pt-8">
      <ConfirmationComponent />

      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/bg/discussions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Обратно
          </Button>
        </Link>
      </div>

      {/* Discussion */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
            <Badge className={getCategoryColor(discussion.category)}>
              {discussion.category}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {formatDate(discussion.created_at)}
            </span>
          </div>

          <CardTitle className="text-xl sm:text-2xl mb-4">{discussion.title}</CardTitle>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <UserAvatar
                  user={discussion.created_by_user}
                  size="sm"
                  showName={true}
                  className="text-sm text-gray-500"
                />
              </div>
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <span>{discussion.comment_count || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye className="h-4 w-4 flex-shrink-0" />
                <span>{discussion.views || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Heart className="h-4 w-4 flex-shrink-0" />
                <span>{discussion.like_count || 0}</span>
              </div>
            </div>

            {/* Like Button */}
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLikeDiscussion}
                className={`flex items-center space-x-2 w-full sm:w-auto ${
                  userLikes.has(discussion.id)
                    ? 'text-red-600 hover:text-red-700'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Heart className={`h-4 w-4 ${userLikes.has(discussion.id) ? 'fill-current' : ''}`} />
                <span>Харесай</span>
              </Button>
            )}
          </div>
        </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                {discussion.content}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Коментари ({comments.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Comments List */}
            <div className="space-y-6 mb-8">
              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Все още няма коментари</p>
                  <p className="text-sm text-gray-500">Бъдете първият, който коментира!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    user={user}
                    userCommentLikes={userCommentLikes}
                    onLike={handleLikeComment}
                    onReply={(commentId) => setReplyingTo(commentId)}
                    replyingTo={replyingTo}
                    replyContent={replyContent}
                    setReplyContent={setReplyContent}
                    onSubmitReply={handleSubmitComment}
                    submittingComment={submittingComment}
                    formatDate={formatDate}
                    commentsNeedApproval={commentsNeedApproval}
                  />
                ))
              )}
            </div>

            {/* Add Comment Form */}
            {user ? (
              <div className="border-t pt-6">
                <form onSubmit={handleSubmitComment}>
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-gray-700">
                      Споделете вашето мнение
                    </label>
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Напишете вашия коментар тук..."
                      rows={4}
                      maxLength={2000}
                      className="resize-none"
                    />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <p className="text-xs text-gray-500">
                        {commentsNeedApproval
                          ? 'Коментарите се модерират преди публикуване'
                          : 'Коментарът ще бъде публикуван веднага'
                        }
                      </p>
                      <Button
                        type="submit"
                        disabled={submittingComment || !newComment.trim()}
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">{submittingComment ? 'Изпращане...' : 'Публикувай коментар'}</span>
                        <span className="sm:hidden">{submittingComment ? 'Изпращане...' : 'Публикувай'}</span>
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div className="border-t pt-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <Link href="/bg/login" className="text-blue-600 hover:underline">
                      Влезте в профила си
                    </Link>
                    {' '}за да можете да коментирате
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  )
}

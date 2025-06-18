'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Send, ThumbsUp, ThumbsDown, User } from 'lucide-react'
import Link from 'next/link'

interface Discussion {
  id: string
  title: string
  content: string
  upvotes: number
  downvotes: number
  is_pinned: boolean
  created_at: string
  user_id: string
  user_email?: string
  comments_count?: number
}

interface Comment {
  id: string
  content: string
  upvotes: number
  downvotes: number
  created_at: string
  user_id: string
  user_email?: string
}

interface RealCommentsSectionProps {
  productId: string
}

export function RealCommentsSection({ productId }: RealCommentsSectionProps) {
  const { user } = useAuth()
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [newDiscussionTitle, setNewDiscussionTitle] = useState('')
  const [newDiscussionContent, setNewDiscussionContent] = useState('')
  const [showNewDiscussion, setShowNewDiscussion] = useState(false)
  const [expandedDiscussion, setExpandedDiscussion] = useState<string | null>(null)

  useEffect(() => {
    fetchDiscussions()
  }, [productId])

  const fetchDiscussions = async () => {
    try {
      // Try the new product_comments table first
      const { data: commentsData, error: commentsError } = await supabase
        .from('product_comments')
        .select(`
          id,
          title,
          content,
          upvotes,
          downvotes,
          is_pinned,
          created_at,
          user_id,
          parent_comment_id
        `)
        .eq('product_id', productId)
        .is('parent_comment_id', null) // Only top-level comments
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (!commentsError && commentsData) {
        // Transform comments to discussions format
        const transformedDiscussions = commentsData.map(comment => ({
          id: comment.id,
          title: comment.title || comment.content.substring(0, 50) + (comment.content.length > 50 ? '...' : ''),
          content: comment.content,
          upvotes: comment.upvotes,
          downvotes: comment.downvotes,
          is_pinned: comment.is_pinned,
          created_at: comment.created_at,
          user_id: comment.user_id
        }))

        setDiscussions(transformedDiscussions)

        // Fetch replies for each comment
        if (commentsData.length > 0) {
          for (const comment of commentsData) {
            await fetchCommentReplies(comment.id)
          }
        }
      } else {
        // Fallback to old discussions table
        const { data, error } = await supabase
          .from('discussions')
          .select(`
            id,
            title,
            content,
            upvotes,
            downvotes,
            is_pinned,
            created_at,
            user_id
          `)
          .eq('product_id', productId)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })

        if (!error && data) {
          setDiscussions(data || [])

          // Fetch comments for each discussion
          if (data && data.length > 0) {
            for (const discussion of data) {
              await fetchComments(discussion.id)
            }
          }
        } else {
          setDiscussions([])
        }
      }
    } catch (error) {
      setDiscussions([])
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async (discussionId: string) => {
    try {
      const { data, error } = await supabase
        .from('discussion_comments')
        .select(`
          id,
          content,
          upvotes,
          downvotes,
          created_at,
          user_id
        `)
        .eq('discussion_id', discussionId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setComments(prev => ({
          ...prev,
          [discussionId]: data
        }))
      }
    } catch (error) {
      // Handle silently
    }
  }

  const fetchCommentReplies = async (commentId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_comments')
        .select(`
          id,
          content,
          upvotes,
          downvotes,
          created_at,
          user_id
        `)
        .eq('parent_comment_id', commentId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setComments(prev => ({
          ...prev,
          [commentId]: data
        }))
      }
    } catch (error) {
      // Handle silently
    }
  }

  const createDiscussion = async () => {
    if (!user || !newDiscussionContent.trim()) return

    try {
      // Try to create in product_comments table
      const { data, error } = await supabase
        .from('product_comments')
        .insert({
          product_id: productId,
          user_id: user.id,
          content: newDiscussionContent.trim(),
          title: newDiscussionTitle.trim() || newDiscussionContent.trim().substring(0, 50) + (newDiscussionContent.trim().length > 50 ? '...' : '')
        })
        .select()
        .single()

      if (error) {
        alert('Функцията за коментари ще бъде активирана скоро! Моля, изпълнете SQL скрипта в database/setup-user-interactions.sql')
        return
      }

      // Transform to discussion format
      const newDiscussion = {
        id: data.id,
        title: newDiscussionTitle.trim() || data.content.substring(0, 50) + (data.content.length > 50 ? '...' : ''),
        content: data.content,
        upvotes: data.upvotes,
        downvotes: data.downvotes,
        is_pinned: data.is_pinned,
        created_at: data.created_at,
        user_id: data.user_id
      }

      setDiscussions(prev => [newDiscussion, ...prev])
      setNewDiscussionTitle('')
      setNewDiscussionContent('')
      setShowNewDiscussion(false)
    } catch (error) {
      alert('Възникна грешка при създаването на коментара')
    }
  }

  const addComment = async (discussionId: string) => {
    if (!user || !newComment.trim()) return

    try {
      // Try to add reply to product_comments table
      const { data, error } = await supabase
        .from('product_comments')
        .insert({
          product_id: productId,
          user_id: user.id,
          content: newComment.trim(),
          parent_comment_id: discussionId
        })
        .select()
        .single()

      if (error) {
        alert('Функцията за отговори ще бъде активирана скоро!')
        return
      }

      setComments(prev => ({
        ...prev,
        [discussionId]: [...(prev[discussionId] || []), data]
      }))
      setNewComment('')
    } catch (error) {
      alert('Възникна грешка при добавянето на отговора')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'преди малко'
    if (diffInHours < 24) return `преди ${diffInHours} часа`
    if (diffInHours < 48) return 'вчера'
    return date.toLocaleDateString('bg-BG')
  }

  const getUserDisplayName = (userId: string) => {
    // If it's the current user, show their display name
    if (user && user.id === userId) {
      return user.user_metadata?.name || user.email?.split('@')[0] || 'Вие'
    }
    // For other users, show a friendly anonymous name
    return `Потребител ${userId.slice(0, 8)}`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Зареждане на дискусии...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Comment Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="h-5 w-5 mr-2" />
            Дискусии за този продукт
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-4">
              {!showNewDiscussion ? (
                <Button 
                  onClick={() => setShowNewDiscussion(true)}
                  className="w-full cursor-pointer"
                >
                  Започни нова дискусия
                </Button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Заглавие на дискусията..."
                    value={newDiscussionTitle}
                    onChange={(e) => setNewDiscussionTitle(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                  <textarea
                    placeholder="Споделете мнението си за този продукт..."
                    value={newDiscussionContent}
                    onChange={(e) => setNewDiscussionContent(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                  <div className="flex space-x-2">
                    <Button onClick={createDiscussion} className="cursor-pointer">
                      <Send className="h-4 w-4 mr-2" />
                      Публикувай
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowNewDiscussion(false)}
                      className="cursor-pointer"
                    >
                      Отказ
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">Влезте в акаунта си за да участвате в дискусии</p>
              <div className="space-x-2">
                <Button asChild>
                  <Link href="/bg/login">Вход</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/bg/register">Регистрация</Link>
                </Button>
              </div>
            </div>
          )}

          {/* Discussions List */}
          {discussions.length > 0 && (
            <div className="mt-6 space-y-4">
              <h4 className="font-semibold">Дискусии ({discussions.length})</h4>
              {discussions.map((discussion) => (
                <div key={discussion.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h5 className="font-medium">{discussion.title}</h5>
                        {discussion.is_pinned && (
                          <Badge variant="secondary" className="text-xs">Закачена</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{discussion.content}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {getUserDisplayName(discussion.user_id)}
                        </span>
                        <span>{formatDate(discussion.created_at)}</span>
                        <div className="flex items-center space-x-2">
                          <span className="flex items-center">
                            <ThumbsUp className="h-3 w-3 mr-1" />
                            {discussion.upvotes}
                          </span>
                          <span className="flex items-center">
                            <ThumbsDown className="h-3 w-3 mr-1" />
                            {discussion.downvotes}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comments */}
                  {comments[discussion.id] && comments[discussion.id].length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-gray-200">
                      <div className="space-y-2">
                        {comments[discussion.id].map((comment) => (
                          <div key={comment.id} className="bg-gray-50 p-3 rounded">
                            <p className="text-sm text-gray-700 mb-1">{comment.content}</p>
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <span>{getUserDisplayName(comment.user_id)}</span>
                              <span>{formatDate(comment.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Comment */}
                  {user && (
                    <div className="mt-3 flex space-x-2">
                      <input
                        type="text"
                        placeholder="Добави коментар..."
                        value={expandedDiscussion === discussion.id ? newComment : ''}
                        onChange={(e) => setNewComment(e.target.value)}
                        onFocus={() => setExpandedDiscussion(discussion.id)}
                        className="flex-1 p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-transparent"
                      />
                      {expandedDiscussion === discussion.id && (
                        <Button 
                          size="sm" 
                          onClick={() => addComment(discussion.id)}
                          className="cursor-pointer"
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {discussions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Все още няма дискусии за този продукт.</p>
              <p className="text-sm">Бъдете първият, който ще сподели мнение!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

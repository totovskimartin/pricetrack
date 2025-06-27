'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserLink } from '@/components/ui/user-link'
import {
  MessageCircle, Send, Heart, Reply, MoreHorizontal,
  Calendar, User, ThumbsUp, ThumbsDown, Flag
} from 'lucide-react'

interface Discussion {
  id: string
  title: string
  content: string
  created_at: string
  user: {
    id: string
    email: string
    user_metadata: {
      full_name?: string
      first_name?: string
    }
  }
  comments: Comment[]
  _count: {
    comments: number
    discussion_votes: number
  }
  discussion_votes: Array<{
    vote_type: 'up' | 'down'
    user_id: string
  }>
}

interface Comment {
  id: string
  content: string
  created_at: string
  user: {
    id: string
    email: string
    user_metadata: {
      full_name?: string
      first_name?: string
    }
  }
  parent_comment_id: string | null
  replies?: Comment[]
  _count: {
    comment_votes: number
  }
  comment_votes: Array<{
    vote_type: 'up' | 'down'
    user_id: string
  }>
}

interface DiscussionSectionProps {
  productId: string
}

export function DiscussionSection({ productId }: DiscussionSectionProps) {
  const { user } = useAuth()
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(true)
  const [newDiscussionTitle, setNewDiscussionTitle] = useState('')
  const [newDiscussionContent, setNewDiscussionContent] = useState('')
  const [newCommentContent, setNewCommentContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [showNewDiscussion, setShowNewDiscussion] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createSupabaseClient()

  useEffect(() => {
    fetchDiscussions()
  }, [productId])

  const fetchDiscussions = async () => {
    try {
      // For now, we'll create mock data since we don't have the full database setup
      const mockDiscussions: Discussion[] = [
        {
          id: '1',
          title: 'Качеството на този продукт',
          content: 'Някой пробвал ли е този продукт? Как е качеството спрямо цената?',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          user: {
            id: 'user1',
            email: 'ivan@example.com',
            user_metadata: {
              full_name: 'Иван Петров',
              first_name: 'Иван'
            }
          },
          comments: [
            {
              id: 'comment1',
              content: 'Аз го купих миналата седмица от Лидл. Качеството е добро за цената.',
              created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              user: {
                id: 'user2',
                email: 'maria@example.com',
                user_metadata: {
                  full_name: 'Мария Георгиева',
                  first_name: 'Мария'
                }
              },
              parent_comment_id: null,
              replies: [
                {
                  id: 'reply1',
                  content: 'Благодаря за отговора! В кой Лидл го намери?',
                  created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
                  user: {
                    id: 'user1',
                    email: 'ivan@example.com',
                    user_metadata: {
                      full_name: 'Иван Петров',
                      first_name: 'Иван'
                    }
                  },
                  parent_comment_id: 'comment1',
                  _count: { comment_votes: 0 },
                  comment_votes: []
                }
              ],
              _count: { comment_votes: 3 },
              comment_votes: [
                { vote_type: 'up', user_id: 'user1' },
                { vote_type: 'up', user_id: 'user3' },
                { vote_type: 'up', user_id: 'user4' }
              ]
            }
          ],
          _count: {
            comments: 2,
            discussion_votes: 5
          },
          discussion_votes: [
            { vote_type: 'up', user_id: 'user2' },
            { vote_type: 'up', user_id: 'user3' },
            { vote_type: 'up', user_id: 'user4' },
            { vote_type: 'up', user_id: 'user5' },
            { vote_type: 'down', user_id: 'user6' }
          ]
        },
        {
          id: '2',
          title: 'Промоции и отстъпки',
          content: 'Видял съм този продукт на промоция в различни магазини. Кой предлага най-добрата цена?',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          user: {
            id: 'user3',
            email: 'georgi@example.com',
            user_metadata: {
              full_name: 'Георги Димитров',
              first_name: 'Георги'
            }
          },
          comments: [],
          _count: {
            comments: 0,
            discussion_votes: 2
          },
          discussion_votes: [
            { vote_type: 'up', user_id: 'user1' },
            { vote_type: 'up', user_id: 'user2' }
          ]
        }
      ]

      setDiscussions(mockDiscussions)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const createDiscussion = async () => {
    if (!user) {
      setError('Трябва да влезете в акаунта си за да създадете дискусия')
      return
    }

    if (!newDiscussionTitle.trim() || !newDiscussionContent.trim()) {
      setError('Моля попълнете заглавие и съдържание')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Mock creating discussion
      const newDiscussion: Discussion = {
        id: Date.now().toString(),
        title: newDiscussionTitle.trim(),
        content: newDiscussionContent.trim(),
        created_at: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email || '',
          user_metadata: user.user_metadata || {}
        },
        comments: [],
        _count: {
          comments: 0,
          discussion_votes: 0
        },
        discussion_votes: []
      }

      setDiscussions([newDiscussion, ...discussions])
      setNewDiscussionTitle('')
      setNewDiscussionContent('')
      setShowNewDiscussion(false)
    } catch (error) {
      setError('Възникна неочаквана грешка')
    } finally {
      setSubmitting(false)
    }
  }

  const createComment = async (discussionId: string, parentCommentId?: string) => {
    if (!user) {
      setError('Трябва да влезете в акаунта си за да коментирате')
      return
    }

    if (!newCommentContent.trim()) {
      setError('Моля въведете съдържание на коментара')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Mock creating comment
      const newComment: Comment = {
        id: Date.now().toString(),
        content: newCommentContent.trim(),
        created_at: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email || '',
          user_metadata: user.user_metadata || {}
        },
        parent_comment_id: parentCommentId || null,
        _count: { comment_votes: 0 },
        comment_votes: []
      }

      // Update discussions with new comment
      setDiscussions(discussions.map(discussion => {
        if (discussion.id === discussionId) {
          if (parentCommentId) {
            // Add as reply
            const updatedComments = discussion.comments.map(comment => {
              if (comment.id === parentCommentId) {
                return {
                  ...comment,
                  replies: [...(comment.replies || []), newComment]
                }
              }
              return comment
            })
            return { ...discussion, comments: updatedComments }
          } else {
            // Add as top-level comment
            return {
              ...discussion,
              comments: [...discussion.comments, newComment]
            }
          }
        }
        return discussion
      }))

      setNewCommentContent('')
      setReplyingTo(null)
    } catch (error) {
      setError('Възникна неочаквана грешка')
    } finally {
      setSubmitting(false)
    }
  }

  const getUserDisplayName = (user: any) => {
    return user.user_metadata?.full_name || 
           user.user_metadata?.first_name || 
           user.email.split('@')[0]
  }

  const getVoteScore = (votes: Array<{ vote_type: 'up' | 'down' }>) => {
    return votes.reduce((score, vote) => {
      return score + (vote.vote_type === 'up' ? 1 : -1)
    }, 0)
  }

  const hasUserVoted = (votes: Array<{ vote_type: 'up' | 'down', user_id: string }>, voteType: 'up' | 'down') => {
    return user ? votes.some(v => v.user_id === user.id && v.vote_type === voteType) : false
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Зареждане на дискусиите...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Дискусии и коментари</h3>
          <p className="text-gray-600 text-sm">
            {discussions.length} дискусии • Споделете мнения и опит за този продукт
          </p>
        </div>
        {user && (
          <Button onClick={() => setShowNewDiscussion(!showNewDiscussion)}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Нова дискусия
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* New Discussion Form */}
      {showNewDiscussion && (
        <Card>
          <CardHeader>
            <CardTitle>Създайте нова дискусия</CardTitle>
            <CardDescription>
              Споделете въпрос, мнение или опит за този продукт
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Заглавие</Label>
              <Input
                id="title"
                placeholder="Въведете заглавие на дискусията..."
                value={newDiscussionTitle}
                onChange={(e) => setNewDiscussionTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="content">Съдържание</Label>
              <textarea
                id="content"
                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Опишете въпроса или споделете мнението си..."
                value={newDiscussionContent}
                onChange={(e) => setNewDiscussionContent(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={createDiscussion} disabled={submitting}>
                {submitting ? 'Създаване...' : 'Създай дискусия'}
              </Button>
              <Button variant="outline" onClick={() => setShowNewDiscussion(false)}>
                Отказ
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Login Prompt */}
      {!user && (
        <Card>
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h4 className="text-lg font-semibold mb-2">Присъединете се към дискусията</h4>
            <p className="text-gray-600 mb-4">
              Влезте в акаунта си за да създавате дискусии, коментирате и гласувате
            </p>
            <div className="space-x-2">
              <Button asChild>
                <a href="/bg/login">Вход</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/bg/register">Регистрация</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discussions List */}
      {discussions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h4 className="text-lg font-semibold mb-2">Няма дискусии</h4>
            <p className="text-gray-600 mb-4">
              Бъдете първият, който ще започне дискусия за този продукт
            </p>
            {user && (
              <Button onClick={() => setShowNewDiscussion(true)}>
                Започнете дискусия
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {discussions.map((discussion) => (
            <Card key={discussion.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{discussion.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {discussion.content}
                    </CardDescription>
                    <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                      <div className="flex items-center">
                        <UserLink user={discussion.user} className="text-sm" showAvatar={true} avatarSize="sm" />
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(discussion.created_at).toLocaleDateString('bg-BG')}
                      </div>
                      <div className="flex items-center">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {discussion._count.comments} коментара
                      </div>
                    </div>
                  </div>
                  
                  {/* Voting */}
                  <div className="flex flex-col items-center space-y-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`p-1 ${hasUserVoted(discussion.discussion_votes, 'up') ? 'text-green-600' : ''}`}
                      onClick={() => {/* voteOnDiscussion(discussion.id, 'up') */}}
                      disabled={!user}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      {getVoteScore(discussion.discussion_votes)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`p-1 ${hasUserVoted(discussion.discussion_votes, 'down') ? 'text-red-600' : ''}`}
                      onClick={() => {/* voteOnDiscussion(discussion.id, 'down') */}}
                      disabled={!user}
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Comments */}
              {discussion.comments.length > 0 && (
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {discussion.comments.map((comment) => (
                      <div key={comment.id} className="border-l-2 border-gray-200 pl-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-gray-900">{comment.content}</p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                              <div className="flex items-center">
                                <UserLink user={comment.user} className="text-sm" showAvatar={true} avatarSize="sm" />
                              </div>
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(comment.created_at).toLocaleDateString('bg-BG')}
                              </div>
                              {user && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-0 h-auto text-blue-600"
                                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                >
                                  <Reply className="h-3 w-3 mr-1" />
                                  Отговори
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Comment Voting */}
                          <div className="flex items-center space-x-1 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`p-1 ${hasUserVoted(comment.comment_votes, 'up') ? 'text-green-600' : ''}`}
                              disabled={!user}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <span className="text-xs">
                              {getVoteScore(comment.comment_votes)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`p-1 ${hasUserVoted(comment.comment_votes, 'down') ? 'text-red-600' : ''}`}
                              disabled={!user}
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-3 space-y-3">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="border-l-2 border-gray-100 pl-4">
                                <p className="text-gray-900 text-sm">{reply.content}</p>
                                <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                                  <div className="flex items-center">
                                    <User className="h-3 w-3 mr-1" />
                                    <UserLink user={reply.user} className="text-xs" />
                                  </div>
                                  <div className="flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {new Date(reply.created_at).toLocaleDateString('bg-BG')}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Form */}
                        {replyingTo === comment.id && (
                          <div className="mt-3 space-y-2">
                            <textarea
                              className="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                              placeholder="Напишете отговор..."
                              value={newCommentContent}
                              onChange={(e) => setNewCommentContent(e.target.value)}
                            />
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => createComment(discussion.id, comment.id)}
                                disabled={submitting}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Отговори
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setReplyingTo(null)}
                              >
                                Отказ
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}

              {/* New Comment Form */}
              {user && replyingTo !== discussion.id && (
                <CardContent className="pt-0">
                  <div className="border-t pt-4">
                    <div className="space-y-3">
                      <textarea
                        className="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                        placeholder="Добавете коментар..."
                        value={replyingTo === discussion.id ? newCommentContent : ''}
                        onChange={(e) => {
                          setNewCommentContent(e.target.value)
                          setReplyingTo(discussion.id)
                        }}
                      />
                      {replyingTo === discussion.id && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => createComment(discussion.id)}
                            disabled={submitting}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Коментирай
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReplyingTo(null)
                              setNewCommentContent('')
                            }}
                          >
                            Отказ
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ThumbsUp, ThumbsDown, MessageCircle, Send, User } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { bg } from 'date-fns/locale'

interface Comment {
  id: string
  content: string
  likes: number
  dislikes: number
  created_at: string
  user_id: string
  user?: {
    username: string
    full_name: string | null
  }
}

interface CommentVote {
  comment_id: string
  user_id: string
  vote_type: 'like' | 'dislike'
}

interface SimpleCommentsSectionProps {
  productId: string
  onCommentCountChange?: (count: number) => void
}

export function SimpleCommentsSection({ productId, onCommentCountChange }: SimpleCommentsSectionProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [userVotes, setUserVotes] = useState<Record<string, 'like' | 'dislike'>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newComment, setNewComment] = useState('')

  useEffect(() => {
    fetchComments()
    if (user) {
      fetchUserVotes()
    }
  }, [productId, user])

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('product_comments')
        .select(`
          id,
          content,
          likes,
          dislikes,
          created_at,
          user_id,
          users (
            username,
            full_name
          )
        `)
        .eq('product_id', productId)
        .is('parent_comment_id', null) // Only top-level comments
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching comments:', error)
        if (error.code === '42P01') {
          console.log('Comments table does not exist yet. Please run the migration.')
        }
        return
      }

      if (data) {
        const commentsData = data.map((comment: any) => ({
          ...comment,
          user: comment.users
        }))
        setComments(commentsData)
        onCommentCountChange?.(commentsData.length)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserVotes = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('comment_votes')
        .select('comment_id, vote_type')
        .eq('user_id', user.id)

      if (!error && data) {
        const votes: Record<string, 'like' | 'dislike'> = {}
        data.forEach(vote => {
          votes[vote.comment_id] = vote.vote_type
        })
        setUserVotes(votes)
      }
    } catch (error) {
      console.error('Error fetching user votes:', error)
    }
  }

  const submitComment = async () => {
    if (!user || !newComment.trim()) return

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('product_comments')
        .insert({
          product_id: productId,
          user_id: user.id,
          content: newComment.trim(),
          likes: 0,
          dislikes: 0
        })
        .select(`
          id,
          content,
          likes,
          dislikes,
          created_at,
          user_id,
          users (
            username,
            full_name
          )
        `)
        .single()

      if (error) {
        console.error('Database error:', error)
        if (error.code === '42P01') {
          alert('Функцията за коментари ще бъде активирана скоро! Моля, изпълнете SQL миграцията.')
        } else {
          alert(`Грешка: ${error.message}`)
        }
        return
      }

      const newCommentData = {
        ...data,
        user: (data as any).users
      }

      setComments(prev => {
        const newComments = [newCommentData, ...prev]
        onCommentCountChange?.(newComments.length)
        return newComments
      })
      setNewComment('')
    } catch (error) {
      console.error('Error submitting comment:', error)
      alert('Възникна грешка при публикуването на коментара. Моля, опитайте отново.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVote = async (commentId: string, voteType: 'like' | 'dislike') => {
    if (!user) return

    try {
      const currentVote = userVotes[commentId]
      
      // If clicking the same vote type, remove the vote
      if (currentVote === voteType) {
        await removeVote(commentId)
        return
      }

      // If there's an existing vote, update it; otherwise create new
      if (currentVote) {
        await updateVote(commentId, voteType)
      } else {
        await createVote(commentId, voteType)
      }
    } catch (error) {
      console.error('Error handling vote:', error)
    }
  }

  const createVote = async (commentId: string, voteType: 'like' | 'dislike') => {
    const { error } = await supabase
      .from('comment_votes')
      .insert({
        comment_id: commentId,
        user_id: user!.id,
        vote_type: voteType
      })

    if (!error) {
      updateCommentVoteCount(commentId, voteType, 'add')
      setUserVotes(prev => ({ ...prev, [commentId]: voteType }))
    }
  }

  const updateVote = async (commentId: string, voteType: 'like' | 'dislike') => {
    const oldVoteType = userVotes[commentId]
    
    const { error } = await supabase
      .from('comment_votes')
      .update({ vote_type: voteType })
      .eq('comment_id', commentId)
      .eq('user_id', user!.id)

    if (!error) {
      updateCommentVoteCount(commentId, oldVoteType, 'remove')
      updateCommentVoteCount(commentId, voteType, 'add')
      setUserVotes(prev => ({ ...prev, [commentId]: voteType }))
    }
  }

  const removeVote = async (commentId: string) => {
    const voteType = userVotes[commentId]
    
    const { error } = await supabase
      .from('comment_votes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', user!.id)

    if (!error) {
      updateCommentVoteCount(commentId, voteType, 'remove')
      setUserVotes(prev => {
        const newVotes = { ...prev }
        delete newVotes[commentId]
        return newVotes
      })
    }
  }

  const updateCommentVoteCount = (commentId: string, voteType: 'like' | 'dislike', action: 'add' | 'remove') => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        const increment = action === 'add' ? 1 : -1
        return {
          ...comment,
          likes: voteType === 'like' ? comment.likes + increment : comment.likes,
          dislikes: voteType === 'dislike' ? comment.dislikes + increment : comment.dislikes
        }
      }
      return comment
    }))
  }

  const getUserDisplayName = (comment: Comment) => {
    if (comment.user?.full_name) return comment.user.full_name
    if (comment.user?.username) return comment.user.username
    return `Потребител ${comment.user_id.slice(0, 8)}`
  }

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Зареждане на коментари...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add Comment Form */}
      {user ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <Textarea
                placeholder="Споделете мнението си за този продукт..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={submitComment}
                  disabled={!newComment.trim() || submitting}
                  className="cursor-pointer"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? 'Публикуване...' : 'Публикувай коментар'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">Влезте в акаунта си за да оставите коментар</p>
            <div className="space-x-2">
              <Button asChild>
                <Link href="/bg/login">Вход</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/bg/register">Регистрация</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold">
            Коментари ({comments.length})
          </h3>
        </div>

        {comments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-2">Все още няма коментари за този продукт</p>
              <p className="text-sm text-gray-400">Бъдете първият, който ще сподели мнение!</p>
            </CardContent>
          </Card>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-sm">
                        {getUserDisplayName(comment)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(comment.created_at), 'dd MMM yyyy, HH:mm', { locale: bg })}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 leading-relaxed">
                    {comment.content}
                  </p>
                  
                  <div className="flex items-center space-x-4 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote(comment.id, 'like')}
                      disabled={!user}
                      className={`cursor-pointer ${
                        userVotes[comment.id] === 'like' 
                          ? 'text-green-600 bg-green-50' 
                          : 'text-gray-600 hover:text-green-600'
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      {comment.likes}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote(comment.id, 'dislike')}
                      disabled={!user}
                      className={`cursor-pointer ${
                        userVotes[comment.id] === 'dislike' 
                          ? 'text-red-600 bg-red-50' 
                          : 'text-gray-600 hover:text-red-600'
                      }`}
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      {comment.dislikes}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

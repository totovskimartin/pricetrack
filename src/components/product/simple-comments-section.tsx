'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '@/components/ui/user-link'
import { ThumbsUp, ThumbsDown, MessageCircle, Send, User, Edit2, Trash2, Check, X } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { bg } from 'date-fns/locale'
import ConfirmationModal from '@/components/ui/confirmation-modal'

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
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchComments()
    if (user) {
      fetchUserVotes()
    }
  }, [productId, user])

  // Update parent component's comment count when comments change
  useEffect(() => {
    onCommentCountChange?.(comments.length)
  }, [comments.length, onCommentCountChange])

  const fetchComments = async () => {
    try {
      console.log('Fetching comments for product:', productId)
      console.log('Product ID type:', typeof productId, 'length:', productId?.length)

      // First check if there are ANY comments in the product_comments table
      console.log('Checking if product_comments table has any data...')
      const { data: allComments, error: allError } = await supabase
        .from('product_comments')
        .select('id, product_id')
        .limit(5)

      if (allError) {
        console.error('Error checking product_comments table:', allError)
      } else {
        console.log('Total comments in product_comments table:', allComments?.length || 0)
        console.log('Sample product IDs in comments:', allComments?.map(c => c.product_id))
      }

      // Now try to fetch comments for this specific product
      console.log('Fetching comments for specific product...')
      const { data, error } = await supabase
        .from('product_comments')
        .select(`
          id,
          content,
          likes,
          dislikes,
          created_at,
          user_id,
          parent_comment_id,
          users (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('product_id', productId)
        .is('parent_comment_id', null) // Only top-level comments
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching product comments:', error)

        // Try to check if there are discussions for this product instead
        console.log('Checking discussions table as fallback...')
        const { data: discussionsData, error: discussionsError } = await supabase
          .from('discussions')
          .select('id, title, content, created_at, created_by')
          .limit(5)

        if (!discussionsError && discussionsData) {
          console.log('Found discussions in discussions table:', discussionsData.length)
          console.log('Sample discussions:', discussionsData)
        }

        return
      }

      if (data) {
        const commentsData = data.map((comment: any) => ({
          ...comment,
          user: comment.users
        }))

        console.log('Raw comment data from database:', data)
        console.log('Transformed comment data:', commentsData)

        setComments(commentsData)
        console.log('Found product comments:', commentsData.length)
      } else {
        console.log('No comment data returned from database')
        setComments([])
      }
    } catch (error) {
      console.error('Exception fetching comments:', error)
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
            full_name,
            avatar_url
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

      setComments(prev => [newCommentData, ...prev])
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

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditingContent(comment.content)
  }

  const cancelEditing = () => {
    setEditingCommentId(null)
    setEditingContent('')
  }

  const saveEdit = async (commentId: string) => {
    if (!editingContent.trim()) return

    try {
      const { error } = await supabase
        .from('product_comments')
        .update({
          content: editingContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', user?.id) // Security: only allow editing own comments

      if (error) {
        console.error('Error updating comment:', error)
        return
      }

      // Update local state
      setComments(prev => prev.map(comment =>
        comment.id === commentId
          ? { ...comment, content: editingContent.trim() }
          : comment
      ))

      cancelEditing()
    } catch (error) {
      console.error('Exception updating comment:', error)
    }
  }

  const showDeleteConfirmation = (commentId: string) => {
    setCommentToDelete(commentId)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!commentToDelete) return

    setDeletingCommentId(commentToDelete)

    try {
      const { error } = await supabase
        .from('product_comments')
        .delete()
        .eq('id', commentToDelete)
        .eq('user_id', user?.id) // Security: only allow deleting own comments

      if (error) {
        console.error('Error deleting comment:', error)
        return
      }

      // Remove from local state
      setComments(prev => prev.filter(comment => comment.id !== commentToDelete))

      // Close modal and reset state
      setShowDeleteModal(false)
      setCommentToDelete(null)
    } catch (error) {
      console.error('Exception deleting comment:', error)
    } finally {
      setDeletingCommentId(null)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setCommentToDelete(null)
  }

  const canEditComment = (comment: Comment) => {
    return user && user.id === comment.user_id
  }

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Зареждане на коментари...</p>
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
            <p className="text-muted-foreground mb-4">Влезте в акаунта си за да оставите коментар</p>
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
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            Коментари ({comments.length})
          </h3>
        </div>

        {comments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-2">Все още няма коментари за този продукт</p>
              <p className="text-sm text-muted-foreground/70">Бъдете първият, който ще сподели мнение!</p>
            </CardContent>
          </Card>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <UserAvatar
                        user={comment.user}
                        size="sm"
                        showName={true}
                        className="text-sm text-foreground"
                      />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'dd MMM yyyy, HH:mm', { locale: bg })}
                      </span>
                    </div>

                    {/* Edit/Delete buttons for own comments */}
                    {canEditComment(comment) && (
                      <div className="flex items-center space-x-1">
                        {editingCommentId === comment.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => saveEdit(comment.id)}
                              disabled={!editingContent.trim()}
                              className="cursor-pointer text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditing}
                              className="cursor-pointer text-gray-600 hover:text-gray-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(comment)}
                              className="cursor-pointer text-blue-600 hover:text-blue-700"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => showDeleteConfirmation(comment.id)}
                              disabled={deletingCommentId === comment.id}
                              className="cursor-pointer text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Comment content - editable if in edit mode */}
                  {editingCommentId === comment.id ? (
                    <Textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      rows={3}
                      className="resize-none"
                      placeholder="Редактирайте коментара си..."
                    />
                  ) : (
                    <p className="text-foreground leading-relaxed">
                      {comment.content}
                    </p>
                  )}

                  {/* Vote buttons */}
                  <div className="flex items-center space-x-4 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote(comment.id, 'like')}
                      disabled={!user}
                      className={`cursor-pointer ${
                        userVotes[comment.id] === 'like'
                          ? 'text-green-600 bg-green-50'
                          : 'text-muted-foreground hover:text-green-600'
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
                          : 'text-muted-foreground hover:text-red-600'
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        type="error"
        title="Изтриване на коментар"
        message="Сигурни ли сте, че искате да изтриете този коментар? Това действие не може да бъде отменено."
        confirmText="Изтрий"
        cancelText="Отказ"
        loading={deletingCommentId !== null}
      />
    </div>
  )
}

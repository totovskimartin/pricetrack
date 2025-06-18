'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  User,
  Trash2,
  Loader2,
  AlertTriangle,
  Calendar,
  Mail,
  Check
} from 'lucide-react'


interface UserDeleteModalProps {
  user: any | null
  isOpen: boolean
  onClose: () => void
  onUserDeleted: (deletedUsername: string) => void
  currentAdminId: string
}

export function UserDeleteModal({ 
  user, 
  isOpen, 
  onClose, 
  onUserDeleted, 
  currentAdminId 
}: UserDeleteModalProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [confirmationText, setConfirmationText] = useState('')

  // Reset form state when modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      setConfirmationText('')
      setError('')
      setSuccess(false)
    }
  }, [isOpen, user?.id])

  const handleDelete = async () => {
    if (!user) return

    setError('')
    
    // Require confirmation text
    if (confirmationText !== user.username) {
      setError('Моля въведете точно потребителското име за потвърждение')
      return
    }

    // Prevent self-deletion
    if (user.id === currentAdminId) {
      setError('Не можете да изтриете собствения си акаунт')
      return
    }

    // Prevent deleting other super admins
    if (user.role === 'super_admin') {
      setError('Не можете да изтриете други супер администратори')
      return
    }

    setLoading(true)
    try {
      // Call the server-side API to delete the user
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          adminId: currentAdminId,
          userDetails: {
            username: user.username,
            email: user.email,
            role: user.role,
            full_name: user.full_name
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Error deleting user:', result.error)
        setError(result.error || 'Възникна грешка при изтриването на потребителя')
        return
      }

      // Show success state
      setSuccess(true)
      setLoading(false)

      // Add a delay to show the success state before closing with fade
      setTimeout(() => {
        onUserDeleted(user.username)
        onClose()
      }, 800)
    } catch (error) {
      console.error('Error deleting user:', error)
      setError('Възникна неочаквана грешка при изтриването')
    } finally {
      setLoading(false)
    }
  }



  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl border-0 shadow-2xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-300">
        <DialogHeader className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <DialogTitle className="text-center text-xl font-semibold text-gray-900">
            Изтриване на потребител
          </DialogTitle>
          <DialogDescription className="text-center text-gray-500">
            Това действие е необратимо и ще изтрие завинаги потребителя и всички свързани данни.
          </DialogDescription>
        </DialogHeader>

        <div className={`space-y-6 px-2 transition-all duration-300 ${success ? 'opacity-75' : ''}`}>
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {/* User Info Card */}
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name || user.email}
                    className="h-16 w-16 rounded-full object-cover ring-4 ring-white shadow-lg"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 ring-4 ring-white shadow-lg">
                    <User className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {user.full_name || `@${user.username}`}
                </h3>
                {user.full_name && (
                  <p className="text-sm text-gray-600">@{user.username}</p>
                )}
                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-1.5" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1.5" />
                    {new Date(user.created_at).toLocaleDateString('bg-BG')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Section */}
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-red-900 mb-3">
                  Внимание! Необратимо действие
                </h4>
                <p className="text-red-800 mb-4">
                  Изтриването на потребител ще премахне завинаги следните данни:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2 text-red-700">
                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                    <span className="text-sm">Профила на потребителя</span>
                  </div>
                  <div className="flex items-center space-x-2 text-red-700">
                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                    <span className="text-sm">Всички коментари</span>
                  </div>
                  <div className="flex items-center space-x-2 text-red-700">
                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                    <span className="text-sm">Любими продукти</span>
                  </div>
                  <div className="flex items-center space-x-2 text-red-700">
                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                    <span className="text-sm">Проследявани продукти</span>
                  </div>
                  <div className="flex items-center space-x-2 text-red-700">
                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                    <span className="text-sm">Всички уведомления</span>
                  </div>
                  <div className="flex items-center space-x-2 text-red-700">
                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                    <span className="text-sm">История на активност</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-4">
            <div className="text-center">
              <Label htmlFor="confirmation" className="text-base font-medium text-gray-900">
                За потвърждение, въведете потребителското име:
              </Label>
              <div className="mt-2 inline-flex items-center rounded-lg bg-gray-100 px-3 py-1">
                <code className="text-lg font-mono font-semibold text-gray-900">
                  {user.username}
                </code>
              </div>
            </div>
            <div className="relative">
              <Input
                id="confirmation"
                type="text"
                placeholder={`Въведете "${user.username}" за потвърждение`}
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                disabled={loading}
                className={`h-12 text-center text-lg font-mono transition-all duration-200 ${
                  confirmationText === user.username
                    ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500'
                    : 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                }`}
              />
              {confirmationText === user.username && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center sm:space-x-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="h-12 px-8 text-base font-medium"
          >
            Отказ
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || success || confirmationText !== user.username}
            className={`h-12 px-8 text-base font-medium transition-all duration-300 ${
              success
                ? 'bg-green-600 hover:bg-green-600 cursor-default'
                : confirmationText === user.username
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {success ? (
              <>
                <Check className="mr-2 h-5 w-5" />
                Потребителят е изтрит!
              </>
            ) : loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Изтриване...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-5 w-5" />
                Изтрий потребителя завинаги
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

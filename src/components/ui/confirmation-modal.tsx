'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  XCircle,
  AlertCircle
} from 'lucide-react'

export type ConfirmationType = 'success' | 'warning' | 'error' | 'info' | 'confirm'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  type: ConfirmationType
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  loading?: boolean
}

const getIcon = (type: ConfirmationType) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-6 w-6 text-green-600" />
    case 'warning':
      return <AlertTriangle className="h-6 w-6 text-yellow-600" />
    case 'error':
      return <XCircle className="h-6 w-6 text-red-600" />
    case 'info':
      return <Info className="h-6 w-6 text-blue-600" />
    case 'confirm':
      return <AlertCircle className="h-6 w-6 text-orange-600" />
    default:
      return <Info className="h-6 w-6 text-blue-600" />
  }
}

const getColors = (type: ConfirmationType) => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        button: 'bg-green-600 hover:bg-green-700'
      }
    case 'warning':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        button: 'bg-yellow-600 hover:bg-yellow-700'
      }
    case 'error':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        button: 'bg-red-600 hover:bg-red-700'
      }
    case 'info':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        button: 'bg-blue-600 hover:bg-blue-700'
      }
    case 'confirm':
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        button: 'bg-orange-600 hover:bg-orange-700'
      }
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        button: 'bg-gray-600 hover:bg-gray-700'
      }
  }
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  title,
  message,
  confirmText = 'Потвърди',
  cancelText = 'Отказ',
  showCancel = true,
  loading = false
}: ConfirmationModalProps) {
  const colors = getColors(type)
  const icon = getIcon(type)

  // Auto-close success/info modals after 3 seconds
  useEffect(() => {
    if (isOpen && (type === 'success' || type === 'info') && !onConfirm) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, type, onConfirm, onClose])

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    } else {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className={`flex items-center space-x-3 p-3 rounded-lg ${colors.bg} ${colors.border} border`}>
            {icon}
            <div>
              <DialogTitle className="text-left">{title}</DialogTitle>
              <DialogDescription className="text-left mt-1">
                {message}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {showCancel && onConfirm && (
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {cancelText}
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className={`w-full sm:w-auto text-white ${colors.button}`}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Изпълнява се...</span>
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

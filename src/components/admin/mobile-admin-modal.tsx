'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, ArrowLeft } from 'lucide-react'

interface MobileAdminModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  actions?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'full'
}

export function MobileAdminModal({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = 'full'
}: MobileAdminModalProps) {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    full: 'w-full h-full'
  }

  const containerClasses = size === 'full' 
    ? 'fixed inset-0 z-50 bg-white'
    : `fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50`

  const modalClasses = size === 'full'
    ? 'w-full h-full flex flex-col'
    : `${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden`

  return (
    <div className={containerClasses}>
      <div className={modalClasses}>
        {size === 'full' ? (
          // Full screen modal
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <div className="p-4">
                {children}
              </div>
            </div>

            {/* Actions */}
            {actions && (
              <div className="bg-white border-t border-gray-200 p-4 sticky bottom-0">
                <div className="flex space-x-3">
                  {actions}
                </div>
              </div>
            )}
          </>
        ) : (
          // Card modal
          <Card className="w-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{title}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="max-h-[60vh] overflow-y-auto">
                {children}
              </div>
              {actions && (
                <div className="flex space-x-3 mt-6 pt-4 border-t">
                  {actions}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// Mobile-optimized form components
export function MobileFormField({
  label,
  children,
  error,
  required = false
}: {
  label: string
  children: ReactNode
  error?: string
  required?: boolean
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export function MobileFormGrid({
  children,
  columns = 1
}: {
  children: ReactNode
  columns?: 1 | 2
}) {
  const gridClasses = columns === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-4'
  
  return (
    <div className={gridClasses}>
      {children}
    </div>
  )
}

export function MobileFormActions({
  children,
  variant = 'horizontal'
}: {
  children: ReactNode
  variant?: 'horizontal' | 'vertical'
}) {
  const containerClasses = variant === 'vertical' 
    ? 'flex flex-col space-y-3'
    : 'flex flex-col sm:flex-row sm:space-x-3 sm:space-y-0 space-y-3'

  return (
    <div className={containerClasses}>
      {children}
    </div>
  )
}

// Mobile-optimized confirmation dialog
export function MobileConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Потвърди',
  cancelText = 'Отказ',
  type = 'default'
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'default' | 'danger' | 'warning'
}) {
  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white'
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white'
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  }

  const getIconColor = () => {
    switch (type) {
      case 'danger':
        return 'text-red-600'
      case 'warning':
        return 'text-yellow-600'
      default:
        return 'text-blue-600'
    }
  }

  return (
    <MobileAdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      actions={
        <MobileFormActions>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            className={`flex-1 ${getConfirmButtonClass()}`}
          >
            {confirmText}
          </Button>
        </MobileFormActions>
      }
    >
      <div className="text-center py-4">
        <div className={`w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center`}>
          <div className={`w-6 h-6 ${getIconColor()}`}>
            {type === 'danger' && '⚠️'}
            {type === 'warning' && '⚠️'}
            {type === 'default' && 'ℹ️'}
          </div>
        </div>
        <p className="text-gray-700 text-sm leading-relaxed">{message}</p>
      </div>
    </MobileAdminModal>
  )
}

// Mobile-optimized loading overlay
export function MobileLoadingOverlay({
  isVisible,
  message = 'Зареждане...'
}: {
  isVisible: boolean
  message?: string
}) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <Card className="mx-4">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700">{message}</p>
        </CardContent>
      </Card>
    </div>
  )
}

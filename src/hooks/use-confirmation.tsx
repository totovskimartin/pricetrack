'use client'

import { useState, useCallback } from 'react'
import ConfirmationModal, { ConfirmationType } from '@/components/ui/confirmation-modal'

interface ConfirmationOptions {
  type: ConfirmationType
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
}

interface ConfirmationState extends ConfirmationOptions {
  isOpen: boolean
  onConfirm?: () => void
  loading?: boolean
}

export function useConfirmation() {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Отказ',
    showCancel: true
  })

  const showConfirmation = useCallback((options: ConfirmationOptions & { 
    onConfirm?: () => void | Promise<void>
  }) => {
    setState({
      isOpen: true,
      type: options.type,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || 'Потвърди',
      cancelText: options.cancelText || 'Отказ',
      showCancel: options.showCancel !== false,
      onConfirm: options.onConfirm ? async () => {
        setState(prev => ({ ...prev, loading: true }))
        try {
          await options.onConfirm?.()
          setState(prev => ({ ...prev, isOpen: false, loading: false }))
        } catch (error) {
          setState(prev => ({ ...prev, loading: false }))
          console.error('Confirmation action failed:', error)
        }
      } : undefined,
      loading: false
    })
  }, [])

  const hideConfirmation = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, loading: false }))
  }, [])

  // Convenience methods
  const showSuccess = useCallback((title: string, message: string) => {
    showConfirmation({
      type: 'success',
      title,
      message,
      confirmText: 'OK',
      showCancel: false
    })
  }, [showConfirmation])

  const showError = useCallback((title: string, message: string) => {
    showConfirmation({
      type: 'error',
      title,
      message,
      confirmText: 'OK',
      showCancel: false
    })
  }, [showConfirmation])

  const showInfo = useCallback((title: string, message: string) => {
    showConfirmation({
      type: 'info',
      title,
      message,
      confirmText: 'OK',
      showCancel: false
    })
  }, [showConfirmation])

  const showWarning = useCallback((title: string, message: string) => {
    showConfirmation({
      type: 'warning',
      title,
      message,
      confirmText: 'OK',
      showCancel: false
    })
  }, [showConfirmation])

  const confirm = useCallback((
    title: string, 
    message: string, 
    onConfirm: () => void | Promise<void>,
    options?: {
      confirmText?: string
      cancelText?: string
      type?: 'confirm' | 'warning' | 'error'
    }
  ) => {
    showConfirmation({
      type: options?.type || 'confirm',
      title,
      message,
      confirmText: options?.confirmText || 'Потвърди',
      cancelText: options?.cancelText || 'Отказ',
      showCancel: true,
      onConfirm
    })
  }, [showConfirmation])

  const ConfirmationComponent = () => (
    <ConfirmationModal
      isOpen={state.isOpen}
      onClose={hideConfirmation}
      onConfirm={state.onConfirm}
      type={state.type}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      showCancel={state.showCancel}
      loading={state.loading}
    />
  )

  return {
    showConfirmation,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    confirm,
    hideConfirmation,
    ConfirmationComponent
  }
}

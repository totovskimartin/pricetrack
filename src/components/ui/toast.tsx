'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  onClose: () => void
  autoClose?: boolean
  duration?: number
}

export function Toast({ 
  message, 
  type = 'success', 
  onClose, 
  autoClose = true, 
  duration = 3000 
}: ToastProps) {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [autoClose, duration, onClose])

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-500',
          border: 'border-green-400',
          icon: '✅'
        }
      case 'error':
        return {
          bg: 'bg-red-500',
          border: 'border-red-400',
          icon: '❌'
        }
      case 'warning':
        return {
          bg: 'bg-yellow-500',
          border: 'border-yellow-400',
          icon: '⚠️'
        }
      case 'info':
        return {
          bg: 'bg-blue-500',
          border: 'border-blue-400',
          icon: 'ℹ️'
        }
      default:
        return {
          bg: 'bg-green-500',
          border: 'border-green-400',
          icon: '✅'
        }
    }
  }

  const styles = getToastStyles()

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className={`${styles.bg} text-white px-6 py-4 rounded-xl shadow-xl border ${styles.border} flex items-center space-x-3 min-w-max max-w-md`}>
        <div className="text-xl">{styles.icon}</div>
        <span className="font-medium whitespace-nowrap text-sm">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 text-white hover:text-gray-200 transition-colors text-lg font-bold"
          title="Затвори"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// Hook for managing toast state
export function useToast() {
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
  } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ message, type })
  }

  const hideToast = () => {
    setToast(null)
  }

  const ToastComponent = toast ? (
    <Toast
      message={toast.message}
      type={toast.type}
      onClose={hideToast}
    />
  ) : null

  return {
    showToast,
    hideToast,
    ToastComponent
  }
}

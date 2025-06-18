'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void
  showSuccess: (message: string, title?: string) => void
  showError: (message: string, title?: string) => void
  showInfo: (message: string, title?: string) => void
  hideToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((
    type: ToastType, 
    message: string, 
    title?: string, 
    duration: number = 5000
  ) => {
    const id = Math.random().toString(36).substr(2, 9)
    const toast: Toast = { id, type, message, title, duration }
    
    setToasts(prev => [...prev, toast])
    
    if (duration > 0) {
      setTimeout(() => {
        hideToast(id)
      }, duration)
    }
  }, [])

  const showSuccess = useCallback((message: string, title?: string) => {
    showToast('success', message, title)
  }, [showToast])

  const showError = useCallback((message: string, title?: string) => {
    showToast('error', message, title, 7000) // Longer duration for errors
  }, [showToast])

  const showInfo = useCallback((message: string, title?: string) => {
    showToast('info', message, title)
  }, [showToast])

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />
      case 'error':
        return <AlertCircle className="h-4 w-4" />
      case 'info':
        return <Info className="h-4 w-4" />
    }
  }

  const getToastVariant = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'default'
      case 'error':
        return 'destructive'
      case 'info':
        return 'default'
    }
  }

  const getToastClasses = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800'
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800'
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800'
    }
  }

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, hideToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto animate-in slide-in-from-top-2 duration-300"
          >
            <Alert
              variant={getToastVariant(toast.type)}
              className={`min-w-[300px] max-w-[500px] shadow-lg ${getToastClasses(toast.type)} relative`}
            >
              <div className="flex items-start gap-3">
                {getToastIcon(toast.type)}
                <div className="flex-1 pr-6">
                  {toast.title && (
                    <div className="font-medium mb-1">{toast.title}</div>
                  )}
                  <AlertDescription className="text-sm">
                    {toast.message}
                  </AlertDescription>
                </div>
              </div>
              <button
                onClick={() => hideToast(toast.id)}
                className="absolute top-2 right-2 opacity-70 hover:opacity-100 transition-opacity p-1 rounded-sm hover:bg-black/10"
              >
                <X className="h-4 w-4" />
              </button>
            </Alert>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

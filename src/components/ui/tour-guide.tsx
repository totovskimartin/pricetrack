'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X, ArrowRight, ArrowLeft, Lightbulb, Plus, Search, Filter } from 'lucide-react'

interface TourStep {
  id: string
  title: string
  description: string
  target?: string // CSS selector for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right'
  icon?: React.ReactNode
  action?: {
    text: string
    onClick: () => void
  }
}

interface TourGuideProps {
  steps: TourStep[]
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  onNeverShowAgain?: () => void
  title?: string
  description?: string
}

export function TourGuide({
  steps,
  isOpen,
  onClose,
  onComplete,
  onNeverShowAgain,
  title = "Добре дошли!",
  description = "Нека ви покажем как да използвате тази страница"
}: TourGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const currentStepData = steps[currentStep]

  // Handle highlighting target elements
  useEffect(() => {
    if (!isOpen || !currentStepData?.target) {
      setHighlightedElement(null)
      return
    }

    const element = document.querySelector(currentStepData.target) as HTMLElement
    if (element) {
      setHighlightedElement(element)
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentStep, isOpen, currentStepData?.target])

  // Position the tour card relative to highlighted element
  useEffect(() => {
    if (!cardRef.current) return

    const updatePosition = () => {
      const card = cardRef.current!

      if (!highlightedElement) {
        // Center the card if no target element
        card.style.top = '50%'
        card.style.left = '50%'
        card.style.transform = 'translate(-50%, -50%)'
        return
      }

      const rect = highlightedElement.getBoundingClientRect()
      const cardWidth = 320 // w-80 = 320px
      const cardHeight = 300 // approximate height

      let top = 0
      let left = 0

      switch (currentStepData.position || 'bottom') {
        case 'top':
          top = rect.top - cardHeight - 16
          left = rect.left + (rect.width - cardWidth) / 2
          break
        case 'bottom':
          top = rect.bottom + 16
          left = rect.left + (rect.width - cardWidth) / 2
          break
        case 'left':
          top = rect.top + (rect.height - cardHeight) / 2
          left = rect.left - cardWidth - 16
          break
        case 'right':
          top = rect.top + (rect.height - cardHeight) / 2
          left = rect.right + 16
          break
      }

      // Keep card within viewport
      const padding = 16
      top = Math.max(padding, Math.min(top, window.innerHeight - cardHeight - padding))
      left = Math.max(padding, Math.min(left, window.innerWidth - cardWidth - padding))

      card.style.top = `${top}px`
      card.style.left = `${left}px`
      card.style.transform = 'none'
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(updatePosition, 100)

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [highlightedElement, currentStepData.position, currentStep])

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    onComplete()
    onClose()
  }

  const handleSkip = () => {
    onClose()
  }

  const handleNeverShowAgain = () => {
    if (onNeverShowAgain) {
      onNeverShowAgain()
    }
    onClose()
  }

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleSkip()
          break
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault()
          nextStep()
          break
        case 'ArrowLeft':
          e.preventDefault()
          prevStep()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentStep])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Highlight cutout */}
      {highlightedElement && (
        <div
          className="absolute border-4 border-blue-500 rounded-lg shadow-2xl pointer-events-none animate-pulse bg-blue-500/10"
          style={{
            top: highlightedElement.getBoundingClientRect().top - 8,
            left: highlightedElement.getBoundingClientRect().left - 8,
            width: highlightedElement.getBoundingClientRect().width + 16,
            height: highlightedElement.getBoundingClientRect().height + 16,
          }}
        />
      )}

      {/* Tour Card */}
      <div
        ref={cardRef}
        className="absolute w-80 shadow-2xl border-2 border-blue-200 bg-white rounded-lg pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {currentStepData.icon || <Lightbulb className="h-5 w-5 text-blue-600" />}
              <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Стъпка {currentStep + 1} от {steps.length}</span>
            <div className="flex space-x-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription className="text-gray-700">
            {currentStepData.description}
          </CardDescription>

          {currentStepData.action && (
            <Button 
              onClick={currentStepData.action.onClick}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {currentStepData.action.text}
            </Button>
          )}

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Назад
              </Button>

              <Button onClick={handleSkip} variant="ghost" size="sm">
                Прескочи
              </Button>

              <Button onClick={nextStep} size="sm">
                {currentStep === steps.length - 1 ? 'Завърши' : 'Напред'}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {onNeverShowAgain && (
              <div className="flex justify-center">
                <Button
                  onClick={handleNeverShowAgain}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Никога не показвай отново
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Helper function to safely access storage (localStorage with sessionStorage fallback)
const getStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null

  try {
    // Try localStorage first
    const value = localStorage.getItem(key)
    if (value !== null) return value

    // Fallback to sessionStorage
    return sessionStorage.getItem(key)
  } catch (error) {
    console.warn('Storage access failed, trying sessionStorage:', error)
    try {
      return sessionStorage.getItem(key)
    } catch (sessionError) {
      console.warn('SessionStorage access also failed:', sessionError)
      return null
    }
  }
}

// Helper function to safely set storage (localStorage with sessionStorage fallback)
const setStorageItem = (key: string, value: string): boolean => {
  if (typeof window === 'undefined') return false

  try {
    localStorage.setItem(key, value)
    // Also set in sessionStorage as backup
    sessionStorage.setItem(key, value)
    return true
  } catch (error) {
    console.warn('localStorage write failed, trying sessionStorage:', error)
    try {
      sessionStorage.setItem(key, value)
      return true
    } catch (sessionError) {
      console.warn('SessionStorage write also failed:', sessionError)
      return false
    }
  }
}

// Helper function to safely remove storage item
const removeStorageItem = (key: string): boolean => {
  if (typeof window === 'undefined') return false

  try {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
    return true
  } catch (error) {
    console.warn('Storage remove failed:', error)
    return false
  }
}

// Hook for managing tour state
export function useTour(tourKey: string, shouldShow: boolean = true) {
  const [isOpen, setIsOpen] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!shouldShow || typeof window === 'undefined' || initialized) return

    // Add a small delay to ensure storage is ready (Safari fix)
    const initTimer = setTimeout(() => {
      // Check if user has disabled this tour permanently
      const neverShowAgain = getStorageItem(`tour_never_show_${tourKey}`)

      if (neverShowAgain === 'true') {
        setInitialized(true)
        return
      }

      // Check if user has seen this tour before
      const hasSeenTour = getStorageItem(`tour_completed_${tourKey}`)

      if (!hasSeenTour || hasSeenTour !== 'true') {
        // Small delay to ensure page is fully loaded
        const showTimer = setTimeout(() => {
          setIsOpen(true)
          setInitialized(true)
        }, 1000)

        // Store the timer reference for cleanup
        return () => clearTimeout(showTimer)
      } else {
        setInitialized(true)
      }
    }, 200) // Increased delay for Safari storage readiness

    return () => clearTimeout(initTimer)
  }, [tourKey, shouldShow, initialized])

  const completeTour = () => {
    setStorageItem(`tour_completed_${tourKey}`, 'true')
    setIsOpen(false)
  }

  const neverShowAgain = () => {
    setStorageItem(`tour_never_show_${tourKey}`, 'true')
    setStorageItem(`tour_completed_${tourKey}`, 'true')
    setIsOpen(false)
  }

  const resetTour = () => {
    removeStorageItem(`tour_completed_${tourKey}`)
    removeStorageItem(`tour_never_show_${tourKey}`)
    setInitialized(false) // Reset initialization state
    setIsOpen(true)
  }

  const canShowTour = () => {
    const neverShow = getStorageItem(`tour_never_show_${tourKey}`)
    return neverShow !== 'true'
  }

  // Override setIsOpen to allow manual tour opening
  const manualSetIsOpen = (open: boolean) => {
    setIsOpen(open)
  }

  return {
    isOpen,
    setIsOpen: manualSetIsOpen,
    completeTour,
    neverShowAgain,
    resetTour,
    canShowTour
  }
}

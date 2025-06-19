'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TourGuide, useTour } from '@/components/ui/tour-guide'
import { Search, Plus, Filter } from 'lucide-react'

export default function TourDebugPage() {
  const [localStorageData, setLocalStorageData] = useState<Record<string, string>>({})
  const [isClient, setIsClient] = useState(false)
  
  // Test tour
  const { isOpen: isTourOpen, setIsOpen: setIsTourOpen, completeTour, neverShowAgain, canShowTour, resetTour } = useTour('debug_tour', true)

  const tourSteps = [
    {
      id: 'welcome',
      title: 'Debug Tour Step 1',
      description: 'This is a test tour to debug localStorage behavior on Safari.',
      icon: <Search className="h-5 w-5 text-blue-600" />
    },
    {
      id: 'step2',
      title: 'Debug Tour Step 2',
      description: 'This is the second step of the debug tour.',
      icon: <Plus className="h-5 w-5 text-green-600" />
    },
    {
      id: 'step3',
      title: 'Debug Tour Step 3',
      description: 'This is the final step. You can complete or select "Never show again".',
      icon: <Filter className="h-5 w-5 text-purple-600" />
    }
  ]

  useEffect(() => {
    setIsClient(true)
    refreshLocalStorageData()
  }, [])

  const refreshLocalStorageData = () => {
    if (typeof window === 'undefined') return
    
    const data: Record<string, string> = {}
    
    // Get all tour-related localStorage items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes('tour')) {
        data[key] = localStorage.getItem(key) || ''
      }
    }
    
    setLocalStorageData(data)
  }

  const clearAllTourData = () => {
    if (typeof window === 'undefined') return
    
    Object.keys(localStorageData).forEach(key => {
      localStorage.removeItem(key)
    })
    
    refreshLocalStorageData()
  }

  const testLocalStorage = () => {
    if (typeof window === 'undefined') return
    
    try {
      const testKey = 'tour_test_' + Date.now()
      const testValue = 'test_value_' + Date.now()
      
      localStorage.setItem(testKey, testValue)
      const retrieved = localStorage.getItem(testKey)
      
      if (retrieved === testValue) {
        alert('localStorage test PASSED: Write and read successful')
      } else {
        alert('localStorage test FAILED: Retrieved value does not match')
      }
      
      localStorage.removeItem(testKey)
    } catch (error) {
      alert('localStorage test FAILED: ' + error)
    }
  }

  if (!isClient) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      {/* Tour Guide */}
      <TourGuide
        steps={tourSteps}
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onComplete={completeTour}
        onNeverShowAgain={neverShowAgain}
        title="Debug Tour"
        description="Testing tour functionality"
      />

      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tour Debug Page</CardTitle>
            <CardDescription>
              This page helps debug tour localStorage behavior, especially on Safari
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setIsTourOpen(true)}>
                Show Tour
              </Button>
              <Button onClick={resetTour} variant="outline">
                Reset Tour
              </Button>
              <Button onClick={refreshLocalStorageData} variant="outline">
                Refresh Data
              </Button>
              <Button onClick={clearAllTourData} variant="destructive">
                Clear All Tour Data
              </Button>
              <Button onClick={testLocalStorage} variant="secondary">
                Test localStorage
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <span>Can Show Tour:</span>
              <Badge variant={canShowTour() ? "default" : "secondary"}>
                {canShowTour() ? "Yes" : "No"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>localStorage Data</CardTitle>
            <CardDescription>
              All tour-related localStorage entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(localStorageData).length === 0 ? (
              <p className="text-gray-500">No tour-related localStorage data found</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(localStorageData).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <code className="text-sm font-mono">{key}</code>
                    <Badge variant="outline">{value}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Browser Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>User Agent:</strong> {navigator.userAgent}</div>
              <div><strong>localStorage Available:</strong> {typeof Storage !== 'undefined' ? 'Yes' : 'No'}</div>
              <div><strong>Window Object:</strong> {typeof window !== 'undefined' ? 'Available' : 'Not Available'}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

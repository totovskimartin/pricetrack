'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Mail,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  TrendingUp,
  TestTube,
  ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import AdminLayout from '@/components/admin/admin-layout'

interface EmailStats {
  pending: number
  sent: number
  failed: number
  total: number
}

interface QueuedEmail {
  id: string
  to_email: string
  subject: string
  email_type: string
  status: string
  attempts: number
  created_at: string
  sent_at?: string
  error_message?: string
}

function EmailSystemContent() {
  const { user } = useAuth()
  const [stats, setStats] = useState<EmailStats | null>(null)
  const [recentEmails, setRecentEmails] = useState<QueuedEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [testEmailType, setTestEmailType] = useState('welcome')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchEmailData()
  }, [])

  const fetchEmailData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/email-system')
      const data = await response.json()

      if (response.ok) {
        setStats(data.stats)
        setRecentEmails(data.recent_emails)
      } else {
        setError(data.error || 'Failed to fetch email data')
      }
    } catch (error) {
      console.error('Error fetching email data:', error)
      setError('Failed to fetch email data')
    } finally {
      setLoading(false)
    }
  }

  const processQueue = async () => {
    try {
      setProcessing(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/admin/email-system', {
        method: 'POST'
      })
      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Email queue processed successfully!')
        // Refresh data after processing
        await fetchEmailData()
      } else {
        setError(data.error || 'Failed to process email queue')
      }
    } catch (error) {
      console.error('Error processing email queue:', error)
      setError('Failed to process email queue')
    } finally {
      setProcessing(false)
    }
  }

  const sendTestEmail = async () => {
    try {
      setSendingTest(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/admin/email-system', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: testEmailType
        })
      })
      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(`Test email (${getTestEmailTypeLabel(testEmailType)}) queued successfully to your email!`)
        // Refresh data to show the new email in queue
        await fetchEmailData()
      } else {
        setError(data.error || 'Failed to send test email')
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      setError('Failed to send test email')
    } finally {
      setSendingTest(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800">Изпратен</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Неуспешен</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Чакащ</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getEmailTypeLabel = (type: string) => {
    switch (type) {
      case 'price_alert':
        return 'Известие за цена'
      case 'admin_notification':
        return 'Админ известие'
      case 'welcome':
        return 'Добре дошли'
      case 'system':
        return 'Системно'
      default:
        return type
    }
  }

  const getTestEmailTypeLabel = (type: string) => {
    switch (type) {
      case 'welcome':
        return 'Добре дошли'
      case 'price_drop':
        return 'Намаление на цена'
      case 'target_reached':
        return 'Достигната целева цена'
      case 'admin_notification':
        return 'Админ известие'
      default:
        return type
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('bg-BG')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Зареждане на имейл системата...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/bg/admin">
              <Button variant="outline" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Обратно към админ панела
              </Button>
            </Link>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Имейл система</h1>
                  <p className="text-gray-600">Управление на имейл известията</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <Button onClick={processQueue} disabled={processing}>
                  {processing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Обработване...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Обработи опашката
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={sendTestEmail}
                  disabled={sendingTest || !user?.email}
                >
                  {sendingTest ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Изпращане...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Тестов имейл
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {/* Test Email Configuration */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TestTube className="h-5 w-5" />
                <span>Тестване на имейл система</span>
              </CardTitle>
              <CardDescription>
                Изпратете тестов имейл до вашия админ акаунт за проверка на функционалността
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Тип тестов имейл
                  </label>
                  <Select value={testEmailType} onValueChange={setTestEmailType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Изберете тип имейл" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="welcome">Добре дошли</SelectItem>
                      <SelectItem value="price_drop">Намаление на цена</SelectItem>
                      <SelectItem value="target_reached">Достигната целева цена</SelectItem>
                      <SelectItem value="admin_notification">Админ известие</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-6">
                  <Button
                    onClick={sendTestEmail}
                    disabled={sendingTest}
                    className="w-full"
                  >
                    {sendingTest ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Изпращане...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        Изпрати тестов имейл
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Тестовият имейл ще бъде изпратен до вашия админ акаунт
              </p>
            </CardContent>
          </Card>

          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Общо имейли</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Mail className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Изпратени</p>
                      <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Чакащи</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Неуспешни</p>
                      <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <XCircle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Emails */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Последни имейли</span>
              </CardTitle>
              <CardDescription>
                Последните 50 имейла в опашката
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentEmails.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Няма имейли в опашката</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentEmails.map((email) => (
                    <div key={email.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">
                            {getEmailTypeLabel(email.email_type)}
                          </Badge>
                          {getStatusBadge(email.status)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(email.created_at)}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900">{email.subject}</p>
                        <p className="text-sm text-gray-600">До: {email.to_email}</p>
                        
                        {email.status === 'failed' && email.error_message && (
                          <p className="text-sm text-red-600">
                            Грешка: {email.error_message}
                          </p>
                        )}
                        
                        {email.sent_at && (
                          <p className="text-sm text-green-600">
                            Изпратен: {formatDate(email.sent_at)}
                          </p>
                        )}
                        
                        {email.attempts > 1 && (
                          <p className="text-sm text-yellow-600">
                            Опити: {email.attempts}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function EmailSystemPage() {
  return (
    <AdminLayout>
      <EmailSystemContent />
    </AdminLayout>
  )
}

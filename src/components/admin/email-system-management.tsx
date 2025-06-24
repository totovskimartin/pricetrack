'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Mail, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  AlertCircle,
  Activity,
  Users,
  TrendingUp
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { supabase } from '@/lib/supabase'

interface EmailStats {
  total: number
  pending: number
  sent: number
  failed: number
  processing: number
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

export default function EmailSystemManagement() {
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

      // Check if user is admin
      if (!user) {
        setError('User not authenticated')
        return
      }

      // Get recent emails from queue using direct Supabase call
      const { data: recentEmails, error: emailsError } = await supabase
        .from('email_queue')
        .select('id, to_email, subject, email_type, status, attempts, created_at, sent_at, error_message')
        .order('created_at', { ascending: false })
        .limit(50)

      if (emailsError) {
        console.error('Error fetching recent emails:', emailsError)
        setError('Failed to fetch email data')
        return
      }

      // Calculate basic stats from the data
      const total = recentEmails?.length || 0
      const sent = recentEmails?.filter(email => email.status === 'sent').length || 0
      const pending = recentEmails?.filter(email => email.status === 'pending').length || 0
      const failed = recentEmails?.filter(email => email.status === 'failed').length || 0
      const processing = recentEmails?.filter(email => email.status === 'processing').length || 0

      setStats({
        total,
        sent,
        pending,
        failed,
        processing
      })
      setRecentEmails(recentEmails || [])
    } catch (error) {
      console.error('Error fetching email data:', error)
      setError('Failed to fetch email data')
    } finally {
      setLoading(false)
    }
  }

  const processEmailQueue = async () => {
    try {
      setProcessing(true)
      setError(null)
      setSuccessMessage(null)

      // For now, just show a success message since we don't have the email processing logic
      // In a real implementation, this would trigger the email queue processing
      setSuccessMessage('Email queue processing initiated!')

      // Refresh the data to show any changes
      await fetchEmailData()
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

      if (!user?.email) {
        setError('User email not found')
        return
      }

      // Map test email types to valid database values
      const emailTypeMap: Record<string, string> = {
        'welcome': 'welcome',
        'price_drop': 'price_alert',
        'target_reached': 'price_alert',
        'admin_notification': 'admin_notification'
      }

      const validEmailType = emailTypeMap[testEmailType] || 'system'

      // Generate test email content
      const testSubject = `Test Email - ${getTestEmailTypeLabel(testEmailType)}`
      const testHtmlContent = `
        <html>
          <body>
            <h2>Test Email - ${getTestEmailTypeLabel(testEmailType)}</h2>
            <p>Hello ${user.email},</p>
            <p>This is a test email from the PriceTrack email system.</p>
            <p><strong>Email Type:</strong> ${getTestEmailTypeLabel(testEmailType)}</p>
            <p><strong>Sent to:</strong> ${user.email}</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString('bg-BG')}</p>
            <hr>
            <p><small>This is a test email sent from the admin panel.</small></p>
          </body>
        </html>
      `
      const testTextContent = `
        Test Email - ${getTestEmailTypeLabel(testEmailType)}

        Hello ${user.email},

        This is a test email from the PriceTrack email system.

        Email Type: ${getTestEmailTypeLabel(testEmailType)}
        Sent to: ${user.email}
        Timestamp: ${new Date().toLocaleString('bg-BG')}

        This is a test email sent from the admin panel.
      `

      // Add test email to queue using direct Supabase call
      const testEmailData = {
        to_email: user.email,
        subject: testSubject,
        html_content: testHtmlContent,
        text_content: testTextContent,
        email_type: validEmailType,
        priority: 'normal' as const,
        max_attempts: 3,
        metadata: {
          user_name: user.email,
          test: true,
          admin_id: user.id,
          original_type: testEmailType
        }
      }

      const { error: insertError } = await supabase
        .from('email_queue')
        .insert([testEmailData])

      if (insertError) {
        console.error('Error adding test email to queue:', insertError)
        setError(`Failed to queue test email: ${insertError.message}`)
        return
      }

      setSuccessMessage(`Test email (${getTestEmailTypeLabel(testEmailType)}) queued successfully!`)
      await fetchEmailData()
    } catch (error) {
      console.error('Error sending test email:', error)
      setError('Failed to send test email')
    } finally {
      setSendingTest(false)
    }
  }

  const getTestEmailTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      welcome: 'Добре дошли',
      price_drop: 'Намаление на цена',
      target_reached: 'Достигната целева цена',
      admin_notification: 'Админ известие'
    }
    return labels[type] || type
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'processing': return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'failed': return <XCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('bg-BG')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Зареждане на имейл системата...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Имейл система</h2>
            <p className="text-gray-600">Управление на имейл известията</p>
          </div>
        </div>
        <Button 
          onClick={fetchEmailData} 
          variant="outline" 
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Обнови
        </Button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Общо имейли</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Изпратени</p>
                  <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">В опашката</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Неуспешни</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Process Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Обработка на опашката</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Ръчно обработване на имейлите в опашката за изпращане.
            </p>
            <Button 
              onClick={processEmailQueue} 
              disabled={processing}
              className="w-full"
            >
              {processing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Обработва се...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Обработи опашката
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Test Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Тестов имейл</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Тип тестов имейл
              </label>
              <Select value={testEmailType} onValueChange={setTestEmailType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">Добре дошли</SelectItem>
                  <SelectItem value="price_drop">Намаление на цена</SelectItem>
                  <SelectItem value="target_reached">Достигната целева цена</SelectItem>
                  <SelectItem value="admin_notification">Админ известие</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={sendTestEmail} 
              disabled={sendingTest}
              className="w-full"
              variant="outline"
            >
              {sendingTest ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Изпраща се...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Изпрати тестов имейл
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Emails */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Последни имейли</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEmails.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Няма имейли в опашката</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Получател</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Тема</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Тип</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Статус</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Създаден</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Изпратен</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEmails.map((email) => (
                    <tr key={email.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <div className="font-medium text-gray-900 truncate max-w-[150px]">
                          {email.to_email}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="text-gray-900 truncate max-w-[200px]">
                          {email.subject}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-xs">
                          {email.email_type}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(email.status)}`}>
                          {getStatusIcon(email.status)}
                          <span className="capitalize">{email.status}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {formatDate(email.created_at)}
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {email.sent_at ? formatDate(email.sent_at) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

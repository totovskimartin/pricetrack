'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'
import { discussionsRequireApproval } from '@/lib/settings'
import { useConfirmation } from '@/hooks/use-confirmation'
import { ensureUserExists } from '@/lib/user-utils'
import { ArrowLeft, Save, AlertCircle, MessageSquare } from 'lucide-react'

interface DiscussionForm {
  title: string
  content: string
  category: string
}

const categories = [
  'Общи',
  'Цени и промоции',
  'Качество на продукти',
  'Супермаркети',
  'Съвети за пазаруване',
  'Рецепти и готвене',
  'Здравословно хранене',
  'Бюджет и спестявания',
  'Други'
]

export default function NewDiscussionPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { showSuccess, showError, ConfirmationComponent } = useConfirmation()
  const [form, setForm] = useState<DiscussionForm>({
    title: '',
    content: '',
    category: ''
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [discussionData, setDiscussionData] = useState<any>(null)
  const [needsApproval, setNeedsApproval] = useState(true)
  const [requiresApproval, setRequiresApproval] = useState(true)

  // Check approval setting and redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/bg/login')
      return
    }

    // Load the approval setting
    const loadApprovalSetting = async () => {
      try {
        const approvalRequired = await discussionsRequireApproval()
        setRequiresApproval(approvalRequired)
      } catch (error) {
        console.error('Error loading approval setting:', error)
        // Default to requiring approval on error
        setRequiresApproval(true)
      }
    }

    loadApprovalSetting()
  }, [user, router])

  if (!user) {
    return null
  }

  const handleChange = (field: keyof DiscussionForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const generateDiscussionSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      // Ensure user exists in the database
      const userExists = await ensureUserExists(user)
      if (!userExists) {
        showError('Грешка', 'Възникна проблем с потребителския профил. Моля, опитайте отново.')
        return
      }

      // Check if discussions require approval
      const requiresApproval = await discussionsRequireApproval()

      // Generate slug
      const slug = generateDiscussionSlug(form.title)

      console.log('Creating discussion with data:', {
        title: form.title,
        slug,
        content: form.content,
        category: form.category,
        is_approved: !requiresApproval,
        created_by: user.id
      })

      const { data, error } = await supabase
        .from('discussions')
        .insert({
          title: form.title,
          slug,
          content: form.content,
          category: form.category,
          is_approved: !requiresApproval, // Auto-approve if setting is disabled
          created_by: user.id
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating discussion:', error)
        console.error('Full error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })

        // Provide user-friendly error messages
        if (error.message.includes('category')) {
          showError('Невалидна категория', 'Моля, изберете валидна категория за дискусията.')
        } else if (error.message.includes('title')) {
          showError('Невалидно заглавие', 'Заглавието трябва да бъде поне 5 символа.')
        } else if (error.message.includes('content')) {
          showError('Невалидно съдържание', 'Съдържанието трябва да бъде поне 10 символа.')
        } else if (error.message.includes('schema cache')) {
          showError('Грешка в базата данни', 'Моля, опитайте отново след малко или се свържете с администратора.')
        } else {
          showError('Грешка при създаване', 'Грешка при създаване на дискусията: ' + error.message + (error.details ? '\nДетайли: ' + error.details : ''))
        }
        return
      }

      console.log('Discussion created successfully:', data)
      setDiscussionData(data)
      setNeedsApproval(requiresApproval)
      setSubmitted(true)
    } catch (error) {
      console.error('Error:', error)
      alert('Възникна неочаквана грешка')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {needsApproval ? 'Дискусията е изпратена успешно!' : 'Дискусията е публикувана!'}
            </h2>
            <p className="text-gray-600 mb-6">
              {needsApproval
                ? 'Благодарим ви за приноса! Дискусията ви ще бъде прегледана от нашия екип и ще бъде одобрена в рамките на 24-48 часа.'
                : 'Благодарим ви за приноса! Дискусията ви е публикувана и вече е достъпна за всички потребители.'
              }
            </p>

            {needsApproval ? (
              <Alert className="mb-6 text-left">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Вашата дискусия ще бъде прегледана от модераторите преди да бъде публикувана.
                  Ще получите известие когато дискусията бъде одобрена.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="mb-6 text-left bg-green-50 border-green-200">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Дискусията ви е публикувана веднага и вече е достъпна за коментари и обсъждане.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {!needsApproval && discussionData && (
                <Link href={`/bg/discussions/${discussionData.id}`}>
                  <Button className="w-full">
                    Виж дискусията
                  </Button>
                </Link>
              )}
              <Button
                variant={needsApproval ? "default" : "outline"}
                onClick={() => {
                  setSubmitted(false)
                  setForm({
                    title: '',
                    content: '',
                    category: ''
                  })
                  setDiscussionData(null)
                }}
              >
                Създай нова дискусия
              </Button>
              <div>
                <Link href="/bg/discussions">
                  <Button variant="outline">
                    Обратно към дискусии
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto pl-16 pr-4 sm:px-6 lg:px-8 py-8">
      <ConfirmationComponent />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Link href="/bg/discussions">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Обратно
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Нова дискусия</h1>
            <p className="text-gray-600">Споделете мнение или започнете разговор</p>
          </div>
        </div>

        {requiresApproval && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Предложените дискусии ще бъдат прегледани от нашия екип преди да бъдат публикувани.
              Моля, спазвайте правилата на общността и бъдете уважителни към другите потребители.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Детайли на дискусията</CardTitle>
            <CardDescription>
              Попълнете информацията за вашата дискусия
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Заглавие *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="напр. Кои са най-добрите промоции тази седмица?"
                  required
                  maxLength={200}
                />
                <p className="text-xs text-gray-500">
                  Изберете ясно и описателно заглавие
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Категория *</Label>
                <Select value={form.category} onValueChange={(value) => handleChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Изберете категория" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Съдържание *</Label>
                <Textarea
                  id="content"
                  value={form.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  placeholder="Споделете вашето мнение, въпрос или съвет..."
                  rows={8}
                  required
                  maxLength={5000}
                />
                <p className="text-xs text-gray-500">
                  Опишете подробно вашата тема. Можете да споделите опит, зададете въпрос или дадете съвет.
                </p>
              </div>

              <div className="flex items-center space-x-4 pt-4">
                <Button type="submit" disabled={loading || !form.title || !form.category || !form.content}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Изпращане...' : (requiresApproval ? 'Изпрати за одобрение' : 'Изпрати')}
                </Button>
                <Link href="/bg/discussions">
                  <Button type="button" variant="outline">
                    Отказ
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Guidelines */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Правила на общността</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800">
            <ul className="space-y-2 text-sm">
              <li>• Бъдете уважителни и вежливи към другите потребители</li>
              <li>• Споделяйте полезна и точна информация</li>
              <li>• Избягвайте спам и неподходящо съдържание</li>
              <li>• Не споделяйте лична информация</li>
              <li>• Фокусирайте се върху теми, свързани с цени и пазаруване</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

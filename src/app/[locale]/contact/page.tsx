'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Mail, Phone, MapPin, Send } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: '' })

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSubmitStatus({
          type: 'success',
          message: result.message || 'Съобщението е изпратено успешно!'
        })
        // Reset form
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        })
      } else {
        setSubmitStatus({
          type: 'error',
          message: result.error || result.message || 'Възникна грешка при изпращането на съобщението.'
        })
      }
    } catch (error) {
      console.error('Error submitting contact form:', error)
      setSubmitStatus({
        type: 'error',
        message: 'Възникна грешка при изпращането на съобщението. Моля, опитайте отново.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <Mail className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Свържете се с нас</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Имате въпроси или предложения? Ние сме тук да помогнем!
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Send className="h-5 w-5 mr-2 text-blue-500" />
                Изпратете съобщение
              </CardTitle>
              <CardDescription>
                Попълнете формата и ние ще се свържем с вас възможно най-скоро
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Име *
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Вашето име"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Имейл *
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Тема *
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Темата на съобщението"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Съобщение *
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Вашето съобщение..."
                    disabled={isSubmitting}
                  />
                </div>

                {/* Status Messages */}
                {submitStatus.type && (
                  <div className={`p-4 rounded-lg ${
                    submitStatus.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    <p className="text-sm font-medium">{submitStatus.message}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Изпращане...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Изпрати съобщение
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            {/* Contact Details */}
            <Card>
              <CardHeader>
                <CardTitle>Контактна информация</CardTitle>
                <CardDescription>
                  Други начини да се свържете с нас
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Имейл</p>
                    <a 
                      href="mailto:info@pricetrack.bg" 
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      info@pricetrack.bg
                    </a>
                  </div>
                </div>
                {/* <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Телефон</p>
                    <a 
                      href="tel:+359888123456" 
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      +359 888 123 456
                    </a>
                  </div>
                </div> */}
                {/* <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Адрес</p>
                    <p className="text-gray-600 text-sm">
                      бул. Витоша 1<br />
                      София 1000, България
                    </p>
                  </div>
                </div> */}
              </CardContent>
            </Card>



            {/* FAQ Link */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="font-medium text-gray-900 mb-2">Преди да се свържете с нас</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Проверете нашата страница с помощ за бързи отговори на често задавани въпроси.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/bg/help">
                      Вижте помощ и FAQ
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

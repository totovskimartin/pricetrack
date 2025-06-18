'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/admin-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'
import { useAuth } from '@/components/providers/auth-provider'
import { generateSlug } from '@/lib/slug-utils'
import { ArrowLeft, Save, Store } from 'lucide-react'
import Link from 'next/link'

interface SupermarketForm {
  name: string
  description: string
  logo_url: string
  website_url: string
  is_active: boolean
}

export default function NewSupermarket() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<SupermarketForm>({
    name: '',
    description: '',
    logo_url: '',
    website_url: '',
    is_active: true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authUser) return

    setLoading(true)
    try {
      // Generate slug from name
      const slug = generateSlug(form.name)

      // Check if slug already exists
      const { data: existingSlug } = await supabase
        .from('supermarkets')
        .select('id')
        .eq('slug', slug)
        .single()

      if (existingSlug) {
        alert('Супермаркет с това име вече съществува')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('supermarkets')
        .insert({
          name: form.name,
          slug,
          description: form.description || null,
          logo_url: form.logo_url || null,
          website_url: form.website_url || null,
          is_active: form.is_active
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating supermarket:', error)
        alert('Грешка при създаване на супермаркета')
        return
      }

      await logAdminAction(authUser.id, 'create_supermarket', 'supermarket', data.id, {
        supermarket_name: form.name,
        slug
      })

      router.push('/bg/admin')
    } catch (error) {
      console.error('Error:', error)
      alert('Възникна неочаквана грешка')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof SupermarketForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Generate preview slug
  const previewSlug = form.name ? generateSlug(form.name) : ''

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/bg/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Обратно
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Добави нов супермаркет</h1>
            <p className="text-gray-600">Създайте нов супермаркет в системата</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Store className="h-5 w-5" />
              <span>Информация за супермаркета</span>
            </CardTitle>
            <CardDescription>
              Попълнете информацията за новия супермаркет
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Име на супермаркета *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="напр. Lidl"
                    required
                  />
                  {previewSlug && (
                    <p className="text-sm text-gray-500">
                      URL адрес: /bg/supermarkets/{previewSlug}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website_url">Уебсайт</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={form.website_url}
                    onChange={(e) => handleChange('website_url', e.target.value)}
                    placeholder="https://www.example.com"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="logo_url">URL на лого</Label>
                  <Input
                    id="logo_url"
                    type="url"
                    value={form.logo_url}
                    onChange={(e) => handleChange('logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Кратко описание на супермаркета..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => handleChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Активен супермаркет</Label>
              </div>

              {/* Preview */}
              {form.logo_url && (
                <div className="space-y-2">
                  <Label>Преглед на логото</Label>
                  <div className="w-32 h-32 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                    <img
                      src={form.logo_url}
                      alt="Преглед на лого"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-4 pt-6 border-t">
                <Link href="/bg/admin">
                  <Button type="button" variant="outline">
                    Отказ
                  </Button>
                </Link>
                <Button type="submit" disabled={loading || !form.name}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Запазване...' : 'Запази супермаркета'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview Card */}
        {form.name && (
          <Card>
            <CardHeader>
              <CardTitle>Преглед</CardTitle>
              <CardDescription>
                Как ще изглежда супермаркетът в системата
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  {form.logo_url ? (
                    <img
                      src={form.logo_url}
                      alt={form.name}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <Store className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{form.name}</h3>
                  {form.description && (
                    <p className="text-sm text-gray-600 mt-1">{form.description}</p>
                  )}
                  {form.website_url && (
                    <a
                      href={form.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {form.website_url}
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
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
import { useConfirmation } from '@/hooks/use-confirmation'
import { ArrowLeft, Save, Loader2, X, Store } from 'lucide-react'

interface SupermarketForm {
  name: string
  description: string
  logo_url: string
  website_url: string
  is_active: boolean
}

export default function EditSupermarketPage() {
  const router = useRouter()
  const params = useParams()
  const { user: authUser } = useAuth()
  const { showSuccess, showError, ConfirmationComponent } = useConfirmation()
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [form, setForm] = useState<SupermarketForm>({
    name: '',
    description: '',
    logo_url: '',
    website_url: '',
    is_active: true
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>('')

  const supermarketId = params.id as string

  const fetchSupermarket = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('supermarkets')
        .select('*')
        .eq('id', supermarketId)
        .single()

      if (error) {
        console.error('Error fetching supermarket:', error)
        showError('Грешка', 'Супермаркетът не беше намерен или нямате права за достъп.')
        router.push('/bg/admin')
        return
      }

      setForm({
        name: data.name || '',
        description: data.description || '',
        logo_url: data.logo_url || '',
        website_url: data.website_url || '',
        is_active: data.is_active ?? true
      })
      setImagePreview(data.logo_url || '')
    } catch (error) {
      console.error('Error:', error)
      showError('Грешка', 'Възникна неочаквана грешка при зареждането на супермаркета.')
      router.push('/bg/admin')
    } finally {
      setFetchLoading(false)
    }
  }, [supermarketId, showError, router])

  useEffect(() => {
    if (supermarketId) {
      fetchSupermarket()
    }
  }, [supermarketId, fetchSupermarket])

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true)
      
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `supermarkets/${fileName}`

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        showError('Грешка', 'Възникна грешка при качване на изображението.')
        return null
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      showError('Грешка', 'Възникна грешка при качване на изображението.')
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showError('Грешка', 'Моля изберете изображение.')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError('Грешка', 'Изображението е твърде голямо. Максималният размер е 5MB.')
        return
      }

      setSelectedFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      // Clear URL input when file is selected
      setForm({ ...form, logo_url: '' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authUser) return

    setLoading(true)
    try {
      let logoUrl = form.logo_url

      // Upload image if file is selected
      if (selectedFile) {
        const uploadedUrl = await uploadImage(selectedFile)
        if (!uploadedUrl) {
          setLoading(false)
          return
        }
        logoUrl = uploadedUrl
      }

      // Generate new slug if name changed
      const slug = generateSlug(form.name)

      // Check if slug already exists (excluding current supermarket)
      const { data: existingSlug } = await supabase
        .from('supermarkets')
        .select('id')
        .eq('slug', slug)
        .neq('id', supermarketId)
        .single()

      if (existingSlug) {
        showError('Грешка', 'Супермаркет с това име вече съществува.')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('supermarkets')
        .update({
          name: form.name,
          slug,
          description: form.description || null,
          logo_url: logoUrl || null,
          website_url: form.website_url || null,
          is_active: form.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', supermarketId)

      if (error) {
        console.error('Error updating supermarket:', error)
        showError('Грешка', 'Възникна грешка при обновяване на супермаркета.')
        return
      }

      await logAdminAction(authUser.id, 'edit_supermarket', 'supermarket', supermarketId, {
        supermarket_name: form.name,
        slug
      })

      showSuccess('Успех', 'Супермаркетът беше обновен успешно!')

      // Redirect after a short delay to allow the user to see the success message
      setTimeout(() => {
        router.push('/bg/admin')
      }, 1500)
    } catch (error) {
      console.error('Error:', error)
      showError('Грешка', 'Възникна неочаквана грешка.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof SupermarketForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))

    // Update image preview when URL changes
    if (field === 'logo_url') {
      setImagePreview(value as string)
      setSelectedFile(null) // Clear file selection when URL is entered
    }
  }

  const clearImage = () => {
    setForm({ ...form, logo_url: '' })
    setSelectedFile(null)
    setImagePreview('')
  }

  // Generate preview slug
  const previewSlug = form.name ? generateSlug(form.name) : ''

  if (fetchLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    )
  }

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
            <h1 className="text-3xl font-bold text-gray-900">Редактирай супермаркет</h1>
            <p className="text-gray-600">Обновете информацията за супермаркета</p>
          </div>
        </div>

        {/* Form */}
        <Card className="bg-white shadow-sm border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Store className="h-5 w-5" />
              <span>Информация за супермаркета</span>
            </CardTitle>
            <CardDescription>
              Попълнете формата за да обновите супермаркета
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Име на супермаркета *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Въведете име на супермаркета"
                    required
                  />
                  {previewSlug && (
                    <p className="text-sm text-gray-500">
                      URL адрес: /bg/supermarkets/{previewSlug}
                    </p>
                  )}
                </div>

                {/* Website URL */}
                <div className="space-y-2">
                  <Label htmlFor="website_url">Уебсайт</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={form.website_url}
                    onChange={(e) => handleChange('website_url', e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Въведете описание на супермаркета"
                  rows={3}
                />
              </div>

              {/* Logo */}
              <div className="space-y-4">
                <Label>Лого на супермаркета</Label>

                {/* Image Preview */}
                {imagePreview && (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={clearImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="logo_file">Качи изображение</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="logo_file"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={uploadingImage}
                      />
                      {uploadingImage && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                    <p className="text-xs text-gray-500">
                      Поддържани формати: JPG, PNG, GIF. Максимален размер: 5MB
                    </p>
                  </div>

                  {/* URL Input */}
                  <div className="space-y-2">
                    <Label htmlFor="logo_url">Или въведете URL</Label>
                    <Input
                      id="logo_url"
                      type="url"
                      value={form.logo_url}
                      onChange={(e) => handleChange('logo_url', e.target.value)}
                      placeholder="https://example.com/logo.png"
                      disabled={uploadingImage}
                    />
                  </div>
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => handleChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Активен супермаркет</Label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t">
                <Link href="/bg/admin">
                  <Button type="button" variant="outline">
                    Отказ
                  </Button>
                </Link>
                <Button type="submit" disabled={loading || uploadingImage || !form.name}>
                  <Save className="h-4 w-4 mr-2" />
                  {uploadingImage ? 'Качване на изображение...' : loading ? 'Запазване...' : 'Запази супермаркета'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationComponent />
    </AdminLayout>
  )
}

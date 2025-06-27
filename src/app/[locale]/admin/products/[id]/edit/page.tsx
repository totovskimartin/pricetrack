'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/admin/admin-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'
import { useAuth } from '@/components/providers/auth-provider'
import { generateProductSlug } from '@/lib/slug-utils'
import { useConfirmation } from '@/hooks/use-confirmation'
import { ArrowLeft, Save, Loader2, Upload, X } from 'lucide-react'

const categories = [
  'Хранителни стоки',
  'Напитки',
  'Месо и риба',
  'Плодове и зеленчуци',
  'Млечни продукти',
  'Хлебни изделия',
  'Замразени продукти',
  'Консерви',
  'Сладкарски изделия',
  'Бебешки продукти',
  'Домакински продукти',
  'Козметика'
]

interface ProductForm {
  name: string
  description: string
  category: string
  brand: string
  image_url: string
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const { user: authUser } = useAuth()
  const { showSuccess, showError, ConfirmationComponent } = useConfirmation()
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [form, setForm] = useState<ProductForm>({
    name: '',
    description: '',
    category: '',
    brand: '',
    image_url: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>('')

  const productId = params.id as string

  const fetchProduct = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (error) {
        console.error('Error fetching product:', error)
        showError('Грешка', 'Продуктът не беше намерен или нямате права за достъп.')
        router.push('/bg/admin')
        return
      }

      setForm({
        name: data.name || '',
        description: data.description || '',
        category: data.category || '',
        brand: data.brand || '',
        image_url: data.image_url || ''
      })
      setImagePreview(data.image_url || '')
    } catch (error) {
      console.error('Error:', error)
      showError('Грешка', 'Възникна неочаквана грешка при зареждането на продукта.')
      router.push('/bg/admin')
    } finally {
      setFetchLoading(false)
    }
  }, [productId, showError, router])

  useEffect(() => {
    if (productId) {
      fetchProduct()
    }
  }, [productId, fetchProduct])

  const uploadImageToSupabase = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true)

      console.log('Uploading image via API route...')

      // Create form data
      const formData = new FormData()
      formData.append('file', file)

      // Upload via API route
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      console.log('Upload API response:', result)

      if (!response.ok) {
        console.error('Upload failed:', result)
        showError('Грешка при качване', result.error || 'Неизвестна грешка при качване на изображението.')
        return null
      }

      return result.publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      showError('Грешка', 'Възникна неочаквана грешка при качване на изображението.')
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
        showError('Невалиден файл', 'Моля, изберете изображение (JPG, PNG, GIF, etc.)')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError('Файлът е твърде голям', 'Изображението е твърде голямо. Максимален размер: 5MB')
        return
      }

      setSelectedFile(file)
      setForm({ ...form, image_url: '' }) // Clear URL when file is selected

      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authUser) return

    setLoading(true)
    try {
      // Upload image if file is selected
      let imageUrl = form.image_url
      if (selectedFile) {
        console.log('Uploading image file...')
        const uploadedUrl = await uploadImageToSupabase(selectedFile)
        if (uploadedUrl) {
          imageUrl = uploadedUrl
          console.log('Image uploaded successfully:', uploadedUrl)
        } else {
          showError('Грешка при качване', 'Грешка при качване на изображението. Продуктът ще бъде обновен без ново изображение.')
        }
      }

      // Generate new slug if name or brand changed
      const slug = generateProductSlug(form.name, form.brand)

      const { error } = await supabase
        .from('products')
        .update({
          name: form.name,
          slug,
          description: form.description || null,
          category: form.category,
          brand: form.brand || null,
          image_url: imageUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)

      if (error) {
        console.error('Error updating product:', error)
        showError('Грешка', 'Възникна грешка при обновяване на продукта.')
        return
      }

      await logAdminAction(authUser.id, 'edit_product', 'product', productId, {
        product_name: form.name,
        category: form.category
      })

      showSuccess('Успех', 'Продуктът беше обновен успешно!')

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
            <h1 className="text-3xl font-bold text-gray-900">Редактирай продукт</h1>
            <p className="text-gray-600">Обновете информацията за продукта</p>
          </div>
        </div>

        {/* Form */}
        <Card className="bg-white shadow-sm border">
          <CardHeader>
            <CardTitle>Информация за продукта</CardTitle>
            <CardDescription>
              Попълнете формата за да обновите продукта
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Име на продукта *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Въведете име на продукта"
                    required
                  />
                </div>

                {/* Brand */}
                <div className="space-y-2">
                  <Label htmlFor="brand">Марка</Label>
                  <Input
                    id="brand"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    placeholder="Въведете марка"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Категория *</Label>
                  <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
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

                {/* Image URL */}
                <div className="space-y-2">
                  <Label htmlFor="image_url">URL на изображение</Label>
                  <Input
                    id="image_url"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Въведете описание на продукта"
                  rows={4}
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label>Качи изображение</Label>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button type="button" variant="outline" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Избери файл
                      </span>
                    </Button>
                  </label>
                  {selectedFile && (
                    <span className="text-sm text-gray-600">{selectedFile.name}</span>
                  )}
                </div>
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="space-y-2">
                  <Label>Преглед на изображението</Label>
                  <div className="relative w-32 h-32">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview('')
                        setSelectedFile(null)
                        setForm({ ...form, image_url: '' })
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button type="submit" disabled={loading || uploadingImage}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Обновява...' : 'Обнови продукта'}
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

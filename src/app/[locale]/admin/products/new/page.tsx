'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { ArrowLeft, Save, Package } from 'lucide-react'
import Link from 'next/link'

const categories = [
  'Хлебни изделия',
  'Мляко и млечни продукти', 
  'Месо и риба',
  'Плодове и зеленчуци',
  'Напитки',
  'Замразени храни',
  'Консерви',
  'Закуски',
  'Домакински стоки',
  'Лична хигиена',
  'Други'
]

interface ProductForm {
  name: string
  description: string
  category: string
  brand: string
  image_url: string
  price_bgn: string
  supermarket_id: string
}

export default function NewProduct() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  const { showSuccess, showError, ConfirmationComponent } = useConfirmation()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<ProductForm>({
    name: '',
    description: '',
    category: '',
    brand: '',
    image_url: '',
    price_bgn: '',
    supermarket_id: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [supermarkets, setSupermarkets] = useState<Array<{
    id: string
    name: string
    logo_url?: string
  }>>([])

  // Fetch supermarkets on component mount
  useEffect(() => {
    const fetchSupermarkets = async () => {
      try {
        const { data, error } = await supabase
          .from('supermarkets')
          .select('id, name, logo_url')
          .eq('is_active', true)
          .order('name')

        if (error) {
          console.error('Error fetching supermarkets:', error)
          return
        }

        setSupermarkets(data || [])
      } catch (error) {
        console.error('Error fetching supermarkets:', error)
      }
    }

    fetchSupermarkets()
  }, [])

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
          showError('Грешка при качване', 'Грешка при качване на изображението. Продуктът ще бъде създаден без изображение.')
        }
      }

      // Generate slug
      const slug = generateProductSlug(form.name, form.brand)

      const { data, error } = await supabase
        .from('products')
        .insert({
          name: form.name,
          slug,
          description: form.description || null,
          category: form.category,
          brand: form.brand || null,
          image_url: imageUrl || null,
          barcode: null,
          unit: 'piece', // Default unit
          is_approved: true, // Admin-created products are auto-approved
          created_by: authUser.id
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating product:', error)
        showError('Грешка', 'Възникна грешка при създаване на продукта.')
        return
      }

      // Create price entry if price and supermarket are provided
      if (form.price_bgn && form.supermarket_id && parseFloat(form.price_bgn) > 0) {
        const { error: priceError } = await supabase
          .from('prices')
          .insert({
            product_id: data.id,
            supermarket_id: form.supermarket_id,
            price_bgn: parseFloat(form.price_bgn),
            is_verified: true, // Admin-created prices are auto-verified
            created_by: authUser.id
          })

        if (priceError) {
          console.error('Error creating price:', priceError)
          showError('Предупреждение', 'Продуктът беше създаден, но възникна грешка при добавяне на цената.')
        }
      }

      await logAdminAction(authUser.id, 'create_product', 'product', data.id, {
        product_name: form.name,
        category: form.category,
        with_price: !!(form.price_bgn && form.supermarket_id)
      })

      showSuccess('Успех', 'Продуктът беше създаден успешно!')

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

  const handleChange = (field: keyof ProductForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))

    // Update image preview when URL changes
    if (field === 'image_url') {
      setImagePreview(value)
      setSelectedFile(null) // Clear file selection when URL is entered
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
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
      setForm(prev => ({ ...prev, image_url: '' })) // Clear URL when file is selected

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

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
            <h1 className="text-3xl font-bold text-gray-900">Добави нов продукт</h1>
            <p className="text-gray-600">Създайте нов продукт в каталога</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Информация за продукта</span>
            </CardTitle>
            <CardDescription>
              Попълнете информацията за новия продукт
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Име на продукта *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="напр. Хляб бял нарязан 500г"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand">Марка</Label>
                  <Input
                    id="brand"
                    value={form.brand}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    placeholder="напр. Добруджа"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Категория *</Label>
                  <Select value={form.category} onValueChange={(value) => handleChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Изберете категория" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>



                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Изображение на продукта</Label>
                    <p className="text-sm text-gray-600 mb-3">Изберете изображение от файл или въведете URL адрес</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* File Upload */}
                      <div className="space-y-2">
                        <Label htmlFor="image_file">Качи изображение</Label>
                        <Input
                          id="image_file"
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-gray-500">
                          JPG, PNG, GIF до 5MB
                        </p>
                      </div>

                      {/* URL Input */}
                      <div className="space-y-2">
                        <Label htmlFor="image_url">Или въведете URL</Label>
                        <Input
                          id="image_url"
                          value={form.image_url}
                          onChange={(e) => handleChange('image_url', e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          type="url"
                          disabled={selectedFile !== null}
                        />
                        <p className="text-xs text-gray-500">
                          Директен линк към изображение
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Information (Optional) */}
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Ценова информация (по избор)</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Можете да добавите начална цена за продукта. Ако не добавите цена сега, можете да го направите по-късно.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="supermarket_id">Супермаркет</Label>
                      <Select value={form.supermarket_id} onValueChange={(value) => handleChange('supermarket_id', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Изберете супермаркет" />
                        </SelectTrigger>
                        <SelectContent>
                          {supermarkets.map((supermarket) => (
                            <SelectItem key={supermarket.id} value={supermarket.id}>
                              <div className="flex items-center space-x-2">
                                {supermarket.logo_url && (
                                  <img
                                    src={supermarket.logo_url}
                                    alt={supermarket.name}
                                    className="w-4 h-4 object-contain"
                                  />
                                )}
                                <span>{supermarket.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price_bgn">Цена (лв.)</Label>
                      <Input
                        id="price_bgn"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.price_bgn}
                        onChange={(e) => handleChange('price_bgn', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Кратко описание на продукта..."
                  rows={3}
                />
              </div>

              {/* Preview */}
              {(imagePreview || form.image_url) && (
                <div className="space-y-2">
                  <Label>Преглед на изображението</Label>
                  <div className="w-32 h-32 border rounded-lg overflow-hidden bg-gray-50">
                    <img
                      src={imagePreview || form.image_url}
                      alt="Преглед"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  </div>
                  {selectedFile && (
                    <p className="text-xs text-green-600">
                      Избран файл: {selectedFile.name}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end space-x-4 pt-6 border-t">
                <Link href="/bg/admin">
                  <Button type="button" variant="outline">
                    Отказ
                  </Button>
                </Link>
                <Button type="submit" disabled={loading || uploadingImage || !form.name || !form.category}>
                  <Save className="h-4 w-4 mr-2" />
                  {uploadingImage ? 'Качване на изображение...' : loading ? 'Запазване...' : 'Запази продукта'}
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

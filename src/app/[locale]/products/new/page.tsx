'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { generateProductSlug } from '@/lib/slug-utils'
import { ArrowLeft, ArrowRight, Package, Save, AlertCircle, User, Tag, FileText, DollarSign, ImageIcon, CheckCircle, Upload, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AuthGuard } from '@/components/auth/auth-guard'

interface ProductForm {
  name: string
  description: string
  category: string
  brand: string
  image_url: string
  price_bgn: string
  supermarket_id: string
}

interface FormErrors {
  [key: string]: string
}

const TOTAL_STEPS = 5

export default function NewUserProduct() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [errors, setErrors] = useState<FormErrors>({})
  const [form, setForm] = useState<ProductForm>({
    name: '',
    description: '',
    category: '',
    brand: '',
    image_url: '',
    price_bgn: '',
    supermarket_id: ''
  })
  const [supermarkets, setSupermarkets] = useState<any[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>('')

  const categories = [
    { id: 'Хранителни стоки', name: 'Хранителни стоки', icon: '🛒' },
    { id: 'Напитки', name: 'Напитки', icon: '🥤' },
    { id: 'Месо и риба', name: 'Месо и риба', icon: '🥩' },
    { id: 'Плодове и зеленчуци', name: 'Плодове и зеленчуци', icon: '🥕' },
    { id: 'Млечни продукти', name: 'Млечни продукти', icon: '🥛' },
    { id: 'Хлебни изделия', name: 'Хлебни изделия', icon: '🍞' },
    { id: 'Замразени продукти', name: 'Замразени продукти', icon: '🧊' },
    { id: 'Консерви', name: 'Консерви', icon: '🥫' },
    { id: 'Сладкарски изделия', name: 'Сладкарски изделия', icon: '🍰' },
    { id: 'Бебешки продукти', name: 'Бебешки продукти', icon: '🍼' },
    { id: 'Домакински продукти', name: 'Домакински продукти', icon: '🧽' },
    { id: 'Козметика', name: 'Козметика', icon: '💄' },
    { id: 'Други', name: 'Други', icon: '📦' }
  ]

  // Validation function for each step
  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {}

    switch (step) {
      case 1:
        if (!form.name.trim()) {
          newErrors.name = 'Името на продукта е задължително'
        } else if (form.name.trim().length < 3) {
          newErrors.name = 'Името трябва да е поне 3 символа'
        }
        // Brand and description are optional, no validation needed for step 1
        break
      case 2:
        if (!form.category) {
          newErrors.category = 'Моля, изберете категория'
        }
        break
      case 3:
        if (!form.price_bgn) {
          newErrors.price_bgn = 'Цената е задължителна'
        } else if (parseFloat(form.price_bgn) <= 0) {
          newErrors.price_bgn = 'Цената трябва да е положително число'
        }
        if (!form.supermarket_id) {
          newErrors.supermarket_id = 'Моля, изберете магазин'
        }
        break
      case 4:
        // Image is optional, no validation needed
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Navigation functions
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const calculateOverallProgress = () => {
    // Calculate progress based on current step only
    return Math.round((currentStep / TOTAL_STEPS) * 100)
  }

  // Handle authentication redirect on client side
  React.useEffect(() => {
    if (!authLoading && user === null) { // Only redirect when we're sure user is not authenticated and not loading
      router.push('/bg/login')
    }
  }, [user, authLoading, router])

  // Debug: Check if user exists in database
  const checkUserInDatabase = async () => {
    if (!user) return

    console.log('Checking if user exists in database:', user.id)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('User in database:', { data, error })

    if (!data && !error) {
      console.log('User not found in database, creating...')
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email || 'test@example.com',
          full_name: user.user_metadata?.name || 'Test User',
          role: 'user',
          is_active: true
        })
        .select()
        .single()

      console.log('Created user:', { newUser, createError })
    }
  }

  // Fetch supermarkets
  const fetchSupermarkets = async () => {
    try {
      const { data, error } = await supabase
        .from('supermarkets')
        .select('id, name, logo_url')
        .eq('is_active', true)
        .order('name')

      if (!error && data) {
        setSupermarkets(data)
      }
    } catch (error) {
      console.error('Error fetching supermarkets:', error)
    }
  }

  // Check user on component mount and fetch supermarkets
  React.useEffect(() => {
    checkUserInDatabase()
    fetchSupermarkets()
  }, [user])

  const handleSubmit = async () => {
    if (!validateStep(3)) return
    if (!user) return

    console.log('Submitting product with user:', user)
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
          alert('Грешка при качване на изображението. Продуктът ще бъде създаден без изображение.')
        }
      }

      // Generate slug
      const slug = generateProductSlug(form.name, form.brand)

      console.log('Creating product with data:', {
        name: form.name,
        slug,
        category: form.category,
        is_approved: false,
        created_by: user.id,
        image_url: imageUrl
      })

      const { data: productData, error: productError } = await supabase
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
          is_approved: false, // User-created products need approval
          created_by: user.id
        })
        .select()
        .single()

      if (productError) {
        console.error('Error creating product:', productError)
        alert('Грешка при създаване на продукта: ' + productError.message)
        return
      }

      console.log('Product created successfully:', productData)

      // Now create the price entry
      const { data: priceData, error: priceError } = await supabase
        .from('prices')
        .insert({
          product_id: productData.id,
          supermarket_id: form.supermarket_id,
          price_bgn: parseFloat(form.price_bgn),
          is_verified: false, // User-submitted prices need verification
          created_by: user.id
        })
        .select()
        .single()

      if (priceError) {
        console.error('Error creating price:', priceError)
        // Product was created but price failed - we could handle this better
        alert('Продуктът беше създаден, но възникна грешка при добавяне на цената: ' + priceError.message)
        return
      }

      console.log('Price created successfully:', priceData)
      setSubmitted(true)
    } catch (error) {
      console.error('Error:', error)
      alert('Възникна неочаквана грешка')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof ProductForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Моля, изберете изображение (JPG, PNG, GIF, etc.)')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Изображението е твърде голямо. Максимален размер: 5MB')
        return
      }

      setSelectedFile(file)
      setErrors(prev => ({ ...prev, image: '' }))

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setSelectedFile(null)
    setImagePreview('')
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
        alert('Грешка при качване: ' + (result.error || 'Неизвестна грешка при качване на изображението.'))
        return null
      }

      return result.publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Възникна неочаквана грешка при качване на изображението.')
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Проверяване на достъпа...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if user is null (will redirect)
  if (user === null) {
    return null
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
              <Card className="bg-white shadow-xl border-0">
                <CardHeader className="text-center pb-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <CardTitle className="text-3xl font-bold text-green-600 mb-2">Успешно изпратено!</CardTitle>
                  <CardDescription className="text-lg text-gray-600">
                    Благодарим ви за предложението на нов продукт
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                  <Alert className="border-green-200 bg-green-50">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Вашият продукт и цената ще бъдат прегледани от нашия екип и ще бъдат одобрени в рамките на 24-48 часа.
                      Ще получите известие когато продуктът и цената бъдат одобрени.
                    </AlertDescription>
                  </Alert>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                    <Link href="/bg/products">
                      <Button variant="outline" size="lg">
                        Обратно към продуктите
                      </Button>
                    </Link>
                    <Button
                      size="lg"
                      onClick={() => {
                        setSubmitted(false)
                        setCurrentStep(1)
                        setForm({
                          name: '',
                          description: '',
                          category: '',
                          brand: '',
                          image_url: '',
                          price_bgn: '',
                          supermarket_id: ''
                        })
                        setSelectedFile(null)
                        setImagePreview('')
                        setErrors({})
                      }}
                    >
                      Добави още продукт
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-8">
              <Link href="/bg/products">
                <Button variant="ghost" size="sm" className="self-start sm:self-auto">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Обратно
                </Button>
              </Link>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Предложи продукт</h1>
                <p className="text-gray-600">Помогнете ни да разширим каталога с продукти</p>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between relative">
                {/* Background line */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0"></div>

                {[
                  { number: 1, label: 'Продукт' },
                  { number: 2, label: 'Категория' },
                  { number: 3, label: 'Цена' },
                  { number: 4, label: 'Снимка' },
                  { number: 5, label: 'Преглед' }
                ].map((step, index) => (
                  <div key={step.number} className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 shadow-sm ${
                        step.number < currentStep
                          ? 'bg-green-500 text-white border-2 border-green-500'
                          : step.number === currentStep
                          ? 'bg-blue-500 text-white border-2 border-blue-500'
                          : 'bg-white border-2 border-gray-300 text-gray-400'
                      }`}
                    >
                      {step.number}
                    </div>
                    <span
                      className={`mt-2 text-sm font-medium transition-colors duration-300 ${
                        step.number < currentStep
                          ? 'text-gray-900'
                          : step.number === currentStep
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}

                {/* Progress line */}
                <div
                  className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-green-500 to-blue-500 -translate-y-1/2 z-0 transition-all duration-700 ease-out"
                  style={{
                    width: `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%`
                  }}
                ></div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Общ прогрес на добавяне</span>
                  <span className="text-sm text-gray-500">{calculateOverallProgress()}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${calculateOverallProgress()}%` }}
                  ></div>
                </div>
                <div className="text-center text-xs text-gray-500">
                  Стъпка {currentStep} от {TOTAL_STEPS}
                </div>
              </CardContent>
            </Card>

            {/* Multi-Step Form */}
            <Card className="bg-white shadow-xl border-0">
              <CardContent className="p-8">
                {/* Step 1: Product Details */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <Package className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Детайли за продукта</h2>
                      <p className="text-gray-600">Въведете основната информация за продукта</p>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-lg font-medium">Име на продукта *</Label>
                        <Input
                          id="name"
                          value={form.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          placeholder="напр. Хляб бял нарязан 500г"
                          className="text-lg p-4 h-14"
                          autoFocus
                        />
                        {errors.name && (
                          <p className="text-red-500 text-sm">{errors.name}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="brand" className="text-lg font-medium">Марка (по избор)</Label>
                        <Input
                          id="brand"
                          value={form.brand}
                          onChange={(e) => handleChange('brand', e.target.value)}
                          placeholder="напр. Добруджа, Данон, Нестле..."
                          className="text-lg p-4 h-14"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-lg font-medium">Описание (по избор)</Label>
                        <Textarea
                          id="description"
                          value={form.description}
                          onChange={(e) => handleChange('description', e.target.value)}
                          placeholder="Допълнителна информация за продукта..."
                          className="text-lg p-4 min-h-[100px] resize-none"
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Category */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <Tag className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Категория</h2>
                      <p className="text-gray-600">Изберете най-подходящата категория за вашия продукт</p>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-lg font-medium">Категория *</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {categories.map((category) => (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => handleChange('category', category.id)}
                              className={`p-4 rounded-lg border-2 text-left transition-all duration-200 hover:scale-105 ${
                                form.category === category.id
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{category.icon}</span>
                                <span className="font-medium">{category.name}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                        {errors.category && (
                          <p className="text-red-500 text-sm">{errors.category}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Price & Supermarket */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <DollarSign className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Цена и магазин</h2>
                      <p className="text-gray-600">Къде видяхте продукта и на каква цена?</p>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="price_bgn" className="text-lg font-medium">Цена в лева *</Label>
                        <Input
                          id="price_bgn"
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.price_bgn}
                          onChange={(e) => handleChange('price_bgn', e.target.value)}
                          placeholder="0.00"
                          className="text-lg p-4 h-14"
                        />
                        {errors.price_bgn && (
                          <p className="text-red-500 text-sm">{errors.price_bgn}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="supermarket_id" className="text-lg font-medium">Магазин *</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {supermarkets.map((supermarket) => (
                            <button
                              key={supermarket.id}
                              type="button"
                              onClick={() => handleChange('supermarket_id', supermarket.id)}
                              className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 flex items-center space-x-3 ${
                                form.supermarket_id === supermarket.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {supermarket.logo_url && (
                                <img
                                  src={supermarket.logo_url}
                                  alt={supermarket.name}
                                  className="w-8 h-8 object-contain"
                                />
                              )}
                              <span className="font-medium">{supermarket.name}</span>
                            </button>
                          ))}
                        </div>
                        {errors.supermarket_id && (
                          <p className="text-red-500 text-sm">{errors.supermarket_id}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-center text-sm text-gray-500">
                      Цената и магазинът са задължителни за да можем да проследяваме промените
                    </div>
                  </div>
                )}

                {/* Step 4: Image Upload */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <ImageIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Добавете изображение</h2>
                      <p className="text-gray-600">Изображението помага на потребителите да разпознаят продукта</p>
                    </div>

                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="relative w-48 h-48 mx-auto mb-6">
                        <img
                          src={imagePreview}
                          alt="Product preview"
                          className="w-full h-full object-cover rounded-lg border-2 border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    <div className="space-y-6">
                      {/* File Upload */}
                      <div className="space-y-2">
                        <Label htmlFor="image_file" className="text-lg font-medium">Качете изображение</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                          <Input
                            id="image_file"
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <Label htmlFor="image_file" className="cursor-pointer">
                            <span className="text-blue-600 hover:text-blue-800 font-medium">
                              Кликнете за избор на файл
                            </span>
                            <p className="text-sm text-gray-500 mt-2">JPG, PNG, GIF до 5MB</p>
                          </Label>
                        </div>
                      </div>
                    </div>

                    {errors.image && (
                      <p className="text-red-500 text-sm text-center">{errors.image}</p>
                    )}

                    <div className="text-center text-sm text-gray-500">
                      Изображението не е задължително, но значително подобрява качеството на предложението
                    </div>
                  </div>
                )}

                {/* Step 5: Review */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <CheckCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Преглед и изпращане</h2>
                      <p className="text-gray-600">Моля, прегледайте информацията преди да изпратите предложението</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                      <div className="flex items-start space-x-4">
                        {imagePreview && (
                          <img
                            src={imagePreview}
                            alt="Product"
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                        )}
                        <div className="flex-1 space-y-3">
                          <div>
                            <h3 className="font-semibold text-lg">{form.name}</h3>
                            {form.brand && <p className="text-gray-600">Марка: {form.brand}</p>}
                            <p className="text-gray-600">Категория: {categories.find(c => c.id === form.category)?.name}</p>
                          </div>
                          {form.description && (
                            <div>
                              <p className="text-sm text-gray-700">{form.description}</p>
                            </div>
                          )}
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="font-medium text-green-600">
                              {parseFloat(form.price_bgn).toFixed(2)} лв.
                            </span>
                            <span className="text-gray-500">
                              в {supermarkets.find(s => s.id === form.supermarket_id)?.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Предложените продукти ще бъдат прегледани от нашия екип преди да бъдат публикувани.
                        Моля, уверете се, че информацията е точна.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-8 border-t">
                  <div>
                    {currentStep > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        className="flex items-center space-x-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Назад</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center space-x-4">
                    <Link href="/bg/products">
                      <Button type="button" variant="ghost">
                        Отказ
                      </Button>
                    </Link>

                    {currentStep < TOTAL_STEPS ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="flex items-center space-x-2"
                      >
                        <span>Напред</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || uploadingImage}
                        className="flex items-center space-x-2"
                      >
                        <Save className="h-4 w-4" />
                        <span>
                          {uploadingImage ? 'Качване на изображение...' : loading ? 'Изпращане...' : 'Изпрати за одобрение'}
                        </span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
}

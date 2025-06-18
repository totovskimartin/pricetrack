'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  ArrowRight, 
  Package, 
  Tag, 
  Image as ImageIcon, 
  DollarSign, 
  CheckCircle,
  Upload,
  X
} from 'lucide-react'
import Link from 'next/link'

interface ProductForm {
  name: string
  description: string
  category: string
  brand: string
  image_url: string
  price_bgn: string
  supermarket_id: string
}

const categories = [
  { id: 'Хранителни стоки', name: 'Хранителни стоки', icon: '🥫' },
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

const TOTAL_STEPS = 6

export default function SuggestProduct() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
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
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Mock supermarkets data for testing
  useEffect(() => {
    setSupermarkets([
      { id: '1', name: 'Lidl', logo_url: null },
      { id: '2', name: 'Fantastico', logo_url: null },
      { id: '3', name: 'Billa', logo_url: null },
      { id: '4', name: 'Kaufland', logo_url: null }
    ])
  }, [])

  const handleChange = (field: keyof ProductForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 1:
        if (!form.name.trim()) {
          newErrors.name = 'Името на продукта е задължително'
        } else if (form.name.length < 3) {
          newErrors.name = 'Името трябва да е поне 3 символа'
        }
        break
      case 2:
        if (!form.category) {
          newErrors.category = 'Моля, изберете категория'
        }
        break
      case 4:
        if (!form.price_bgn) {
          newErrors.price_bgn = 'Цената е задължителна'
        } else if (parseFloat(form.price_bgn) <= 0) {
          newErrors.price_bgn = 'Цената трябва да е положително число'
        }
        if (!form.supermarket_id) {
          newErrors.supermarket_id = 'Моля, изберете магазин'
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ image: 'Моля, изберете изображение (JPG, PNG, GIF, etc.)' })
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ image: 'Изображението е твърде голямо. Максимален размер: 5MB' })
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
    // Mock image upload for testing
    setUploadingImage(true)

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    setUploadingImage(false)

    // Return a mock URL
    return 'https://via.placeholder.com/300x300?text=Mock+Image'
  }

  const handleSubmit = async () => {
    if (!validateStep(4)) return

    setLoading(true)

    // Simulate submission delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('Mock submission:', {
      form,
      selectedFile: selectedFile?.name,
      imagePreview
    })

    setSubmitted(true)
    setLoading(false)
  }



  const calculateOverallProgress = () => {
    // Calculate progress based on current step only
    return Math.round((currentStep / TOTAL_STEPS) * 100)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Продуктът е изпратен успешно!
              </h2>
              <Alert className="mb-6">
                <AlertDescription>
                  Вашият продукт и цената ще бъдат прегледани от нашия екип и ще бъдат одобрени в рамките на 24-48 часа.
                  Ще получите известие когато продуктът и цената бъдат одобрени.
                </AlertDescription>
              </Alert>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" onClick={() => window.history.back()}>
                  Назад
                </Button>
                <Button onClick={() => {
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
                }}>
                  Предложи още продукт
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Предложи продукт - Тест страница</h1>
          <p className="text-gray-600 mt-2">Многостъпкова форма за предлагане на продукти (демо версия)</p>
        </div>



        {/* Step Content */}
        <Card className="mb-8">
          <CardContent className="p-8">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <Package className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Как се казва продуктът?</h2>
                  <p className="text-gray-600">Въведете точното име на продукта, включително размер или тегло</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-lg font-medium">Име на продукта</Label>
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
                <div className="text-center text-sm text-gray-500">
                  Бъдете максимално точни - това помага на другите потребители да намерят продукта
                </div>
              </div>
            )}



            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <Tag className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">В коя категория спада?</h2>
                  <p className="text-gray-600">Изберете най-подходящата категория за вашия продукт</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleChange('category', category.id)}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                        form.category === category.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{category.icon}</div>
                      <div className="text-sm font-medium text-center">{category.name}</div>
                    </button>
                  ))}
                </div>
                {errors.category && (
                  <p className="text-red-500 text-sm text-center">{errors.category}</p>
                )}
              </div>
            )}



            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <Package className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Марка и описание</h2>
                  <p className="text-gray-600">Добавете допълнителна информация за продукта</p>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="brand" className="text-lg font-medium">Марка (по избор)</Label>
                    <Input
                      id="brand"
                      value={form.brand}
                      onChange={(e) => handleChange('brand', e.target.value)}
                      placeholder="напр. Добруджа, Данон, Nestle"
                      className="text-lg p-4 h-14"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-lg font-medium">Описание (по избор)</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Кратко описание на продукта, специални характеристики..."
                      className="min-h-[120px] text-lg p-4"
                      rows={4}
                    />
                  </div>
                </div>
                <div className="text-center text-sm text-gray-500">
                  Тези полета не са задължителни, но помагат за по-добро описание на продукта
                </div>
              </div>
            )}



            {currentStep === 4 && (
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

            {currentStep === 5 && (
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

            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <CheckCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Преглед на предложението</h2>
                  <p className="text-gray-600">Проверете информацията преди изпращане</p>
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
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">{form.name}</h3>
                      {form.brand && (
                        <p className="text-gray-600">Марка: {form.brand}</p>
                      )}
                      <Badge variant="secondary" className="mt-2">
                        {categories.find(c => c.id === form.category)?.name}
                      </Badge>
                    </div>
                  </div>

                  {form.description && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Описание:</h4>
                      <p className="text-gray-600">{form.description}</p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-gray-900">Цена:</h4>
                        <p className="text-2xl font-bold text-green-600">{form.price_bgn} лв.</p>
                      </div>
                      <div className="text-right">
                        <h4 className="font-medium text-gray-900">Магазин:</h4>
                        <div className="flex items-center space-x-2">
                          {supermarkets.find(s => s.id === form.supermarket_id)?.logo_url && (
                            <img
                              src={supermarkets.find(s => s.id === form.supermarket_id)?.logo_url}
                              alt=""
                              className="w-6 h-6 object-contain"
                            />
                          )}
                          <span className="font-medium">
                            {supermarkets.find(s => s.id === form.supermarket_id)?.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    Вашето предложение ще бъде прегледано от нашия екип преди да бъде публикувано.
                    Обикновено това отнема 24-48 часа.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

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

        {/* Navigation Buttons */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Назад</span>
              </Button>

              <div className="flex space-x-4">
                <Button variant="ghost" onClick={() => window.history.back()}>
                  Отказ
                </Button>

                {currentStep < TOTAL_STEPS ? (
                  <Button
                    onClick={nextStep}
                    className="flex items-center space-x-2"
                  >
                    <span>Напред</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>{loading ? 'Изпращане...' : 'Изпрати предложението'}</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

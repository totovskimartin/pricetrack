'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Check, X, Clock, Search, DollarSign, User, Calendar, MessageSquare, Edit, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'
import { format } from 'date-fns'
import { bg } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface PriceSuggestion {
  id: string
  product_id: string
  supermarket_id: string
  suggested_price_bgn: number
  suggested_price_eur: number | null
  current_price_bgn: number | null
  notes: string | null
  status: 'pending' | 'approved' | 'rejected' | 'duplicate'
  suggested_by: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  product: {
    id: string
    name: string
    image_url?: string
  }
  supermarket: {
    id: string
    name: string
    logo_url?: string
  }
  user: {
    id: string
    username: string
    email: string
  } | null
}

export function PriceSuggestionsManagement() {
  const { user: authUser } = useAuth()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [suggestions, setSuggestions] = useState<PriceSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (authUser) {
      fetchUserProfile()
    }
  }, [authUser])

  useEffect(() => {
    if (userProfile) {
      fetchSuggestions()
    }
  }, [userProfile])

  const fetchUserProfile = async () => {
    if (!authUser) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .eq('id', authUser.id)
        .single()

      if (!error && data) {
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('price_suggestions')
        .select(`
          *,
          product:products (
            id,
            name,
            image_url
          ),
          supermarket:supermarkets (
            id,
            name,
            logo_url
          ),
          user:users!price_suggestions_suggested_by_fkey (
            id,
            username,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setSuggestions(data as PriceSuggestion[])
      }
    } catch (error) {
      console.error('Error fetching price suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionAction = async (
    suggestionId: string,
    action: 'approve' | 'reject',
    createPrice: boolean = false
  ) => {
    if (!userProfile) return

    setProcessingIds(prev => new Set(prev).add(suggestionId))
    
    try {
      const suggestion = suggestions.find(s => s.id === suggestionId)
      if (!suggestion) return

      // Update suggestion status
      const { error: updateError } = await supabase
        .from('price_suggestions')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewed_by: userProfile.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', suggestionId)

      if (updateError) throw updateError

      // If approving and should create price, add to prices table
      if (action === 'approve' && createPrice) {
        const { error: priceError } = await supabase
          .from('prices')
          .insert({
            product_id: suggestion.product_id,
            supermarket_id: suggestion.supermarket_id,
            price_bgn: suggestion.suggested_price_bgn,
            is_verified: true,
            created_by: userProfile.id
          })

        if (priceError) {
          console.error('Error creating price:', priceError)
          // Don't throw here, suggestion was still updated
        }
      }

      // Refresh suggestions
      await fetchSuggestions()

    } catch (error) {
      console.error('Error processing suggestion:', error)
      alert('Възникна грешка при обработката на предложението')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(suggestionId)
        return newSet
      })
    }
  }

  const filteredSuggestions = suggestions.filter(suggestion => {
    const matchesSearch = 
      suggestion.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      suggestion.supermarket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (suggestion.user?.username.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    
    const matchesTab = activeTab === 'all' || suggestion.status === activeTab
    
    return matchesSearch && matchesTab
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Чакащо</Badge>
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><Check className="h-3 w-3 mr-1" />Одобрено</Badge>
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><X className="h-3 w-3 mr-1" />Отхвърлено</Badge>
      case 'duplicate':
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Дублирано</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatPrice = (price: number) => `${price.toFixed(2)} лв.`

  const getPriceChange = (suggested: number, current: number | null) => {
    if (!current) return null
    const change = suggested - current
    const percent = (change / current) * 100
    return { change, percent }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Зареждане на предложения...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Управление на предложения за цени
          </CardTitle>
          <CardDescription>
            Прегледайте и одобрявайте предложения за цени от потребители
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center space-x-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Търсене по продукт, магазин или потребител..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">Всички</TabsTrigger>
              <TabsTrigger value="pending">Чакащи</TabsTrigger>
              <TabsTrigger value="approved">Одобрени</TabsTrigger>
              <TabsTrigger value="rejected">Отхвърлени</TabsTrigger>
              <TabsTrigger value="duplicate">Дублирани</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {filteredSuggestions.length > 0 ? (
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Продукт</TableHead>
                          <TableHead>Супермаркет</TableHead>
                          <TableHead>Предложена цена</TableHead>
                          <TableHead>Текуща цена</TableHead>
                          <TableHead>Промяна</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Потребител</TableHead>
                          <TableHead>Дата</TableHead>
                          <TableHead>Бележки</TableHead>
                          <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSuggestions.map((suggestion) => {
                          const priceChange = getPriceChange(suggestion.suggested_price_bgn, suggestion.current_price_bgn)
                          const isProcessing = processingIds.has(suggestion.id)

                          return (
                            <TableRow key={suggestion.id} className="hover:bg-gray-50">
                              {/* Product */}
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  {suggestion.product.image_url && (
                                    <img
                                      src={suggestion.product.image_url}
                                      alt={suggestion.product.name}
                                      className="w-10 h-10 object-cover rounded-lg border"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <div>
                                    <div className="font-medium text-gray-900 max-w-[200px] truncate">
                                      {suggestion.product.name}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Supermarket */}
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  {suggestion.supermarket.logo_url && (
                                    <img
                                      src={suggestion.supermarket.logo_url}
                                      alt={suggestion.supermarket.name}
                                      className="w-5 h-5 object-contain"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <span className="text-sm text-gray-900">{suggestion.supermarket.name}</span>
                                </div>
                              </TableCell>

                              {/* Suggested Price */}
                              <TableCell>
                                <div className="font-semibold text-green-700">
                                  {formatPrice(suggestion.suggested_price_bgn)}
                                </div>
                              </TableCell>

                              {/* Current Price */}
                              <TableCell>
                                {suggestion.current_price_bgn ? (
                                  <div className="font-semibold text-gray-700">
                                    {formatPrice(suggestion.current_price_bgn)}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">Няма</span>
                                )}
                              </TableCell>

                              {/* Price Change */}
                              <TableCell>
                                {priceChange ? (
                                  <div className={`font-semibold ${
                                    priceChange.change < 0 ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                    {priceChange.change > 0 ? '+' : ''}{formatPrice(Math.abs(priceChange.change))}
                                    <div className="text-xs">
                                      ({priceChange.percent > 0 ? '+' : ''}{priceChange.percent.toFixed(1)}%)
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </TableCell>

                              {/* Status */}
                              <TableCell>
                                {getStatusBadge(suggestion.status)}
                              </TableCell>

                              {/* User */}
                              <TableCell>
                                <div className="text-sm text-gray-900">
                                  {suggestion.user?.username || 'Неизвестен'}
                                </div>
                              </TableCell>

                              {/* Date */}
                              <TableCell>
                                <div className="text-sm text-gray-600">
                                  {format(new Date(suggestion.created_at), 'dd MMM yyyy', { locale: bg })}
                                  <div className="text-xs text-gray-500">
                                    {format(new Date(suggestion.created_at), 'HH:mm', { locale: bg })}
                                  </div>
                                </div>
                              </TableCell>

                              {/* Notes */}
                              <TableCell>
                                {suggestion.notes ? (
                                  <div className="max-w-[150px] truncate text-sm text-gray-600" title={suggestion.notes}>
                                    {suggestion.notes}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </TableCell>

                              {/* Actions */}
                              <TableCell className="text-right">
                                {suggestion.status === 'pending' ? (
                                  <div className="flex items-center justify-end space-x-1">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSuggestionAction(suggestion.id, 'approve', true)}
                                      disabled={isProcessing}
                                      className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1"
                                      title="Одобри и добави"
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSuggestionAction(suggestion.id, 'approve', false)}
                                      disabled={isProcessing}
                                      className="border-green-600 text-green-600 hover:bg-green-50 text-xs px-2 py-1"
                                      title="Само одобри"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSuggestionAction(suggestion.id, 'reject')}
                                      disabled={isProcessing}
                                      className="border-red-600 text-red-600 hover:bg-red-50 text-xs px-2 py-1"
                                      title="Отхвърли"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Няма предложения за цени</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

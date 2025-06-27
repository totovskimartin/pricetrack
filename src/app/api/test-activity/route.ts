import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    console.log('🔍 Testing activity feed data...')

    // Get recent price changes (last 7 days) for all products
    const { data: recentPricesData, error: pricesError } = await supabase
      .from('prices')
      .select(`
        id,
        price_bgn,
        created_at,
        supermarket_id,
        product_id,
        products (
          id,
          name,
          brand,
          image_url
        ),
        supermarkets (
          name
        )
      `)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    if (pricesError) {
      console.error('❌ Error fetching recent prices:', pricesError)
      return NextResponse.json({ error: pricesError }, { status: 500 })
    }

    console.log(`📊 Found ${recentPricesData?.length || 0} recent price entries`)

    // Process recent price changes to find actual changes
    const activities = []
    const processedProducts = new Set()

    if (recentPricesData) {
      for (const price of recentPricesData) {
        const productId = (price.products as any)?.id
        const supermarketId = price.supermarket_id
        const productKey = `${productId}-${supermarketId}`

        // Skip if we already processed this product-supermarket combination
        if (processedProducts.has(productKey)) {
          continue
        }
        processedProducts.add(productKey)

        // Get previous price for this specific product and supermarket
        const { data: previousPricesData } = await supabase
          .from('prices')
          .select('id, price_bgn, created_at')
          .eq('product_id', productId)
          .eq('supermarket_id', supermarketId)
          .neq('id', price.id)
          .lt('created_at', price.created_at)
          .order('created_at', { ascending: false })
          .limit(1)

        let percentageChange = null
        let oldPrice = null
        let changeType = 'new'

        if (previousPricesData && previousPricesData.length > 0) {
          const previousPrice = previousPricesData[0]
          oldPrice = previousPrice.price_bgn
          
          if (price.price_bgn !== previousPrice.price_bgn) {
            percentageChange = ((price.price_bgn - previousPrice.price_bgn) / previousPrice.price_bgn) * 100
            changeType = price.price_bgn > previousPrice.price_bgn ? 'increase' : 'decrease'
            
            console.log(`💰 Price change for ${(price.products as any)?.name}: ${previousPrice.price_bgn} → ${price.price_bgn} (${percentageChange.toFixed(1)}%)`)
            
            activities.push({
              id: `price-${price.id}`,
              type: 'price_update',
              product_name: (price.products as any)?.name || 'Неизвестен продукт',
              supermarket_name: (price.supermarkets as any)?.name || 'Неизвестен супермаркет',
              new_price: price.price_bgn,
              old_price: oldPrice,
              percentage_change: percentageChange,
              change_type: changeType,
              created_at: price.created_at,
              product: price.products
            })
          }
        } else {
          // New price entry (no previous price)
          console.log(`🆕 New price entry for ${(price.products as any)?.name}: ${price.price_bgn} лв.`)
          
          activities.push({
            id: `price-${price.id}`,
            type: 'price_update',
            product_name: (price.products as any)?.name || 'Неизвестен продукт',
            supermarket_name: (price.supermarkets as any)?.name || 'Неизвестен супермаркет',
            new_price: price.price_bgn,
            old_price: null,
            percentage_change: 0,
            change_type: 'new',
            created_at: price.created_at,
            product: price.products
          })
        }
      }
    }

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const finalActivities = activities.slice(0, 15)
    
    console.log(`✅ Final activity feed: ${finalActivities.length} items`)

    return NextResponse.json({
      success: true,
      totalPrices: recentPricesData?.length || 0,
      activities: finalActivities,
      activitiesCount: finalActivities.length
    })

  } catch (error) {
    console.error('❌ Error in test-activity API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkRecentPrices() {
  console.log('🔍 Checking recent prices in the database...')
  
  try {
    // Check total number of prices
    const { data: allPrices, error: allError } = await supabase
      .from('prices')
      .select('id, price_bgn, created_at, products(name), supermarkets(name)')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (allError) {
      console.error('❌ Error fetching all prices:', allError)
      return
    }
    
    console.log(`📊 Total recent prices found: ${allPrices?.length || 0}`)
    
    if (allPrices && allPrices.length > 0) {
      console.log('\n📋 Recent prices:')
      allPrices.forEach((price, index) => {
        console.log(`${index + 1}. ${price.products?.name || 'Unknown'} - ${price.price_bgn} лв. at ${price.supermarkets?.name || 'Unknown'} (${new Date(price.created_at).toLocaleDateString()})`)
      })
    }
    
    // Check prices from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentPrices, error: recentError } = await supabase
      .from('prices')
      .select('id, price_bgn, created_at, products(name), supermarkets(name)')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
    
    if (recentError) {
      console.error('❌ Error fetching recent prices:', recentError)
      return
    }
    
    console.log(`\n📅 Prices from last 7 days: ${recentPrices?.length || 0}`)
    
    // Check price alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('price_alerts')
      .select('id, alert_type, created_at, products(name)')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (alertsError) {
      console.error('❌ Error fetching price alerts:', alertsError)
    } else {
      console.log(`\n🔔 Recent price alerts: ${alerts?.length || 0}`)
      if (alerts && alerts.length > 0) {
        alerts.forEach((alert, index) => {
          console.log(`${index + 1}. ${alert.alert_type} for ${alert.products?.name || 'Unknown'} (${new Date(alert.created_at).toLocaleDateString()})`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkRecentPrices()

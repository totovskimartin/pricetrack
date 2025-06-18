// Email notification system for price changes
// This would typically integrate with an email service like SendGrid, Mailgun, or Resend

interface PriceChangeNotification {
  userId: string
  userEmail: string
  productId: string
  productName: string
  oldPrice: number
  newPrice: number
  targetPrice?: number
  supermarketName: string
  productUrl: string
}

interface AdminPriceSuggestionNotification {
  adminEmail: string
  adminName: string
  userName: string
  productName: string
  productSlug: string
  supermarketName: string
  suggestedPrice: number
  currentPrice?: number
  notes?: string
  suggestionId: string
  productUrl: string
  adminPanelUrl: string
}

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export class EmailNotificationService {
  private apiKey: string
  private fromEmail: string

  constructor() {
    // In production, these would come from environment variables
    this.apiKey = process.env.EMAIL_API_KEY || ''
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@pricetrack.bg'
  }

  /**
   * Send price drop notification email
   */
  async sendPriceDropNotification(notification: PriceChangeNotification): Promise<boolean> {
    try {
      const template = this.generatePriceDropTemplate(notification)
      
      // In production, this would call your email service API
      // For now, we'll log the email content
      console.log('📧 Sending price drop notification:')
      console.log('To:', notification.userEmail)
      console.log('Subject:', template.subject)
      console.log('Content:', template.text)
      
      // Simulate email sending
      await this.simulateEmailSend(notification.userEmail, template)
      
      return true
    } catch (error) {
      console.error('Failed to send price drop notification:', error)
      return false
    }
  }

  /**
   * Send price increase notification email
   */
  async sendPriceIncreaseNotification(notification: PriceChangeNotification): Promise<boolean> {
    try {
      const template = this.generatePriceIncreaseTemplate(notification)

      console.log('📧 Sending price increase notification:')
      console.log('To:', notification.userEmail)
      console.log('Subject:', template.subject)
      console.log('Content:', template.text)

      await this.simulateEmailSend(notification.userEmail, template)

      return true
    } catch (error) {
      console.error('Failed to send price increase notification:', error)
      return false
    }
  }

  /**
   * Send admin price suggestion notification email
   */
  async sendAdminPriceSuggestionNotification(notification: AdminPriceSuggestionNotification): Promise<boolean> {
    try {
      const template = this.generateAdminPriceSuggestionTemplate(notification)

      console.log('📧 Sending admin price suggestion notification:')
      console.log('To:', notification.adminEmail)
      console.log('Subject:', template.subject)
      console.log('Content:', template.text)

      await this.simulateEmailSend(notification.adminEmail, template)

      return true
    } catch (error) {
      console.error('Failed to send admin price suggestion notification:', error)
      return false
    }
  }

  /**
   * Generate email template for price drop
   */
  private generatePriceDropTemplate(notification: PriceChangeNotification): EmailTemplate {
    const savings = notification.oldPrice - notification.newPrice
    const savingsPercent = ((savings / notification.oldPrice) * 100).toFixed(1)
    
    const subject = `🎉 Цената на ${notification.productName} падна с ${savings.toFixed(2)} лв!`
    
    const text = `
Здравейте!

Отлични новини! Цената на продукта, който следите, е намалена:

📦 Продукт: ${notification.productName}
💰 Стара цена: ${notification.oldPrice.toFixed(2)} лв.
🎯 Нова цена: ${notification.newPrice.toFixed(2)} лв.
💸 Спестявания: ${savings.toFixed(2)} лв. (${savingsPercent}%)
🏪 Магазин: ${notification.supermarketName}

${notification.targetPrice ? `Вашата целева цена: ${notification.targetPrice.toFixed(2)} лв.` : ''}

Вижте продукта: ${notification.productUrl}

Поръчайте сега, преди цената да се върне!

С уважение,
Екипът на PriceTrack България
    `.trim()

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Цената падна!</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .price-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
        .savings { color: #10b981; font-weight: bold; font-size: 18px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Цената падна!</h1>
        </div>
        <div class="content">
            <p>Здравейте!</p>
            <p>Отлични новини! Цената на продукта, който следите, е намалена:</p>
            
            <div class="price-box">
                <h3>📦 ${notification.productName}</h3>
                <p><strong>Стара цена:</strong> <span style="text-decoration: line-through;">${notification.oldPrice.toFixed(2)} лв.</span></p>
                <p><strong>Нова цена:</strong> <span class="savings">${notification.newPrice.toFixed(2)} лв.</span></p>
                <p><strong>Спестявания:</strong> <span class="savings">${savings.toFixed(2)} лв. (${savingsPercent}%)</span></p>
                <p><strong>Магазин:</strong> ${notification.supermarketName}</p>
                ${notification.targetPrice ? `<p><strong>Вашата целева цена:</strong> ${notification.targetPrice.toFixed(2)} лв.</p>` : ''}
            </div>
            
            <a href="${notification.productUrl}" class="button">Вижте продукта</a>
            
            <p>Поръчайте сега, преди цената да се върне!</p>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
                С уважение,<br>
                Екипът на PriceTrack България
            </p>
        </div>
    </div>
</body>
</html>
    `.trim()

    return { subject, text, html }
  }

  /**
   * Generate email template for price increase
   */
  private generatePriceIncreaseTemplate(notification: PriceChangeNotification): EmailTemplate {
    const increase = notification.newPrice - notification.oldPrice
    const increasePercent = ((increase / notification.oldPrice) * 100).toFixed(1)
    
    const subject = `📈 Цената на ${notification.productName} се увеличи с ${increase.toFixed(2)} лв.`
    
    const text = `
Здравейте!

Информираме ви, че цената на продукта, който следите, се е увеличила:

📦 Продукт: ${notification.productName}
💰 Стара цена: ${notification.oldPrice.toFixed(2)} лв.
📈 Нова цена: ${notification.newPrice.toFixed(2)} лв.
📊 Увеличение: ${increase.toFixed(2)} лв. (${increasePercent}%)
🏪 Магазин: ${notification.supermarketName}

${notification.targetPrice ? `Вашата целева цена: ${notification.targetPrice.toFixed(2)} лв.` : ''}

Вижте продукта: ${notification.productUrl}

Може да искате да проверите други магазини за по-добра цена.

С уважение,
Екипът на PriceTrack България
    `.trim()

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Цената се увеличи</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .price-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
        .increase { color: #dc2626; font-weight: bold; font-size: 18px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📈 Цената се увеличи</h1>
        </div>
        <div class="content">
            <p>Здравейте!</p>
            <p>Информираме ви, че цената на продукта, който следите, се е увеличила:</p>
            
            <div class="price-box">
                <h3>📦 ${notification.productName}</h3>
                <p><strong>Стара цена:</strong> ${notification.oldPrice.toFixed(2)} лв.</p>
                <p><strong>Нова цена:</strong> <span class="increase">${notification.newPrice.toFixed(2)} лв.</span></p>
                <p><strong>Увеличение:</strong> <span class="increase">${increase.toFixed(2)} лв. (${increasePercent}%)</span></p>
                <p><strong>Магазин:</strong> ${notification.supermarketName}</p>
                ${notification.targetPrice ? `<p><strong>Вашата целева цена:</strong> ${notification.targetPrice.toFixed(2)} лв.</p>` : ''}
            </div>
            
            <a href="${notification.productUrl}" class="button">Вижте продукта</a>
            
            <p>Може да искате да проверите други магазини за по-добра цена.</p>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
                С уважение,<br>
                Екипът на PriceTrack България
            </p>
        </div>
    </div>
</body>
</html>
    `.trim()

    return { subject, text, html }
  }

  /**
   * Generate email template for admin price suggestion notification
   */
  private generateAdminPriceSuggestionTemplate(notification: AdminPriceSuggestionNotification): EmailTemplate {
    const subject = `💰 Ново предложение за цена: ${notification.productName}`

    const text = `
Здравейте ${notification.adminName}!

Получихте ново предложение за цена от потребител:

👤 Потребител: ${notification.userName}
📦 Продукт: ${notification.productName}
🏪 Магазин: ${notification.supermarketName}
💰 Предложена цена: ${notification.suggestedPrice.toFixed(2)} лв.
${notification.currentPrice ? `📊 Текуща цена: ${notification.currentPrice.toFixed(2)} лв.` : ''}
${notification.notes ? `📝 Бележки: ${notification.notes}` : ''}

Прегледайте предложението в админ панела:
${notification.adminPanelUrl}

Вижте продукта:
${notification.productUrl}

С уважение,
Системата на PriceTrack България
    `.trim()

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Ново предложение за цена</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .suggestion-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3b82f6; }
        .price { color: #059669; font-weight: bold; font-size: 18px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .button-secondary { background: #6b7280; }
        .notes { background: #f3f4f6; padding: 10px; border-radius: 4px; font-style: italic; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💰 Ново предложение за цена</h1>
        </div>
        <div class="content">
            <p>Здравейте ${notification.adminName}!</p>
            <p>Получихте ново предложение за цена от потребител:</p>

            <div class="suggestion-box">
                <h3>📦 ${notification.productName}</h3>
                <p><strong>👤 Потребител:</strong> ${notification.userName}</p>
                <p><strong>🏪 Магазин:</strong> ${notification.supermarketName}</p>
                <p><strong>💰 Предложена цена:</strong> <span class="price">${notification.suggestedPrice.toFixed(2)} лв.</span></p>
                ${notification.currentPrice ? `<p><strong>📊 Текуща цена:</strong> ${notification.currentPrice.toFixed(2)} лв.</p>` : ''}
                ${notification.notes ? `<div class="notes"><strong>📝 Бележки:</strong><br>${notification.notes}</div>` : ''}
            </div>

            <div style="text-align: center; margin: 20px 0;">
                <a href="${notification.adminPanelUrl}" class="button">Прегледайте в админ панела</a>
                <a href="${notification.productUrl}" class="button button-secondary">Вижте продукта</a>
            </div>

            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
                С уважение,<br>
                Системата на PriceTrack България
            </p>
        </div>
    </div>
</body>
</html>
    `.trim()

    return { subject, text, html }
  }

  /**
   * Simulate email sending (replace with real email service in production)
   */
  private async simulateEmailSend(to: string, template: EmailTemplate): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // In production, replace this with actual email service call:
    /*
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: this.fromEmail },
        subject: template.subject,
        content: [
          { type: 'text/plain', value: template.text },
          { type: 'text/html', value: template.html }
        ]
      })
    })
    */
    
    console.log(`✅ Email simulated successfully to ${to}`)
  }
}

// Export singleton instance
export const emailService = new EmailNotificationService()

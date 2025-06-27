// Email template types
export interface EmailTemplateData {
  [key: string]: any
}

export interface PriceAlertData {
  userName: string
  productName: string
  productBrand?: string
  productImage?: string
  oldPrice: number
  newPrice: number
  priceDifference: number
  percentageChange: number
  supermarketName: string
  targetPrice?: number
  productUrl: string
  unsubscribeUrl: string
}

export interface AdminNotificationData {
  adminName: string
  notificationType: string
  details: string
  actionUrl?: string
  timestamp: string
}

export interface WelcomeEmailData {
  userName: string
  dashboardUrl: string
  supportEmail: string
}

export interface ContactMessageData {
  senderName: string
  senderEmail: string
  subject: string
  message: string
  timestamp: string
}

// Base email template wrapper
const getBaseTemplate = (content: string, title: string) => `
<!DOCTYPE html>
<html lang="bg">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 0;
            background-color: #f8fafc;
        }
        .container {
            background-color: white;
            margin: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .header .subtitle {
            margin: 5px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
        }
        .content {
            padding: 30px 20px;
        }
        .footer {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
        }
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 10px 0;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .price-card {
            background-color: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .price-old {
            text-decoration: line-through;
            color: #6b7280;
            font-size: 18px;
        }
        .price-new {
            color: #059669;
            font-size: 24px;
            font-weight: 600;
        }
        .price-increase {
            color: #dc2626;
        }
        .product-info {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        .product-image {
            width: 60px;
            height: 60px;
            border-radius: 8px;
            margin-right: 15px;
            object-fit: cover;
        }
        .unsubscribe {
            font-size: 11px;
            color: #9ca3af;
            margin-top: 15px;
        }
        .unsubscribe a {
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PriceTrack</h1>
            <div class="subtitle">България</div>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>© 2024 PriceTrack България. Всички права запазени.</p>
            <p>Този имейл е изпратен автоматично. Моля, не отговаряйте на този имейл.</p>
        </div>
    </div>
</body>
</html>
`

// Price drop alert template
export const getPriceDropTemplate = (data: PriceAlertData): { html: string; text: string } => {
  const savings = data.oldPrice - data.newPrice
  const content = `
    <h2>🎉 Отлична новина! Цената падна!</h2>
    
    <div class="product-info">
      ${data.productImage ? `<img src="${data.productImage}" alt="${data.productName}" class="product-image">` : ''}
      <div>
        <h3 style="margin: 0; color: #1f2937;">${data.productName}</h3>
        ${data.productBrand ? `<p style="margin: 5px 0; color: #6b7280;">${data.productBrand}</p>` : ''}
      </div>
    </div>

    <div class="price-card">
      <p><strong>Супермаркет:</strong> ${data.supermarketName}</p>
      <p style="margin: 10px 0;">
        <span class="price-old">${data.oldPrice.toFixed(2)} лв.</span>
        →
        <span class="price-new">${data.newPrice.toFixed(2)} лв.</span>
      </p>
      <p style="color: #059669; font-weight: 600;">
        💰 Спестявате: ${savings.toFixed(2)} лв. (${Math.abs(data.percentageChange).toFixed(1)}%)
      </p>
      ${data.targetPrice ? `<p style="color: #7c3aed;">🎯 Вашата целева цена: ${data.targetPrice.toFixed(2)} лв.</p>` : ''}
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.productUrl}" class="button">Вижте продукта</a>
    </div>

    <p>Здравейте ${data.userName},</p>
    <p>Имаме отлични новини! Цената на продукта, който следите, току-що падна. Това е перфектният момент за покупка!</p>

    <div class="unsubscribe">
      <a href="${data.unsubscribeUrl}">Отписване от известия за цени</a>
    </div>
  `

  const text = `
Здравейте ${data.userName},

Отлична новина! Цената на ${data.productName} падна!

Супермаркет: ${data.supermarketName}
Стара цена: ${data.oldPrice.toFixed(2)} лв.
Нова цена: ${data.newPrice.toFixed(2)} лв.
Спестявате: ${savings.toFixed(2)} лв. (${Math.abs(data.percentageChange).toFixed(1)}%)

Вижте продукта: ${data.productUrl}

За отписване: ${data.unsubscribeUrl}
  `

  return {
    html: getBaseTemplate(content, 'Цената падна!'),
    text
  }
}

// Price increase alert template
export const getPriceIncreaseTemplate = (data: PriceAlertData): { html: string; text: string } => {
  const increase = data.newPrice - data.oldPrice
  const content = `
    <h2>📈 Цената се повиши</h2>
    
    <div class="product-info">
      ${data.productImage ? `<img src="${data.productImage}" alt="${data.productName}" class="product-image">` : ''}
      <div>
        <h3 style="margin: 0; color: #1f2937;">${data.productName}</h3>
        ${data.productBrand ? `<p style="margin: 5px 0; color: #6b7280;">${data.productBrand}</p>` : ''}
      </div>
    </div>

    <div class="price-card">
      <p><strong>Супермаркет:</strong> ${data.supermarketName}</p>
      <p style="margin: 10px 0;">
        <span class="price-old">${data.oldPrice.toFixed(2)} лв.</span>
        →
        <span class="price-new price-increase">${data.newPrice.toFixed(2)} лв.</span>
      </p>
      <p style="color: #dc2626; font-weight: 600;">
        📊 Увеличение: +${increase.toFixed(2)} лв. (+${data.percentageChange.toFixed(1)}%)
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.productUrl}" class="button">Вижте продукта</a>
    </div>

    <p>Здравейте ${data.userName},</p>
    <p>Искаме да ви уведомим, че цената на продукта, който следите, се повиши. Може да искате да проверите други супермаркети за по-добри цени.</p>

    <div class="unsubscribe">
      <a href="${data.unsubscribeUrl}">Отписване от известия за цени</a>
    </div>
  `

  const text = `
Здравейте ${data.userName},

Цената на ${data.productName} се повиши.

Супермаркет: ${data.supermarketName}
Стара цена: ${data.oldPrice.toFixed(2)} лв.
Нова цена: ${data.newPrice.toFixed(2)} лв.
Увеличение: +${increase.toFixed(2)} лв. (+${data.percentageChange.toFixed(1)}%)

Вижте продукта: ${data.productUrl}

За отписване: ${data.unsubscribeUrl}
  `

  return {
    html: getBaseTemplate(content, 'Цената се повиши'),
    text
  }
}

// Target price reached template
export const getTargetPriceReachedTemplate = (data: PriceAlertData): { html: string; text: string } => {
  const content = `
    <h2>🎯 Целевата цена е достигната!</h2>
    
    <div class="product-info">
      ${data.productImage ? `<img src="${data.productImage}" alt="${data.productName}" class="product-image">` : ''}
      <div>
        <h3 style="margin: 0; color: #1f2937;">${data.productName}</h3>
        ${data.productBrand ? `<p style="margin: 5px 0; color: #6b7280;">${data.productBrand}</p>` : ''}
      </div>
    </div>

    <div class="price-card">
      <p><strong>Супермаркет:</strong> ${data.supermarketName}</p>
      <p style="margin: 10px 0;">
        <span class="price-new">${data.newPrice.toFixed(2)} лв.</span>
      </p>
      <p style="color: #7c3aed; font-weight: 600;">
        🎯 Вашата целева цена: ${data.targetPrice?.toFixed(2)} лв.
      </p>
      <p style="color: #059669;">
        ✅ Цената е ${data.newPrice <= (data.targetPrice || 0) ? 'на или под' : 'близо до'} вашата цел!
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.productUrl}" class="button">Купете сега</a>
    </div>

    <p>Здравейте ${data.userName},</p>
    <p>Отлични новини! Продуктът, който следите, достигна вашата целева цена. Време е за покупка!</p>

    <div class="unsubscribe">
      <a href="${data.unsubscribeUrl}">Отписване от известия за цени</a>
    </div>
  `

  const text = `
Здравейте ${data.userName},

Целевата цена е достигната за ${data.productName}!

Супермаркет: ${data.supermarketName}
Текуща цена: ${data.newPrice.toFixed(2)} лв.
Вашата целева цена: ${data.targetPrice?.toFixed(2)} лв.

Купете сега: ${data.productUrl}

За отписване: ${data.unsubscribeUrl}
  `

  return {
    html: getBaseTemplate(content, 'Целевата цена е достигната!'),
    text
  }
}

// Welcome email template
export const getWelcomeEmailTemplate = (data: WelcomeEmailData): { html: string; text: string } => {
  const content = `
    <h2>🎉 Добре дошли в PriceTrack!</h2>
    
    <p>Здравейте ${data.userName},</p>
    
    <p>Благодарим ви, че се присъединихте към PriceTrack България! Вие сте на една стъпка от това да започнете да пестите пари при пазаруването.</p>
    
    <h3>Какво можете да правите:</h3>
    <ul>
      <li>🔍 <strong>Търсете продукти</strong> - Намерете най-добрите цени в различни супермаркети</li>
      <li>📊 <strong>Следете цени</strong> - Получавайте известия при промяна на цените</li>
      <li>🎯 <strong>Задавайте целеви цени</strong> - Бъдете уведомени когато цената падне до желаната от вас</li>
      <li>❤️ <strong>Запазвайте любими</strong> - Създайте списък с любимите си продукти</li>
      <li>💬 <strong>Участвайте в дискусии</strong> - Споделяйте мнения и съвети с общността</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.dashboardUrl}" class="button">Започнете сега</a>
    </div>

    <p>Ако имате въпроси, не се колебайте да се свържете с нас на <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>.</p>
    
    <p>Желаем ви успешно пазаруване и много спестени пари!</p>
  `

  const text = `
Здравейте ${data.userName},

Добре дошли в PriceTrack България!

Благодарим ви, че се присъединихте към нас. Сега можете да:
- Търсите продукти и сравнявате цени
- Следите цени и получавате известия
- Задавате целеви цени
- Запазвате любими продукти
- Участвате в дискусии

Започнете: ${data.dashboardUrl}

За въпроси: ${data.supportEmail}
  `

  return {
    html: getBaseTemplate(content, 'Добре дошли в PriceTrack!'),
    text
  }
}

// Admin notification template
export const getAdminNotificationTemplate = (data: AdminNotificationData): { html: string; text: string } => {
  const content = `
    <h2>🔔 Административно известие</h2>
    
    <p>Здравейте ${data.adminName},</p>
    
    <div class="price-card">
      <p><strong>Тип:</strong> ${data.notificationType}</p>
      <p><strong>Време:</strong> ${data.timestamp}</p>
      <p><strong>Детайли:</strong></p>
      <p>${data.details}</p>
    </div>

    ${data.actionUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.actionUrl}" class="button">Прегледайте</a>
    </div>
    ` : ''}

    <p>Това е автоматично известие от системата PriceTrack.</p>
  `

  const text = `
Административно известие - PriceTrack

Здравейте ${data.adminName},

Тип: ${data.notificationType}
Време: ${data.timestamp}
Детайли: ${data.details}

${data.actionUrl ? `Прегледайте: ${data.actionUrl}` : ''}
  `

  return {
    html: getBaseTemplate(content, 'Административно известие'),
    text
  }
}

// Contact message template
export function getContactMessageTemplate(data: ContactMessageData) {
  const content = `
    <div class="header">
      <h1>Ново съобщение от контактната форма</h1>
    </div>

    <div class="content">
      <div class="info-section">
        <h2>Информация за подателя</h2>
        <p><strong>Име:</strong> ${data.senderName}</p>
        <p><strong>Имейл:</strong> ${data.senderEmail}</p>
        <p><strong>Време:</strong> ${data.timestamp}</p>
      </div>

      <div class="message-section">
        <h2>Тема: ${data.subject}</h2>
        <div class="message-content">
          ${data.message.replace(/\n/g, '<br>')}
        </div>
      </div>

      <div class="action-section">
        <p><strong>За отговор:</strong> Отговорете директно на този имейл или използвайте адреса: ${data.senderEmail}</p>
      </div>
    </div>

    <div class="footer">
      <p>Това съобщение е изпратено автоматично от контактната форма на PriceTrack България.</p>
    </div>
  `

  const text = `
Ново съобщение от контактната форма

Информация за подателя:
Име: ${data.senderName}
Имейл: ${data.senderEmail}
Време: ${data.timestamp}

Тема: ${data.subject}

Съобщение:
${data.message}

За отговор: ${data.senderEmail}

---
Това съобщение е изпратено автоматично от контактната форма на PriceTrack България.
  `

  return {
    html: getBaseTemplate(content, `Контактна форма: ${data.subject}`),
    text
  }
}

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const baseUrl = `${url.protocol}//${url.host}`

  const manifest = {
    "name": "PriceTrack BG - Проследяване на цени",
    "short_name": "PriceTrack BG",
    "description": "Проследяване на цени на продукти в български супермаркети",
    "start_url": "/bg",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#2563eb",
    "orientation": "portrait-primary",
    "scope": "/",
    "lang": "bg",
    "categories": ["shopping", "lifestyle", "productivity"],
    "icons": [
      {
        "src": `${baseUrl}/next.svg`,
        "sizes": "any",
        "type": "image/svg+xml"
      }
    ],
    "shortcuts": [
      {
        "name": "Продукти",
        "short_name": "Продукти",
        "description": "Преглед на всички продукти",
        "url": "/bg/products",
        "icons": [
          {
            "src": `${baseUrl}/next.svg`,
            "sizes": "any"
          }
        ]
      },
      {
        "name": "Супермаркети",
        "short_name": "Супермаркети",
        "description": "Преглед на супермаркети",
        "url": "/bg/supermarkets",
        "icons": [
          {
            "src": `${baseUrl}/next.svg`,
            "sizes": "any"
          }
        ]
      },
      {
        "name": "Дискусии",
        "short_name": "Дискусии",
        "description": "Участие в дискусии",
        "url": "/bg/discussions",
        "icons": [
          {
            "src": `${baseUrl}/next.svg`,
            "sizes": "any"
          }
        ]
      }
    ],

    "prefer_related_applications": false,
    "related_applications": [],
    "edge_side_panel": {
      "preferred_width": 400
    },
    "launch_handler": {
      "client_mode": "navigate-existing"
    }
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  })
}

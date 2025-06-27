
import { NextResponse } from 'next/server'

export async function GET() {
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
        "src": "/favicon.svg",
        "sizes": "any",
        "type": "image/svg+xml",
        "purpose": "any"
      },
      {
        "src": "/android-chrome-192x192.svg",
        "sizes": "192x192",
        "type": "image/svg+xml",
        "purpose": "maskable any"
      },
      {
        "src": "/android-chrome-512x512.svg",
        "sizes": "512x512",
        "type": "image/svg+xml",
        "purpose": "maskable any"
      },
      {
        "src": "/apple-touch-icon.svg",
        "sizes": "180x180",
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
            "src": "/favicon.svg",
            "sizes": "any",
            "type": "image/svg+xml"
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
            "src": "/favicon.svg",
            "sizes": "any",
            "type": "image/svg+xml"
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

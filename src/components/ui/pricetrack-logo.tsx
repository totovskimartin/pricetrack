import React from 'react'

interface PriceTrackLogoProps {
  className?: string
  size?: number
}

export function PriceTrackLogo({ className = "", size = 32 }: PriceTrackLogoProps) {
  const scale = size / 32
  const strokeWidth = Math.max(1, 2.5 * scale)
  const dotRadius = Math.max(0.5, 1.5 * scale)

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={`0 0 ${size} ${size}`} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={`bg-gradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:'#3b82f6', stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:'#6366f1', stopOpacity:1}} />
        </linearGradient>
      </defs>
      
      {/* Background rounded rectangle */}
      <rect 
        width={size} 
        height={size} 
        rx={Math.round(5 * scale)} 
        ry={Math.round(5 * scale)} 
        fill={`url(#bg-gradient-${size})`}
      />
      
      {/* Price chart line */}
      <path 
        d={`M${Math.round(6 * scale)} ${Math.round(22 * scale)} Q${Math.round(10 * scale)} ${Math.round(18 * scale)} ${Math.round(12 * scale)} ${Math.round(20 * scale)} Q${Math.round(16 * scale)} ${Math.round(16 * scale)} ${Math.round(20 * scale)} ${Math.round(14 * scale)} Q${Math.round(24 * scale)} ${Math.round(10 * scale)} ${Math.round(26 * scale)} ${Math.round(12 * scale)}`}
        stroke="white" 
        strokeWidth={strokeWidth} 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none"
      />
      
      {/* Data points */}
      <circle cx={Math.round(6 * scale)} cy={Math.round(22 * scale)} r={dotRadius} fill="white"/>
      <circle cx={Math.round(12 * scale)} cy={Math.round(20 * scale)} r={dotRadius} fill="white"/>
      <circle cx={Math.round(20 * scale)} cy={Math.round(14 * scale)} r={dotRadius} fill="white"/>
      <circle cx={Math.round(26 * scale)} cy={Math.round(12 * scale)} r={dotRadius} fill="white"/>
      
      {/* Upward arrow (for larger sizes) */}
      {size >= 32 && (
        <path 
          d={`M${Math.round(22 * scale)} ${Math.round(8 * scale)} L${Math.round(26 * scale)} ${Math.round(8 * scale)} L${Math.round(24 * scale)} ${Math.round(5 * scale)} Z`} 
          fill="white"
        />
      )}
    </svg>
  )
}

// Preset size variants for common use cases
export function PriceTrackLogoSmall({ className }: { className?: string }) {
  return <PriceTrackLogo size={24} className={className} />
}

export function PriceTrackLogoMedium({ className }: { className?: string }) {
  return <PriceTrackLogo size={32} className={className} />
}

export function PriceTrackLogoLarge({ className }: { className?: string }) {
  return <PriceTrackLogo size={48} className={className} />
}

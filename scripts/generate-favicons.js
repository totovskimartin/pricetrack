const fs = require('fs');
const path = require('path');

// Create a simple PNG generator using ASCII art approach
// This creates the favicon data as base64 encoded PNG

const createFaviconData = (size) => {
  // Create a simple canvas-like structure
  const canvas = Array(size).fill().map(() => Array(size).fill([255, 255, 255, 0])); // RGBA
  
  // Helper function to set pixel
  const setPixel = (x, y, color) => {
    if (x >= 0 && x < size && y >= 0 && y < size) {
      canvas[y][x] = color;
    }
  };
  
  // Helper function to draw line
  const drawLine = (x1, y1, x2, y2, color) => {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    
    let x = x1, y = y1;
    
    while (true) {
      setPixel(x, y, color);
      
      if (x === x2 && y === y2) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  };
  
  // Helper function to draw filled circle
  const drawCircle = (cx, cy, radius, color) => {
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        if (x * x + y * y <= radius * radius) {
          setPixel(cx + x, cy + y, color);
        }
      }
    }
  };
  
  // Colors
  const blue = [59, 130, 246, 255];      // #3b82f6
  const indigo = [99, 102, 241, 255];    // #6366f1
  const white = [255, 255, 255, 255];
  
  // Fill background with gradient (simplified to solid blue)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Simple gradient from blue to indigo
      const ratio = (x + y) / (size * 2);
      const r = Math.round(blue[0] + (indigo[0] - blue[0]) * ratio);
      const g = Math.round(blue[1] + (indigo[1] - blue[1]) * ratio);
      const b = Math.round(blue[2] + (indigo[2] - blue[2]) * ratio);
      setPixel(x, y, [r, g, b, 255]);
    }
  }
  
  // Draw price chart line (simplified)
  const scale = size / 32;
  const padding = Math.max(2, Math.round(size * 0.2));
  const chartHeight = Math.round(size * 0.4);
  const startY = Math.round(size * 0.7);
  
  // Chart points
  const points = [
    { x: padding, y: startY },
    { x: Math.round(padding + (size - padding * 2) * 0.25), y: Math.round(startY - chartHeight * 0.3) },
    { x: Math.round(padding + (size - padding * 2) * 0.5), y: Math.round(startY - chartHeight * 0.1) },
    { x: Math.round(padding + (size - padding * 2) * 0.75), y: Math.round(startY - chartHeight * 0.8) },
    { x: size - padding, y: Math.round(startY - chartHeight * 0.6) }
  ];
  
  // Draw lines between points
  for (let i = 0; i < points.length - 1; i++) {
    drawLine(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, white);
  }
  
  // Draw dots at points
  const dotRadius = Math.max(1, Math.round(size * 0.04));
  points.forEach(point => {
    drawCircle(point.x, point.y, dotRadius, white);
  });
  
  // Draw arrow (for larger sizes)
  if (size >= 32) {
    const arrowSize = Math.round(size * 0.15);
    const arrowX = size - padding - arrowSize;
    const arrowY = padding + arrowSize;
    
    // Simple arrow triangle
    drawLine(arrowX, arrowY, arrowX + arrowSize, arrowY, white);
    drawLine(arrowX + arrowSize, arrowY, arrowX + Math.round(arrowSize * 0.5), arrowY - arrowSize, white);
    drawLine(arrowX + Math.round(arrowSize * 0.5), arrowY - arrowSize, arrowX, arrowY, white);
  }
  
  return canvas;
};

// Convert canvas to PNG-like data structure
const canvasToPNG = (canvas) => {
  const size = canvas.length;
  
  // Create a simple BMP-like structure and convert to base64
  // This is a simplified approach - in a real scenario you'd use a proper PNG encoder
  
  let imageData = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = canvas[y][x];
      imageData += String.fromCharCode(r, g, b, a);
    }
  }
  
  return Buffer.from(imageData, 'binary').toString('base64');
};

// Generate SVG favicon (this will work better)
const generateSVGFavicon = () => {
  return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background rounded rectangle -->
  <rect width="32" height="32" rx="5" ry="5" fill="url(#bg-gradient)"/>
  
  <!-- Price chart line -->
  <path d="M6 22 Q10 18 12 20 Q16 16 20 14 Q24 10 26 12" 
        stroke="white" 
        stroke-width="2.5" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        fill="none"/>
  
  <!-- Data points -->
  <circle cx="6" cy="22" r="1.5" fill="white"/>
  <circle cx="12" cy="20" r="1.5" fill="white"/>
  <circle cx="20" cy="14" r="1.5" fill="white"/>
  <circle cx="26" cy="12" r="1.5" fill="white"/>
  
  <!-- Upward arrow -->
  <path d="M22 8 L26 8 L24 5 Z" fill="white"/>
</svg>`;
};

// Generate different sized SVG favicons
const generateSVGFaviconSize = (size) => {
  const scale = size / 32;
  const strokeWidth = Math.max(1, 2.5 * scale);
  const dotRadius = Math.max(0.5, 1.5 * scale);
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-gradient-${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background rounded rectangle -->
  <rect width="${size}" height="${size}" rx="${Math.round(5 * scale)}" ry="${Math.round(5 * scale)}" fill="url(#bg-gradient-${size})"/>
  
  <!-- Price chart line -->
  <path d="M${Math.round(6 * scale)} ${Math.round(22 * scale)} Q${Math.round(10 * scale)} ${Math.round(18 * scale)} ${Math.round(12 * scale)} ${Math.round(20 * scale)} Q${Math.round(16 * scale)} ${Math.round(16 * scale)} ${Math.round(20 * scale)} ${Math.round(14 * scale)} Q${Math.round(24 * scale)} ${Math.round(10 * scale)} ${Math.round(26 * scale)} ${Math.round(12 * scale)}" 
        stroke="white" 
        stroke-width="${strokeWidth}" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        fill="none"/>
  
  <!-- Data points -->
  <circle cx="${Math.round(6 * scale)}" cy="${Math.round(22 * scale)}" r="${dotRadius}" fill="white"/>
  <circle cx="${Math.round(12 * scale)}" cy="${Math.round(20 * scale)}" r="${dotRadius}" fill="white"/>
  <circle cx="${Math.round(20 * scale)}" cy="${Math.round(14 * scale)}" r="${dotRadius}" fill="white"/>
  <circle cx="${Math.round(26 * scale)}" cy="${Math.round(12 * scale)}" r="${dotRadius}" fill="white"/>
  
  ${size >= 32 ? `<!-- Upward arrow -->
  <path d="M${Math.round(22 * scale)} ${Math.round(8 * scale)} L${Math.round(26 * scale)} ${Math.round(8 * scale)} L${Math.round(24 * scale)} ${Math.round(5 * scale)} Z" fill="white"/>` : ''}
</svg>`;
};

// Main function to generate all favicons
const generateFavicons = () => {
  const publicDir = path.join(__dirname, '..', 'public');
  
  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  console.log('🎨 Generating favicons...');
  
  // Generate SVG favicons (these will work best)
  const sizes = [16, 32, 48, 180, 192, 512];
  
  sizes.forEach(size => {
    const svg = generateSVGFaviconSize(size);
    let filename;
    
    switch(size) {
      case 16:
        filename = 'favicon-16x16.svg';
        break;
      case 32:
        filename = 'favicon-32x32.svg';
        break;
      case 48:
        filename = 'favicon-48x48.svg';
        break;
      case 180:
        filename = 'apple-touch-icon.svg';
        break;
      case 192:
        filename = 'android-chrome-192x192.svg';
        break;
      case 512:
        filename = 'android-chrome-512x512.svg';
        break;
    }
    
    fs.writeFileSync(path.join(publicDir, filename), svg);
    console.log(`✅ Generated ${filename}`);
  });
  
  // Generate the main favicon.svg
  const mainSVG = generateSVGFavicon();
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), mainSVG);
  console.log('✅ Generated favicon.svg');
  
  console.log('\n🎉 All favicons generated successfully!');
  console.log('\n📝 Note: SVG favicons are generated. For PNG versions, you can:');
  console.log('1. Use an online SVG to PNG converter');
  console.log('2. Or use the SVG files directly (modern browsers support them)');
  console.log('\n📁 Files created in public/ directory:');
  console.log('- favicon.svg (main favicon)');
  console.log('- favicon-16x16.svg');
  console.log('- favicon-32x32.svg'); 
  console.log('- favicon-48x48.svg');
  console.log('- apple-touch-icon.svg');
  console.log('- android-chrome-192x192.svg');
  console.log('- android-chrome-512x512.svg');
};

// Run the generator
generateFavicons();

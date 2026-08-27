import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Dark Rounded Container -->
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)"/>
  
  <!-- Golden Border Accent -->
  <rect x="20" y="20" width="472" height="472" rx="108" fill="none" stroke="#f59e0b" stroke-width="10" stroke-opacity="0.4"/>

  <!-- Main Amber Glowing Circle -->
  <circle cx="256" cy="220" r="130" fill="url(#amberGrad)" filter="url(#glow)"/>

  <!-- Bold Styled "B" Logo -->
  <text x="256" y="278" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-weight="900" font-size="165" fill="#0f172a" text-anchor="middle">B</text>

  <!-- Cocktail/Glass Badge Overlay at Bottom -->
  <g transform="translate(256, 385)">
    <!-- Glass Shape -->
    <path d="M-60,-50 L60,-50 L0,20 Z" fill="#f59e0b" stroke="#0f172a" stroke-width="8" stroke-linejoin="round"/>
    <!-- Stem and Base -->
    <line x1="0" y1="20" x2="0" y2="55" stroke="#f59e0b" stroke-width="12" stroke-linecap="round"/>
    <line x1="-35" y1="55" x2="35" y2="55" stroke="#f59e0b" stroke-width="12" stroke-linecap="round"/>
  </g>
</svg>`;

async function generate() {
  const publicIconsDir = path.join(process.cwd(), 'public', 'icons');
  const publicDir = path.join(process.cwd(), 'public');

  if (!fs.existsSync(publicIconsDir)) {
    fs.mkdirSync(publicIconsDir, { recursive: true });
  }

  // Save SVG
  fs.writeFileSync(path.join(publicIconsDir, 'icon.svg'), svgContent);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);

  const svgBuffer = Buffer.from(svgContent);

  // Generate 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicIconsDir, 'icon-192.png'));

  // Generate 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicIconsDir, 'icon-512.png'));

  // Generate Apple Touch Icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Generate favicon 64x64 PNG
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('✅ PWA Launch icons generated successfully!');
}

generate().catch(console.error);

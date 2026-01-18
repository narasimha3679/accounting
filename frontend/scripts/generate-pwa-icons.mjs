import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');
const iconSvgPath = join(publicDir, 'icon.svg');

async function generateIcons() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Read the SVG file
  const svgContent = readFileSync(iconSvgPath, 'utf-8');
  
  // Create HTML with the SVG
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 0; }
        svg { display: block; }
      </style>
    </head>
    <body>
      ${svgContent}
    </body>
    </html>
  `;
  
  await page.setContent(html);
  
  // Generate 192x192 icon
  await page.setViewportSize({ width: 192, height: 192 });
  await page.locator('svg').screenshot({ 
    type: 'png',
    path: join(publicDir, 'icon-192x192.png')
  });
  
  // Generate 512x512 icon
  await page.setViewportSize({ width: 512, height: 512 });
  await page.locator('svg').screenshot({ 
    type: 'png',
    path: join(publicDir, 'icon-512x512.png')
  });
  
  await browser.close();
  console.log('PWA icons generated successfully!');
  console.log('- icon-192x192.png');
  console.log('- icon-512x512.png');
}

generateIcons().catch(console.error);

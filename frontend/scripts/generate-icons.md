# Generating PWA Icons

The PWA requires PNG icons in the following sizes:
- 192x192px (`icon-192x192.png`)
- 512x512px (`icon-512x512.png`)

## Option 1: Using Online Tools
1. Use an online SVG to PNG converter (e.g., https://convertio.co/svg-png/)
2. Upload `public/icon.svg`
3. Generate 192x192 and 512x512 versions
4. Save them as `public/icon-192x192.png` and `public/icon-512x512.png`

## Option 2: Using ImageMagick (if installed)
```bash
magick convert public/icon.svg -resize 192x192 public/icon-192x192.png
magick convert public/icon.svg -resize 512x512 public/icon-512x512.png
```

## Option 3: Using Inkscape (if installed)
```bash
inkscape public/icon.svg --export-width=192 --export-filename=public/icon-192x192.png
inkscape public/icon.svg --export-width=512 --export-filename=public/icon-512x512.png
```

## Option 4: Manual Creation
Use any image editor to:
1. Open `public/icon.svg`
2. Export as PNG at 192x192 and 512x512 sizes
3. Save to `public/` directory

Once the PNG files are created, the PWA will work correctly.

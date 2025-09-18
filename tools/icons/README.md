# Dev Support Extension Icons

Professional Chrome extension icons for the Dev Support extension, designed with a modern developer tools theme.

## Design Overview

- **Theme**: Blue-to-purple gradient matching the extension UI (`#667eea` → `#764ba2`)
- **Style**: Modern, clean developer tools aesthetic
- **Elements**: Code brackets, terminal/console, gear icons representing productivity tools
- **Format**: SVG source files with PNG conversion support

## Icon Sizes

| Size | Usage | File |
|------|-------|------|
| 16x16 | Small extension icon | `icon-16.svg/png` |
| 19x19 | Toolbar icon | `icon-19.png` |
| 24x24 | Menu icon | `icon-24.png` |
| 32x32 | Medium extension icon | `icon-32.svg/png` |
| 38x38 | Toolbar icon @2x | `icon-38.png` |
| 48x48 | Large extension icon | `icon-48.svg/png` |
| 64x64 | Store listing | `icon-64.png` |
| 128x128 | Chrome Web Store | `icon-128.svg/png` |

## Converting to PNG

### Automatic Conversion
Run the provided script to convert all SVG files to PNG:
```bash
./convert-to-png.sh
```

### Manual Conversion
If you prefer manual conversion or need custom sizes:

#### Using librsvg (recommended):
```bash
brew install librsvg
rsvg-convert -w 48 -h 48 icon-48.svg > icon-48.png
```

#### Using Inkscape:
```bash
brew install --cask inkscape
inkscape --export-type=png --export-filename=icon-48.png --export-width=48 --export-height=48 icon-48.svg
```

#### Using ImageMagick:
```bash
brew install imagemagick
convert -background transparent -density 300 icon-48.svg -resize 48x48 icon-48.png
```

## Manifest.json Integration

Add these icons to your `manifest.json`:

```json
{
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png", 
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "action": {
    "default_icon": {
      "19": "icons/icon-19.png",
      "38": "icons/icon-38.png"
    }
  }
}
```

## Design Elements

### 16x16 Icon
- Simple code brackets with center dot
- Minimal design for small size visibility
- Circular background with gradient

### 32x32 Icon
- Code brackets with gear/cog symbol
- Rounded square background
- Tool indicator at bottom

### 48x48 Icon
- Terminal/console window in center
- Code brackets on sides
- Productivity indicators
- Drop shadow for depth

### 128x128 Icon (Main Store Icon)
- Detailed terminal interface
- Large code brackets
- Gear settings icon
- Multiple productivity elements
- Inner glow and shadows for premium look

## Color Scheme

- **Primary Gradient**: `#667eea` (blue) → `#764ba2` (purple)
- **Text/Icons**: White with varying opacity (0.6-0.95)
- **Accents**: White with subtle transparency
- **Shadows**: Black with low opacity for depth

## Customization

To modify the icons:
1. Edit the SVG files with any vector graphics editor
2. Maintain the gradient colors for brand consistency
3. Keep the developer tools theme elements
4. Re-run the conversion script to generate new PNGs

The SVG files use inline gradients and are self-contained, making them easy to edit and maintain.
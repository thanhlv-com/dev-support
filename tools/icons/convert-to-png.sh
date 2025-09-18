#!/bin/bash

# Dev Support Extension - Icon Conversion Script
# Converts SVG icons to PNG format for Chrome extension

# Colors used: #667eea (blue) to #764ba2 (purple) gradient
# Icon design: Developer tools theme with code brackets, terminal, and productivity elements

echo "🎨 Converting Dev Support Extension SVG icons to PNG..."

# Check if required tools are available
if ! command -v rsvg-convert &> /dev/null && ! command -v inkscape &> /dev/null && ! command -v convert &> /dev/null; then
    echo "❌ Error: No suitable SVG to PNG converter found."
    echo ""
    echo "Please install one of the following:"
    echo "  • librsvg (rsvg-convert): brew install librsvg"
    echo "  • Inkscape: brew install --cask inkscape"
    echo "  • ImageMagick: brew install imagemagick"
    echo ""
    exit 1
fi

# Function to convert SVG to PNG
convert_svg_to_png() {
    local svg_file="$1"
    local png_file="$2"
    local size="$3"
    
    echo "Converting $svg_file → $png_file (${size}x${size})"
    
    if command -v rsvg-convert &> /dev/null; then
        # Using librsvg (recommended - best quality)
        rsvg-convert -w "$size" -h "$size" "$svg_file" > "$png_file"
    elif command -v inkscape &> /dev/null; then
        # Using Inkscape
        inkscape --export-type=png --export-filename="$png_file" --export-width="$size" --export-height="$size" "$svg_file" &> /dev/null
    elif command -v convert &> /dev/null; then
        # Using ImageMagick
        convert -background transparent -density 300 "$svg_file" -resize "${size}x${size}" "$png_file"
    fi
}

# Convert each icon size
convert_svg_to_png "../../public/icons/icon-16.svg" "../../public/icons/icon-16.png" 16
convert_svg_to_png "../../public/icons/icon-32.svg" "../../public/icons/icon-32.png" 32
convert_svg_to_png "../../public/icons/icon-48.svg" "../../public/icons/icon-48.png" 48
convert_svg_to_png "../../public/icons/icon-128.svg" "../../public/icons/icon-128.png" 128

# Create additional standard sizes that might be needed
echo ""
echo "Creating additional standard sizes from base SVGs..."
convert_svg_to_png "../../public/icons/icon-16.svg" "../../public/icons/icon-19.png" 19   # Toolbar icon
convert_svg_to_png "../../public/icons/icon-32.svg" "../../public/icons/icon-38.png" 38   # Toolbar icon @2x
convert_svg_to_png "../../public/icons/icon-16.svg" "../../public/icons/icon-24.png" 24   # Menu icon
convert_svg_to_png "../../public/icons/icon-32.svg" "../../public/icons/icon-64.png" 64   # Store listing

echo ""
echo "✅ Icon conversion completed!"
echo ""
echo "Generated files:"
echo "  • icon-16.png  (16x16)   - Extension icon small"
echo "  • icon-19.png  (19x19)   - Toolbar icon"  
echo "  • icon-24.png  (24x24)   - Menu icon"
echo "  • icon-32.png  (32x32)   - Extension icon medium"
echo "  • icon-38.png  (38x38)   - Toolbar icon @2x"
echo "  • icon-48.png  (48x48)   - Extension icon large"
echo "  • icon-64.png  (64x64)   - Store listing"
echo "  • icon-128.png (128x128) - Chrome Web Store"
echo ""
echo "📝 Don't forget to update your manifest.json with the PNG references!"
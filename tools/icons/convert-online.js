#!/usr/bin/env node

/**
 * Dev Support Extension - Online SVG to PNG Converter
 * Uses online services to convert SVG files to PNG when local tools aren't available
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 Dev Support Extension - Icon Conversion Guide\n');

const icons = [
  { svg: 'icon-16.svg', png: 'icon-16.png', size: 16 },
  { svg: 'icon-32.svg', png: 'icon-32.png', size: 32 },
  { svg: 'icon-48.svg', png: 'icon-48.png', size: 48 },
  { svg: 'icon-128.svg', png: 'icon-128.png', size: 128 },
  // Additional sizes
  { svg: 'icon-16.svg', png: 'icon-19.png', size: 19 },
  { svg: 'icon-32.svg', png: 'icon-38.png', size: 38 },
  { svg: 'icon-16.svg', png: 'icon-24.png', size: 24 },
  { svg: 'icon-32.svg', png: 'icon-64.png', size: 64 }
];

// Check if SVG files exist
console.log('📁 Checking SVG files...');
let allFilesExist = true;
icons.forEach(icon => {
  if (fs.existsSync(icon.svg)) {
    console.log(`✅ ${icon.svg}`);
  } else {
    console.log(`❌ ${icon.svg} - File not found`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some SVG files are missing. Please ensure all SVG files are present.');
  process.exit(1);
}

console.log('\n🔄 Conversion Options:\n');

console.log('1. 💻 Install Local Tools (Recommended):');
console.log('   macOS: brew install librsvg');
console.log('   Ubuntu: sudo apt-get install librsvg2-bin');
console.log('   Windows: Download from https://wiki.gnome.org/Projects/LibRsvg\n');
console.log('   Then run: ./convert-to-png.sh\n');

console.log('2. 🌐 Online Conversion Services:');
console.log('   Visit these services and upload your SVG files:\n');

console.log('   • CloudConvert: https://cloudconvert.com/svg-to-png');
console.log('   • Online-Convert: https://www.online-convert.com/');
console.log('   • Convertio: https://convertio.co/svg-png/');
console.log('   • FreeConvert: https://www.freeconvert.com/svg-to-png\n');

console.log('3. 🖥️ Browser-Based Conversion:');
console.log('   • Open each SVG file in a web browser');
console.log('   • Right-click and "Save as" or take a screenshot');
console.log('   • Use browser developer tools to capture at exact dimensions\n');

console.log('4. 🎨 Design Tools:');
console.log('   • Figma: Import SVG, export as PNG');
console.log('   • GIMP: Open SVG, export as PNG');
console.log('   • Adobe Illustrator: Open SVG, export as PNG\n');

console.log('📋 Required Files to Generate:');
icons.forEach(icon => {
  console.log(`   • ${icon.png} (${icon.size}x${icon.size}) from ${icon.svg}`);
});

console.log('\n💡 Pro Tips:');
console.log('   • Maintain transparent backgrounds');
console.log('   • Use high DPI/resolution for crisp results');
console.log('   • Verify PNG files are properly sized');
console.log('   • Test icons in Chrome extension after conversion\n');

// Generate HTML preview file
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dev Support Extension - Icon Preview</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 40px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-size: 2.5em;
            margin: 0;
        }
        .icon-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .icon-item {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 2px solid #e0e0e0;
        }
        .icon-item img {
            max-width: 100%;
            height: auto;
            margin-bottom: 10px;
            background: repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px;
            padding: 10px;
            border-radius: 4px;
        }
        .icon-item h3 {
            margin: 10px 0 5px 0;
            color: #333;
        }
        .icon-item p {
            color: #666;
            font-size: 0.9em;
            margin: 0;
        }
        .instructions {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #2196f3;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Dev Support Extension Icons</h1>
            <p>Professional Chrome extension icons with developer tools theme</p>
        </div>
        
        <div class="icon-grid">
            ${icons.map(icon => `
            <div class="icon-item">
                <img src="${icon.svg}" alt="${icon.png}" width="${icon.size}" height="${icon.size}">
                <h3>${icon.size}x${icon.size}</h3>
                <p>${icon.png}</p>
            </div>
            `).join('')}
        </div>
        
        <div class="instructions">
            <h3>🔄 Conversion Instructions</h3>
            <p>To convert these SVG icons to PNG format:</p>
            <ol>
                <li>Right-click on each icon above and "Save Image As" to get the SVG</li>
                <li>Use an online converter like <a href="https://cloudconvert.com/svg-to-png" target="_blank">CloudConvert</a></li>
                <li>Set the output dimensions to match the required size</li>
                <li>Save with transparent background</li>
                <li>Place the PNG files in the icons/ directory</li>
            </ol>
        </div>
    </div>
</body>
</html>
`;

fs.writeFileSync('icon-preview.html', htmlContent);
console.log('✅ Generated icon-preview.html - Open this file in your browser to see and convert icons');
console.log('📂 File location: ' + path.resolve('icon-preview.html') + '\n');
#!/bin/bash

# Script para generar iconos PNG desde SVG
# Requiere ImageMagick o Inkscape

echo "Generando iconos para la extensión..."

# Verificar si existe convert (ImageMagick)
if command -v convert &> /dev/null; then
    echo "Usando ImageMagick..."
    convert -background none icons/icon128.svg -resize 16x16 icons/icon16.png
    convert -background none icons/icon128.svg -resize 32x32 icons/icon32.png
    convert -background none icons/icon128.svg -resize 48x48 icons/icon48.png
    convert -background none icons/icon128.svg -resize 128x128 icons/icon128.png
    echo "✓ Iconos generados exitosamente"
elif command -v inkscape &> /dev/null; then
    echo "Usando Inkscape..."
    inkscape icons/icon128.svg -o icons/icon16.png -w 16 -h 16
    inkscape icons/icon128.svg -o icons/icon32.png -w 32 -h 32
    inkscape icons/icon128.svg -o icons/icon48.png -w 48 -h 48
    inkscape icons/icon128.svg -o icons/icon128.png -w 128 -h 128
    echo "✓ Iconos generados exitosamente"
else
    echo "⚠ No se encontró ImageMagick ni Inkscape"
    echo "Para generar los iconos PNG, instala una de estas herramientas:"
    echo "  - ImageMagick: sudo apt install imagemagick"
    echo "  - Inkscape: sudo apt install inkscape"
    echo ""
    echo "O usa un conversor online: https://convertio.co/es/svg-png/"
    exit 1
fi

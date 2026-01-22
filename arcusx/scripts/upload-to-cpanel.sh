#!/bin/bash
# Script para subir archivos de dist/ al cPanel usando FTP/SFTP
# Uso: ./scripts/upload-to-cpanel.sh

echo "📦 Preparando archivos para subir al cPanel..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que dist/ existe
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Error: La carpeta dist/ no existe. Ejecuta 'npm run build' primero.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Carpeta dist/ encontrada${NC}"
echo ""
echo -e "${YELLOW}📋 Instrucciones para subir archivos:${NC}"
echo ""
echo "OPCIÓN 1: Usar FileZilla o cliente FTP/SFTP"
echo "  1. Conecta a tu servidor usando FTP/SFTP"
echo "  2. Navega a public_html/ (o la carpeta donde está tu sitio)"
echo "  3. Sube TODOS los archivos de dist/ (no comprimas)"
echo "  4. Asegúrate de mantener la estructura de carpetas (assets/, etc.)"
echo ""
echo "OPCIÓN 2: Usar rsync (si tienes acceso SSH)"
echo "  rsync -avz --progress dist/ usuario@servidor:/ruta/a/public_html/"
echo ""
echo "OPCIÓN 3: Usar el File Manager del cPanel"
echo "  1. Ve a File Manager en cPanel"
echo "  2. Navega a public_html/"
echo "  3. Sube los archivos UNO POR UNO o en grupos pequeños"
echo "  4. NO uses ZIP - sube los archivos directamente"
echo ""
echo -e "${GREEN}📁 Archivos listos en: $(pwd)/dist${NC}"
echo ""
echo "Archivos principales a subir:"
ls -lh dist/*.{html,js,css,json,txt,xml} 2>/dev/null | head -10
echo ""
echo "Total de archivos en dist/:"
find dist -type f | wc -l
echo ""

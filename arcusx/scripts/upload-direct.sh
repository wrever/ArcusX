#!/bin/bash
# SOLUCIÓN DEFINITIVA: Subir archivos directamente sin ZIP
# Este script sube archivos individuales evitando completamente el escaneo de ZIP

echo "🚀 SOLUCIÓN DEFINITIVA - Subida Directa (Sin ZIP)"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Error: Ejecuta 'npm run build' primero${NC}"
    exit 1
fi

echo -e "${BLUE}📋 MÉTODO 1: FileZilla (MÁS RÁPIDO)${NC}"
echo ""
echo "1. Abre FileZilla (descarga: https://filezilla-project.org/)"
echo "2. Conecta a tu servidor:"
echo "   - Host: ftp.tudominio.com (o IP del servidor)"
echo "   - Usuario: [tu usuario FTP]"
echo "   - Contraseña: [tu contraseña FTP]"
echo "   - Puerto: 21 (FTP) o 22 (SFTP)"
echo ""
echo "3. En FileZilla:"
echo "   - Panel izquierdo: Navega a $(pwd)/dist"
echo "   - Panel derecho: Navega a public_html/ (o tu carpeta web)"
echo "   - Selecciona TODOS los archivos de dist/ (incluyendo carpeta assets/)"
echo "   - Arrastra y suelta al panel derecho"
echo "   - ✅ Listo - Sin ZIP, sin problemas de antivirus"
echo ""

echo -e "${BLUE}📋 MÉTODO 2: cPanel File Manager (Manual)${NC}"
echo ""
echo "1. Ve a cPanel > File Manager"
echo "2. Navega a public_html/"
echo "3. Click en 'Upload'"
echo "4. IMPORTANTE: Sube archivos UNO POR UNO o en grupos de 5-10"
echo "   - NO uses 'Upload Files' con múltiples archivos grandes"
echo "   - Sube primero: index.html, manifest.json, robots.txt, sitemap.xml"
echo "   - Luego crea carpeta 'assets' y sube archivos de assets/ dentro"
echo "5. Mantén la estructura de carpetas exacta"
echo ""

echo -e "${BLUE}📋 MÉTODO 3: rsync (Si tienes SSH)${NC}"
echo ""
echo "rsync -avz --progress dist/ usuario@servidor:/ruta/a/public_html/"
echo ""

echo -e "${GREEN}✅ RECORDATORIO: NUNCA uses ZIP para subir estos archivos${NC}"
echo -e "${YELLOW}⚠️  El antivirus del cPanel escanea ZIPs y detecta falsos positivos${NC}"
echo -e "${GREEN}✅ Subir archivos directamente = Sin problemas${NC}"
echo ""

# Mostrar estructura de archivos
echo -e "${BLUE}📁 Estructura de archivos a subir:${NC}"
echo ""
tree -L 2 dist 2>/dev/null || find dist -type f | head -20
echo ""
echo -e "${GREEN}Total de archivos: $(find dist -type f | wc -l)${NC}"

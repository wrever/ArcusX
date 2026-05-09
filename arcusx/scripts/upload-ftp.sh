#!/bin/bash
# Script para subir archivos de dist/ al cPanel usando FTP
# Uso: ./scripts/upload-ftp.sh

echo "🚀 Script de subida automática por FTP"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar que dist/ existe
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Error: La carpeta dist/ no existe. Ejecuta 'npm run build' primero.${NC}"
    exit 1
fi

# Solicitar credenciales FTP
echo -e "${BLUE}📋 Configuración FTP:${NC}"
read -p "Servidor FTP (ej: ftp.tudominio.com): " FTP_HOST
read -p "Usuario FTP: " FTP_USER
read -s -p "Contraseña FTP: " FTP_PASS
echo ""
read -p "Ruta remota (ej: /public_html o /public_html/arcusx): " FTP_PATH

echo ""
echo -e "${YELLOW}⏳ Subiendo archivos...${NC}"

# Usar lftp si está disponible, sino usar curl
if command -v lftp &> /dev/null; then
    lftp -c "
    set ftp:ssl-allow no
    open -u $FTP_USER,$FTP_PASS $FTP_HOST
    cd $FTP_PATH
    mirror -R dist/ . --delete --verbose
    bye
    "
    echo -e "${GREEN}✅ Archivos subidos exitosamente con lftp${NC}"
elif command -v curl &> /dev/null; then
    echo -e "${YELLOW}Usando curl (subida básica)...${NC}"
    # Subir archivos principales
    for file in dist/*.{html,json,txt,xml}; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            curl -T "$file" "ftp://$FTP_HOST$FTP_PATH/$filename" --user "$FTP_USER:$FTP_PASS"
        fi
    done
    echo -e "${GREEN}✅ Archivos principales subidos${NC}"
    echo -e "${YELLOW}⚠️  Nota: Instala 'lftp' para subida completa con carpetas${NC}"
else
    echo -e "${RED}❌ Error: Necesitas instalar 'lftp' o 'curl' para usar este script${NC}"
    echo -e "${YELLOW}Instalar lftp: brew install lftp (macOS) o apt-get install lftp (Linux)${NC}"
    exit 1
fi

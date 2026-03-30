#!/bin/bash

# Script untuk generate self-signed SSL certificates untuk development
# Usage: ./scripts/generate-ssl-cert.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CERT_DIR="ssl/dev"
CERT_FILE="server.crt"
KEY_FILE="server.key"
CSR_FILE="server.csr"
CONFIG_FILE="ssl.conf"
DAYS=365
COUNTRY="ID"
STATE="Jakarta"
CITY="Jakarta"
ORG="TTU Development"
ORG_UNIT="IT Department"
COMMON_NAME="localhost"

echo -e "${BLUE}🔐 Generating SSL certificates for development...${NC}"

# Create SSL directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Create OpenSSL configuration file
cat > "$CERT_DIR/$CONFIG_FILE" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=$COUNTRY
ST=$STATE
L=$CITY
O=$ORG
OU=$ORG_UNIT
CN=$COMMON_NAME

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

echo -e "${YELLOW}📝 Created OpenSSL configuration file${NC}"

# Generate private key
echo -e "${YELLOW}🔑 Generating private key...${NC}"
openssl genrsa -out "$CERT_DIR/$KEY_FILE" 2048

# Generate certificate signing request
echo -e "${YELLOW}📋 Generating certificate signing request...${NC}"
openssl req -new -key "$CERT_DIR/$KEY_FILE" -out "$CERT_DIR/$CSR_FILE" -config "$CERT_DIR/$CONFIG_FILE"

# Generate self-signed certificate
echo -e "${YELLOW}📜 Generating self-signed certificate...${NC}"
openssl x509 -req -in "$CERT_DIR/$CSR_FILE" -signkey "$CERT_DIR/$KEY_FILE" -out "$CERT_DIR/$CERT_FILE" -days $DAYS -extensions v3_req -extfile "$CERT_DIR/$CONFIG_FILE"

# Set appropriate permissions
chmod 600 "$CERT_DIR/$KEY_FILE"
chmod 644 "$CERT_DIR/$CERT_FILE"

# Clean up CSR file
rm "$CERT_DIR/$CSR_FILE"

echo -e "${GREEN}✅ SSL certificates generated successfully!${NC}"
echo -e "${BLUE}📁 Certificate files:${NC}"
echo -e "   🔑 Private Key: $CERT_DIR/$KEY_FILE"
echo -e "   📜 Certificate: $CERT_DIR/$CERT_FILE"
echo -e "   ⚙️  Config File: $CERT_DIR/$CONFIG_FILE"

echo -e "${YELLOW}⚠️  Important Notes:${NC}"
echo -e "   • These are self-signed certificates for development only"
echo -e "   • Your browser will show security warnings - this is normal"
echo -e "   • For production, use certificates from a trusted CA"
echo -e "   • Certificate is valid for $DAYS days"

echo -e "${BLUE}🚀 To use HTTPS in development:${NC}"
echo -e "   1. Set ENABLE_HTTPS=true in your .env file"
echo -e "   2. Start your server with: npm run dev"
echo -e "   3. Visit: https://localhost:2443"

# Verify certificate
echo -e "${BLUE}🔍 Certificate Information:${NC}"
openssl x509 -in "$CERT_DIR/$CERT_FILE" -text -noout | grep -A 1 "Subject:"
openssl x509 -in "$CERT_DIR/$CERT_FILE" -text -noout | grep -A 3 "Subject Alternative Name:"
openssl x509 -in "$CERT_DIR/$CERT_FILE" -text -noout | grep "Not After"

echo -e "${GREEN}🎉 Setup complete!${NC}"

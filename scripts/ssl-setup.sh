#!/bin/bash
set -e

echo "🔒 JustDesk SSL Setup Script"
echo "==========================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Get domain
read -p "Enter your domain (e.g., justtech.work): " DOMAIN
read -p "Enter your email for SSL notifications: " EMAIL

# Validate domain
if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
    echo -e "${RED}Invalid domain format${NC}"
    exit 1
fi

echo -e "${YELLOW}Setting up SSL for $DOMAIN...${NC}"

# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Stop nginx if running
echo "Stopping nginx..."
systemctl stop nginx || true
docker-compose stop nginx || true

# Obtain certificate
echo "Obtaining SSL certificate..."
certbot certonly --standalone \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --expand

# Create SSL directory
mkdir -p /opt/justdesk/ssl

# Copy certificates
echo "Copying certificates..."
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /opt/justdesk/ssl/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /opt/justdesk/ssl/
chmod 600 /opt/justdesk/ssl/*.pem

# Update nginx configuration
echo "Updating nginx configuration..."
sed -i "s/justtech.work/$DOMAIN/g" /opt/justdesk/nginx/conf.d/default.conf

# Setup auto-renewal
echo "Setting up auto-renewal..."
cat > /etc/cron.d/certbot << EOL
0 0,12 * * * root certbot renew --quiet --post-hook "cd /opt/justdesk && docker-compose restart nginx"
EOL

# Restart services
echo "Restarting services..."
cd /opt/justdesk
docker-compose up -d

echo -e "${GREEN}✅ SSL setup completed successfully!${NC}"
echo -e "${GREEN}Your site is now available at: https://$DOMAIN${NC}"
echo ""
echo "Certificate will auto-renew before expiration."
echo "To test renewal: certbot renew --dry-run"
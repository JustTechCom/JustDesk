#!/bin/bash
set -e

echo "🚀 JustDesk Setup Script"
echo "========================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}This script should not be run as root${NC}"
   exit 1
fi

# Get domain name
read -p "Enter your domain name (e.g., justtech.work): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Domain name is required${NC}"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}Installing system dependencies...${NC}"
sudo apt update
sudo apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx git

# Clone repository
if [ ! -d "JustDesk" ]; then
    echo -e "${YELLOW}Cloning JustDesk repository...${NC}"
    git clone https://github.com/kadirertancam/JustDesk.git
fi

cd JustDesk

# Generate secure passwords
echo -e "${YELLOW}Generating secure passwords...${NC}"
REDIS_PASSWORD=$(openssl rand -hex 32)
TURN_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

# Create .env file
echo -e "${YELLOW}Creating environment configuration...${NC}"
cat > .env << EOL
# Application
NODE_ENV=production
APP_URL=https://${DOMAIN}

# Backend
PORT=3001
SESSION_SECRET=${SESSION_SECRET}

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# TURN Server
TURN_SECRET=${TURN_SECRET}
TURN_URL=turn:${DOMAIN}:3478
TURN_USERNAME=justdesk
TURN_PASSWORD=${TURN_SECRET}

# Frontend
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
NEXT_PUBLIC_WS_URL=wss://${DOMAIN}

# SSL
SSL_EMAIL=admin@${DOMAIN}
EOL

# Setup SSL certificates
echo -e "${YELLOW}Setting up SSL certificates...${NC}"
sudo certbot certonly --standalone -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m admin@${DOMAIN}

# Copy SSL certificates
sudo mkdir -p ssl
sudo cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem ssl/
sudo chown -R $USER:$USER ssl/

# Update Nginx configuration
echo -e "${YELLOW}Configuring Nginx...${NC}"
sudo cp nginx/conf.d/default.conf /etc/nginx/sites-available/justdesk
sudo sed -i "s/justtech.work/${DOMAIN}/g" /etc/nginx/sites-available/justdesk
sudo ln -sf /etc/nginx/sites-available/justdesk /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# Build and start services
echo -e "${YELLOW}Building and starting services...${NC}"
docker-compose build
docker-compose up -d

# Wait for services to start
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Check service health
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
fi

# Setup auto-renewal for SSL
echo -e "${YELLOW}Setting up SSL auto-renewal...${NC}"
(crontab -l 2>/dev/null; echo "0 0 * * * /usr/bin/certbot renew --quiet --post-hook 'docker-compose restart nginx'") | crontab -

echo -e "${GREEN}✅ JustDesk installation complete!${NC}"
echo -e "${GREEN}Access your installation at: https://${DOMAIN}${NC}"
echo ""
echo "Important information saved to .env file"
echo "To view logs: docker-compose logs -f"
echo "To stop services: docker-compose down"
echo "To update: git pull && docker-compose up -d --build"
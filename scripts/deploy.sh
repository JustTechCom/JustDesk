#!/bin/bash
set -e

echo "🚀 JustDesk Deployment Script"
echo "============================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
DEPLOY_USER="deploy"
DEPLOY_HOST=""
DEPLOY_PATH="/opt/justdesk"
REPOSITORY="https://github.com/yourusername/JustDesk.git"
BRANCH="main"

# Get deployment target
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please specify deployment target (staging|production)${NC}"
    exit 1
fi

TARGET=$1

# Set environment-specific variables
case $TARGET in
    staging)
        DEPLOY_HOST="staging.justtech.work"
        BRANCH="develop"
        ;;
    production)
        DEPLOY_HOST="justtech.work"
        BRANCH="main"
        ;;
    *)
        echo -e "${RED}Error: Invalid target. Use 'staging' or 'production'${NC}"
        exit 1
        ;;
esac

echo -e "${YELLOW}Deploying to $TARGET ($DEPLOY_HOST)...${NC}"

# SSH into server and deploy
ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
    set -e
    
    # Navigate to deployment directory
    cd $DEPLOY_PATH
    
    # Pull latest changes
    echo "Pulling latest changes from $BRANCH branch..."
    git fetch origin
    git checkout $BRANCH
    git pull origin $BRANCH
    
    # Install dependencies
    echo "Installing dependencies..."
    npm ci --production
    
    # Build application
    echo "Building application..."
    npm run build
    
    # Run database migrations (if any)
    # npm run migrate
    
    # Restart services
    echo "Restarting services..."
    docker-compose down
    docker-compose up -d --build
    
    # Wait for services to start
    sleep 10
    
    # Health check
    echo "Running health checks..."
    curl -f http://localhost:3000/api/health || exit 1
    curl -f http://localhost:3001/api/health || exit 1
    
    echo "✅ Deployment completed successfully!"
EOF

echo -e "${GREEN}✅ Deployment to $TARGET completed!${NC}"

# Send deployment notification (optional)
# curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
#     -H 'Content-type: application/json' \
#     -d "{\"text\":\"JustDesk deployed to $TARGET successfully!\"}"
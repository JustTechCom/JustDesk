#!/bin/bash
set -e

echo "🔄 JustDesk Backup Script"
echo "========================"

# Configuration
BACKUP_DIR="/backup/justdesk"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="justdesk_backup_$TIMESTAMP"
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD="${REDIS_PASSWORD}"
S3_BUCKET="justdesk-backups"
RETENTION_DAYS=30

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
cd "$BACKUP_DIR/$BACKUP_NAME"

echo -e "${YELLOW}Starting backup process...${NC}"

# 1. Backup Redis data
echo "Backing up Redis data..."
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD --rdb redis_backup.rdb

# 2. Backup application data
echo "Backing up application data..."
mkdir -p app_data
cp -r /opt/justdesk/.env app_data/
cp -r /opt/justdesk/logs app_data/
cp -r /opt/justdesk/ssl app_data/

# 3. Export Docker images (optional)
echo "Exporting Docker images..."
docker save justdesk_frontend:latest -o frontend_image.tar
docker save justdesk_backend:latest -o backend_image.tar

# 4. Create archive
echo "Creating backup archive..."
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"

# 5. Upload to S3 (if configured)
if command -v aws &> /dev/null; then
    echo "Uploading to S3..."
    aws s3 cp "$BACKUP_NAME.tar.gz" "s3://$S3_BUCKET/backups/"
fi

# 6. Cleanup old local backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "justdesk_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# 7. Remove temporary files
rm -rf "$BACKUP_DIR/$BACKUP_NAME"

echo -e "${GREEN}✅ Backup completed: $BACKUP_NAME.tar.gz${NC}"

# Send notification (optional)
# echo "Backup completed: $BACKUP_NAME" | mail -s "JustDesk Backup Success" admin@justtech.work
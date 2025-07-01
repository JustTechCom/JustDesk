# JustDesk Deployment Guide

## Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose installed
- Domain name with DNS configured
- SSL certificate (or use Let's Encrypt)
- Minimum 2GB RAM, 2 CPU cores

## Quick Deployment

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/JustDesk.git
cd JustDesk
```
2. Configure Environment
bashcp .env.example .env
nano .env
Update the following variables:

DOMAIN: Your domain name
REDIS_PASSWORD: Strong password for Redis
TURN_SECRET: Secret for TURN authentication
SSL_EMAIL: Email for Let's Encrypt

3. Run Setup Script
bashchmod +x scripts/setup.sh
./scripts/setup.sh
This script will:

Install dependencies
Configure SSL certificates
Set up Docker containers
Start all services

Manual Deployment
1. Install Dependencies
bashsudo apt update
sudo apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx
2. Configure SSL
bashsudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
3. Build and Start Services
bashdocker-compose build
docker-compose up -d
4. Configure Nginx
bashsudo cp nginx/conf.d/default.conf /etc/nginx/sites-available/justdesk
sudo ln -s /etc/nginx/sites-available/justdesk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
Production Considerations
Security

Enable firewall (UFW)
Configure fail2ban
Regular security updates
Monitor logs

Performance

Enable gzip compression
Configure CDN
Optimize Docker images
Monitor resource usage

Backup

Automated Redis backups
SSL certificate backups
Configuration backups
Test restore procedures

Monitoring

Set up health checks
Configure alerts
Log aggregation
Performance metrics

Environment Variables
VariableDescriptionExampleNODE_ENVEnvironment modeproductionDOMAINYour domainjustdesk.ioREDIS_PASSWORDRedis passwordstrong-passwordTURN_SECRETTURN server secretrandom-secretSSL_EMAILEmail for SSLadmin@justdesk.io
Troubleshooting
Connection Issues

Check firewall rules
Verify TURN server configuration
Check WebSocket connectivity
Review nginx logs

Performance Issues

Monitor CPU/Memory usage
Check Redis performance
Review WebRTC statistics
Optimize video quality settings

SSL Issues

Verify certificate installation
Check certificate expiration
Test auto-renewal
Review nginx SSL configuration

Scaling
Single Server

Suitable for up to 100 concurrent users
4GB RAM, 4 CPU cores recommended
SSD storage for better performance

Multi-Server Setup

Load balancer (HAProxy/Nginx)
Multiple backend servers
Redis cluster
Distributed TURN servers

Cloud Deployment
AWS
bash# Use provided CloudFormation template
aws cloudformation create-stack \
  --stack-name justdesk \
  --template-body file://aws-cf-template.yaml
Docker Swarm
bashdocker swarm init
docker stack deploy -c docker-compose.yml justdesk
Kubernetes
bashkubectl apply -f k8s/
Maintenance
Updates
bashcd /opt/justdesk
git pull
docker-compose down
docker-compose up -d --build
Logs
bash# View all logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend
Backup
bash./scripts/backup.sh
SSL Renewal
bashcertbot renew
docker-compose restart nginx

## docs/API.md
```markdown
# JustDesk API Documentation

## Overview

JustDesk uses WebSocket connections for real-time communication. This document describes the available events and their payloads.

## WebSocket Connection

### Connection URL
wss://justdesk.io/socket.io/

### Connection Example
```javascript
const socket = io('wss://justdesk.io', {
  transports: ['websocket']
});
Events
Client → Server Events
create-room
Creates a new room for screen sharing.
javascriptsocket.emit('create-room', (response) => {
  console.log(response);
  // { success: true, roomId: '123456789', password: 'ABC123' }
});
join-room
Join an existing room as a viewer.
javascriptsocket.emit('join-room', {
  roomId: '123456789',
  password: 'ABC123'
}, (response) => {
  console.log(response);
  // { success: true, hostId: 'socket-id' }
});
offer
Send WebRTC offer to establish connection.
javascriptsocket.emit('offer', {
  offer: { type: 'offer', sdp: '...' },
  to: 'target-socket-id'
});
answer
Send WebRTC answer in response to offer.
javascriptsocket.emit('answer', {
  answer: { type: 'answer', sdp: '...' },
  to: 'target-socket-id'
});
ice-candidate
Exchange ICE candidates for connection establishment.
javascriptsocket.emit('ice-candidate', {
  candidate: {
    candidate: '...',
    sdpMLineIndex: 0,
    sdpMid: '0'
  },
  to: 'target-socket-id'
});
Server → Client Events
viewer-joined
Notifies host when a viewer joins.
javascriptsocket.on('viewer-joined', ({ viewerId, roomId }) => {
  console.log(`Viewer ${viewerId} joined room ${roomId}`);
});
viewer-left
Notifies host when a viewer leaves.
javascriptsocket.on('viewer-left', ({ viewerId }) => {
  console.log(`Viewer ${viewerId} left`);
});
host-disconnected
Notifies viewers when host disconnects.
javascriptsocket.on('host-disconnected', () => {
  console.log('Host has disconnected');
});
offer
Receive WebRTC offer from peer.
javascriptsocket.on('offer', ({ offer, from }) => {
  // Handle incoming offer
});
answer
Receive WebRTC answer from peer.
javascriptsocket.on('answer', ({ answer, from }) => {
  // Handle incoming answer
});
ice-candidate
Receive ICE candidate from peer.
javascriptsocket.on('ice-candidate', ({ candidate, from }) => {
  // Handle incoming ICE candidate
});
REST API Endpoints
Health Check
httpGET /api/health
Response:
json{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345
}
Room Info (Debug Only)
httpGET /api/room/:roomId
Response:
json{
  "roomId": "123456789",
  "created": 1704067200000,
  "participantCount": 2
}
Error Codes
CodeDescriptionROOM_NOT_FOUNDThe specified room does not existINVALID_PASSWORDIncorrect room passwordROOM_FULLRoom has reached maximum capacityCONNECTION_FAILEDWebRTC connection failedRATE_LIMIT_EXCEEDEDToo many requests
Rate Limits

Room creation: 5 rooms per 5 minutes
Connection attempts: 10 per minute
General API: 100 requests per 15 minutes

WebRTC Configuration
ICE Servers
javascript{
  iceServers: [
    { urls: 'stun:stun.justdesk.io:3478' },
    { 
      urls: 'turn:turn.justdesk.io:3478',
      username: 'provided-username',
      credential: 'provided-password'
    }
  ]
}
Media Constraints
javascript{
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  },
  audio: true
}



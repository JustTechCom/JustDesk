```markdown
# JustDesk Troubleshooting Guide

## Common Issues

### Connection Problems

#### "Failed to connect to room"
**Causes:**
- Incorrect room ID or password
- Room has expired (1-hour timeout)
- Network connectivity issues

**Solutions:**
1. Verify room ID and password
2. Create a new room if expired
3. Check internet connection
4. Try refreshing the page

#### "WebRTC connection failed"
**Causes:**
- Firewall blocking WebRTC
- TURN server not accessible
- Browser compatibility issues

**Solutions:**
1. Check firewall settings
2. Verify TURN server configuration
3. Use a supported browser (Chrome, Firefox, Safari)
4. Try disabling VPN/proxy

### Video Quality Issues

#### Poor video quality
**Causes:**
- Limited bandwidth
- High CPU usage
- Network congestion

**Solutions:**
1. Close unnecessary applications
2. Use wired connection instead of WiFi
3. Reduce screen resolution
4. Lower frame rate in settings

#### Video freezing/stuttering
**Causes:**
- Packet loss
- Insufficient bandwidth
- CPU throttling

**Solutions:**
1. Check network stability
2. Reduce quality settings
3. Close resource-intensive apps
4. Check CPU temperature

### Audio Issues

#### No audio transmission
**Causes:**
- Audio not enabled during screen share
- Browser permissions denied
- System audio routing issues

**Solutions:**
1. Enable "Share audio" when starting
2. Check browser permissions
3. Verify system audio settings
4. Restart browser

### Browser-Specific Issues

#### Chrome
- Enable hardware acceleration
- Clear browser cache
- Disable extensions
- Check chrome://webrtc-internals

#### Firefox
- Enable WebRTC in about:config
- Check media.peerconnection.enabled
- Update to latest version

#### Safari
- Enable WebRTC in Developer menu
- Check Screen Recording permissions
- Update macOS if needed

## Server-Side Issues

### High CPU Usage
```bash
# Check process usage
htop

# Check Docker stats
docker stats

# Restart containers
docker-compose restart
Memory Issues
bash# Check memory usage
free -h

# Clear Redis cache if needed
redis-cli FLUSHDB

# Increase swap if necessary
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
Connection Limits
bash# Check current connections
ss -s

# Increase file descriptors
ulimit -n 65535

# Update system limits
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf
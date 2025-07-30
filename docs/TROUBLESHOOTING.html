<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>JustDesk Troubleshooting Guide</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      margin: 0;
      padding: 0;
      background: #f8fafc;
      color: #333;
      line-height: 1.6;
    }

    header {
      background-color: #2b6cb0;
      color: #fff;
      padding: 2rem;
      text-align: center;
    }

    main {
      max-width: 900px;
      margin: 2rem auto;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.05);
    }

    h1, h2, h3, h4 {
      color: #2b6cb0;
    }

    pre {
      background-color: #f1f5f9;
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 0.95em;
    }

    code {
      background: #edf2f7;
      padding: 2px 4px;
      border-radius: 4px;
      font-family: monospace;
    }

    ul {
      padding-left: 1.2rem;
      margin-top: 0.5rem;
    }

    li {
      margin-bottom: 0.4rem;
    }

    section {
      margin-bottom: 2rem;
    }

    .subsection {
      background: #f9fafb;
      padding: 1rem;
      border-left: 4px solid #63b3ed;
      margin-top: 1rem;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <header>
    <h1>JustDesk Troubleshooting Guide</h1>
    <p>Resolve common connection, video, and server issues</p>
  </header>
  <main>

    <section>
      <h2>Common Issues</h2>

      <div class="subsection">
        <h3>Connection Problems</h3>
        <h4>"Failed to connect to room"</h4>
        <strong>Causes:</strong>
        <ul>
          <li>Incorrect room ID or password</li>
          <li>Room has expired (1-hour timeout)</li>
          <li>Network connectivity issues</li>
        </ul>
        <strong>Solutions:</strong>
        <ul>
          <li>Verify room ID and password</li>
          <li>Create a new room if expired</li>
          <li>Check internet connection</li>
          <li>Try refreshing the page</li>
        </ul>

        <h4>"WebRTC connection failed"</h4>
        <strong>Causes:</strong>
        <ul>
          <li>Firewall blocking WebRTC</li>
          <li>TURN server not accessible</li>
          <li>Browser compatibility issues</li>
        </ul>
        <strong>Solutions:</strong>
        <ul>
          <li>Check firewall settings</li>
          <li>Verify TURN server configuration</li>
          <li>Use a supported browser (Chrome, Firefox, Safari)</li>
          <li>Try disabling VPN/proxy</li>
        </ul>
      </div>

      <div class="subsection">
        <h3>Video Quality Issues</h3>

        <h4>Poor video quality</h4>
        <strong>Causes:</strong>
        <ul>
          <li>Limited bandwidth</li>
          <li>High CPU usage</li>
          <li>Network congestion</li>
        </ul>
        <strong>Solutions:</strong>
        <ul>
          <li>Close unnecessary applications</li>
          <li>Use wired connection instead of WiFi</li>
          <li>Reduce screen resolution</li>
          <li>Lower frame rate in settings</li>
        </ul>

        <h4>Video freezing/stuttering</h4>
        <strong>Causes:</strong>
        <ul>
          <li>Packet loss</li>
          <li>Insufficient bandwidth</li>
          <li>CPU throttling</li>
        </ul>
        <strong>Solutions:</strong>
        <ul>
          <li>Check network stability</li>
          <li>Reduce quality settings</li>
          <li>Close resource-intensive apps</li>
          <li>Check CPU temperature</li>
        </ul>
      </div>

      <div class="subsection">
        <h3>Audio Issues</h3>
        <h4>No audio transmission</h4>
        <strong>Causes:</strong>
        <ul>
          <li>Audio not enabled during screen share</li>
          <li>Browser permissions denied</li>
          <li>System audio routing issues</li>
        </ul>
        <strong>Solutions:</strong>
        <ul>
          <li>Enable "Share audio" when starting</li>
          <li>Check browser permissions</li>
          <li>Verify system audio settings</li>
          <li>Restart browser</li>
        </ul>
      </div>

      <div class="subsection">
        <h3>Browser-Specific Issues</h3>

        <h4>Chrome</h4>
        <ul>
          <li>Enable hardware acceleration</li>
          <li>Clear browser cache</li>
          <li>Disable extensions</li>
          <li>Check <code>chrome://webrtc-internals</code></li>
        </ul>

        <h4>Firefox</h4>
        <ul>
          <li>Enable WebRTC in <code>about:config</code></li>
          <li>Check <code>media.peerconnection.enabled</code></li>
          <li>Update to latest version</li>
        </ul>

        <h4>Safari</h4>
        <ul>
          <li>Enable WebRTC in Developer menu</li>
          <li>Check Screen Recording permissions</li>
          <li>Update macOS if needed</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Server-Side Issues</h2>

      <div class="subsection">
        <h3>High CPU Usage</h3>
        <pre><code># Check process usage
htop

# Check Docker stats
docker stats

# Restart containers
docker-compose restart
        </code></pre>
      </div>

      <div class="subsection">
        <h3>Memory Issues</h3>
        <pre><code># Check memory usage
free -h

# Clear Redis cache if needed
redis-cli FLUSHDB

# Increase swap if necessary
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
        </code></pre>
      </div>

      <div class="subsection">
        <h3>Connection Limits</h3>
        <pre><code># Check current connections
ss -s

# Increase file descriptors
ulimit -n 65535

# Update system limits
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf
        </code></pre>
      </div>
    </section>
  </main>
</body>
</html>

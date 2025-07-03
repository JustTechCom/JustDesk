📄 README.md
markdown# JustDesk 🖥️

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/kadirertancam/JustDesk/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/JustDesk/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://hub.docker.com/r/kadirtn)

Web-based remote desktop solution that requires no installation. Share your screen instantly with just a web browser!

## ✨ Features

- 🚀 **No Installation Required** - Works directly in the browser
- 🔒 **Secure** - End-to-end encrypted WebRTC connections
- 🌍 **Cross-Platform** - Works on Windows, Mac, Linux, and mobile devices
- ⚡ **Low Latency** - Peer-to-peer connections for optimal performance
- 🎯 **Simple** - Share with just an ID and password
- 📱 **Responsive** - Mobile-friendly interface

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/kadirertancam/JustDesk.git
cd JustDesk

# Copy environment variables
cp .env.example .env

# Start with Docker Compose
docker-compose up -d

# Access at http://localhost:3000
Manual Installation
bash# Clone the repository
git clone https://github.com/kadirertancam/JustDesk.git
cd JustDesk

# Install dependencies
npm install

# Setup environment variables
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.local.example packages/frontend/.env.local

# Start development servers
npm run dev

# Access at http://localhost:3000
🛠️ Technology Stack

Frontend: Next.js, React, Tailwind CSS
Backend: Node.js, Express, Socket.IO
WebRTC: Simple-peer, STUN/TURN servers
Database: Redis
Deployment: Docker, Nginx

📖 Documentation

Architecture Overview
Deployment Guide
API Documentation
Troubleshooting

🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

Fork the repository
Create your feature branch (git checkout -b feature/AmazingFeature)
Commit your changes (git commit -m 'Add some AmazingFeature')
Push to the branch (git push origin feature/AmazingFeature)
Open a Pull Request

📝 License
This project is licensed under the MIT License - see the LICENSE file for details.
🙏 Acknowledgments

WebRTC for making peer-to-peer connections possible
The open-source community for inspiration and support

📞 Support

Create an Issue
Email: info@justtech.work
Discord: Join our community


Getting Help
Log Collection
bash# Collect all logs
./scripts/collect-logs.sh

# Create support bundle
tar -czf support-bundle.tar.gz logs/ .env docker-compose.yml
Information to Provide

Browser and version
Operating system
Network type (home/office/mobile)
Error messages
Steps to reproduce

Support Channels

GitHub Issues: https://github.com/yourusername/JustDesk/issues
Email: support@justdesk.io
Discord: https://discord.gg/justdesk

FAQ
Q: Why can't others see my screen?
A: Ensure you've started screen sharing and shared the correct room ID and password.
Q: Is my data secure?
A: Yes, all connections are encrypted using WebRTC's built-in security features.
Q: What's the maximum number of viewers?
A: Currently limited to 10 viewers per room for optimal performance.
Q: Can I record sessions?
A: Recording is not built-in but viewers can use screen recording software.
Q: Why does my session expire?
A: Sessions expire after 1 hour of inactivity for security and resource management.

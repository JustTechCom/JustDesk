# JustDesk Architecture

## Overview

JustDesk is a web-based remote desktop solution built with modern web technologies. It enables users to share their screens through web browsers without requiring any software installation.

## System Architecture
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Web Browser   │────▶│   Web Server    │────▶│ Signaling Server│
│   (Frontend)    │◀────│    (Nginx)      │◀────│   (Node.js)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
│                                                │
│                                                │
│              ┌─────────────────┐              │
│              │                 │              │
└─────────────▶│   TURN Server   │◀─────────────┘
│   (CoTURN)      │
└─────────────────┘
│
▼
┌─────────────────┐
│                 │
│     Redis       │
│   (Sessions)    │
└─────────────────┘


## Core Components

### 1. Frontend (Next.js + React)
- **Purpose**: User interface and WebRTC client
- **Technology**: Next.js, React, Tailwind CSS
- **Key Features**:
  - Screen capture using WebRTC
  - Real-time video streaming
  - Responsive design
  - PWA capabilities

### 2. Backend (Node.js + Socket.IO)
- **Purpose**: WebRTC signaling and session management
- **Technology**: Express, Socket.IO, Redis
- **Key Features**:
  - WebSocket connections for real-time signaling
  - Room management
  - Authentication and authorization
  - Rate limiting

### 3. TURN/STUN Server
- **Purpose**: NAT traversal for P2P connections
- **Technology**: CoTURN
- **Key Features**:
  - STUN for public IP discovery
  - TURN for relay when P2P fails
  - Bandwidth management

### 4. Redis
- **Purpose**: Session storage and pub/sub
- **Technology**: Redis 7+
- **Key Features**:
  - Room data storage
  - Session management
  - Real-time event broadcasting

## Data Flow

### Connection Establishment
1. Host creates a room → Server generates Room ID & Password
2. Host starts screen capture → WebRTC creates offer
3. Viewer joins with credentials → Server validates
4. WebRTC negotiation → P2P connection established
5. Stream flows directly between peers

### Security Measures
- HTTPS/WSS encryption
- Room passwords
- Session timeouts
- Rate limiting
- CORS protection

## Scalability Considerations

### Horizontal Scaling
- Multiple signaling servers behind load balancer
- Redis cluster for session sharing
- Geographic distribution of TURN servers

### Performance Optimization
- P2P connections reduce server load
- Adaptive bitrate for video quality
- Connection pooling
- Caching strategies

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js, React | UI Framework |
| Styling | Tailwind CSS | CSS Framework |
| WebRTC | SimplePeer | P2P Connection |
| Backend | Node.js, Express | Server Framework |
| WebSocket | Socket.IO | Real-time Communication |
| Database | Redis | Session Storage |
| Proxy | Nginx | Reverse Proxy |
| Container | Docker | Containerization |
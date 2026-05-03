# 🎧 SyncRoom — Real-Time Social Music Listening

SyncRoom is a real-time web application where users join a shared room, take turns as DJ, and listen to music together with synchronized playback across all clients.

---

## 🚀 Live Demo

*(Add your deployed link here)*

---

## 🧠 Core Idea

Instead of streaming music independently, SyncRoom ensures that **all users hear the same moment of a song**, even if they join late.

It combines:

* Real-time communication
* Distributed time synchronization
* Social interaction (DJ rotation + voting)

---

## ✨ Features

### 🎵 Synchronized Playback

* Uses timestamp-based syncing (`startAt`)
* Late joiners align instantly using `seekTo`

### 👥 Multi-Room Support

* Users can create/join rooms dynamically
* Each room maintains isolated state

### 🎧 DJ Rotation System

* Users take turns playing songs
* Automatic rotation with inactivity timeout

### 👍 Voting System

* Users can like or skip songs
* Skip threshold triggers song change

### 📊 Leaderboard

* Tracks user performance (likes vs skips)
* Sorted ranking with real-time updates

### 🔍 YouTube Search Integration

* Search songs directly using YouTube API
* Click-to-play with seamless sync

---

## ⚙️ Tech Stack

**Frontend**

* React (Vite)
* TypeScript
* Socket.io Client
* YouTube IFrame API

**Backend**

* Node.js
* Express
* Socket.io

---

## 🧩 Architecture Overview

### 🔁 Real-Time Flow

User plays song → Server assigns `startAt` → Broadcast →
Clients compute elapsed time → `seekTo()` → Synchronized playback

---

### 🧠 Key Engineering Decisions

* **Server-authoritative state** to avoid desync
* **Timestamp-based sync** instead of event-based playback
* **Dual sync triggers** (`onReady` + `useEffect`) to handle async race conditions
* **useRef for player control** (imperative API handling)

---

## 🧪 Challenges Solved

* Syncing playback across users joining at different times
* Handling race conditions between React lifecycle and YouTube player
* Preventing repeated re-sync loops
* Managing real-time state consistency across clients

---

## 📦 Installation

### 1. Clone repo

```bash
git clone https://github.com/YOUR_USERNAME/syncroom.git
cd syncroom
```

### 2. Setup server

```bash
cd server
npm install
```

Create `.env`:

```
PORT=3000
CLIENT_URL=http://localhost:5173
```

Run:

```bash
npm run dev
```

---

### 3. Setup client

```bash
cd client
npm install
```

Create `.env`:

```
VITE_SERVER_URL=http://localhost:3000
VITE_YT_API_KEY=YOUR_API_KEY
```

Run:

```bash
npm run dev
```

---

## 🚀 Future Improvements

* Authentication (persistent identity)
* Spotify integration (true audio streaming)
* Room discovery UI
* Mobile optimization
* Playback progress bar sync

---

## 🤝 Acknowledgements

* YouTube Data API v3
* Socket.io

---

## 📌 Author

Om Badgujar
GitHub: https://github.com/ombadgujar40/Music-room.git

---

<div align="center">

# 📍 Navigo Pro — Employee GPS Tracking System

**A real-time, cross-platform employee location tracking solution built for enterprises.**

[![Live Demo](https://img.shields.io/badge/Live%20Web%20App-gps--tracking--azure.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://gps-tracking-azure.vercel.app)
[![Backend](https://img.shields.io/badge/Backend%20API-Render-46c77f?style=for-the-badge&logo=render)](https://render.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## 📋 Table of Contents

1. [What This App Does](#1-what-this-app-does)
2. [Architecture Overview](#2-architecture-overview)
3. [User Flow Diagram](#3-user-flow-diagram)
4. [Tech Stack](#4-tech-stack)
5. [Project Structure](#5-project-structure)
6. [Features](#6-features)
7. [Local Development Setup](#7-local-development-setup)
8. [Environment Variables](#8-environment-variables)
9. [Deployment Guide (Cloud)](#9-deployment-guide-cloud)
10. [Mobile App Builds (CI/CD)](#10-mobile-app-builds-cicd)
11. [API Reference](#11-api-reference)
12. [Database Schema](#12-database-schema)
13. [Handover & Maintenance](#13-handover--maintenance)

---

## 1. What This App Does

Navigo Pro is a full-stack, real-time employee GPS tracking system. It allows a company to:

- 🗺️ **See every employee's live location** on a shared map, updated in real-time.
- 🏢 **Create Organizations (Workspaces)** — e.g., "Main Office", "Field Team" — with password-protected access.
- 📍 **Set Geofences (Destinations)** — admins can click on the map to define important locations (offices, client sites, restricted zones) with a radius. Employees are automatically alerted when they enter or exit these zones.
- ⏱️ **Track Clock In / Clock Out** — employees can mark when they start and finish work directly in the app.
- 👤 **Manage Profiles** — employees have their own profile with avatar, designation, and role.
- 📱 **Run on any device** — works as a web browser app, Android app (`.apk`), and iOS app.

---

## 2. Architecture Overview

The system is split into three layers that communicate with each other.

```mermaid
graph TB
    subgraph "CLIENT LAYER"
        WEB["🌐 Web Browser<br/>(Vercel)"]
        AND["🤖 Android App<br/>(.apk)"]
        IOS["🍎 iOS App<br/>(.app / Appetize.io)"]
    end

    subgraph "SERVER LAYER"
        API["⚡ Node.js + Express<br/>REST API<br/>(Render)"]
        SOCK["🔌 Socket.IO<br/>Real-time WebSocket Server<br/>(Render)"]
    end

    subgraph "DATA LAYER"
        DB[("🍃 MongoDB Atlas<br/>Cloud Database")]
    end

    WEB -->|HTTPS REST Calls| API
    AND -->|HTTPS REST Calls| API
    IOS -->|HTTPS REST Calls| API

    WEB <-->|WebSocket - Live GPS| SOCK
    AND <-->|WebSocket - Live GPS| SOCK
    IOS <-->|WebSocket - Live GPS| SOCK

    API -->|Read/Write| DB
    SOCK -->|Read/Write| DB
```

> **In plain English:** The app (on browser or phone) talks to the backend server for things like logging in and saving data. For the live map, it keeps a permanent open connection (WebSocket) so the server can push GPS updates instantly without the app having to keep asking.

---

## 3. User Flow Diagram

```mermaid
flowchart TD
    A([User Opens App]) --> B{Has Account?}
    B -- No --> C[Register Page\nName, Email, Password,\nDesignation, Role]
    B -- Yes --> D[Login Page]
    C --> D
    D --> E[JWT Token Issued\nStored in localStorage]
    E --> F{Has Organization?}
    F -- No --> G[Setup Page\nCreate or Join a Workspace]
    G --> H[Organization Created/Joined\nin MongoDB]
    H --> I
    F -- Yes --> I[Dashboard / Map View]
    I --> J[Socket.IO Connection\nOpened to Server]
    J --> K[GPS Watch Started\nnavigator.geolocation.watchPosition]
    K --> L[Location Emitted\nEvery Few Seconds via Socket]
    L --> M[Server Broadcasts\nto All Room Members]
    M --> N[All Users See\nLive Map Update]
    I --> O{User is Admin?}
    O -- Yes --> P[Click Map to\nCreate Geofence]
    P --> Q[Geofence Saved\nto MongoDB]
    Q --> R[All Users Notified\nif They Enter/Exit Zone]
```

---

## 4. Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | 19 | User interface framework |
| **Vite** | 8 | Build tool and dev server |
| **React Leaflet** | 5 | Interactive map rendering (Google Maps tile layer) |
| **Socket.IO Client** | 4.8 | Real-time WebSocket connection to backend |
| **React Router DOM** | 7 | Client-side page navigation |
| **Capacitor** | 8 | Converts web app into native Android & iOS apps |
| **Lucide React** | Latest | Icons |
| **Vanilla CSS** | — | Custom styling, dark mode, animations |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 20+ | JavaScript runtime |
| **Express** | 4 | REST API web framework |
| **Socket.IO** | 4.7 | Real-time bidirectional WebSocket events |
| **Mongoose** | 9 | MongoDB object modeling |
| **JSON Web Tokens** | 9 | Secure user authentication |
| **bcryptjs** | 3 | Password hashing |
| **CORS** | 2.8 | Cross-origin request handling |

### Infrastructure & Cloud
| Service | Purpose | Cost |
|---|---|---|
| **Vercel** | Frontend hosting + auto-deploy from GitHub | Free |
| **Render** | Backend server hosting | Free tier (sleeps after 15 min inactivity) |
| **MongoDB Atlas** | Cloud database | Free (512 MB) |
| **GitHub Actions** | Automated Android `.apk` build on push | Free |
| **Codemagic** | Automated iOS `.app` build | Free tier |
| **Appetize.io** | iOS simulator in the browser | Free tier |

---

## 5. Project Structure

```
Employee Tracking App/
│
├── backend/                    # Node.js Server
│   ├── models/                 # MongoDB data schemas
│   │   ├── User.js             # Employee accounts & profiles
│   │   ├── Organization.js     # Workspaces / teams
│   │   ├── Room.js             # Active tracking sessions
│   │   ├── Destination.js      # Geofences on the map
│   │   ├── LocationHistory.js  # Historical GPS data
│   │   └── Visit.js            # Geofence entry/exit log
│   ├── routes/                 # REST API endpoints
│   │   ├── auth.js             # Login, Register, Org management
│   │   ├── profile.js          # Edit profile, upload avatar
│   │   ├── destinations.js     # Create/read geofences
│   │   ├── admin.js            # Admin-only controls
│   │   └── rooms.js            # Tracking room management
│   ├── server.js               # Main server entry point
│   └── package.json
│
├── frontend/                   # React Web + Mobile App
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx       # Login screen
│   │   │   ├── Register.jsx    # Registration screen
│   │   │   ├── Setup.jsx       # Create/Join organization
│   │   │   ├── Dashboard.jsx   # Main map + sidebar view
│   │   │   ├── Profile.jsx     # User profile page
│   │   │   └── MapRoom.jsx     # Shared map room view
│   │   ├── components/
│   │   │   └── Map.jsx         # Leaflet map, markers, geofences, search
│   │   ├── utils/
│   │   │   ├── api.js          # Centralized API client (uses backend URL)
│   │   │   └── colors.js       # User color assignment for markers
│   │   └── index.css           # All styles, dark mode, responsive layout
│   ├── android/                # Native Android project (auto-generated by Capacitor)
│   ├── ios/                    # Native iOS project (auto-generated by Capacitor)
│   ├── capacitor.config.json   # Capacitor native app configuration
│   ├── index.html              # App entry HTML
│   └── package.json
│
├── .github/workflows/
│   └── android.yml             # GitHub Actions: automated Android .apk build
├── codemagic.yaml              # Codemagic: automated iOS .app build
├── Project_Handover_Document.md
└── README.md                   # This file
```

---

## 6. Features

### For Employees
- ✅ Register and log in securely with email & password.
- ✅ Join an organization using a workspace name and password.
- ✅ See their own live location on the map.
- ✅ See all online colleagues' live locations with color-coded markers.
- ✅ Clock In and Clock Out from within the app.
- ✅ Edit their profile photo and designation.
- ✅ Search for any location on the map.
- ✅ Receive alerts when entering or exiting a geofenced area.

### For Admins
- ✅ All employee features, plus:
- ✅ See all employee details in the sidebar.
- ✅ Click anywhere on the map to create a named geofence.
- ✅ Assign geofence types: Office, Client Site, Warehouse, Restricted Zone, Other.
- ✅ Monitor who is active vs. idle.

---

## 7. Local Development Setup

> **Prerequisites:** You need [Node.js 20+](https://nodejs.org) and [Git](https://git-scm.com) installed.

### Step 1 — Clone the Repository
```bash
git clone https://github.com/SandipAcharya/gps_tracking.git
cd "gps_tracking"
```

### Step 2 — Set Up the Backend
```bash
cd backend
npm install
```
Create a `.env` file inside the `backend/` folder:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/tracker
JWT_SECRET=your_super_secret_key_here
```
Start the backend server:
```bash
npm start
# Server will run at http://localhost:5000
```

### Step 3 — Set Up the Frontend
Open a **second terminal window**:
```bash
cd frontend
npm install
```
Create a `.env` file inside the `frontend/` folder:
```env
VITE_API_URL=http://localhost:5000
```
Start the frontend dev server:
```bash
npm run dev
# Web app will open at http://localhost:5173
```

### Step 4 — Open in Browser
Visit `http://localhost:5173`, register a new account, create an organization, and you will see the live map!

---

## 8. Environment Variables

| Variable | Where | Description | Example |
|---|---|---|---|
| `PORT` | Backend | Port for the server to listen on | `5000` |
| `MONGO_URI` | Backend | Full MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.net/db` |
| `JWT_SECRET` | Backend | Secret key for signing login tokens | `any_long_random_string` |
| `VITE_API_URL` | Frontend | Full public URL of the backend server | `https://your-app.onrender.com` |

> ⚠️ **Security Note:** Never commit `.env` files to GitHub. They are already listed in `.gitignore`.

---

## 9. Deployment Guide (Cloud)

### A. Deploy the Backend to Render
1. Create a free account at [render.com](https://render.com).
2. Click **New +** → **Web Service** → Connect your GitHub repository.
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
4. Add all 3 backend environment variables under **Environment** → **Add Environment Variable**.
5. Click **Create Web Service**. Note the final `onrender.com` URL — you will need it for the frontend.

### B. Deploy the Frontend to Vercel
1. Create a free account at [vercel.com](https://vercel.com).
2. Click **Add New Project** → Import your GitHub repository.
3. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
4. Add the `VITE_API_URL` environment variable, using the Render URL from Step A.
5. Click **Deploy**.

### C. Set Up MongoDB Atlas
1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a free **M0 Cluster**.
3. Under **Database Access**, create a user with a password.
4. Under **Network Access**, add `0.0.0.0/0` (allow all IPs).
5. Click **Connect** → **Compass** and copy the connection string. Replace `<password>` with your user's password. This is your `MONGO_URI`.

---

## 10. Mobile App Builds (CI/CD)

The mobile apps are **built automatically in the cloud** — no Xcode or Android Studio required on your machine.

### Android (.apk)
Triggered automatically on every push to the `main` branch via **GitHub Actions**.
1. Go to your GitHub repository → **Actions** tab.
2. Click **Build Android App** → **Run Workflow** to trigger manually.
3. Once complete (≈10 mins), download the `.apk` from the workflow **Artifacts** section.
4. Transfer the `.apk` to an Android phone and install it.

### iOS (Simulator)
Built using **Codemagic** → tested on **Appetize.io** (no Apple Developer account required for simulator testing).
1. Log into [codemagic.io](https://codemagic.io) and connect your repository.
2. Click **Start New Build** on the `main` branch.
3. Once complete (≈20 mins), download `App-Simulator.zip` from the **Artifacts** section.
4. Go to [appetize.io/upload](https://appetize.io/upload) and upload the `.zip`.
5. Appetize will give you a browser link to test your app on a virtual iPhone!

> **📌 Note for Real iPhone Distribution:** Testing on a physical iPhone or publishing to the App Store requires an [Apple Developer Account](https://developer.apple.com) ($99/year).

---

## 11. API Reference

All API requests require the `Authorization: Bearer <token>` header unless marked as Public.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create a new user account |
| `POST` | `/api/auth/login` | Public | Log in and receive a JWT token |
| `POST` | `/api/auth/org/create` | Required | Create a new organization |
| `POST` | `/api/auth/org/join` | Required | Join an existing organization |
| `GET` | `/api/auth/me` | Required | Get the current user's profile |
| `PUT` | `/api/profile/update` | Required | Update name, designation, avatar |
| `GET` | `/api/destinations` | Required | Get all geofences for the org |
| `POST` | `/api/destinations` | Admin only | Create a new geofence |
| `DELETE` | `/api/destinations/:id` | Admin only | Delete a geofence |

### Real-time Socket.IO Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `join-room` | Client → Server | `{ roomId, user }` | User joins a tracking room |
| `location-update` | Client → Server | `{ lat, lng, accuracy }` | User sends their GPS position |
| `room-users` | Server → Client | `[ ...users ]` | Server broadcasts updated user list |
| `geofence-alert` | Server → Client | `{ message, type }` | Server notifies user of zone entry/exit |

---

## 12. Database Schema

```mermaid
erDiagram
    USER {
        ObjectId _id
        string name
        string email
        string passwordHash
        string role
        string designation
        string avatarUrl
        ObjectId activeOrganization
    }
    ORGANIZATION {
        ObjectId _id
        string name
        string passwordHash
        ObjectId[] members
        ObjectId admin
    }
    DESTINATION {
        ObjectId _id
        string orgName
        string name
        string tag
        number lat
        number lng
        number radius
    }
    LOCATIONHISTORY {
        ObjectId _id
        ObjectId user
        number lat
        number lng
        date timestamp
    }
    USER }o--|| ORGANIZATION : "belongs to"
    ORGANIZATION ||--o{ DESTINATION : "has"
    USER ||--o{ LOCATIONHISTORY : "generates"
```

---

## 13. Handover & Maintenance

### Giving a New Developer Access
1. **GitHub:** Go to repository **Settings** → **Collaborators** → **Add people**.
2. **Vercel:** Go to your project → **Settings** → **Members** → Invite by email.
3. **Render:** Go to your service → **Settings** → **Collaborators** → Invite by email.
4. **MongoDB Atlas:** Go to your project → **Access Manager** → **Invite Member**.
5. **Credentials:** Share all Environment Variables listed in Section 8 via a secure channel (not by email or in the code).

### Common Maintenance Tasks

| Task | How |
|---|---|
| View server logs | Render dashboard → your service → **Logs** tab |
| Add a new admin user | Run `node backend/scripts/makeAdmin.js <email>` locally or via Render Shell |
| View all registered users | Run `node backend/scripts/listUsers.js` |
| Update the app | Push to `main` branch — Vercel auto-deploys in ~2 mins, Render auto-deploys in ~3 mins |
| Backend keeps sleeping | Upgrade Render to the **Starter** plan ($7/month) for always-on service |

### Known Limitations (Free Tier)
- **Render free tier** spins down after 15 minutes of no traffic. The first request after inactivity may take 30–60 seconds. *(A self-ping keep-alive is configured in `server.js` to mitigate this.)*
- **MongoDB Atlas free tier** has a 512 MB storage limit.
- **iOS real-device testing** requires an Apple Developer Account ($99/year).

---

<div align="center">

Built with ❤️ by **Sandip Acharya** and the **Inpanda Team**

</div>

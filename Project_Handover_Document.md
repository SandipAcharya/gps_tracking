# Employee Tracking App - Project Handover Document

## 1. Project Overview
This project is a real-time **Employee GPS Tracking System** built to monitor staff locations, manage organizational geofences (destinations), and track employee status (active, idle, clocked in/out). 

It is a **cross-platform** solution, meaning the exact same codebase runs as:
1. A web browser application.
2. A native Android application (.apk).
3. A native iOS application (.app for simulators, .ipa for real devices).

## 2. Technology Stack & Infrastructure
We built this using modern, free-tier cloud infrastructure to keep running costs at zero while maintaining high performance.

- **Frontend (User Interface & Map):** Built with React.js and Leaflet Maps. Deployed on **Vercel** (updates automatically when code is pushed to GitHub).
- **Backend (Server & Real-time tracking):** Built with Node.js and Socket.IO. Deployed on **Render** (handles all the live GPS data streaming).
- **Database:** Hosted on **MongoDB Atlas** (stores user accounts, locations, and geofence data).
- **Mobile App Engine:** Powered by **Capacitor**, which converts the web app into native Android and iOS apps.
- **CI/CD (Automated App Building):** 
  - **Android:** Built automatically using **GitHub Actions**.
  - **iOS:** Built automatically using **Codemagic** and previewed on **Appetize.io**.

---

## 3. Environment Variables (Credentials)
*Note: Never upload these keys to GitHub. They are the "keys to the house" and should be kept secure.*

**Backend Environment Variables (Needed on Render):**
- `PORT` = `5000` (The port the server runs on).
- `MONGO_URI` = `mongodb+srv://...` (The connection string to your MongoDB database).
- `JWT_SECRET` = `your_super_secret_key` (Used to securely log users in).

**Frontend Environment Variables (Needed on Vercel):**
- `VITE_API_URL` = `https://your-backend-url.onrender.com` (Tells the frontend where the backend server lives).

---

## 4. How to Deploy the System from Scratch
If you ever need to move this project to your own accounts, follow these steps in exact order:

### Step A: Set up the Database (MongoDB Atlas)
1. Create a free account on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a new Cluster and set up a Database User with a password.
3. Go to "Network Access" and allow access from anywhere (`0.0.0.0/0`).
4. Copy the connection string (this is your `MONGO_URI`).

### Step B: Set up the Backend Server (Render)
1. Create an account on [Render](https://render.com/).
2. Click **New +** > **Web Service** and connect your GitHub repository.
3. Set the Root Directory to `backend`.
4. Set the Build Command to `npm install`.
5. Set the Start Command to `npm start`.
6. Add the 3 Environment Variables listed in section 3.
7. Click Deploy. Once finished, copy the provided `onrender.com` URL.

### Step C: Set up the Frontend Web App (Vercel)
1. Create an account on [Vercel](https://vercel.com/) and import your GitHub repository.
2. Set the Root Directory to `frontend`.
3. Add the `VITE_API_URL` environment variable (using the Render URL you just created).
4. Click Deploy. Your web app is now live!

### Step D: Generate Mobile Apps
Whenever you update the code, the mobile apps can be generated automatically:
- **Android:** Go to the GitHub repository > **Actions** tab > Click "Build Android App" > **Run Workflow**. Once finished, it will provide an `.apk` file for download.
- **iOS Simulator:** Log into [Codemagic](https://codemagic.io/), connect the repository, and click **Start New Build**. It will output an `App-Simulator.zip` which you can upload to [Appetize.io](https://appetize.io/) to test.

---

## 5. Next Steps & Future Recommendations
As the project grows, here is what you should focus on next:
1. **Apple Developer Account:** To test the iOS app on real physical iPhones (and launch it on the App Store), the company will need to purchase an Apple Developer Account ($99/year).
2. **Custom Domains:** Right now, the app uses free URLs (like `.vercel.app`). You can buy a custom domain (e.g., `company-tracker.com`) and easily attach it to Vercel and Render.
3. **Render Paid Tier:** The backend is currently on Render's free tier. For production usage with many employees, you should upgrade to Render's $7/month tier so the server never goes to sleep.

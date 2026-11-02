# Nails by Vril (NBV)
### Handcrafted Nail Artistry & Studio Management System

A production-ready Progressive Web Application (PWA) built specifically for **Nails by Vril** in Pasig City. It provides a client-facing online booking wizard, automated double-booking prevention, dynamic schedule management, and an Owner/Admin portal for managing appointments, services, calendar, client directory, and revenue analytics.

---

## 🌟 Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Canvas Confetti
- **Backend & Database**: Firebase Authentication (Google Sign-In), Cloud Firestore (NoSQL)
- **Deployment & Hosting**: Vercel Production & Firebase Hosting
- **Mobile Experience**: Progressive Web App (PWA via `vite-plugin-pwa` & Service Worker) — 1-click install on Android, iOS Safari, and Desktop without requiring Flutter, Dart, or app stores.

---

## 📋 Table of Contents

1. [Local Development Setup](#1-local-development-setup)
2. [Firebase Setup (From Scratch)](#2-firebase-setup-from-scratch)
3. [Environment Variables Reference](#3-environment-variables-reference)
4. [Deployment Guides](#4-deployment-guides)
   - [Deploying to Vercel (Recommended)](#option-a-deploying-to-vercel-recommended)
   - [Deploying to Firebase Hosting](#option-b-deploying-to-firebase-hosting)
5. [Owner & Admin Operations (For Rayana)](#5-owner--admin-operations-for-rayana)
   - [How to Transfer Main Admin Ownership](#how-to-transfer-main-admin-ownership)
   - [Managing Working Days & Hours](#managing-working-days--hours)
   - [Toggling Services ON / OFF](#toggling-services-on--off)
   - [Recording Walk-In & Instagram DM Clients](#recording-walk-in--instagram-dm-clients)
   - [Visual Calendar Color Coding](#visual-calendar-color-coding)
6. [Progressive Web App (PWA) Mobile Install](#6-progressive-web-app-pwa-mobile-install)
7. [Automated Test Suites](#7-automated-test-suites)
8. [Security & Troubleshooting](#8-security--troubleshooting)

---

## 1. Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) version **18.0.0 or higher** (v20+ recommended)
- `npm` (bundled with Node.js) or `pnpm`
- Git

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ruelchristian/nbv.git
   cd nbv
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Firebase credentials in `.env.local`:
   ```ini
   VITE_FIREBASE_PROJECT_ID="nails-by-vril-bb79b"
   VITE_FIREBASE_APP_ID="1:493784820237:web:a5876e20512fedd7730344"
   VITE_FIREBASE_API_KEY="AIzaSyDcKFFKabnifap5L-WulOe8kX4WlcHmTCE"
   VITE_FIREBASE_AUTH_DOMAIN="nails-by-vril-bb79b.firebaseapp.com"
   VITE_FIREBASE_STORAGE_BUCKET="nails-by-vril-bb79b.firebasestorage.app"
   VITE_FIREBASE_MESSAGING_SENDER_ID="493784820237"
   VITE_FIREBASE_MEASUREMENT_ID="G-QCL19V6PYH"
   ```

4. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 2. Firebase Setup (From Scratch)

If you are setting up a brand new Firebase project:

1. **Create Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
   - Name it (e.g., `nails-by-vril`). Disable or enable Google Analytics as desired.

2. **Enable Authentication:**
   - In the left sidebar, navigate to **Build** $\rightarrow$ **Authentication**.
   - Click **Get Started**.
   - Under **Sign-in method**, enable **Google**. Set your support email and click **Save**.

3. **Create Cloud Firestore Database:**
   - In the left sidebar, navigate to **Build** $\rightarrow$ **Firestore Database**.
   - Click **Create Database**.
   - Select Database ID `(default)` and your nearest region (e.g., `asia-southeast1` for Singapore/Philippines).
   - Start in **Production mode**.

4. **Deploy Firestore Security Rules:**
   - The security rules in `firestore.rules` protect client data and ensure only authorized owners can manage appointments and settings.
   - Log in and deploy from your terminal:
     ```bash
     npx firebase-tools login
     npx firebase-tools deploy --only firestore:rules
     ```

5. **Register Web App to get credentials:**
   - Go to **Project Settings** (gear icon) $\rightarrow$ **General**.
   - Under **Your apps**, click the Web icon `</>` to register a web app.
   - Copy the configuration values into your `.env.local` or Vercel environment variables.

---

## 3. Environment Variables Reference

| Variable | Description | Example / Default |
|---|---|---|
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | `nails-by-vril-bb79b` |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID | `1:493784820237:web:...` |
| `VITE_FIREBASE_API_KEY` | Public Web API Key | `AIzaSyDc...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `nails-by-vril-bb79b.firebaseapp.com` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Cloud Storage Bucket | `nails-by-vril-bb79b.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Cloud Messaging Sender ID | `493784820237` |
| `VITE_FIREBASE_MEASUREMENT_ID` | Google Analytics ID | `G-QCL19V6PYH` |

*(Note: In Vite, variables prefixed with `VITE_` are bundled into the client build. Firebase Web API keys are public by design, with data access secured by Firebase Security Rules.)*

---

## 4. Deployment Guides

### Option A: Deploying to Vercel (Recommended)

Vercel provides automatic deployments whenever code is pushed to GitHub, with global CDN edge caching.

1. **Import your GitHub repository:**
   - Log into [Vercel](https://vercel.com/) with your GitHub account.
   - Click **Add New...** $\rightarrow$ **Project**.
   - Select the `nbv` repository.

2. **Configure Environment Variables in Vercel:**
   - Under **Environment Variables**, add the 7 `VITE_FIREBASE_*` variables from above (Environment: Production, Preview, Development).

3. **Deploy:**
   - Click **Deploy**. Vercel will run `npm run build` and publish your app in ~15 seconds.
   - Every future `git push origin master` will automatically update the live site!

4. **Deploy via CLI (Alternative):**
   ```bash
   npx vercel --prod
   ```

---

### Option B: Deploying to Firebase Hosting

Firebase Hosting serves the application directly from Google's CDN with zero external dependencies.

1. **Build the production bundle:**
   ```bash
   npm run build
   ```

2. **Deploy via Firebase CLI:**
   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only hosting
   ```
   The site will be live instantly at `https://<your-project-id>.web.app`.

---

## 5. Owner & Admin Operations (For Rayana)

### How to Sign In as Owner
1. Open the website on your phone or computer.
2. Click **Sign In** in the top navigation bar and select your Google account.
3. If your email is registered as an Admin, the navbar will immediately display the purple **Owner Portal [Admin]** button and redirect you to the management workspace.

---

### How to Transfer Main Admin Ownership
*(When Ruel hands over full permanent ownership to Rayana)*

1. Ruel signs into the website using `ruelchristianumel@gmail.com`.
2. Click **Owner Portal** in the navbar.
3. Switch to the **Settings** sub-tab (or *Salon Profile*).
4. Scroll down to **Authorized Owner & Sub-Admin Accounts**.
5. In the input box, type Rayana's Google email address and click **Grant Sub-Admin Access**.
6. Rayana's email will now appear in the list with a **Transfer Ownership** button.
7. Click **Transfer Main Admin** next to Rayana's name.
8. Read the prompt and click **Confirm Transfer**.
9. **Done!** Rayana is now the permanent Main Admin with the crown badge 👑, and Ruel becomes a Sub-Admin (or can be revoked).

---

### Managing Working Days & Hours
Nails by Vril defaults to **Sundays & Mondays**, but the schedule is 100% customizable:

1. In the **Owner Portal**, click the **Schedule** sub-tab.
2. **Working Days of the Week**: Click any day chip (Sun, Mon, Tue, Wed, Thu, Fri, Sat) to turn it ON or OFF. The counter updates dynamically (e.g., *"2 of 7 days open"*).
3. **Set Specific Calendar Date Available**: To open for a special holiday or VIP day (e.g., a Tuesday before Christmas), pick the date and click **Unlock Date**.
4. **Blocked / Holiday Dates**: To close for vacation or family emergencies, pick the date and click **Block Date**. Clients will not be able to book those slots.
5. Click **Save Schedule Changes**.

---

### Toggling Services ON / OFF
1. In the **Owner Portal**, click the **Services** sub-tab.
2. Each service card (e.g., *In-Studio Structured Gel*, *Home Service*, *Removal*) has an interactive **ON / OFF toggle switch**.
3. Toggling a service OFF immediately hides it from the client booking wizard while keeping past records intact.

---

### Recording Walk-In & Instagram DM Clients
When a client walks into the studio or books via Instagram DM/phone:

1. Go to the **Appointments** sub-tab or **Calendar** sub-tab in the Owner Portal.
2. Click the **+ Walk-In Booking** button.
3. Fill in the client's name, phone number, Instagram handle, and service.
4. Select the appointment date, start time, and payment method (*Cash at Studio*, *GCash (Paid)*, or *Deposit Waived*).
5. Click **Confirm & Log Booking**.
6. The appointment is immediately recorded as **Confirmed** and placed on your visual calendar with zero client GCash deposit hurdles.

---

### Visual Calendar Color Coding
In the **Calendar** sub-tab, appointments are color-coded for quick visual scanning:
- 🟣 **Burgundy (`#8B3A56`)**: Confirmed appointments
- 🟡 **Amber (`#D97706`)**: Pending review
- 🟢 **Green (`#059669`)**: Completed / Finished appointments
- 🔴 **Red (`#DC2626`)**: Cancelled / Declined

---

## 6. Progressive Web App (PWA) Mobile Install

Nails by Vril is a Progressive Web App that works like a native app without going through the Google Play Store or Apple App Store.

### On Android / Chrome / Edge:
1. Open the website in Chrome.
2. Tap the **Download App** button in the footer (or the install icon in the address bar).
3. Tap **Install App**. An NBV app icon will appear on your home screen.

### On iPhone / iPad (Safari):
1. Open the website in **Safari**.
2. Tap the **Share** button at the bottom (box with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**. The app will launch in full-screen standalone mode without Safari browser bars!

---

## 7. Automated Test Suites

The codebase includes end-to-end (E2E) automated test suites using Playwright. Run them anytime to verify your app before deploying:

```bash
# 1. Test Admin Roles & Permissions (18 checks)
node e2e-admin-roles-test.mjs

# 2. Test Visual Calendar, Services Toggles, Schedule & Transfer Ownership (23 checks)
node e2e-restored-features-test.mjs

# 3. Test Customer vs. Owner UI/UX & Walk-In Booking Engine (13 checks)
node e2e-ui-ux-roles-test.mjs
```

All 54 tests must pass (`0 failed`) before publishing production releases.

---

## 8. Security & Troubleshooting

### GitHub Secret Scanning Alert (Google API Key)
If GitHub sends an alert regarding `Google API Key detected`:
- **Why**: GitHub automatically flags keys matching `AIzaSy...`. In Firebase, web client keys are public identifiers and are **not** secret backend passwords. Access to your database is strictly guarded by `firestore.rules`.
- **How to resolve**:
  1. Open your GitHub repo $\rightarrow$ **Security** tab $\rightarrow$ **Secret scanning alerts**.
  2. Click the alert and select **Close alert** $\rightarrow$ **"Publicly known / used in client"**.
  3. (Optional Extra Security) In [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials), restrict the API key to your website HTTP referrers:
     - `https://nails-by-vril-bb79b.web.app/*`
     - `https://nbv-lyart.vercel.app/*`
     - `http://localhost:*/*`

### Common Issues

| Issue | Cause | Solution |
|---|---|---|
| **"Missing or insufficient permissions"** | Firestore rules not deployed or user not signed in | Run `npx firebase-tools deploy --only firestore:rules` and verify your email in the authorized admins list. |
| **"This time slot was just claimed"** | Another client just locked that exact date and time | Select another time slot; atomic locking prevents double-booking. |
| **PWA not updating on phone** | Service worker cached older assets | Close all tabs of the app on your phone and reopen, or tap Refresh. The app updates automatically via service worker (`skipWaiting: true`). |

---

## 💅 Handcrafted with Care for Nails by Vril
Pasig City, Metro Manila • Sunday & Monday Handcrafted Nail Artistry & Extensions

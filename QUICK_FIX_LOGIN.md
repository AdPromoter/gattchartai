# Quick Fix: Can't Login Issue

## Problem
You can't login because the Firebase Hosting domains need to be added to authorized domains.

## Solution (2 Minutes)

### Step 1: Add Authorized Domains

1. **Go directly to**: https://console.firebase.google.com/project/gantt-chart-ai/authentication/settings

2. **Scroll down** to the **"Authorized domains"** section

3. **Click "Add domain"** and add:
   - `gantt-chart-ai.web.app`
   - `gantt-chart-ai.firebaseapp.com`

4. **Click "Add"** for each domain

### Step 2: Enable Google Authentication (if not already done)

1. **Go to**: https://console.firebase.google.com/project/gantt-chart-ai/authentication/providers

2. **Click on "Google"** provider

3. **Toggle "Enable"** to ON

4. **Set Project support email** (your email)

5. **Click "Save"**

### Step 3: Test Login

1. Visit: https://gantt-chart-ai.web.app
2. Click "Sign in with Google"
3. Should work now! ✅

## Why This Happens

Firebase Authentication requires you to explicitly authorize domains for security. When you deploy to Firebase Hosting, the hosting domains (`gantt-chart-ai.web.app` and `gantt-chart-ai.firebaseapp.com`) are NOT automatically added to the authorized domains list.

## Verification

After adding domains, you should see in the authorized domains list:
- ✅ localhost (for development)
- ✅ gantt-chart-ai.web.app (for production)
- ✅ gantt-chart-ai.firebaseapp.com (for production)

## Still Having Issues?

1. **Check browser console** (F12) for error messages
2. **Common errors**:
   - `auth/unauthorized-domain` → Domain not added (fix above)
   - `auth/popup-blocked` → Allow popups in browser
   - `auth/network-request-failed` → Check internet connection

3. **Verify Google provider is enabled** in Firebase Console

## Direct Links

- **Add Authorized Domains**: https://console.firebase.google.com/project/gantt-chart-ai/authentication/settings
- **Enable Google Provider**: https://console.firebase.google.com/project/gantt-chart-ai/authentication/providers
- **Live Site**: https://gantt-chart-ai.web.app


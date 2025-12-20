# Firebase Authentication Setup - Fix Login Issue

## Problem
You can't login because the Firebase Hosting domain needs to be added to authorized domains in Firebase Authentication.

## Solution: Add Authorized Domains

### Step 1: Go to Firebase Authentication Settings

1. Open Firebase Console: https://console.firebase.google.com/project/gantt-chart-ai/authentication/settings
2. Scroll down to **Authorized domains** section

### Step 2: Add Your Hosting Domains

You need to add these domains (if not already present):

1. **gantt-chart-ai.web.app** (Firebase Hosting default domain)
2. **gantt-chart-ai.firebaseapp.com** (Firebase Hosting alternate domain)
3. **localhost** (for local development - should already be there)

### Step 3: Enable Google Authentication Provider

1. Go to: https://console.firebase.google.com/project/gantt-chart-ai/authentication/providers
2. Click on **Google** provider
3. Toggle **Enable** to ON
4. Set **Project support email** (your email)
5. Click **Save**

### Step 4: Verify OAuth Consent Screen

1. The OAuth consent screen should be automatically configured
2. If you see any warnings, complete the OAuth consent screen setup:
   - Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials/consent?project=gantt-chart-ai
   - Complete any required fields
   - Save changes

## Quick Fix Steps

1. **Add Authorized Domains**:
   - Go to: https://console.firebase.google.com/project/gantt-chart-ai/authentication/settings
   - Scroll to "Authorized domains"
   - Click "Add domain"
   - Add: `gantt-chart-ai.web.app`
   - Add: `gantt-chart-ai.firebaseapp.com`
   - Save

2. **Enable Google Provider**:
   - Go to: https://console.firebase.google.com/project/gantt-chart-ai/authentication/providers
   - Enable Google provider
   - Save

3. **Test Login**:
   - Visit: https://gantt-chart-ai.web.app
   - Try signing in with Google
   - Should work now!

## Troubleshooting

### Still Can't Login?

1. **Check Browser Console**:
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Look for authentication errors

2. **Check Firebase Console**:
   - Go to Authentication → Users
   - See if any users are being created
   - Check for error messages

3. **Common Issues**:
   - **"auth/unauthorized-domain"**: Domain not in authorized list
   - **"auth/popup-blocked"**: Browser blocking popups
   - **"auth/network-request-failed"**: Network connectivity issue

### If OAuth Consent Screen Needs Setup

1. Go to: https://console.cloud.google.com/apis/credentials/consent?project=gantt-chart-ai
2. Select "External" user type
3. Fill in required fields:
   - App name: "AI Gantt Chart"
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes (if needed):
   - email
   - profile
   - openid
5. Add test users (if in testing mode)
6. Save and continue

## Verification Checklist

- [ ] Authorized domains include `gantt-chart-ai.web.app`
- [ ] Authorized domains include `gantt-chart-ai.firebaseapp.com`
- [ ] Google authentication provider is enabled
- [ ] OAuth consent screen is configured
- [ ] Project support email is set
- [ ] Test login works on live site

## After Setup

Once configured, the login should work immediately. No code changes needed - just Firebase Console configuration.

## Support

If issues persist:
1. Check Firebase Console for error logs
2. Check browser console for JavaScript errors
3. Verify all domains are added correctly
4. Ensure Google provider is enabled


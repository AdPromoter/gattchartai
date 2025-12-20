# Firebase Setup Guide

This guide will help you configure Firebase for the Gantt Chart AI application.

## Prerequisites

Your Firebase project `gantt-chart-ai` is already created. Now you need to configure:

1. **Google Authentication** - Enable Google Sign-In
2. **Firestore Database** - Create and configure the database
3. **Security Rules** - Set up proper access rules

## Step 1: Enable Google Authentication

1. Go to [Firebase Console - Authentication](https://console.firebase.google.com/project/gantt-chart-ai/authentication/providers)
2. Click **Get Started** (if you haven't enabled it yet)
3. Click on the **Sign-in method** tab
4. Click on **Google** provider
5. Toggle **Enable** to ON
6. Set the **Project support email** (your email)
7. Click **Save**

## Step 1.5: Add Authorized Domains (IMPORTANT - Fixes Login Issue!)

**This is required for login to work on your deployed site!**

1. Go to [Firebase Authentication Settings](https://console.firebase.google.com/project/gantt-chart-ai/authentication/settings)
2. Scroll down to **Authorized domains** section
3. Click **Add domain** button
4. Add these domains (one at a time):
   - `gantt-chart-ai.web.app` (Firebase Hosting default domain)
   - `gantt-chart-ai.firebaseapp.com` (Firebase Hosting alternate domain)
5. Click **Add** for each domain
6. **localhost** should already be there for development

**Note**: Without adding these domains, you'll get an "unauthorized-domain" error when trying to login!

## Step 2: Create Firestore Database

1. In Firebase Console, click on **Firestore Database** in the left sidebar
2. Click **Create database**
3. Choose **Start in test mode** (we'll add security rules next)
4. Select a **location** for your database (choose the closest to your users)
5. Click **Enable**

## Step 3: Configure Firestore Security Rules

1. In Firestore Database, click on the **Rules** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **Publish**

**Important**: These rules ensure users can only access their own data. Each user's Gantt chart data is stored in `/users/{userId}`.

## Step 4: Verify Your Configuration

Your Firebase config is already set up in `src/config/firebase.js` with:
- ✅ Project ID: `gantt-chart-ai`
- ✅ Auth Domain: `gantt-chart-ai.firebaseapp.com`
- ✅ API Key and other credentials

## Step 5: Test the Application

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:5173` (or your dev port)

3. Click "Sign in with Google"

4. Complete the Google sign-in flow

5. Your data will be automatically saved to Firestore under `/users/{userId}`

## Data Structure

The app stores data in Firestore with this structure:

```
/users/{userId}
  - sheets: Array of sheet objects
  - activeSheetId: String
  - visibleColumns: Object
  - savedAt: Timestamp
  - updatedAt: Timestamp
```

## Troubleshooting

### "Firebase: Error (auth/popup-blocked)"
- Your browser is blocking popups. Allow popups for your domain and try again.

### "Firebase: Error (auth/unauthorized-domain)"
- Add your domain to authorized domains in Firebase Console:
  1. Go to Authentication → Settings → Authorized domains
  2. Add your domain (e.g., `localhost` for development)

### "Permission denied" when saving data
- Check that Firestore security rules are published correctly
- Verify the user is authenticated (check Firebase Console → Authentication)

### Data not loading
- Check browser console for errors
- Verify Firestore database is created and rules are published
- Check that the user document exists in Firestore

## Production Deployment

When deploying to production:

1. **Update Security Rules** - Consider adding more restrictive rules for production
2. **Add Production Domain** - Add your production domain to authorized domains
3. **Enable App Check** (optional) - For additional security
4. **Set up Custom Domain** (optional) - For Firebase Hosting

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Console](https://console.firebase.google.com/project/gantt-chart-ai/overview)



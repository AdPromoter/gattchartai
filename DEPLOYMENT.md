# Deployment Guide

## ✅ Successfully Deployed!

Your application is now live at:
- **Hosting URL**: https://gantt-chart-ai.web.app
- **Project Console**: https://console.firebase.google.com/project/gantt-chart-ai/overview

## Deployment Status

✅ Firebase Hosting configured
✅ Application built and deployed
✅ Firebase Authentication enabled
✅ Firestore Database ready

## Environment Variables for Production

For production deployment with OpenAI AI features, you have two options:

### Option 1: Build-time Environment Variables (Recommended)

1. Create a `.env.production` file in the root directory:
   ```bash
   VITE_OPENAI_API_KEY=sk-your-api-key-here
   ```

2. Build and deploy:
   ```bash
   npm run build
   npx firebase deploy --only hosting
   ```

**Note**: The `.env.production` file should NOT be committed to git (already in `.gitignore`).

### Option 2: Firebase Hosting Environment Variables

Firebase Hosting doesn't support runtime environment variables for client-side apps. You'll need to:
1. Set the API key in `.env.production` before building
2. Or use Firebase Functions to proxy API calls (more complex)

## Deployment Commands

```bash
# Build for production
npm run build

# Deploy to Firebase Hosting
npm run deploy
# OR
npx firebase deploy --only hosting

# View deployment logs
npx firebase hosting:channel:list
```

## Post-Deployment Checklist

1. ✅ **Test Authentication**
   - Visit https://gantt-chart-ai.web.app
   - Try signing in with Google
   - Verify user data is saved to Firestore

2. ✅ **Test AI Features** (if API key is set)
   - Open the AI Assistant
   - Try voice or text input
   - Verify AI responses work

3. ✅ **Verify Firestore Security Rules**
   - Go to Firebase Console → Firestore Database → Rules
   - Ensure rules are published:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

4. ✅ **Check Authorized Domains**
   - Go to Firebase Console → Authentication → Settings → Authorized domains
   - Ensure `gantt-chart-ai.web.app` and `gantt-chart-ai.firebaseapp.com` are listed

## Updating the Deployment

To update your deployed application:

```bash
# Make your changes
# Then build and deploy:
npm run build
npm run deploy
```

## Custom Domain (Optional)

To use a custom domain:

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Follow the setup instructions
4. Update DNS records as instructed
5. Wait for SSL certificate provisioning (can take a few hours)

## Monitoring

- **Analytics**: Firebase Analytics is automatically enabled
- **Performance**: Check Firebase Console → Performance
- **Errors**: Check Firebase Console → Crashlytics (if enabled)

## Troubleshooting

### Build Errors
- Check that all dependencies are installed: `npm install`
- Verify Node.js version compatibility
- Check for TypeScript/ESLint errors

### Deployment Errors
- Ensure you're logged in: `npx firebase login`
- Verify project ID: `npx firebase use gantt-chart-ai`
- Check Firebase Console for project status

### Runtime Errors
- Check browser console for errors
- Verify Firebase services are enabled in Console
- Check Firestore security rules
- Verify authorized domains in Authentication settings

## Security Notes

1. **API Keys**: Never commit API keys to git
2. **Firestore Rules**: Always use proper security rules
3. **CORS**: Firebase handles CORS automatically
4. **HTTPS**: Firebase Hosting provides HTTPS by default

## Next Steps

1. Set up custom domain (optional)
2. Configure Firebase Analytics (optional)
3. Set up error monitoring (optional)
4. Add CI/CD pipeline (optional)

For more information, see:
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Firebase Console](https://console.firebase.google.com/project/gantt-chart-ai/overview)

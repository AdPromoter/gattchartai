# Environment Setup Guide

This app requires API keys for AI functionality and Google authentication. Follow these steps:

## Step 1: Get an OpenAI API Key (Optional but Recommended)

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in to your OpenAI account
3. Click "Create new secret key"
4. Copy your API key (starts with `sk-`)

## Step 2: Get a Google OAuth Client ID (Required for Login)

1. Go to https://console.cloud.google.com/
2. Create a new project or select an existing one
3. Enable the **Google+ API** (or **Google Identity Services**)
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Configure the OAuth consent screen:
   - User Type: External (or Internal if using Google Workspace)
   - App name: "AI Gantt Chart"
   - Support email: Your email
   - Authorized domains: Your domain (or `localhost` for development)
6. Create OAuth client ID:
   - Application type: **Web application**
   - Name: "Gantt Chart Web Client"
   - Authorized JavaScript origins: 
     - `http://localhost:5173` (for development)
     - Your production domain (e.g., `https://yourdomain.com`)
   - Authorized redirect URIs: (can leave empty for this implementation)
7. Copy the **Client ID** (looks like: `123456789-abc.apps.googleusercontent.com`)

## Step 3: Create Environment File

1. Create a file named `.env` in the root directory (same folder as `package.json`)
2. Add your keys:

```bash
# Required: Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Optional: OpenAI API Key (for AI features)
VITE_OPENAI_API_KEY=sk-your-api-key-here
```

**Important**: Never commit the `.env` file to git! It's already in `.gitignore`.

## Step 3: Restart the Dev Server

After creating the `.env` file, restart your development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## How It Works

- **With API Key**: The app uses OpenAI GPT-4o-mini to understand your natural language prompts
- **Without API Key**: Falls back to simple pattern matching (basic functionality)

## Cost Information

- **Model Used**: `gpt-4o-mini` (cost-effective)
- **Approximate Cost**: ~$0.01 per 1000 prompts
- **Usage**: Only called when you submit text/voice input through the AI assistant

## Alternative AI Providers

To use a different AI provider (Anthropic, Google, etc.), modify `src/services/aiService.js`:

1. Update the `parseAITaskWithLLM` function
2. Change the API endpoint and headers
3. Adjust the prompt format if needed

## Troubleshooting

**API key not working?**
- Check that `.env` file is in the root directory
- Verify the variable name is exactly `VITE_OPENAI_API_KEY`
- Restart the dev server after creating/changing `.env`
- Check browser console for error messages

**Want to test without API key?**
- Simply don't create the `.env` file
- The app will use simple parsing (less intelligent but still works)


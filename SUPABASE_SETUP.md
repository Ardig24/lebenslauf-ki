# Supabase Edge Function Setup for CVprofi

This guide explains how to deploy the OpenAI proxy Edge Function to secure your API key.

## Why This Is Needed

Without this setup, your OpenAI API key would be exposed in the browser's JavaScript bundle. Anyone could extract it and use it for their own purposes. The Edge Function keeps your API key secure on the server.

## Prerequisites

1. A Supabase project (you should already have this)
2. Supabase CLI installed
3. Your OpenAI API key

## Step 1: Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# or with npm
npm install -g supabase
```

## Step 2: Login to Supabase

```bash
supabase login
```

This will open a browser window to authenticate.

## Step 3: Link Your Project

```bash
cd /path/to/lebenslauf-antigravity
supabase link --project-ref YOUR_PROJECT_REF
```

You can find your project ref in the Supabase dashboard URL:
`https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

## Step 4: Set the OpenAI API Key Secret

```bash
supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Important:** This stores your API key securely on Supabase's servers. It will NOT be exposed to the browser.

## Step 5: Deploy the Edge Function

```bash
supabase functions deploy openai-proxy
```

This deploys the function at `supabase/functions/openai-proxy/index.ts`.

## Step 6: Verify Deployment

Go to your Supabase dashboard → Edge Functions → You should see `openai-proxy` listed.

## Step 7: Remove VITE_OPENAI_API_KEY (Optional but Recommended)

Once the Edge Function is deployed, you can remove `VITE_OPENAI_API_KEY` from your `.env.local` file. The app will automatically use the secure Edge Function instead.

```bash
# In .env.local, remove or comment out:
# VITE_OPENAI_API_KEY=sk-...
```

## How It Works

1. **User makes AI request** → Frontend calls Supabase Edge Function
2. **Edge Function verifies user** → Checks the user is logged in
3. **Edge Function calls OpenAI** → Using the secret API key
4. **Response returned to user** → API key never exposed

## Troubleshooting

### "Unauthorized" error
- Make sure the user is logged in
- Check that your Supabase auth is working

### "OpenAI API key not configured" error
- Run `supabase secrets set OPENAI_API_KEY=sk-...` again
- Redeploy the function: `supabase functions deploy openai-proxy`

### Function not found
- Make sure you ran `supabase functions deploy openai-proxy`
- Check the Supabase dashboard → Edge Functions

## Local Development

For local development, you can still use `VITE_OPENAI_API_KEY` in `.env.local`. The app will fall back to direct API calls when Supabase is not configured or when the Edge Function is unavailable.

## Security Notes

- The Edge Function requires authentication - only logged-in users can use AI features
- Rate limiting can be added to the Edge Function if needed
- The API key is stored in Supabase Secrets, not in your code

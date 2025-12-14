# 🚀 Setup Guide - TaskMaster

## Prerequisites Checklist

Before you begin, make sure you have:
- ✅ Node.js 18+ installed ([nodejs.org](https://nodejs.org))
- ✅ npm or yarn package manager
- ✅ A Supabase account ([supabase.com](https://supabase.com))
- ✅ Code editor (VS Code recommended)

## Step-by-Step Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in the details:
   - **Name**: TaskMaster (or your preferred name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
4. Click **"Create new project"**
5. Wait 2-3 minutes for setup to complete

### Step 2: Set Up Database Schema

1. In your Supabase Dashboard, navigate to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open the `tables.sql` file from this project
4. Copy ALL the contents
5. Paste into the SQL Editor
6. Click **"Run"** (or press Cmd/Ctrl + Enter)
7. You should see: **"Success. No rows returned"**

This creates:
- ✅ `tasks` table with RLS policies
- ✅ `task_analytics` table for tracking
- ✅ `user_stats` table for gamification
- ✅ Triggers for auto-creating user data
- ✅ All security policies

### Step 3: Get Your Supabase Credentials

1. In Supabase Dashboard, go to **Settings** (gear icon) → **API**
2. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)
3. Keep this tab open (you'll need these values next)

### Step 4: Configure Environment Variables

1. In the project root directory, create a file named `.env`
2. Add the following lines:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

3. Replace the values with your actual credentials from Step 3
4. Save the file

**Example:**
```env
VITE_SUPABASE_URL=https://abcdefghijk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 5: Enable Google OAuth (Optional but Recommended)

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Find **Google** in the list
3. Toggle it **ON**
4. You'll need Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable **Google+ API**
   - Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: Add your Supabase callback URL
     - Format: `https://YOUR_PROJECT_URL/auth/v1/callback`
     - Example: `https://abcdefghijk.supabase.co/auth/v1/callback`
   - Copy **Client ID** and **Client Secret**
5. Paste these into Supabase Google Provider settings
6. Click **Save**

### Step 6: Install Dependencies

Open terminal in the project directory and run:

```bash
npm install
```

This will install all required packages:
- React and React Router
- Tailwind CSS
- Framer Motion
- Supabase client
- And more...

Wait for the installation to complete (usually 1-2 minutes).

### Step 7: Start Development Server

Run:

```bash
npm run dev
```

You should see:

```
  VITE v7.2.7  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 8: Open the App

1. Open your browser
2. Navigate to: `http://localhost:5173`
3. You should see the TaskMaster authentication page! 🎉

## Testing Your Setup

### 1. Test Authentication

1. Click **"Sign up with Email"**
2. Enter email and password
3. Check your email for verification link
4. Click the link to verify
5. You should be logged in!

OR

1. Click **"Continue with Google"** (if you set up OAuth)
2. Select your Google account
3. Grant permissions
4. You should be logged in!

### 2. Test Task Creation

Try these examples:

```
Buy groceries tomorrow at 3pm #shopping !high
```
- Should create a task with:
  - ✅ Due date: Tomorrow at 3pm
  - ✅ Priority: High
  - ✅ Tag: shopping

```
Call dentist next Monday !urgent
```
- Should create a task with:
  - ✅ Due date: Next Monday
  - ✅ Priority: Urgent

### 3. Test Views

- Click **"Kanban"** - Should show columns (Urgent / To Do / Done)
- Click **"Calendar"** - Should show monthly calendar
- Click **"Analytics"** - Should show productivity dashboard
- Click **"Focus"** - Should show Pomodoro timer

### 4. Test Gamification

1. Complete a task (click checkbox)
2. Check the sidebar - you should see:
   - ✅ XP increase
   - ✅ Progress bar update
   - ✅ "Getting Started" achievement unlocked

### 5. Test Command Palette

1. Press `Cmd + K` (Mac) or `Ctrl + K` (Windows/Linux)
2. Command palette should appear
3. Type to search
4. Use arrow keys to navigate
5. Press Enter to execute

### 6. Test Export

1. Press `Cmd/Ctrl + K`
2. Type "export"
3. Select "Export as JSON" or "Export as CSV" or "Export as Markdown"
4. File should download

## Common Issues & Solutions

### Issue 1: "Failed to fetch tasks"

**Cause**: RLS policies not set up correctly

**Solution**:
1. Go to Supabase SQL Editor
2. Re-run the `tables.sql` file
3. Make sure you see "Success" message
4. Refresh the app

### Issue 2: "Supabase client error"

**Cause**: Environment variables not loaded

**Solution**:
1. Check `.env` file exists in root directory
2. Check file starts with `VITE_` prefix
3. Restart dev server (`npm run dev`)
4. Hard refresh browser (Cmd/Ctrl + Shift + R)

### Issue 3: Tasks not appearing

**Cause**: User not associated with tasks

**Solution**:
1. Logout and login again
2. Check browser console for errors (F12)
3. Verify RLS policies are active in Supabase Dashboard:
   - Go to **Database** → **Policies**
   - You should see policies for `tasks` table

### Issue 4: Google OAuth not working

**Cause**: Redirect URI mismatch

**Solution**:
1. Check Google Cloud Console redirect URIs
2. Must exactly match: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
3. No trailing slash
4. Must be HTTPS (not HTTP)

### Issue 5: XP/Achievements not updating

**Cause**: User stats not created

**Solution**:
1. Check if trigger exists:
   - Supabase Dashboard → **Database** → **Functions**
   - Should see `handle_new_user`
2. Manually create user stats:
   - Go to **Table Editor** → `user_stats`
   - Click **Insert row**
   - Add your `user_id` (get from `auth.users` table)

## Verify Database Setup

Run this query in SQL Editor to check everything is set up:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tasks', 'task_analytics', 'user_stats');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('tasks', 'task_analytics', 'user_stats');

-- Check policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check triggers exist
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

You should see:
- ✅ 3 tables (tasks, task_analytics, user_stats)
- ✅ RLS enabled on all 3 tables
- ✅ Multiple policies
- ✅ 2 triggers (handle_new_user, update_updated_at)

## Production Deployment

### Build for Production

```bash
npm run build
```

This creates a `dist/` folder with optimized files.

### Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click **"Import Project"**
4. Select your repository
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **"Deploy"**

### Deploy to Netlify

1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click **"New site from Git"**
4. Select your repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Add environment variables (same as Vercel)
7. Click **"Deploy site"**

## Security Checklist

Before going live, verify:

- ✅ `.env` is in `.gitignore` (already included)
- ✅ RLS policies are enabled on all tables
- ✅ No API keys in code
- ✅ HTTPS enabled (automatic on Vercel/Netlify)
- ✅ Google OAuth redirect URIs updated for production URL
- ✅ Supabase rate limiting enabled (Dashboard → Settings → API)

## Next Steps

Now that you're set up:

1. **Customize branding** - Update colors in `tailwind.config.js`
2. **Add custom achievements** - Edit `src/components/Gamification.jsx`
3. **Modify XP values** - Update XP map in `src/context/TodoContext.jsx`
4. **Add more views** - Create new components
5. **Integrate external services** - Use Supabase Edge Functions

## Support

If you encounter issues:

1. Check browser console (F12) for errors
2. Check Supabase logs (Dashboard → Logs)
3. Review this setup guide
4. Check `FEATURES.md` for implementation details

## Success! 🎉

If you can:
- ✅ Sign up and login
- ✅ Create tasks
- ✅ See XP increase when completing tasks
- ✅ View different layouts (List, Kanban, Calendar, Analytics)
- ✅ Use command palette (Cmd/Ctrl + K)

**Congratulations! TaskMaster is ready to use!**

---

**Happy task managing! 📝✨**

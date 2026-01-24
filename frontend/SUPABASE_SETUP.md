# Supabase Setup Guide

This guide will help you set up Supabase for the DataRefinery application.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A Supabase project created

## Step 1: Create a Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in your project details:
   - Name: `DataRefinery` (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Choose the closest region to your users
4. Click "Create new project"
5. Wait for the project to be set up (takes a few minutes)

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

## Step 3: Set Up Environment Variables

1. In the `frontend` directory, create a `.env` file (copy from `.env.example`)
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. **Important**: Never commit your `.env` file to version control!

## Step 4: Set Up Database Schema

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the contents of `supabase-schema.sql`
4. Click "Run" to execute the SQL
5. Verify the tables were created by going to **Table Editor**

You should see:
- `user_profiles` table
- `activity_logs` table

## Step 5: Configure Authentication

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Enable **Email** provider (should be enabled by default)
3. Configure email templates if needed (optional)
4. Set up email redirect URLs:
   - Add your app URL to "Redirect URLs"
   - For development: `http://localhost:5173`
   - For production: `https://your-domain.com`

## Step 6: (Optional) Set Up Storage Bucket

If you want to store processed files:

1. Go to **Storage** in your Supabase dashboard
2. Click "Create a new bucket"
3. Name: `user-files`
4. Make it **Private** (not public)
5. Click "Create bucket"
6. Go to **Storage** → **Policies**
7. Create policies for the bucket (see comments in `supabase-schema.sql`)

## Step 7: Install Dependencies

In the `frontend` directory, run:

```bash
npm install
```

This will install `@supabase/supabase-js` and other dependencies.

## Step 8: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. You should see the authentication screen
3. Try creating an account
4. Check your Supabase dashboard → **Authentication** → **Users** to see the new user
5. Check **Table Editor** → **user_profiles** to see the profile was created

## Troubleshooting

### "Supabase URL or Anon Key is missing"
- Make sure your `.env` file exists in the `frontend` directory
- Check that the variable names are correct: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart your development server after creating/updating `.env`

### "Failed to create account"
- Check that Email provider is enabled in Supabase
- Verify your email address is valid
- Check browser console for detailed error messages

### "Row Level Security policy violation"
- Make sure you ran the SQL schema file completely
- Check that RLS policies were created correctly
- Verify you're authenticated when trying to access data

### Database tables not appearing
- Make sure you ran the SQL in the SQL Editor
- Check for any SQL errors in the Supabase dashboard
- Verify you're looking at the correct database schema

## Security Notes

1. **Never expose your service_role key** - only use the anon key in the frontend
2. **RLS is enabled** - users can only access their own data
3. **Environment variables** - keep your `.env` file out of version control
4. **Storage policies** - configure storage policies if using file storage

## Next Steps

- Customize the authentication flow
- Add more user profile fields
- Integrate activity logs with Supabase storage
- Set up email notifications
- Configure production environment variables

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)

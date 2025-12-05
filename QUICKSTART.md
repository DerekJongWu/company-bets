# Quick Start Guide

## Get Started in 3 Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Supabase
1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Open `.env` and add your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Where to find these?**
- Go to your Supabase project dashboard
- Click on Settings → API
- Copy the Project URL and anon/public key

### Step 3: Run the App
```bash
npm run dev
```

Visit `http://localhost:5173` to see your app!

## First Time Setup Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with Supabase credentials
- [ ] Supabase tables created (see main README)
- [ ] RLS policies configured in Supabase (see main README)
- [ ] Realtime enabled for tables in Supabase
- [ ] At least one admin user created

## Creating Your First Admin User

1. Sign up through the app normally
2. In Supabase dashboard, go to Table Editor → users
3. Find your user and set `is_admin` to `true`
4. Refresh the app - you'll now see the Admin Panel option

## Testing the App

1. **Sign up** a new account (starts with $100 balance)
2. **Create a bet** - ask a yes/no question
3. **Place a prediction** - bet $1 on YES or NO
4. **As admin** - resolve or cancel the bet
5. **Request a refill** when your balance is low

## Common Issues

### App shows "Missing Supabase environment variables"
- Make sure `.env` file exists in the project root
- Check that the variable names start with `VITE_`
- Restart the dev server after creating `.env`

### Can't sign up or login
- Verify Supabase Auth is enabled
- Check that RLS policies are configured
- Look for errors in browser console

### Balance not updating
- Enable Realtime for the `users` table in Supabase
- Check RLS policies allow reading/updating user data

## Next Steps

See [README.md](README.md) for:
- Complete feature documentation
- Database schema details
- RLS policy configuration
- Production build instructions

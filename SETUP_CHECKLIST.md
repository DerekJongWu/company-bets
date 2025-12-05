# Setup Checklist

Use this checklist to set up your Company Bets application.

## Prerequisites

- [ ] Node.js 16+ installed
- [ ] npm installed
- [ ] Supabase account created
- [ ] Supabase project created with the schema provided

## Installation Steps

### 1. Project Setup
- [x] Project files created
- [x] Dependencies configured in package.json
- [ ] Run `npm install`

### 2. Environment Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Get Supabase URL from: Settings → API → Project URL
- [ ] Get Supabase Anon Key from: Settings → API → Project API keys (anon/public)
- [ ] Add both to `.env` file
- [ ] Verify environment variables start with `VITE_`

### 3. Supabase Database Setup
- [ ] All tables created (users, bets, user_predictions, refill_requests, transactions)
- [ ] Schema matches the provided SQL
- [ ] Foreign key relationships set up correctly

### 4. Supabase RLS (Row Level Security)
- [ ] Open Supabase SQL Editor
- [ ] Copy contents of `supabase-rls-policies.sql`
- [ ] Run the SQL script
- [ ] Verify no errors in execution
- [ ] Confirm RLS is enabled on all tables

### 5. Supabase Realtime
Go to Database → Replication and enable for:
- [ ] users table
- [ ] bets table
- [ ] user_predictions table
- [ ] refill_requests table

### 6. Supabase Authentication
- [ ] Email provider enabled (Settings → Authentication → Providers)
- [ ] Email confirmation disabled (optional, for easier testing)
- [ ] Site URL configured if deploying

### 7. First Run
- [ ] Run `npm run dev`
- [ ] App opens at http://localhost:5173
- [ ] No console errors
- [ ] No Supabase connection errors

### 8. Create Test Users
- [ ] Sign up with a test account
- [ ] Verify user appears in `users` table
- [ ] Verify starting balance is $100.00
- [ ] Verify `is_admin` is false

### 9. Create Admin User
In Supabase SQL Editor:
- [ ] Run: `UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';`
- [ ] Refresh the app
- [ ] Verify "Show Admin Panel" button appears

### 10. Test Core Features

#### Authentication
- [ ] Sign up creates account
- [ ] Login works
- [ ] Logout works
- [ ] Protected routes redirect to login when not authenticated
- [ ] Balance shows $100 for new users

#### Create Bet
- [ ] Click "Create New Bet" opens modal
- [ ] Can enter question
- [ ] Can set future closing time
- [ ] Bet appears in list after creation
- [ ] Real-time: Other users see new bet immediately

#### Place Prediction
- [ ] Click YES or NO on open bet
- [ ] Balance decreases by $1
- [ ] Prediction is saved and displayed
- [ ] Can change prediction (no extra cost)
- [ ] Cannot predict on closed/resolved bets
- [ ] Cannot predict with insufficient balance

#### Admin Panel (Admin only)
- [ ] "Show Admin Panel" button visible
- [ ] Can see pending bets to resolve
- [ ] Can resolve bet as YES or NO
- [ ] Winners receive payouts
- [ ] Can cancel bet
- [ ] Cancelled bets refund all participants
- [ ] Can see refill requests
- [ ] Can approve/deny refill requests

#### Refill System
- [ ] Click "Request Refill" opens modal
- [ ] Can request custom amount
- [ ] Quick buttons work ($50, $100, $200)
- [ ] Request appears in admin panel
- [ ] Admin can approve
- [ ] Balance updates after approval

#### Filters
- [ ] "All Bets" shows all bets
- [ ] "Open Bets" shows only open bets
- [ ] "My Predictions" shows bets user predicted on
- [ ] "Resolved" shows only resolved bets
- [ ] Counts are accurate

#### Real-time Updates
- [ ] Balance updates without refresh
- [ ] New bets appear without refresh
- [ ] Predictions update without refresh
- [ ] Bet resolutions update without refresh

## Production Deployment Checklist

### Pre-Deploy
- [ ] Run `npm run build` successfully
- [ ] No build errors
- [ ] Test production build with `npm run preview`
- [ ] All features work in production build

### Supabase Production
- [ ] RLS policies reviewed and secure
- [ ] Email templates configured
- [ ] Rate limiting configured
- [ ] CORS settings configured
- [ ] API key rotation plan

### Deployment
- [ ] Environment variables configured on hosting platform
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Site accessible and working
- [ ] Real-time features working in production

### Post-Deploy
- [ ] Create admin users in production
- [ ] Test all critical flows
- [ ] Monitor error logs
- [ ] Set up monitoring/alerting (optional)

## Troubleshooting Reference

### Common Issues

**"Missing Supabase environment variables"**
- Check `.env` file exists
- Verify variable names: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart dev server after creating/editing `.env`

**"Can't sign up or login"**
- Check Supabase Auth is enabled
- Verify email provider is enabled
- Check RLS policies allow inserts to `users` table
- Look at browser console for specific errors

**"Balance not updating"**
- Enable Realtime for `users` table
- Check RLS policies allow updates to `users` table
- Verify websocket connection in Network tab

**"Predictions not saving"**
- Check balance is sufficient ($1 minimum)
- Verify RLS policies for `user_predictions` table
- Check if bet is still open
- Look at browser console for errors

**"Admin panel not showing"**
- Verify user has `is_admin = true` in database
- Refresh the page after setting admin flag
- Check user is logged in

**"Real-time not working"**
- Enable Realtime in Supabase for all tables
- Check websocket connection in browser Network tab
- Verify RLS policies allow reads
- Try refreshing the page

## Support Resources

- [README.md](README.md) - Full documentation
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Project overview
- [Supabase Docs](https://supabase.com/docs) - Official documentation
- [React Docs](https://react.dev) - React documentation
- [Tailwind CSS Docs](https://tailwindcss.com/docs) - Styling reference

## Success Criteria

You're done when:
- [ ] You can sign up and login
- [ ] You can create a bet
- [ ] You can place and change predictions
- [ ] Balance updates correctly
- [ ] Admins can resolve bets
- [ ] Winners receive payouts
- [ ] Refill system works
- [ ] Real-time updates work
- [ ] Mobile responsive design works
- [ ] No console errors

---

**Need help?** Check the troubleshooting section above or review the README.md for detailed information.

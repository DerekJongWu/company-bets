# Company Bets - Prop Betting Application

A React-based prop betting application where coworkers can create and bet on yes/no questions. Built with React, Vite, Tailwind CSS, and Supabase.

## Features

### User Features
- **Authentication**: Email/password signup and login
- **User Balance**: Every new user starts with $100
- **Create Bets**: Create yes/no questions with closing times
- **Place Predictions**: Bet $1 on YES or NO for any open bet
- **Change Predictions**: Change your prediction before betting closes (no additional cost)
- **View Bets**: Filter bets by All, Open, My Predictions, or Resolved
- **Request Refills**: Request balance refills from admins
- **Real-time Updates**: Balance and bet updates happen in real-time

### Admin Features
- **Resolve Bets**: Mark bets as resolved with YES or NO outcome
- **Cancel Bets**: Cancel bets and refund all participants
- **Approve Refills**: Review and approve/deny user refill requests
- **Winner Payouts**: Automatic $1 payout to all winners when bet is resolved

## Tech Stack

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router v6
- **Database/Auth**: Supabase
- **Real-time**: Supabase Realtime subscriptions

## Prerequisites

- Node.js 16+ and npm
- A Supabase account and project

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd company-bets
npm install
```

### 2. Configure Supabase

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup

The following tables should already be set up in your Supabase project:

- `users` - User profiles with balance
- `bets` - Bet questions and metadata
- `user_predictions` - User predictions on bets
- `refill_requests` - User balance refill requests
- `transactions` - Transaction history

### 4. Set Up Row Level Security (RLS) Policies

You'll need to configure RLS policies in Supabase for security. Here are the recommended policies:

#### Users Table
```sql
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
```

#### Bets Table
```sql
-- Anyone authenticated can read bets
CREATE POLICY "Anyone can view bets" ON bets
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can create bets
CREATE POLICY "Users can create bets" ON bets
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Admins can update bets
CREATE POLICY "Admins can update bets" ON bets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );
```

#### User Predictions Table
```sql
-- Users can view all predictions
CREATE POLICY "Anyone can view predictions" ON user_predictions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert their own predictions
CREATE POLICY "Users can insert own predictions" ON user_predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own predictions
CREATE POLICY "Users can update own predictions" ON user_predictions
  FOR UPDATE USING (auth.uid() = user_id);
```

#### Refill Requests Table
```sql
-- Users can view their own requests
CREATE POLICY "Users can view own refill requests" ON refill_requests
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true
  ));

-- Users can create refill requests
CREATE POLICY "Users can create refill requests" ON refill_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can update refill requests
CREATE POLICY "Admins can update refill requests" ON refill_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );
```

#### Transactions Table
```sql
-- Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- System can insert transactions
CREATE POLICY "Authenticated users can insert transactions" ON transactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### 5. Enable Realtime

In your Supabase dashboard, enable Realtime for these tables:
- `users`
- `bets`
- `user_predictions`
- `refill_requests`

Go to Database → Replication → Enable for these tables.

### 6. Create Admin Users

To make a user an admin, update their record in the `users` table:

```sql
UPDATE users SET is_admin = true WHERE email = 'admin@example.com';
```

### 7. Run the Application

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
company-bets/
├── src/
│   ├── components/
│   │   ├── AdminPanel.jsx          # Admin features
│   │   ├── BetCard.jsx             # Individual bet card
│   │   ├── BetList.jsx             # List of bets with filters
│   │   ├── CreateBetModal.jsx      # Modal to create new bet
│   │   ├── Navbar.jsx              # Navigation bar with balance
│   │   ├── ProtectedRoute.jsx      # Auth route wrapper
│   │   └── RefillRequestModal.jsx  # Modal to request refill
│   ├── pages/
│   │   ├── Dashboard.jsx           # Main dashboard page
│   │   ├── Login.jsx               # Login page
│   │   └── Signup.jsx              # Signup page
│   ├── lib/
│   │   └── supabase.js             # Supabase client config
│   ├── store/
│   │   └── authStore.js            # Zustand auth store
│   ├── App.jsx                     # Main app component
│   ├── main.jsx                    # App entry point
│   └── index.css                   # Global styles
├── .env                            # Environment variables (create this)
├── .env.example                    # Example env file
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## Business Logic

### Betting Flow
1. User creates a bet with a question and closing time
2. Other users can predict YES or NO (costs $1 for first prediction)
3. Users can change their prediction before closing time (no extra cost)
4. Admin resolves the bet after closing time
5. Winners automatically receive $1 payout

### Balance Management
- New users start with $100
- Each prediction costs $1 (deducted immediately)
- Changing prediction is free
- Winners get $1 back (net zero if they won)
- Cancelled bets refund $1 to all participants
- Users can request refills, admins approve

### Bet States
- **open**: Bet is active and accepting predictions
- **closed**: Past closing time, waiting for admin resolution
- **resolved**: Admin has determined the outcome
- **cancelled**: Bet cancelled, all funds refunded

## Key Features Implemented

✅ Real-time balance updates
✅ Real-time bet updates
✅ Bet filtering (All, Open, My Predictions, Resolved)
✅ Prediction placement with balance validation
✅ Prediction changes (no additional cost)
✅ Admin panel for resolving/cancelling bets
✅ Refill request system
✅ Transaction history tracking
✅ Mobile-responsive design
✅ Loading states and error handling
✅ Protected routes

## Usage

### Creating a Bet
1. Click "Create New Bet"
2. Enter your yes/no question
3. Set the closing date/time
4. Submit

### Placing a Prediction
1. Find an open bet
2. Click YES or NO
3. Your balance is deducted by $1
4. You can change your prediction anytime before closing

### Admin Actions
1. Click "Show Admin Panel" (only visible to admins)
2. **Resolve Bets**: Choose YES or NO outcome, winners get paid
3. **Cancel Bets**: Refund all participants
4. **Approve Refills**: Review and approve balance refill requests

## Build for Production

```bash
npm run build
```

The production build will be in the `dist` folder.

## Preview Production Build

```bash
npm run preview
```

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure you've created a `.env` file with the correct Supabase URL and anon key

### Users can't sign up
- Check that RLS policies are correctly configured
- Verify Supabase Auth is enabled

### Real-time updates not working
- Ensure Realtime is enabled for all relevant tables in Supabase
- Check that RLS policies allow reading the tables

### Balance not updating after prediction
- Check browser console for errors
- Verify the `users` table RLS policies allow updates
- Check that transactions are being created

## Future Enhancements

- Add bet categories/tags
- Implement bet search functionality
- Add user statistics and leaderboards
- Email notifications for bet resolutions
- Betting history and analytics
- Support for custom bet amounts
- Comment system on bets
- Mobile app version

## License

MIT

## Support

For issues or questions, please open an issue in the repository.

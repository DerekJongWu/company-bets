-- ============================================
-- Row Level Security Policies for Company Bets App
-- ============================================
-- Run this entire script in your Supabase SQL Editor
-- This will enable RLS and create all necessary policies

-- ============================================
-- STEP 1: Drop existing policies (if any)
-- ============================================
-- IMPORTANT: Drop policies BEFORE dropping the function they depend on
-- This prevents errors if you run the script multiple times

-- Users table policies
DROP POLICY IF EXISTS "Users can view profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can update any profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Bets table policies
DROP POLICY IF EXISTS "Anyone can view bets" ON bets;
DROP POLICY IF EXISTS "Users can create bets" ON bets;
DROP POLICY IF EXISTS "Admins can update bets" ON bets;

-- User predictions table policies
DROP POLICY IF EXISTS "Anyone can view predictions" ON user_predictions;
DROP POLICY IF EXISTS "Users can insert own predictions" ON user_predictions;
DROP POLICY IF EXISTS "Users can update own predictions" ON user_predictions;

-- Refill requests table policies
DROP POLICY IF EXISTS "Users can view own refill requests" ON refill_requests;
DROP POLICY IF EXISTS "Users can create refill requests" ON refill_requests;
DROP POLICY IF EXISTS "Admins can update refill requests" ON refill_requests;

-- Transactions table policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;

-- ============================================
-- STEP 1b: Drop existing functions (if any)
-- ============================================
-- Now we can safely drop the function since no policies depend on it

DROP FUNCTION IF EXISTS is_admin(UUID);

-- ============================================
-- STEP 2: Enable RLS on all tables
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refill_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: HELPER FUNCTION FOR ADMIN CHECK
-- ============================================
-- This function bypasses RLS to check if a user is an admin
-- Prevents infinite recursion in policies

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.id = user_id AND users.is_admin = true
  );
END;
$$;

-- ============================================
-- STEP 4: USERS TABLE POLICIES
-- ============================================

-- Users can view their own profile OR admins can view all
-- Uses the helper function to avoid infinite recursion
CREATE POLICY "Users can view profiles" ON users
  FOR SELECT
  USING (
    auth.uid() = id
    OR is_admin(auth.uid())
  );

-- Users can update their own profile (balance updates)
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Admins can update any user's profile (for making admins, etc.)
CREATE POLICY "Admins can update any profile" ON users
  FOR UPDATE
  USING (is_admin(auth.uid()));

-- Users can only insert their own profile during signup
-- This ensures users can't create profiles for other users
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- BETS TABLE POLICIES
-- ============================================

-- Anyone authenticated can read bets
CREATE POLICY "Anyone can view bets" ON bets
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can create bets
CREATE POLICY "Users can create bets" ON bets
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Admins can update bets (for resolving/cancelling)
CREATE POLICY "Admins can update bets" ON bets
  FOR UPDATE
  USING (is_admin(auth.uid()));

-- ============================================
-- USER PREDICTIONS TABLE POLICIES
-- ============================================

-- Users can view all predictions (to see counts)
CREATE POLICY "Anyone can view predictions" ON user_predictions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can insert their own predictions
CREATE POLICY "Users can insert own predictions" ON user_predictions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own predictions
CREATE POLICY "Users can update own predictions" ON user_predictions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- REFILL REQUESTS TABLE POLICIES
-- ============================================

-- Users can view their own requests, admins can view all
CREATE POLICY "Users can view own refill requests" ON refill_requests
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_admin(auth.uid())
  );

-- Users can create refill requests
CREATE POLICY "Users can create refill requests" ON refill_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can update refill requests (approve/deny)
CREATE POLICY "Admins can update refill requests" ON refill_requests
  FOR UPDATE
  USING (is_admin(auth.uid()));

-- ============================================
-- TRANSACTIONS TABLE POLICIES
-- ============================================

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can insert transactions
CREATE POLICY "Authenticated users can insert transactions" ON transactions
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions" ON transactions
  FOR SELECT
  USING (is_admin(auth.uid()));

-- ============================================
-- HELPER FUNCTION (OPTIONAL)
-- ============================================

-- Optional: Create a function to handle prediction placement atomically
-- This ensures balance deduction and prediction creation happen together
CREATE OR REPLACE FUNCTION place_prediction(
  p_user_id UUID,
  p_bet_id UUID,
  p_prediction TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance DECIMAL(10,2);
  v_existing_prediction_id UUID;
BEGIN
  -- Check if user already has a prediction
  SELECT id INTO v_existing_prediction_id
  FROM user_predictions
  WHERE user_id = p_user_id AND bet_id = p_bet_id;

  -- If new prediction, deduct balance
  IF v_existing_prediction_id IS NULL THEN
    -- Get current balance
    SELECT balance INTO v_balance
    FROM users
    WHERE id = p_user_id;

    -- Check sufficient balance
    IF v_balance < 1.00 THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Deduct balance
    UPDATE users
    SET balance = balance - 1.00
    WHERE id = p_user_id;

    -- Insert prediction
    INSERT INTO user_predictions (user_id, bet_id, prediction, amount)
    VALUES (p_user_id, p_bet_id, p_prediction, 1.00);

    -- Create transaction
    INSERT INTO transactions (user_id, bet_id, amount, type)
    VALUES (p_user_id, p_bet_id, -1.00, 'bet_placed');
  ELSE
    -- Update existing prediction
    UPDATE user_predictions
    SET prediction = p_prediction, updated_at = NOW()
    WHERE id = v_existing_prediction_id;
  END IF;
END;
$$;

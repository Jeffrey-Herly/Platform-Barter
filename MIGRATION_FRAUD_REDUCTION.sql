-- ============================================================================
-- FRAUD REDUCTION: MINIMAL TRANSACTION CONFIRMATION SYSTEM
-- Database Migration Script
-- ============================================================================
-- This script:
-- 1. Adds new status values to barter_statuses table
-- 2. Adds new confirmation fields to barter_transactions table
-- 3. Is fully backward compatible (no data loss)
-- ============================================================================

-- ============================================================================
-- PART 1: UPDATE STATUS VALUES
-- ============================================================================

-- Insert new status values (if not exists)
INSERT INTO public.barter_statuses (status_name, description) 
VALUES 
  ('IN_TRANSIT', 'Items are in physical transit between users'),
  ('AWAITING_OWNER_CONFIRMATION', 'Waiting for owner to confirm received requester item'),
  ('AWAITING_REQUESTER_CONFIRMATION', 'Waiting for requester to confirm received owner item'),
  ('BOTH_CONFIRMED', 'Both users confirmed receiving their items'),
  ('COMPLETED_AWAITING_REVIEW', 'Transaction complete, awaiting user reviews'),
  ('DISPUTE', 'Item reported as not received, transaction disputed')
ON CONFLICT (status_name) DO NOTHING;

-- ============================================================================
-- PART 2: ADD NEW COLUMNS TO barter_transactions
-- ============================================================================

-- These columns track the confirmation timestamps for each step
-- All are nullable - existing transactions will have NULL values

ALTER TABLE public.barter_transactions
ADD COLUMN IF NOT EXISTS requester_sent_at timestamptz NULL 
  COMMENT 'Timestamp when requester marked item as sent';

ALTER TABLE public.barter_transactions
ADD COLUMN IF NOT EXISTS requester_sent_confirmed_at timestamptz NULL 
  COMMENT 'Timestamp when owner confirmed receiving requester item';

ALTER TABLE public.barter_transactions
ADD COLUMN IF NOT EXISTS owner_sent_at timestamptz NULL 
  COMMENT 'Timestamp when owner marked item as sent (currently unused - owner sends after acceptance)';

ALTER TABLE public.barter_transactions
ADD COLUMN IF NOT EXISTS owner_sent_confirmed_at timestamptz NULL 
  COMMENT 'Timestamp when requester confirmed receiving owner item';

ALTER TABLE public.barter_transactions
ADD COLUMN IF NOT EXISTS both_confirmed_at timestamptz NULL 
  COMMENT 'Timestamp when both users confirmed receiving (triggers rating window)';

ALTER TABLE public.barter_transactions
ADD COLUMN IF NOT EXISTS dispute_reason text NULL 
  COMMENT 'Reason provided if transaction marked as not received';

-- ============================================================================
-- PART 3: UPDATE CONSTRAINT (optional - only if needed)
-- ============================================================================
-- If you need to drop and recreate the constraint, uncomment below:
-- 
-- ALTER TABLE public.barter_statuses 
-- DROP CONSTRAINT IF EXISTS valid_status;
-- 
-- ALTER TABLE public.barter_statuses 
-- ADD CONSTRAINT valid_status CHECK (((status_name)::text = ANY ((ARRAY[
--   'PENDING'::character varying,
--   'ACCEPTED'::character varying,
--   'REJECTED'::character varying,
--   'NEGOTIATING'::character varying,
--   'COMPLETED'::character varying,
--   'CANCELLED'::character varying,
--   'EXPIRED'::character varying,
--   'IN_TRANSIT'::character varying,
--   'AWAITING_OWNER_CONFIRMATION'::character varying,
--   'AWAITING_REQUESTER_CONFIRMATION'::character varying,
--   'BOTH_CONFIRMED'::character varying,
--   'COMPLETED_AWAITING_REVIEW'::character varying,
--   'DISPUTE'::character varying
-- ]::text[])));

-- ============================================================================
-- PART 4: VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify migration completed successfully:
-- ============================================================================

-- Check new statuses were added:
-- SELECT status_name FROM public.barter_statuses 
-- WHERE status_name IN ('IN_TRANSIT', 'AWAITING_OWNER_CONFIRMATION', 
--                       'AWAITING_REQUESTER_CONFIRMATION', 'BOTH_CONFIRMED',
--                       'COMPLETED_AWAITING_REVIEW', 'DISPUTE')
-- ORDER BY status_name;

-- Check new columns exist in barter_transactions:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'barter_transactions' 
--   AND column_name IN ('requester_sent_at', 'requester_sent_confirmed_at',
--                       'owner_sent_at', 'owner_sent_confirmed_at', 
--                       'both_confirmed_at', 'dispute_reason')
-- ORDER BY column_name;

-- ============================================================================
-- PART 5: DATA INTEGRITY
-- ============================================================================
-- Existing data is safe:
-- - Old statuses (PENDING, ACCEPTED, COMPLETED, etc.) are unchanged
-- - New columns are all NULL for existing transactions
-- - No existing transactions are modified
-- - System is fully backward compatible

-- ============================================================================
-- PART 6: ROLLBACK (if needed)
-- ============================================================================
-- To reverse this migration:
--
-- DELETE FROM public.barter_statuses 
-- WHERE status_name IN ('IN_TRANSIT', 'AWAITING_OWNER_CONFIRMATION', 
--                       'AWAITING_REQUESTER_CONFIRMATION', 'BOTH_CONFIRMED',
--                       'COMPLETED_AWAITING_REVIEW', 'DISPUTE');
-- 
-- ALTER TABLE public.barter_transactions
-- DROP COLUMN IF EXISTS requester_sent_at,
-- DROP COLUMN IF EXISTS requester_sent_confirmed_at,
-- DROP COLUMN IF EXISTS owner_sent_at,
-- DROP COLUMN IF EXISTS owner_sent_confirmed_at,
-- DROP COLUMN IF EXISTS both_confirmed_at,
-- DROP COLUMN IF EXISTS dispute_reason;

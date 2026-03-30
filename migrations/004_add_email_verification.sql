-- Migration: Add Email Verification System
-- Created: 2024-11-28

-- Add email_verified column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_token varchar(255) NULL,
ADD COLUMN IF NOT EXISTS verification_token_expires timestamptz NULL;

-- Create email_verification_tokens table for tracking
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
    token_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token varchar(255) NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    used_at timestamptz NULL,
    CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (token_id),
    CONSTRAINT email_verification_tokens_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users(user_id)
        ON DELETE CASCADE
);

-- Create index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_verification_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_user_id ON email_verification_tokens(user_id);

-- Add comment
COMMENT ON TABLE public.email_verification_tokens IS 'Stores email verification tokens for user registration';
COMMENT ON COLUMN public.users.email_verified IS 'Whether user has verified their email address';
COMMENT ON COLUMN public.users.verification_token IS 'Current active verification token (for quick lookup)';
COMMENT ON COLUMN public.users.verification_token_expires IS 'When the verification token expires';

-- Permissions
GRANT ALL ON TABLE public.email_verification_tokens TO postgres;

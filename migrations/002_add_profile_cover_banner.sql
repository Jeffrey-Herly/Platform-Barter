-- Migration: Add cover_url to user_profiles for profile header/banner

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS cover_url text NULL;


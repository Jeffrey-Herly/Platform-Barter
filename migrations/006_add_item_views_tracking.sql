-- Migration 006: Add item views tracking per user
-- Tracks which users have viewed which items to prevent duplicate view counts

BEGIN;

-- Create item_views table to track user views
CREATE TABLE IF NOT EXISTS public.item_views (
    view_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES public.items(item_id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- Allow NULL user_id for anonymous viewers
    UNIQUE (item_id, user_id) -- Prevent duplicate views from same user
);

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_item_views_item_user ON public.item_views(item_id, user_id);
CREATE INDEX IF NOT EXISTS idx_item_views_user ON public.item_views(user_id);

COMMIT;

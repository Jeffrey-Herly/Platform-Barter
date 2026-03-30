-- Migration: Add user_deleted_conversations table for soft delete per user
-- Purpose: Track which users have deleted which conversations
-- Chat messages are NOT deleted, only visibility is removed per user

CREATE TABLE public.user_deleted_conversations (
    deletion_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    transaction_id uuid NOT NULL,
    user_id uuid NOT NULL,
    deleted_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT user_deleted_conversations_pkey PRIMARY KEY (deletion_id),
    CONSTRAINT user_deleted_conversations_unique UNIQUE (transaction_id, user_id),
    CONSTRAINT user_deleted_conversations_transaction_fkey FOREIGN KEY (transaction_id)
        REFERENCES public.barter_transactions(transaction_id) ON DELETE CASCADE,
    CONSTRAINT user_deleted_conversations_user_fkey FOREIGN KEY (user_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE
);

-- Create index untuk faster queries
CREATE INDEX idx_user_deleted_conversations_user_id ON public.user_deleted_conversations (user_id);
CREATE INDEX idx_user_deleted_conversations_transaction_id ON public.user_deleted_conversations (transaction_id);

-- Permissions
ALTER TABLE public.user_deleted_conversations OWNER TO postgres;
GRANT ALL ON TABLE public.user_deleted_conversations TO postgres;

-- Migration: 005_add_user_personalized_tags.sql
-- Purpose: Enable users to create personalized tags
-- Adds user_id column to tags table to track custom tags per user
-- This version is safe and checks for existing columns/constraints

-- Step 1: Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tags' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.tags ADD COLUMN user_id uuid NULL;
        RAISE NOTICE 'Added user_id column to tags table';
    END IF;
END $$;

-- Step 2: Add is_custom column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tags' AND column_name = 'is_custom'
    ) THEN
        ALTER TABLE public.tags ADD COLUMN is_custom boolean DEFAULT false;
        RAISE NOTICE 'Added is_custom column to tags table';
    END IF;
END $$;

-- Step 3: Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tags_user_id_fkey'
    ) THEN
        ALTER TABLE public.tags 
        ADD CONSTRAINT tags_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;
        RAISE NOTICE 'Added tags_user_id_fkey constraint';
    END IF;
END $$;

-- Step 4: Drop old unique constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tags_tag_name_key'
    ) THEN
        ALTER TABLE public.tags DROP CONSTRAINT tags_tag_name_key;
        RAISE NOTICE 'Dropped old tags_tag_name_key constraint';
    END IF;
END $$;

-- Step 5: Add new unique constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tags_unique_per_user'
    ) THEN
        ALTER TABLE public.tags 
        ADD CONSTRAINT tags_unique_per_user UNIQUE (tag_name, user_id, is_custom);
        RAISE NOTICE 'Added tags_unique_per_user constraint';
    END IF;
END $$;

-- Step 6: Create index for faster queries by user_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'tags' AND indexname = 'idx_tags_user_id'
    ) THEN
        CREATE INDEX idx_tags_user_id ON public.tags(user_id);
        RAISE NOTICE 'Created idx_tags_user_id index';
    END IF;
END $$;

-- Step 7: Create index for getting custom tags
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'tags' AND indexname = 'idx_tags_custom_by_user'
    ) THEN
        CREATE INDEX idx_tags_custom_by_user ON public.tags(user_id, is_custom) WHERE is_custom = true;
        RAISE NOTICE 'Created idx_tags_custom_by_user index';
    END IF;
END $$;

-- Step 8: Update existing global tags - set user_id to NULL and is_custom to false
UPDATE public.tags SET is_custom = false, user_id = NULL WHERE user_id IS NULL;

-- Step 9: Add comment for documentation
COMMENT ON COLUMN public.tags.user_id IS 'User ID for custom personalized tags. NULL for global tags.';
COMMENT ON COLUMN public.tags.is_custom IS 'TRUE for user-created custom tags, FALSE for global system tags.';

-- Step 10: Create view for getting user tags (both custom and global)
CREATE OR REPLACE VIEW user_tags_view AS
SELECT 
  tag_id,
  tag_name,
  tag_slug,
  usage_count,
  user_id,
  is_custom,
  created_at,
  'custom' as tag_type
FROM public.tags
WHERE is_custom = true

UNION ALL

SELECT 
  tag_id,
  tag_name,
  tag_slug,
  usage_count,
  user_id,
  is_custom,
  created_at,
  'global' as tag_type
FROM public.tags
WHERE is_custom = false AND user_id IS NULL

ORDER BY tag_name;

-- Grant permissions
GRANT SELECT ON user_tags_view TO postgres;

-- Final verification query
SELECT 'Migration completed successfully!' as status;

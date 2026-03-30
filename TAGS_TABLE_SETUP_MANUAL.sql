-- ============================================
-- COMPLETE TAGS TABLE SETUP QUERY
-- Copy dan jalankan di DBeaver
-- ============================================

-- STEP 1: Check current tags table structure
SELECT 'Current tags table structure:' as step;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tags' 
ORDER BY ordinal_position;

-- STEP 2: Add missing columns if they don't exist
ALTER TABLE public.tags 
ADD COLUMN IF NOT EXISTS user_id uuid NULL;

ALTER TABLE public.tags 
ADD COLUMN IF NOT EXISTS is_custom boolean DEFAULT false;

-- STEP 3: Verify columns were added
SELECT 'Columns after adding:' as step;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tags' 
ORDER BY ordinal_position;

-- STEP 4: Add foreign key constraint (safely)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tags_user_id_fkey' AND table_name = 'tags'
    ) THEN
        ALTER TABLE public.tags 
        ADD CONSTRAINT tags_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint: tags_user_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- STEP 5: Handle old unique constraint
-- Drop the old tags_tag_name_key if it exists (it prevents multiple users from having same tag)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tags_tag_name_key' AND table_name = 'tags'
    ) THEN
        ALTER TABLE public.tags DROP CONSTRAINT tags_tag_name_key;
        RAISE NOTICE 'Dropped old unique constraint: tags_tag_name_key';
    ELSE
        RAISE NOTICE 'Old unique constraint does not exist';
    END IF;
END $$;

-- STEP 6: Add new unique constraint for personalized tags
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tags_unique_per_user' AND table_name = 'tags'
    ) THEN
        ALTER TABLE public.tags 
        ADD CONSTRAINT tags_unique_per_user UNIQUE (tag_name, user_id, is_custom);
        RAISE NOTICE 'Added new unique constraint: tags_unique_per_user';
    ELSE
        RAISE NOTICE 'New unique constraint already exists';
    END IF;
END $$;

-- STEP 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_custom_by_user ON public.tags(user_id, is_custom) WHERE is_custom = true;
CREATE INDEX IF NOT EXISTS idx_tags_is_custom ON public.tags(is_custom);

SELECT 'Indexes created/verified' as step;

-- STEP 8: Update existing tags to be global (not custom)
UPDATE public.tags 
SET is_custom = false, user_id = NULL 
WHERE user_id IS NULL;

SELECT 'Existing tags updated to global status' as step;

-- STEP 9: Add column comments for documentation
COMMENT ON COLUMN public.tags.user_id IS 'User ID for custom personalized tags. NULL for global tags.';
COMMENT ON COLUMN public.tags.is_custom IS 'TRUE for user-created custom tags, FALSE for global system tags.';

-- STEP 10: Create view for user tags (optional but recommended)
CREATE OR REPLACE VIEW user_tags_view AS
SELECT 
  tag_id,
  tag_name,
  tag_slug,
  usage_count,
  user_id,
  is_custom,
  created_at,
  CASE WHEN is_custom = true THEN 'custom' ELSE 'global' END as tag_type
FROM public.tags
WHERE is_custom = true OR (is_custom = false AND user_id IS NULL)
ORDER BY tag_name;

-- STEP 11: Final verification
SELECT '✅ MIGRATION COMPLETE - VERIFICATION RESULTS:' as status;

SELECT 'Total tags in system:' as metric;
SELECT COUNT(*) as count FROM public.tags;

SELECT 'Tags breakdown:' as metric;
SELECT is_custom, COUNT(*) as count FROM public.tags GROUP BY is_custom;

SELECT 'Table structure (FINAL):' as metric;
SELECT column_name, data_type, is_nullable FROM information_schema.columns 
WHERE table_name = 'tags' ORDER BY ordinal_position;

SELECT 'Constraints:' as metric;
SELECT constraint_name, constraint_type FROM information_schema.table_constraints 
WHERE table_name = 'tags';

SELECT 'All checks passed! ✅' as final_status;

-- SAFE SETUP QUERY - Won't error if already exists
-- Copy & paste ini ke DBeaver

-- Step 1: Add columns if they don't exist (safe)
ALTER TABLE public.tags 
ADD COLUMN IF NOT EXISTS user_id uuid NULL;

ALTER TABLE public.tags 
ADD COLUMN IF NOT EXISTS is_custom boolean DEFAULT false;

-- Step 2: Drop old constraint if it exists (safe)
ALTER TABLE public.tags 
DROP CONSTRAINT IF EXISTS tags_tag_name_key;

-- Step 3: Drop and recreate foreign key (safest approach)
ALTER TABLE public.tags 
DROP CONSTRAINT IF EXISTS tags_user_id_fkey;

ALTER TABLE public.tags 
ADD CONSTRAINT tags_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;

-- Step 4: Drop and recreate unique constraint (safest approach)
ALTER TABLE public.tags 
DROP CONSTRAINT IF EXISTS tags_unique_per_user;

ALTER TABLE public.tags 
ADD CONSTRAINT tags_unique_per_user UNIQUE (tag_name, user_id, is_custom);

-- Step 5: Create indexes (safe - won't error if exist)
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_custom_by_user ON public.tags(user_id, is_custom) WHERE is_custom = true;
CREATE INDEX IF NOT EXISTS idx_tags_is_custom ON public.tags(is_custom);

-- Step 6: Update existing tags to be global
UPDATE public.tags 
SET is_custom = false, user_id = NULL 
WHERE user_id IS NULL;

-- Step 7: Add comments
COMMENT ON COLUMN public.tags.user_id IS 'User ID for custom personalized tags. NULL for global tags.';
COMMENT ON COLUMN public.tags.is_custom IS 'TRUE for user-created custom tags, FALSE for global system tags.';

-- ✅ VERIFICATION - Run to confirm setup is correct
SELECT '✅ Setup Complete!' as status;

SELECT 'Final Table Structure:' as check;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tags' 
ORDER BY ordinal_position;

SELECT 'Constraints:' as check;
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'tags';

SELECT 'Total Tags:' as check;
SELECT COUNT(*) as total_tags FROM public.tags;

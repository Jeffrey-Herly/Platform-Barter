-- COPY & PASTE THIS DIRECTLY TO DBEAVER
-- Ini query SIMPLE untuk setup tags table

-- Add columns if missing
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS user_id uuid NULL;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS is_custom boolean DEFAULT false;

-- Add foreign key
ALTER TABLE public.tags ADD CONSTRAINT tags_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;

-- Drop old constraint (ignore if error - means already removed)
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_tag_name_key;

-- Add new constraint (ignore if error - means already exists)
ALTER TABLE public.tags ADD CONSTRAINT tags_unique_per_user UNIQUE (tag_name, user_id, is_custom);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_custom_by_user ON public.tags(user_id, is_custom) WHERE is_custom = true;

-- Update existing tags
UPDATE public.tags SET is_custom = false, user_id = NULL WHERE user_id IS NULL;

-- Add comments
COMMENT ON COLUMN public.tags.user_id IS 'User ID. NULL for global tags.';
COMMENT ON COLUMN public.tags.is_custom IS 'TRUE for custom tags, FALSE for global.';

-- VERIFY - Run this to check if setup successful
SELECT 'Column Names:' as check;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tags' ORDER BY ordinal_position;

SELECT 'Total Tags:' as check;
SELECT COUNT(*) FROM public.tags;

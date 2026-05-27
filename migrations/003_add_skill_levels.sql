-- Migration: Add skill_levels table for service items
-- Created: 2024-11-28

-- Create skill_levels table
CREATE TABLE IF NOT EXISTS public.skill_levels (
    level_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    level_code varchar(50) NOT NULL,
    level_name varchar(100) NOT NULL,
    description text NULL,
    sort_order int4 DEFAULT 0 NULL,
    CONSTRAINT skill_levels_pkey PRIMARY KEY (level_id),
    CONSTRAINT skill_levels_level_code_key UNIQUE (level_code)
);

-- Insert default skill levels
INSERT INTO public.skill_levels (level_code, level_name, description, sort_order)
VALUES
    ('beginner', 'Pemula (Beginner)', 'Baru memulai atau memiliki pengalaman minimal', 1),
    ('intermediate', 'Menengah (Intermediate)', 'Memiliki pengalaman dan pengetahuan dasar yang solid', 2),
    ('advanced', 'Mahir (Advanced)', 'Sangat berpengalaman dengan keahlian mendalam', 3),
    ('expert', 'Ahli (Expert)', 'Profesional dengan keahlian tingkat tertinggi', 4)
ON CONFLICT (level_code) DO NOTHING;

-- Add skill_level_id column to items table
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS skill_level_id uuid NULL;

-- Add foreign key constraint
ALTER TABLE public.items
ADD CONSTRAINT items_skill_level_id_fkey
FOREIGN KEY (skill_level_id)
REFERENCES public.skill_levels(level_id)
ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN public.items.skill_level_id IS 'Skill level for service items (null for goods)';

-- Permissions
ALTER TABLE public.skill_levels OWNER TO postgres;
GRANT ALL ON TABLE public.skill_levels TO postgres;

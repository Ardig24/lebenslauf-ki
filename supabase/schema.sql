-- CVprofi Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================
-- CVS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cvs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL DEFAULT 'Untitled CV',
    template_id TEXT DEFAULT 'modern',
    data JSONB NOT NULL DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    public_slug TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;

-- CVs policies
CREATE POLICY "Users can view their own CVs"
    ON cvs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CVs"
    ON cvs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CVs"
    ON cvs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CVs"
    ON cvs FOR DELETE
    USING (auth.uid() = user_id);

-- Public CVs can be viewed by anyone
CREATE POLICY "Anyone can view public CVs"
    ON cvs FOR SELECT
    USING (is_public = TRUE);

-- ============================================
-- TEMPLATES TABLE (for custom/premium templates)
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    preview_url TEXT,
    css_class TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (templates are public read)
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view templates"
    ON templates FOR SELECT
    TO authenticated, anon
    USING (TRUE);

-- Insert default templates
INSERT INTO templates (id, name, description, css_class, is_premium, sort_order) VALUES
    ('modern', 'Modern', 'Clean & Minimalist', 'cv-template-modern', FALSE, 1),
    ('professional', 'Professional', 'Classic & Formal', 'cv-template-professional', FALSE, 2),
    ('creative', 'Creative', 'Two-Column Accent', 'cv-template-creative', FALSE, 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for cvs updated_at
DROP TRIGGER IF EXISTS update_cvs_updated_at ON cvs;
CREATE TRIGGER update_cvs_updated_at
    BEFORE UPDATE ON cvs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_cvs_public_slug ON cvs(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cvs_updated_at ON cvs(updated_at DESC);

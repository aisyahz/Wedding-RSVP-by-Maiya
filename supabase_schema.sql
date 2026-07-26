-- ====================================================================
-- SUPABASE DATABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- Project: Digital Card by Maiya
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. PROFILES TABLE (Admin user metadata synced with auth.users)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'display_name', 'Admin'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- --------------------------------------------------------------------
-- 2. INVITATIONS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    bride_name TEXT NOT NULL,
    groom_name TEXT NOT NULL,
    wedding_date TEXT NOT NULL,
    wedding_time TEXT NOT NULL,
    venue_name TEXT NOT NULL,
    venue_address TEXT NOT NULL,
    google_maps_url TEXT,
    waze_url TEXT,
    whatsapp_contact TEXT NOT NULL,
    wishlist_url TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    bank_account_holder TEXT,
    qr_code_url TEXT,
    rsvp_closing_date TEXT,
    video_url TEXT NOT NULL,
    video_file_name TEXT,
    private_pin TEXT NOT NULL DEFAULT '1234',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by slug
CREATE INDEX IF NOT EXISTS idx_invitations_slug ON public.invitations(slug);

-- Enable RLS on invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Invitations RLS Policies:
-- A. Public Guests can read published/active invitations
CREATE POLICY "Public guests can view active invitations" 
    ON public.invitations FOR SELECT 
    TO public 
    USING (status = 'active');

-- B. Authenticated admins can manage (SELECT, INSERT, UPDATE, DELETE) all invitations
CREATE POLICY "Admins have full access to invitations" 
    ON public.invitations FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);


-- --------------------------------------------------------------------
-- 3. RSVP_ENTRIES TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rsvp_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    attendance TEXT NOT NULL CHECK (attendance IN ('attending', 'declined')),
    pax INTEGER NOT NULL DEFAULT 1 CHECK (pax >= 0),
    wishes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for RSVP queries
CREATE INDEX IF NOT EXISTS idx_rsvp_invitation_id ON public.rsvp_entries(invitation_id);

-- Enable RLS on rsvp_entries
ALTER TABLE public.rsvp_entries ENABLE ROW LEVEL SECURITY;

-- RSVP RLS Policies:
-- A. Public Guests can submit RSVP responses
CREATE POLICY "Public guests can insert RSVP entries" 
    ON public.rsvp_entries FOR INSERT 
    TO public 
    WITH CHECK (true);

-- B. Authenticated admins can view & manage all RSVP entries
CREATE POLICY "Admins have full access to RSVP entries" 
    ON public.rsvp_entries FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);


-- --------------------------------------------------------------------
-- 4. PRIVATE COUPLE REPORT SECURITY RPC FUNCTION
-- Validates private 4-digit PIN on server side without revealing PIN to guest client
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_invitation_pin(inv_id UUID, input_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    matched_id UUID;
BEGIN
    SELECT id INTO matched_id 
    FROM public.invitations 
    WHERE id = inv_id AND private_pin = input_pin;

    RETURN matched_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- --------------------------------------------------------------------
-- 5. STORAGE BUCKET setup for invitation-videos
-- --------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'invitation-videos',
    'invitation-videos',
    true,
    52428800, -- 50 MB
    ARRAY['video/mp4']
) ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['video/mp4'];

-- Storage RLS Policies
-- A. Public can read/view videos
CREATE POLICY "Public can view invitation videos" 
    ON storage.objects FOR SELECT 
    TO public 
    USING (bucket_id = 'invitation-videos');

-- B. Admins can upload, replace, delete videos
CREATE POLICY "Admins can upload invitation videos" 
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'invitation-videos');

CREATE POLICY "Admins can update invitation videos" 
    ON storage.objects FOR UPDATE 
    TO authenticated 
    USING (bucket_id = 'invitation-videos');

CREATE POLICY "Admins can delete invitation videos" 
    ON storage.objects FOR DELETE 
    TO authenticated 
    USING (bucket_id = 'invitation-videos');

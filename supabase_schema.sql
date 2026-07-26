-- ====================================================================
-- SUPABASE DATABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- Project: Digital Card by Maiya (Hardened & Production Security Revision)
-- ====================================================================

-- Enable required Postgres extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- Idempotent RLS Policies for Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Trigger to automatically create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'display_name', 'Admin'));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- --------------------------------------------------------------------
-- 2. INVITATIONS TABLE (Public details only - NO secrets/PINs)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL CONSTRAINT check_slug_not_empty CHECK (length(trim(slug)) > 0),
    bride_name TEXT NOT NULL,
    groom_name TEXT NOT NULL,
    wedding_date DATE NOT NULL,
    wedding_time TIME NOT NULL,
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
    rsvp_closing_date TIMESTAMPTZ,
    video_url TEXT NULL, -- Nullable for draft state
    video_key TEXT NULL,
    poster_url TEXT NULL,
    poster_key TEXT NULL,
    gift_qr_key TEXT NULL,
    video_file_name TEXT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration for existing databases
ALTER TABLE public.invitations
ADD COLUMN IF NOT EXISTS video_key TEXT,
ADD COLUMN IF NOT EXISTS poster_url TEXT,
ADD COLUMN IF NOT EXISTS poster_key TEXT,
ADD COLUMN IF NOT EXISTS gift_qr_key TEXT;

-- Index for fast lookup by slug
CREATE INDEX IF NOT EXISTS idx_invitations_slug ON public.invitations(slug);

-- Enable RLS on invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Updated At Trigger Function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_invitations_updated_at ON public.invitations;
CREATE TRIGGER trigger_invitations_updated_at
    BEFORE UPDATE ON public.invitations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Invitations RLS Policies
DROP POLICY IF EXISTS "Public guests can view active invitations" ON public.invitations;
CREATE POLICY "Public guests can view active invitations" 
    ON public.invitations FOR SELECT 
    TO public 
    USING (status = 'active');

DROP POLICY IF EXISTS "Admins have full access to invitations" ON public.invitations;
CREATE POLICY "Admins have full access to invitations" 
    ON public.invitations FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);


-- --------------------------------------------------------------------
-- 3. INVITATION_SECRETS TABLE (Strictly private PIN hashes)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invitation_secrets (
    invitation_id UUID PRIMARY KEY REFERENCES public.invitations(id) ON DELETE CASCADE,
    private_pin_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on invitation_secrets
ALTER TABLE public.invitation_secrets ENABLE ROW LEVEL SECURITY;

-- NO public/anon policies created for invitation_secrets.
-- Only authenticated admins have access to invitation_secrets.
DROP POLICY IF EXISTS "Admins have full access to invitation secrets" ON public.invitation_secrets;
CREATE POLICY "Admins have full access to invitation secrets" 
    ON public.invitation_secrets FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);


-- --------------------------------------------------------------------
-- 4. RSVP_ENTRIES TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rsvp_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL CONSTRAINT check_guest_name_len CHECK (length(trim(guest_name)) >= 1 AND length(trim(guest_name)) <= 100),
    attendance TEXT NOT NULL CHECK (attendance IN ('attending', 'declined')),
    pax INTEGER NOT NULL DEFAULT 1 CONSTRAINT check_pax_range CHECK (pax >= 0 AND pax <= 20),
    wishes TEXT CONSTRAINT check_wishes_len CHECK (wishes IS NULL OR length(wishes) <= 1000),
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for RSVP queries
CREATE INDEX IF NOT EXISTS idx_rsvp_invitation_id ON public.rsvp_entries(invitation_id);

-- Enable RLS on rsvp_entries
ALTER TABLE public.rsvp_entries ENABLE ROW LEVEL SECURITY;

-- RSVP RLS Policies
-- A. Public guests can insert RSVP ONLY if invitation status is active and closing date has not passed
DROP POLICY IF EXISTS "Public guests can insert RSVP entries" ON public.rsvp_entries;
CREATE POLICY "Public guests can insert RSVP entries" 
    ON public.rsvp_entries FOR INSERT 
    TO public 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.invitations i
            WHERE i.id = invitation_id
              AND i.status = 'active'
              AND (i.rsvp_closing_date IS NULL OR i.rsvp_closing_date >= NOW())
        )
    );

-- B. Note: NO public/anon SELECT policy is created on rsvp_entries.
-- Public guests cannot query or list RSVP entries directly.

-- C. Authenticated admins have full read/write access to RSVP entries
DROP POLICY IF EXISTS "Admins have full access to RSVP entries" ON public.rsvp_entries;
CREATE POLICY "Admins have full access to RSVP entries" 
    ON public.rsvp_entries FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);


-- --------------------------------------------------------------------
-- 5. HELPER UTILITY FUNCTIONS
-- --------------------------------------------------------------------

-- Helper Function: Hash PIN using pgcrypto
CREATE OR REPLACE FUNCTION public.hash_pin(pin_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN extensions.crypt(pin_text, extensions.gen_salt('bf'));
END;
$$;

-- Helper Function: Generate random 6-digit PIN
CREATE OR REPLACE FUNCTION public.generate_random_pin()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$;


-- --------------------------------------------------------------------
-- 6. SECURE AUTHENTICATED RPC: CREATE INVITATION WITH 6-DIGIT PIN
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_invitation_with_pin(
    p_slug TEXT,
    p_bride_name TEXT,
    p_groom_name TEXT,
    p_wedding_date DATE,
    p_wedding_time TIME,
    p_venue_name TEXT,
    p_venue_address TEXT,
    p_google_maps_url TEXT DEFAULT NULL,
    p_waze_url TEXT DEFAULT NULL,
    p_whatsapp_contact TEXT DEFAULT '',
    p_wishlist_url TEXT DEFAULT NULL,
    p_bank_name TEXT DEFAULT NULL,
    p_bank_account_number TEXT DEFAULT NULL,
    p_bank_account_holder TEXT DEFAULT NULL,
    p_qr_code_url TEXT DEFAULT NULL,
    p_rsvp_closing_date TIMESTAMPTZ DEFAULT NULL,
    p_video_url TEXT DEFAULT NULL,
    p_video_file_name TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'draft',
    p_custom_pin TEXT DEFAULT NULL
)
RETURNS TABLE (
    invitation_id UUID,
    slug TEXT,
    plain_pin TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_pin TEXT;
    v_pin_hash TEXT;
    v_id UUID;
    v_slug TEXT;
BEGIN
    -- Verify caller is authenticated admin
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized. Authenticated admin access required.';
    END IF;

    -- Validate or generate 6-digit numeric PIN
    IF p_custom_pin IS NOT NULL AND length(p_custom_pin) = 6 AND p_custom_pin ~ '^[0-9]{6}$' THEN
        v_pin := p_custom_pin;
    ELSE
        v_pin := public.generate_random_pin();
    END IF;

    -- Hash PIN using pgcrypto
    v_pin_hash := public.hash_pin(v_pin);

    -- Insert invitation record
    INSERT INTO public.invitations (
        slug, bride_name, groom_name, wedding_date, wedding_time,
        venue_name, venue_address, google_maps_url, waze_url, whatsapp_contact,
        wishlist_url, bank_name, bank_account_number, bank_account_holder, qr_code_url,
        rsvp_closing_date, video_url, video_file_name, status
    ) VALUES (
        p_slug, p_bride_name, p_groom_name, p_wedding_date, p_wedding_time,
        p_venue_name, p_venue_address, p_google_maps_url, p_waze_url, p_whatsapp_contact,
        p_wishlist_url, p_bank_name, p_bank_account_number, p_bank_account_holder, p_qr_code_url,
        p_rsvp_closing_date, p_video_url, p_video_file_name, p_status
    )
    RETURNING id, invitations.slug INTO v_id, v_slug;

    -- Insert secret PIN hash into invitation_secrets
    INSERT INTO public.invitation_secrets (invitation_id, private_pin_hash)
    VALUES (v_id, v_pin_hash);

    -- Return invitation ID, slug and plain PIN once to admin
    RETURN QUERY
    SELECT v_id, v_slug, v_pin;
END;
$$;


-- --------------------------------------------------------------------
-- 7. SECURE PUBLIC/ANON RPC: COUPLE PRIVATE RSVP REPORT
-- Accepts slug and PIN, verifies PIN hash server-side using pgcrypto,
-- and returns only the RSVP report for that invitation without revealing hashes.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_private_couple_rsvp_report(
    invitation_slug TEXT,
    input_pin TEXT
)
RETURNS TABLE (
    rsvp_id UUID,
    guest_name TEXT,
    attendance TEXT,
    pax INTEGER,
    wishes TEXT,
    submitted_at TIMESTAMPTZ,
    bride_name TEXT,
    groom_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    target_inv RECORD;
BEGIN
    -- Validate 6-digit numeric input format
    IF input_pin IS NULL OR length(input_pin) != 6 OR input_pin !~ '^[0-9]{6}$' THEN
        RAISE EXCEPTION 'Invalid security PIN format. Must be 6 numeric digits.';
    END IF;

    -- Fetch target invitation and secret PIN hash
    SELECT i.id, i.bride_name, i.groom_name, s.private_pin_hash
    INTO target_inv
    FROM public.invitations i
    JOIN public.invitation_secrets s ON s.invitation_id = i.id
    WHERE i.slug = invitation_slug;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found.';
    END IF;

    -- Verify PIN hash using pgcrypto
    IF target_inv.private_pin_hash IS NULL OR target_inv.private_pin_hash != extensions.crypt(input_pin, target_inv.private_pin_hash) THEN
        RAISE EXCEPTION 'Invalid security PIN.';
    END IF;

    -- Return RSVP entries for this invitation
    RETURN QUERY
    SELECT 
        r.id AS rsvp_id,
        r.guest_name,
        r.attendance,
        r.pax,
        r.wishes,
        r.submitted_at,
        target_inv.bride_name,
        target_inv.groom_name
    FROM public.rsvp_entries r
    WHERE r.invitation_id = target_inv.id
    ORDER BY r.submitted_at DESC;
END;
$$;


-- --------------------------------------------------------------------
-- 8. FUNCTION PERMISSION REVOCATIONS & GRANTS
-- --------------------------------------------------------------------
-- Revoke execution from PUBLIC, anon, authenticated by default for internal functions
REVOKE EXECUTE ON FUNCTION public.hash_pin(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_random_pin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Revoke create_invitation_with_pin from PUBLIC and anon, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.create_invitation_with_pin(
    TEXT, TEXT, TEXT, DATE, TIME, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invitation_with_pin(
    TEXT, TEXT, TEXT, DATE, TIME, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

-- Allow anon and authenticated to execute get_private_couple_rsvp_report
GRANT EXECUTE ON FUNCTION public.get_private_couple_rsvp_report(TEXT, TEXT) TO anon, authenticated;


-- --------------------------------------------------------------------
-- 9. STORAGE BUCKET SETUP (invitation-videos)
-- Supports TUS resumable uploads natively via Supabase JS client
-- --------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'invitation-videos',
    'invitation-videos',
    true,
    52428800, -- 50 MB limit
    ARRAY['video/mp4']
) ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['video/mp4'];

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public can view invitation videos" ON storage.objects;
CREATE POLICY "Public can view invitation videos" 
    ON storage.objects FOR SELECT 
    TO public 
    USING (bucket_id = 'invitation-videos');

DROP POLICY IF EXISTS "Admins can upload invitation videos" ON storage.objects;
CREATE POLICY "Admins can upload invitation videos" 
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'invitation-videos');

DROP POLICY IF EXISTS "Admins can update invitation videos" ON storage.objects;
CREATE POLICY "Admins can update invitation videos" 
    ON storage.objects FOR UPDATE 
    TO authenticated 
    USING (bucket_id = 'invitation-videos');

DROP POLICY IF EXISTS "Admins can delete invitation videos" ON storage.objects;
CREATE POLICY "Admins can delete invitation videos" 
    ON storage.objects FOR DELETE 
    TO authenticated 
    USING (bucket_id = 'invitation-videos');

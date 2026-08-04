-- Fix PostgREST RPC resolution after replacing the legacy p_video_url argument
-- with p_video_key. PostgreSQL identifies functions by argument types, while
-- PostgREST also matches named JSON arguments.

BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.invitations
    ADD COLUMN IF NOT EXISTS video_key TEXT,
    ADD COLUMN IF NOT EXISTS video_url TEXT,
    ADD COLUMN IF NOT EXISTS video_file_name TEXT;

CREATE TABLE IF NOT EXISTS public.invitation_secrets (
    invitation_id UUID PRIMARY KEY
        REFERENCES public.invitations(id) ON DELETE CASCADE,
    private_pin TEXT NOT NULL CHECK (private_pin ~ '^[0-9]{6}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE public.invitation_secrets ENABLE ROW LEVEL SECURITY;

-- This is the single 20-argument type signature used by both the outdated
-- p_video_url function and the corrected p_video_key function. Dropping it
-- does not affect any differently typed overload.
DROP FUNCTION IF EXISTS public.create_invitation_with_pin(
    TEXT, TEXT, TEXT, DATE, TIME, TEXT, TEXT, TEXT, TEXT, TEXT,
    TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
);

CREATE FUNCTION public.create_invitation_with_pin(
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
    p_video_key TEXT DEFAULT NULL,
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
AS $function$
DECLARE
    v_invitation_id UUID;
    v_slug TEXT;
    v_plain_pin TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized. Authenticated access required.'
            USING ERRCODE = '42501';
    END IF;

    IF NULLIF(pg_catalog.btrim(p_slug), ''::text) IS NULL THEN
        RAISE EXCEPTION 'Invitation slug is required.'
            USING ERRCODE = '22023';
    END IF;

    IF p_custom_pin IS NOT NULL THEN
        IF p_custom_pin !~ '^[0-9]{6}$' THEN
            RAISE EXCEPTION 'Custom PIN must contain exactly 6 digits.'
                USING ERRCODE = '22023';
        END IF;
        v_plain_pin := p_custom_pin;
    ELSE
        -- Generate a zero-padded six-digit PIN.
        v_plain_pin := pg_catalog.lpad(
    pg_catalog.floor(pg_catalog.random() * 1000000)::text,
    6,
    '0'
);
    END IF;

    INSERT INTO public.invitations AS invitation (
        slug,
        bride_name,
        groom_name,
        wedding_date,
        wedding_time,
        venue_name,
        venue_address,
        google_maps_url,
        waze_url,
        whatsapp_contact,
        wishlist_url,
        bank_name,
        bank_account_number,
        bank_account_holder,
        qr_code_url,
        rsvp_closing_date,
        video_key,
        video_url,
        video_file_name,
        status
    )
    VALUES (
        p_slug,
        p_bride_name,
        p_groom_name,
        p_wedding_date,
        p_wedding_time,
        p_venue_name,
        p_venue_address,
        p_google_maps_url,
        p_waze_url,
        p_whatsapp_contact,
        p_wishlist_url,
        p_bank_name,
        p_bank_account_number,
        p_bank_account_holder,
        p_qr_code_url,
        p_rsvp_closing_date,
        p_video_key,
        NULL,
        p_video_file_name,
        p_status
    )
    RETURNING invitation.id, invitation.slug
    INTO v_invitation_id, v_slug;

    INSERT INTO public.invitation_secrets (
        invitation_id,
        private_pin
    )
    VALUES (
        v_invitation_id,
        v_plain_pin
    );

    RETURN QUERY
    SELECT v_invitation_id, v_slug, v_plain_pin;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_invitation_with_pin(
    TEXT, TEXT, TEXT, DATE, TIME, TEXT, TEXT, TEXT, TEXT, TEXT,
    TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_invitation_with_pin(
    TEXT, TEXT, TEXT, DATE, TIME, TEXT, TEXT, TEXT, TEXT, TEXT,
    TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

COMMIT;

-- Ask PostgREST to reload its function metadata immediately.
NOTIFY pgrst, 'reload schema';

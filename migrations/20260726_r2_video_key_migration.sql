-- Cloudflare R2 video_key migration
-- Run each phase separately and in the deployment order documented below.

-- =====================================================================
-- PHASE 1: PRE-DEPLOY (safe with the currently deployed application)
-- =====================================================================
BEGIN;

ALTER TABLE public.invitations
ADD COLUMN IF NOT EXISTS video_key TEXT;

-- Backfill only URLs whose path is already an R2 object key in the expected
-- invitations/... namespace. Query strings and fragments are excluded.
UPDATE public.invitations
SET video_key = substring(
    video_url
    FROM '^https?://[^/]+/(invitations/[^?#]+)'
)
WHERE NULLIF(trim(video_key), '') IS NULL
  AND NULLIF(trim(video_url), '') IS NOT NULL
  AND video_url ~ '^https?://[^/]+/invitations/[^?#]+(?:[?#].*)?$';

COMMIT;

-- This result MUST be zero before deploying the key-first application.
-- Non-zero rows are intentionally not modified because they may point to
-- Supabase Storage, Mixkit, or another provider rather than this R2 bucket.
SELECT id, slug, video_url, video_key
FROM public.invitations
WHERE NULLIF(trim(video_url), '') IS NOT NULL
  AND NULLIF(trim(video_key), '') IS NULL
ORDER BY created_at;

-- Review the backfill before continuing. Each derived URL must match the old
-- URL when combined with the deployment's CLOUDFLARE_R2_PUBLIC_DOMAIN.
SELECT id, slug, video_url, video_key
FROM public.invitations
WHERE NULLIF(trim(video_key), '') IS NOT NULL
ORDER BY created_at;

-- For every unresolved row, first copy its video into R2, then assign the real
-- R2 object key explicitly. Do not derive a key from a non-R2 URL.
-- Example (replace both values):
-- UPDATE public.invitations
-- SET video_key = 'invitations/<invitation-uuid>/video.mp4'
-- WHERE id = '<invitation-uuid>';

-- =====================================================================
-- PHASE 2: DEPLOY-CUTOVER
-- Run after Phase 1 reports zero unresolved rows, immediately before deploying
-- the key-first application. This changes the named RPC argument used by new
-- invitation creation.
-- =====================================================================
BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.invitations
        WHERE NULLIF(trim(video_url), '') IS NOT NULL
          AND NULLIF(trim(video_key), '') IS NULL
    ) THEN
        RAISE EXCEPTION
            'R2 migration blocked: invitations with video_url but no video_key remain';
    END IF;
END;
$$;

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
RETURNS TABLE (invitation_id UUID, slug TEXT, plain_pin TEXT)
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
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized. Authenticated admin access required.';
    END IF;

    IF p_custom_pin IS NOT NULL
       AND length(p_custom_pin) = 6
       AND p_custom_pin ~ '^[0-9]{6}$' THEN
        v_pin := p_custom_pin;
    ELSE
        v_pin := public.generate_random_pin();
    END IF;

    v_pin_hash := public.hash_pin(v_pin);

    INSERT INTO public.invitations (
        slug, bride_name, groom_name, wedding_date, wedding_time,
        venue_name, venue_address, google_maps_url, waze_url, whatsapp_contact,
        wishlist_url, bank_name, bank_account_number, bank_account_holder,
        qr_code_url, rsvp_closing_date, video_key, video_file_name, status
    ) VALUES (
        p_slug, p_bride_name, p_groom_name, p_wedding_date, p_wedding_time,
        p_venue_name, p_venue_address, p_google_maps_url, p_waze_url,
        p_whatsapp_contact, p_wishlist_url, p_bank_name,
        p_bank_account_number, p_bank_account_holder, p_qr_code_url,
        p_rsvp_closing_date, p_video_key, p_video_file_name, p_status
    )
    RETURNING id, invitations.slug INTO v_id, v_slug;

    INSERT INTO public.invitation_secrets (invitation_id, private_pin_hash)
    VALUES (v_id, v_pin_hash);

    RETURN QUERY SELECT v_id, v_slug, v_pin;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_invitation_with_pin(
    TEXT, TEXT, TEXT, DATE, TIME, TEXT, TEXT, TEXT, TEXT, TEXT,
    TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_invitation_with_pin(
    TEXT, TEXT, TEXT, DATE, TIME, TEXT, TEXT, TEXT, TEXT, TEXT,
    TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

COMMIT;

-- Deploy the key-first application now, then verify old and new invitations.

-- =====================================================================
-- PHASE 3: POST-DEPLOY CLEANUP
-- Run only after production playback has been verified for every migrated row.
-- The guard prevents removal if any legacy URL was not migrated.
-- =====================================================================
BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.invitations
        WHERE NULLIF(trim(video_url), '') IS NOT NULL
          AND NULLIF(trim(video_key), '') IS NULL
    ) THEN
        RAISE EXCEPTION
            'Cannot drop video_url: invitations without video_key remain';
    END IF;
END;
$$;

ALTER TABLE public.invitations
DROP COLUMN video_url;

COMMIT;

-- Store an optional same-day event end time separately from wedding_time.
-- Existing invitations remain valid with a NULL end time.

ALTER TABLE public.invitations
ADD COLUMN IF NOT EXISTS event_end_time TIME;

ALTER TABLE public.invitations
DROP CONSTRAINT IF EXISTS invitations_event_time_order_check;

ALTER TABLE public.invitations
ADD CONSTRAINT invitations_event_time_order_check
CHECK (event_end_time IS NULL OR event_end_time > wedding_time);

COMMENT ON COLUMN public.invitations.event_end_time IS
'Optional same-day event end time. Must be later than wedding_time when set.';

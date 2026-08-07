import { createClient, Session } from '@supabase/supabase-js';
import { Invitation, InvitationContact, RsvpEntry, InvitationStatus, SystemSettings } from '../types';
import { MediaProviderService } from './mediaProvider';
import { buildR2PublicUrl } from './mediaUrl';

const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('YOUR_SUPABASE')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Convert DB snake_case to TS camelCase
export function mapDbInvitationToApp(dbRow: any): Invitation {
  const videoKey = dbRow.video_key || '';
  const posterKey = dbRow.poster_key || '';
  const giftQrKey = dbRow.gift_qr_key || '';
  const storedContacts = Array.isArray(dbRow.contacts) ? dbRow.contacts : [];
  const dressCodeColors = (Array.isArray(dbRow.dress_code_colors) ? dbRow.dress_code_colors : [])
    .slice(0, 5)
    .map((color: any) => ({ name: String(color?.name || '').trim(), hex: String(color?.hex || '').trim() }))
    .filter((color: { name: string; hex: string }) => color.name || /^#[0-9a-f]{6}$/i.test(color.hex));
  const contacts: InvitationContact[] = storedContacts
    .slice(0, 3)
    .map((contact: any, index: number) => ({
      id: String(contact?.id || `contact-${index + 1}`),
      name: String(contact?.name || ''),
      relationship: String(contact?.relationship || ''),
      phoneNumber: String(contact?.phoneNumber || contact?.phone_number || ''),
      whatsappNumber: String(contact?.whatsappNumber || contact?.whatsapp_number || ''),
      enabled: contact?.enabled !== false,
    }));
  if (contacts.length === 0 && dbRow.whatsapp_contact) {
    contacts.push({
      id: 'legacy-contact',
      name: 'Wakil Keluarga',
      relationship: '',
      phoneNumber: dbRow.whatsapp_contact,
      whatsappNumber: dbRow.whatsapp_contact,
      enabled: true,
    });
  }
  return {
    id: dbRow.id,
    slug: dbRow.slug || '',
    openingTitle: dbRow.opening_title || '',
    brideName: dbRow.bride_name || '',
    groomName: dbRow.groom_name || '',
    weddingDate: dbRow.wedding_date || '',
    weddingTime: dbRow.wedding_time || '',
    eventEndTime: dbRow.event_end_time || '',
    venueName: dbRow.venue_name || '',
    venueAddress: dbRow.venue_address || '',
    googleMapsUrl: dbRow.google_maps_url || '',
    wazeUrl: dbRow.waze_url || '',
    whatsappContact: dbRow.whatsapp_contact || '',
    contacts,
    maxPax: Math.min(999, Math.max(1, Number(dbRow.max_pax) || 6)),
    dressCodeText: dbRow.dress_code_text || '',
    dressCodeColors,
    wishlistUrl: dbRow.wishlist_url || '',
    enableGiftSection: Boolean(
      dbRow.bank_name ||
      dbRow.bank_account_number ||
      dbRow.bank_account_holder ||
      dbRow.qr_code_url ||
      giftQrKey ||
      dbRow.wishlist_url
    ),
    bankGift: (dbRow.bank_name || dbRow.bank_account_number || dbRow.bank_account_holder || dbRow.qr_code_url || giftQrKey)
      ? {
          bankName: dbRow.bank_name || '',
          accountNumber: dbRow.bank_account_number || '',
          accountHolder: dbRow.bank_account_holder || '',
          qrCodeUrl: dbRow.qr_code_url || buildR2PublicUrl(giftQrKey),
          qrCodeKey: giftQrKey,
        }
      : undefined,
    rsvpClosingDate: dbRow.rsvp_closing_date ? new Date(dbRow.rsvp_closing_date).toISOString().split('T')[0] : '',
    videoKey,
    videoUrl: buildR2PublicUrl(videoKey),
    posterUrl: dbRow.poster_url || buildR2PublicUrl(posterKey),
    posterKey,
    giftQrKey,
    videoFileName: dbRow.video_file_name || 'Wedding_Video.mp4',
    status: (dbRow.status as InvitationStatus) || 'draft',
    privatePin: '', // Loaded separately through the authenticated get_invitation_pin RPC.
    createdAt: dbRow.created_at || new Date().toISOString(),
  };
}


export function mapDbRsvpToApp(dbRow: any): RsvpEntry {
  return {
    id: dbRow.id || dbRow.rsvp_id,
    invitationId: dbRow.invitation_id || '',
    guestName: dbRow.guest_name || '',
    attendance: dbRow.attendance === 'attending' ? 'attending' : 'declined',
    pax: Number(dbRow.pax) || 1,
    wishes: dbRow.wishes || '',
    submittedAt: dbRow.submitted_at
      ? new Date(dbRow.submitted_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  };
}

// ====================================================================
// SUPABASE AUTH SERVICE
// ====================================================================

export async function loginAdmin(
  email: string,
  pass: string
): Promise<{ session: Session | null; error?: string }> {
  if (!supabase) return { session: null, error: 'Supabase client is not configured.' };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
  const session = data.session;
  if (error || !session || !session.access_token || !session.user) {
    return {
      session: null,
      error: error?.message || 'Supabase did not return a valid authenticated session.',
    };
  }
  return { session };
}

export async function logoutAdmin(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: true };
  const { error } = await supabase.auth.signOut();
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getAdminSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getAdminSettings(
  fallback: SystemSettings,
): Promise<{ data: SystemSettings | null; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  const { data, error } = await supabase
    .from('app_settings')
    .select('business_name, tagline, whatsapp_number, default_expiry_days, google_sheets_sync_enabled')
    .eq('id', 'default')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message || 'Settings could not be loaded.' };
  }

  return {
    data: {
      ...fallback,
      businessName: data.business_name,
      tagline: data.tagline,
      whatsappNumber: data.whatsapp_number,
      defaultExpiryDays: data.default_expiry_days,
      googleSheetsSyncEnabled: data.google_sheets_sync_enabled,
    },
  };
}

export async function saveAdminSettings(
  settings: SystemSettings,
): Promise<{ data: SystemSettings | null; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  const { data, error } = await supabase
    .from('app_settings')
    .upsert(
      {
        id: 'default',
        business_name: settings.businessName.trim(),
        tagline: settings.tagline.trim(),
        whatsapp_number: settings.whatsappNumber.trim(),
        default_expiry_days: settings.defaultExpiryDays,
        google_sheets_sync_enabled: Boolean(settings.googleSheetsSyncEnabled),
      },
      { onConflict: 'id' },
    )
    .select('business_name, tagline, whatsapp_number, default_expiry_days, google_sheets_sync_enabled')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message || 'Settings could not be saved.' };
  }

  return {
    data: {
      ...settings,
      businessName: data.business_name,
      tagline: data.tagline,
      whatsappNumber: data.whatsapp_number,
      defaultExpiryDays: data.default_expiry_days,
      googleSheetsSyncEnabled: data.google_sheets_sync_enabled,
    },
  };
}

// ====================================================================
// INVITATION MANAGEMENT API
// ====================================================================

// 1. Fetch All Invitations (For Admin)
export async function getInvitations(): Promise<{ data: Invitation[]; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: [], error: 'Supabase URL and Anon Key are missing in .env.' };
  }

  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch invitations error:', error);
      return { data: [], error: error.message };
    }

    return { data: (data || []).map(mapDbInvitationToApp) };
  } catch (err: any) {
    console.error('Supabase fetch invitations exception:', err);
    return { data: [], error: err.message || 'Error loading invitations' };
  }
}

export async function getInvitationById(id: string): Promise<{ data: Invitation | null; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return { data: null, error: error?.message || 'Invitation not found' };
    }

    return { data: mapDbInvitationToApp(data) };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error retrieving invitation' };
  }
}

// 2. Fetch Single Invitation by Slug (For Public Guest View)
export async function getInvitationBySlug(slug: string): Promise<{ data: Invitation | null; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return { data: null, error: error?.message || 'Invitation not found or inactive' };
    }

    return { data: mapDbInvitationToApp(data) };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error retrieving invitation' };
  }
}

export function formatDateForDb(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) return '2026-12-31';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return '2026-12-31';
}

export function formatTimeForDb(timeStr?: string): string {
  if (!timeStr || !timeStr.trim()) return '11:00:00';
  const trimmed = timeStr.trim();
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
  }
  const match = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = match[3]?.toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    const hStr = hours.toString().padStart(2, '0');
    return `${hStr}:${minutes}:00`;
  }
  return '11:00:00';
}

// 3. Create Invitation with 6-digit PIN via the authenticated RPC
export async function createInvitationWithPin(
  invData: Partial<Invitation>,
  customPin?: string
): Promise<{ data: { invitation: Invitation; plainPin: string } | null; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: null, error: 'Supabase is not configured' };
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (sessionError || !session || !session.access_token || !session.user) {
      return {
        data: null,
        error: sessionError?.message || 'Authentication required. Please sign in again.',
      };
    }

    // Format closing date to ISO string if provided
    let closingDateIso: string | null = null;
    if (invData.rsvpClosingDate && invData.rsvpClosingDate.trim()) {
      const d = new Date(invData.rsvpClosingDate);
      if (!isNaN(d.getTime())) {
        closingDateIso = d.toISOString();
      }
    }

    const payload = {
      p_slug: invData.slug || `wedding-${Date.now().toString().slice(-6)}`,
      p_opening_title: invData.openingTitle?.trim() || null,
      p_bride_name: invData.brideName || '',
      p_groom_name: invData.groomName || '',
      p_wedding_date: formatDateForDb(invData.weddingDate),
      p_wedding_time: formatTimeForDb(invData.weddingTime),
      p_venue_name: invData.venueName || '',
      p_venue_address: invData.venueAddress || '',
      p_google_maps_url: invData.googleMapsUrl || null,
      p_waze_url: invData.wazeUrl || null,
      p_whatsapp_contact: invData.whatsappContact || '',
      p_wishlist_url: invData.wishlistUrl || null,
      p_bank_name: invData.bankGift?.bankName || null,
      p_bank_account_number: invData.bankGift?.accountNumber || null,
      p_bank_account_holder: invData.bankGift?.accountHolder || null,
      p_qr_code_url: invData.bankGift?.qrCodeUrl || null,
      p_rsvp_closing_date: closingDateIso,
      p_video_key: invData.videoKey || null,
      p_video_file_name: invData.videoFileName || null,
      p_status: invData.status || 'draft',
      p_custom_pin: customPin || null,
      p_contacts: invData.contacts || [],
      p_max_pax: Math.min(999, Math.max(1, Number(invData.maxPax) || 6)),
      p_dress_code_text: invData.dressCodeText?.trim() || null,
      p_dress_code_colors: invData.dressCodeColors || [],
    };

    const { data, error } = await supabase.rpc('create_invitation_with_pin', payload);

    if (error) {
      return { data: null, error: error.message };
    }
    if (!data || data.length === 0) {
      return { data: null, error: 'create_invitation_with_pin returned no invitation.' };
    }

    const createdRow = data[0];
    const generatedPin = createdRow.plain_pin;
    const invitationId = createdRow.invitation_id;
    if (invData.eventEndTime) {
      const { error: endTimeError } = await supabase
        .from('invitations')
        .update({ event_end_time: formatTimeForDb(invData.eventEndTime) })
        .eq('id', invitationId);
      if (endTimeError) {
        const { error: rollbackError } = await supabase
          .from('invitations')
          .delete()
          .eq('id', invitationId);
        return {
          data: null,
          error: rollbackError
            ? `End time could not be saved and the incomplete invitation could not be rolled back: ${endTimeError.message}; rollback: ${rollbackError.message}`
            : `End time could not be saved, so invitation creation was rolled back: ${endTimeError.message}`,
        };
      }
    }
    const { data: fetchRow, error: fetchError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (fetchError || !fetchRow) {
      return { data: null, error: fetchError?.message || 'Created invitation could not be loaded.' };
    }
    const mappedInv = mapDbInvitationToApp(fetchRow);
    mappedInv.privatePin = generatedPin;
    return {
      data: {
        invitation: mappedInv,
        plainPin: generatedPin,
      },
    };
  } catch (err: any) {
    return { data: null, error: err.message || 'Exception during invitation creation' };
  }
}

export async function getInvitationPin(
  invitationId: string,
): Promise<{ plainPin?: string; hasPin: boolean; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { hasPin: false, error: 'Supabase is not configured' };
  }
  if (!invitationId) return { hasPin: false, error: 'Invitation ID is required.' };

  try {
    const { data, error } = await supabase.rpc('get_invitation_pin', {
      p_invitation_id: invitationId,
    });
    if (error) return { hasPin: false, error: error.message };
    const plainPin = typeof data === 'string' ? data : '';
    if (!plainPin) return { hasPin: false };
    if (!/^\d{6}$/.test(plainPin)) {
      return { hasPin: false, error: 'The stored security PIN is not a valid 6-digit PIN.' };
    }
    return { plainPin, hasPin: true };
  } catch (error: any) {
    return { hasPin: false, error: error.message || 'Unable to load the security PIN.' };
  }
}

export async function generateInvitationPin(
  invitationId: string,
  replaceExisting = false,
): Promise<{ plainPin?: string; replacedExisting?: boolean; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { error: 'Supabase is not configured' };
  }
  if (!invitationId) return { error: 'Invitation ID is required.' };

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user) {
      return { error: sessionError?.message || 'Authentication required. Please sign in again.' };
    }

    const { data, error } = await supabase.rpc('generate_invitation_pin', {
      p_invitation_id: invitationId,
      p_replace_existing: replaceExisting,
    });
    if (error) return { error: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    const plainPin = String(row?.plain_pin || '');
    if (!/^\d{6}$/.test(plainPin)) {
      return { error: 'The server did not return a valid 6-digit PIN.' };
    }
    return {
      plainPin,
      replacedExisting: Boolean(row?.replaced_existing),
    };
  } catch (error: any) {
    return { error: error.message || 'Unable to generate security PIN.' };
  }
}

// 4. Update Existing Invitation Details
export async function updateInvitationInSupabase(
  id: string,
  invData: Partial<Invitation>
): Promise<{ data: Invitation | null; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  try {
    const has = (key: keyof Invitation) =>
      Object.prototype.hasOwnProperty.call(invData, key);

    let closingDateIso: string | null = null;
    if (invData.rsvpClosingDate && invData.rsvpClosingDate.trim()) {
      const d = new Date(invData.rsvpClosingDate);
      if (!isNaN(d.getTime())) {
        closingDateIso = d.toISOString();
      }
    }

    const payload: Record<string, any> = {
      ...(invData.slug ? { slug: invData.slug } : {}),
      ...(has('openingTitle') ? { opening_title: invData.openingTitle?.trim() || null } : {}),
      ...(invData.brideName ? { bride_name: invData.brideName } : {}),
      ...(invData.groomName ? { groom_name: invData.groomName } : {}),
      ...(invData.weddingDate ? { wedding_date: formatDateForDb(invData.weddingDate) } : {}),
      ...(invData.weddingTime ? { wedding_time: formatTimeForDb(invData.weddingTime) } : {}),
      ...(invData.venueName ? { venue_name: invData.venueName } : {}),
      ...(invData.venueAddress ? { venue_address: invData.venueAddress } : {}),
      ...(has('googleMapsUrl') ? { google_maps_url: invData.googleMapsUrl || null } : {}),
      ...(has('wazeUrl') ? { waze_url: invData.wazeUrl || null } : {}),
      ...(has('whatsappContact') ? { whatsapp_contact: invData.whatsappContact || '' } : {}),
      ...(has('contacts') ? { contacts: invData.contacts || [] } : {}),
      ...(has('eventEndTime') ? {
        event_end_time: invData.eventEndTime ? formatTimeForDb(invData.eventEndTime) : null,
      } : {}),
      ...(has('maxPax') ? { max_pax: Math.min(999, Math.max(1, Number(invData.maxPax) || 6)) } : {}),
      ...(has('dressCodeText') ? { dress_code_text: invData.dressCodeText?.trim() || null } : {}),
      ...(has('dressCodeColors') ? { dress_code_colors: invData.dressCodeColors || [] } : {}),
      ...(has('wishlistUrl') ? { wishlist_url: invData.wishlistUrl || null } : {}),
      ...(has('bankGift') ? {
        bank_name: invData.bankGift?.bankName || null,
        bank_account_number: invData.bankGift?.accountNumber || null,
        bank_account_holder: invData.bankGift?.accountHolder || null,
        qr_code_url: invData.bankGift?.qrCodeUrl || null,
      } : {}),
      ...(has('giftQrKey') ? { gift_qr_key: invData.giftQrKey || null } : {}),
      ...(has('rsvpClosingDate') ? { rsvp_closing_date: closingDateIso } : {}),
      ...(has('videoKey') ? { video_key: invData.videoKey || null } : {}),
      ...(has('posterUrl') ? { poster_url: invData.posterUrl || null } : {}),
      ...(has('posterKey') ? { poster_key: invData.posterKey || null } : {}),
      ...(has('videoFileName') ? { video_file_name: invData.videoFileName || null } : {}),
      ...(invData.status ? { status: invData.status } : {}),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('invitations')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Supabase update invitation error:', error);
      return { data: null, error: error?.message || 'Failed to update invitation' };
    }

    return { data: mapDbInvitationToApp(data) };
  } catch (err: any) {
    return { data: null, error: err.message || 'Exception updating invitation' };
  }
}

// 5. Delete Invitation (and attached video/media files & rsvps)
export async function deleteInvitationFromSupabase(
  id: string
): Promise<{ success: boolean; mediaDeleted?: boolean; warning?: string; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    // 1. Explicitly delete related rsvp_entries in case ON DELETE CASCADE is missing
    const { error: rsvpError } = await supabase
      .from('rsvp_entries')
      .delete()
      .eq('invitation_id', id);

    if (rsvpError) {
      console.warn(`Notice: rsvp_entries deletion notice: ${rsvpError.message}`);
    }

    // 2. Explicitly delete invitation_secrets
    const { error: secretsError } = await supabase
      .from('invitation_secrets')
      .delete()
      .eq('invitation_id', id);

    if (secretsError) {
      console.warn(`Notice: invitation_secrets deletion notice: ${secretsError.message}`);
    }

    // 3. Delete the database record before removing media. If this fails, the
    // public invitation remains intact and its R2 objects are not orphaned.
    const { error: invError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', id);

    if (invError) {
      return { success: false, error: invError.message };
    }

    // 4. Clean up R2 media after the invitation is successfully removed.
    const mediaResult = await MediaProviderService.deleteMedia(id, 'all');

    return mediaResult.success
      ? { success: true, mediaDeleted: true }
      : {
          success: true,
          mediaDeleted: false,
          warning: mediaResult.error || 'Rekod dipadam tetapi pembersihan media R2 gagal.',
        };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error deleting invitation' };
  }
}

// ====================================================================
// RSVP SERVICE
// ====================================================================

// Fetch RSVPs for Admin
export async function getRsvps(invitationId?: string): Promise<{ data: RsvpEntry[]; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: [], error: 'Supabase is not configured' };
  }

  try {
    let query = supabase.from('rsvp_entries').select('*').order('submitted_at', { ascending: false });
    if (invitationId) {
      query = query.eq('invitation_id', invitationId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Supabase fetch RSVPs error:', error);
      return { data: [], error: error.message };
    }

    return { data: (data || []).map(mapDbRsvpToApp) };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error fetching RSVPs' };
  }
}

// Public Guest RSVP Submission
export async function addRsvpToSupabase(
  newRsvp: Omit<RsvpEntry, 'id' | 'submittedAt'>
): Promise<{ data: RsvpEntry | null; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  // Frontend validation
  if (!newRsvp.guestName || newRsvp.guestName.trim().length === 0) {
    return { data: null, error: 'Sila masukkan nama tetamu.' };
  }
  if (newRsvp.guestName.trim().length > 100) {
    return { data: null, error: 'Nama tetamu tidak boleh melebihi 100 aksara.' };
  }
  if (newRsvp.pax < 0 || newRsvp.pax > 20) {
    return { data: null, error: 'Bilangan pax mestilah antara 0 hingga 20.' };
  }

  try {
    const { data, error } = await supabase
      .from('rsvp_entries')
      .insert({
        invitation_id: newRsvp.invitationId,
        guest_name: newRsvp.guestName.trim(),
        attendance: newRsvp.attendance,
        pax: newRsvp.pax,
        wishes: newRsvp.wishes ? newRsvp.wishes.trim().slice(0, 1000) : null,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Supabase insert RSVP error:', error);
      return { data: null, error: error?.message || 'Gagal menghantar RSVP. Sila semak semula.' };
    }

    return { data: mapDbRsvpToApp(data) };
  } catch (err: any) {
    return { data: null, error: err.message || 'Ralat menghantar RSVP' };
  }
}

// Admin Delete RSVP
export async function deleteRsvpFromSupabase(id: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    const { error } = await supabase.from('rsvp_entries').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error deleting RSVP' };
  }
}

// Private Couple RSVP Report RPC
export async function getPrivateCoupleRsvpReport(
  slug: string,
  inputPin: string
): Promise<{
  data: RsvpEntry[];
  brideName?: string;
  groomName?: string;
  error?: string;
  errorCode?: 'no_pin' | 'invalid_pin' | 'not_found' | 'system';
}> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: [], error: 'Supabase is not configured', errorCode: 'system' };
  }

  if (!inputPin || inputPin.length !== 6 || !/^\d{6}$/.test(inputPin)) {
    return {
      data: [],
      error: 'Sila masukkan 6-digit PIN keselamatan dalam bentuk nombor.',
      errorCode: 'invalid_pin',
    };
  }

  try {
    const { data, error } = await supabase.rpc('get_private_couple_rsvp_report', {
      invitation_slug: slug,
      input_pin: inputPin,
    });

    if (error) {
      console.warn('RPC get_private_couple_rsvp_report notice:', error.message);
      const message = error.message || '';
      if (/has not been generated|no.*pin/i.test(message)) {
        return { data: [], error: message, errorCode: 'no_pin' };
      }
      if (/invitation not found/i.test(message)) {
        return { data: [], error: message, errorCode: 'not_found' };
      }
      if (/invalid.*pin|pin.*format/i.test(message)) {
        return { data: [], error: message, errorCode: 'invalid_pin' };
      }
      return { data: [], error: message || 'Unable to verify the PIN.', errorCode: 'system' };
    }

    if (!data || data.length === 0) {
      return { data: [] };
    }

    const mapped = data.map((row: any) => ({
      id: row.rsvp_id,
      invitationId: '',
      guestName: row.guest_name,
      attendance: row.attendance === 'attending' ? 'attending' : 'declined',
      pax: Number(row.pax) || 1,
      wishes: row.wishes || '',
      submittedAt: row.submitted_at
        ? new Date(row.submitted_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    }));

    return {
      data: mapped,
      brideName: data[0].bride_name,
      groomName: data[0].groom_name,
    };
  } catch (err: any) {
    return {
      data: [],
      error: err.message || 'Unable to verify the PIN.',
      errorCode: 'system',
    };
  }
}


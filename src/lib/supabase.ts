import { createClient, Session } from '@supabase/supabase-js';
import { Invitation, RsvpEntry, InvitationStatus } from '../types';
import { MediaProviderService } from './mediaProvider';

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
  return {
    id: dbRow.id,
    slug: dbRow.slug || '',
    brideName: dbRow.bride_name || '',
    groomName: dbRow.groom_name || '',
    weddingDate: dbRow.wedding_date || '',
    weddingTime: dbRow.wedding_time || '',
    venueName: dbRow.venue_name || '',
    venueAddress: dbRow.venue_address || '',
    googleMapsUrl: dbRow.google_maps_url || '',
    wazeUrl: dbRow.waze_url || '',
    whatsappContact: dbRow.whatsapp_contact || '',
    wishlistUrl: dbRow.wishlist_url || '',
    enableGiftSection: Boolean(dbRow.bank_name || dbRow.bank_account_number || dbRow.bank_account_holder),
    bankGift: (dbRow.bank_name || dbRow.bank_account_number || dbRow.bank_account_holder)
      ? {
          bankName: dbRow.bank_name || '',
          accountNumber: dbRow.bank_account_number || '',
          accountHolder: dbRow.bank_account_holder || '',
          qrCodeUrl: dbRow.qr_code_url || '',
          qrCodeKey: dbRow.gift_qr_key || '',
        }
      : undefined,
    rsvpClosingDate: dbRow.rsvp_closing_date ? new Date(dbRow.rsvp_closing_date).toISOString().split('T')[0] : '',
    videoKey: dbRow.video_key || '',
    videoUrl: dbRow.video_url || '',
    posterUrl: dbRow.poster_url || '',
    posterKey: dbRow.poster_key || '',
    giftQrKey: dbRow.gift_qr_key || '',
    videoFileName: dbRow.video_file_name || 'Wedding_Video.mp4',
    status: (dbRow.status as InvitationStatus) || 'draft',
    privatePin: '', // Stored securely as pgcrypto hash in invitation_secrets; not exposed in SELECT queries
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
      ...(invData.brideName ? { bride_name: invData.brideName } : {}),
      ...(invData.groomName ? { groom_name: invData.groomName } : {}),
      ...(invData.weddingDate ? { wedding_date: formatDateForDb(invData.weddingDate) } : {}),
      ...(invData.weddingTime ? { wedding_time: formatTimeForDb(invData.weddingTime) } : {}),
      ...(invData.venueName ? { venue_name: invData.venueName } : {}),
      ...(invData.venueAddress ? { venue_address: invData.venueAddress } : {}),
      ...(has('googleMapsUrl') ? { google_maps_url: invData.googleMapsUrl || null } : {}),
      ...(has('wazeUrl') ? { waze_url: invData.wazeUrl || null } : {}),
      ...(invData.whatsappContact ? { whatsapp_contact: invData.whatsappContact } : {}),
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
      ...(has('videoUrl') ? { video_url: invData.videoUrl || null } : {}),
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
): Promise<{ data: RsvpEntry[]; brideName?: string; groomName?: string; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: [], error: 'Supabase is not configured' };
  }

  if (!inputPin || inputPin.length !== 6 || !/^\d{6}$/.test(inputPin)) {
    return { data: [], error: 'Sila masukkan 6-digit PIN keselamatan dalam bentuk nombor.' };
  }

  try {
    const { data, error } = await supabase.rpc('get_private_couple_rsvp_report', {
      invitation_slug: slug,
      input_pin: inputPin,
    });

    if (error) {
      console.warn('RPC get_private_couple_rsvp_report notice:', error.message);
      return { data: [], error: error.message || 'Security PIN tidak tepat.' };
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
    return { data: [], error: err.message || 'PIN keselamatan tidak sah.' };
  }
}


import { createClient } from '@supabase/supabase-js';
import { Invitation, RsvpEntry } from '../types';
import { INITIAL_INVITATIONS, INITIAL_RSVPS } from '../data/mockData';

const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helpers to convert DB snake_case to TS camelCase
export function mapDbInvitationToApp(dbRow: any): Invitation {
  return {
    id: dbRow.id,
    slug: dbRow.slug,
    brideName: dbRow.bride_name,
    groomName: dbRow.groom_name,
    weddingDate: dbRow.wedding_date,
    weddingTime: dbRow.wedding_time,
    venueName: dbRow.venue_name,
    venueAddress: dbRow.venue_address,
    googleMapsUrl: dbRow.google_maps_url || '',
    wazeUrl: dbRow.waze_url || '',
    whatsappContact: dbRow.whatsapp_contact,
    wishlistUrl: dbRow.wishlist_url || '',
    enableGiftSection: Boolean(dbRow.bank_name || dbRow.bank_account_number),
    bankGift: dbRow.bank_name
      ? {
          bankName: dbRow.bank_name || '',
          accountNumber: dbRow.bank_account_number || '',
          accountHolder: dbRow.bank_account_holder || '',
          qrCodeUrl: dbRow.qr_code_url || '',
        }
      : undefined,
    rsvpClosingDate: dbRow.rsvp_closing_date || '',
    videoUrl: dbRow.video_url,
    videoFileName: dbRow.video_file_name || 'Wedding_Video.mp4',
    status: dbRow.status || 'active',
    privatePin: dbRow.private_pin || '1234',
    createdAt: dbRow.created_at || new Date().toISOString(),
  };
}

export function mapAppInvitationToDb(inv: Partial<Invitation>): Record<string, any> {
  return {
    ...(inv.id ? { id: inv.id } : {}),
    slug: inv.slug,
    bride_name: inv.brideName,
    groom_name: inv.groomName,
    wedding_date: inv.weddingDate,
    wedding_time: inv.weddingTime,
    venue_name: inv.venueName,
    venue_address: inv.venueAddress,
    google_maps_url: inv.googleMapsUrl || '',
    waze_url: inv.wazeUrl || '',
    whatsapp_contact: inv.whatsappContact,
    wishlist_url: inv.wishlistUrl || '',
    bank_name: inv.bankGift?.bankName || null,
    bank_account_number: inv.bankGift?.accountNumber || null,
    bank_account_holder: inv.bankGift?.accountHolder || null,
    qr_code_url: inv.bankGift?.qrCodeUrl || null,
    rsvp_closing_date: inv.rsvpClosingDate || '',
    video_url: inv.videoUrl,
    video_file_name: inv.videoFileName || '',
    private_pin: inv.privatePin || '1234',
    status: inv.status || 'active',
    updated_at: new Date().toISOString(),
  };
}

export function mapDbRsvpToApp(dbRow: any): RsvpEntry {
  return {
    id: dbRow.id,
    invitationId: dbRow.invitation_id,
    guestName: dbRow.guest_name,
    attendance: dbRow.attendance,
    pax: Number(dbRow.pax) || 1,
    wishes: dbRow.wishes || '',
    submittedAt: dbRow.submitted_at
      ? new Date(dbRow.submitted_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  };
}

// ====================================================================
// SUPABASE API SERVICE
// ====================================================================

// 1. Fetch All Invitations
export async function getInvitations(): Promise<{ data: Invitation[]; error?: string }> {
  if (!supabase) {
    const local = localStorage.getItem('maiya_invitations');
    if (local) {
      try {
        return { data: JSON.parse(local) };
      } catch {}
    }
    return { data: INITIAL_INVITATIONS };
  }

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch invitations error:', error);
    return { data: [], error: error.message };
  }

  return { data: (data || []).map(mapDbInvitationToApp) };
}

// 2. Fetch Single Invitation by Slug
export async function getInvitationBySlug(slug: string): Promise<{ data: Invitation | null; error?: string }> {
  if (!supabase) {
    const local = localStorage.getItem('maiya_invitations');
    if (local) {
      try {
        const parsed: Invitation[] = JSON.parse(local);
        const found = parsed.find((i) => i.slug === slug);
        if (found) return { data: found };
      } catch {}
    }
    const found = INITIAL_INVITATIONS.find((i) => i.slug === slug) || INITIAL_INVITATIONS[0];
    return { data: found };
  }

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message || 'Invitation not found' };
  }

  return { data: mapDbInvitationToApp(data) };
}

// 3. Save or Update Invitation
export async function saveInvitationToSupabase(
  invitationData: Partial<Invitation>
): Promise<{ data: Invitation | null; error?: string }> {
  if (!supabase) {
    const local = localStorage.getItem('maiya_invitations');
    let list: Invitation[] = local ? JSON.parse(local) : [...INITIAL_INVITATIONS];

    if (invitationData.id) {
      list = list.map((item) => (item.id === invitationData.id ? ({ ...item, ...invitationData } as Invitation) : item));
    } else {
      const newInv: Invitation = {
        id: `inv-${Date.now()}`,
        slug: invitationData.slug || 'wedding-invite',
        brideName: invitationData.brideName || 'Bride',
        groomName: invitationData.groomName || 'Groom',
        weddingDate: invitationData.weddingDate || '2026-11-28',
        weddingTime: invitationData.weddingTime || '11:00 AM – 4:00 PM',
        venueName: invitationData.venueName || 'Seputeh',
        venueAddress: invitationData.venueAddress || 'Kuala Lumpur',
        googleMapsUrl: invitationData.googleMapsUrl || '',
        wazeUrl: invitationData.wazeUrl || '',
        whatsappContact: invitationData.whatsappContact || '+60123456789',
        wishlistUrl: invitationData.wishlistUrl || '',
        enableGiftSection: invitationData.enableGiftSection ?? true,
        bankGift: invitationData.bankGift,
        rsvpClosingDate: invitationData.rsvpClosingDate || '2026-11-14',
        videoUrl: invitationData.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-wedding-rings-in-a-box-41582-large.mp4',
        videoFileName: invitationData.videoFileName || 'wedding.mp4',
        status: invitationData.status || 'active',
        privatePin: invitationData.privatePin || '1234',
        createdAt: new Date().toISOString(),
      };
      list.unshift(newInv);
      invitationData = newInv;
    }

    localStorage.setItem('maiya_invitations', JSON.stringify(list));
    return { data: (invitationData.id ? invitationData : list[0]) as Invitation };
  }

  const payload = mapAppInvitationToDb(invitationData);

  const { data, error } = await supabase
    .from('invitations')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error('Supabase upsert invitation error:', error);
    return { data: null, error: error.message };
  }

  return { data: mapDbInvitationToApp(data) };
}

// 4. Delete Invitation
export async function deleteInvitationFromSupabase(id: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    const local = localStorage.getItem('maiya_invitations');
    if (local) {
      const list: Invitation[] = JSON.parse(local);
      const filtered = list.filter((i) => i.id !== id);
      localStorage.setItem('maiya_invitations', JSON.stringify(filtered));
    }
    return { success: true };
  }

  const { error } = await supabase.from('invitations').delete().eq('id', id);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

// 5. Fetch RSVP Entries
export async function getRsvps(invitationId?: string): Promise<{ data: RsvpEntry[]; error?: string }> {
  if (!supabase) {
    const local = localStorage.getItem('maiya_rsvps');
    let list: RsvpEntry[] = local ? JSON.parse(local) : [...INITIAL_RSVPS];
    if (invitationId) {
      list = list.filter((r) => r.invitationId === invitationId);
    }
    return { data: list };
  }

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
}

// 6. Submit RSVP
export async function addRsvpToSupabase(
  newRsvp: Omit<RsvpEntry, 'id' | 'submittedAt'>
): Promise<{ data: RsvpEntry | null; error?: string }> {
  if (!supabase) {
    const local = localStorage.getItem('maiya_rsvps');
    const list: RsvpEntry[] = local ? JSON.parse(local) : [...INITIAL_RSVPS];
    const created: RsvpEntry = {
      ...newRsvp,
      id: `rsvp-${Date.now()}`,
      submittedAt: new Date().toISOString().split('T')[0],
    };
    list.unshift(created);
    localStorage.setItem('maiya_rsvps', JSON.stringify(list));
    return { data: created };
  }

  const { data, error } = await supabase
    .from('rsvp_entries')
    .insert({
      invitation_id: newRsvp.invitationId,
      guest_name: newRsvp.guestName,
      attendance: newRsvp.attendance,
      pax: newRsvp.pax,
      wishes: newRsvp.wishes,
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase insert RSVP error:', error);
    return { data: null, error: error.message };
  }

  return { data: mapDbRsvpToApp(data) };
}

// 7. Delete RSVP
export async function deleteRsvpFromSupabase(id: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    const local = localStorage.getItem('maiya_rsvps');
    if (local) {
      const list: RsvpEntry[] = JSON.parse(local);
      const filtered = list.filter((r) => r.id !== id);
      localStorage.setItem('maiya_rsvps', JSON.stringify(filtered));
    }
    return { success: true };
  }

  const { error } = await supabase.from('rsvp_entries').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// 8. Upload MP4 Video to Supabase Storage ('invitation-videos')
export async function uploadVideoToSupabase(
  file: File,
  slug: string
): Promise<{ publicUrl: string | null; error?: string }> {
  if (!file.name.toLowerCase().endsWith('.mp4') && file.type !== 'video/mp4') {
    return { publicUrl: null, error: 'Only MP4 video files are supported.' };
  }

  if (file.size > 50 * 1024 * 1024) {
    return { publicUrl: null, error: 'File size exceeds maximum 50 MB limit.' };
  }

  if (!supabase) {
    const objectUrl = URL.createObjectURL(file);
    return { publicUrl: objectUrl };
  }

  const fileExt = 'mp4';
  const filePath = `invitations/${slug}_${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('invitation-videos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'video/mp4',
    });

  if (uploadError) {
    console.error('Supabase video upload error:', uploadError);
    return { publicUrl: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from('invitation-videos').getPublicUrl(filePath);
  return { publicUrl: data.publicUrl };
}

// 9. Verify Private Couple PIN (Using RPC or direct check)
export async function verifyPrivatePinWithSupabase(
  invitationId: string,
  inputPin: string,
  fallbackPin: string
): Promise<boolean> {
  if (!supabase) {
    return inputPin === fallbackPin;
  }

  const { data, error } = await supabase.rpc('verify_invitation_pin', {
    inv_id: invitationId,
    input_pin: inputPin,
  });

  if (error || data === null) {
    const { data: inv } = await supabase
      .from('invitations')
      .select('private_pin')
      .eq('id', invitationId)
      .single();

    return inv?.private_pin === inputPin;
  }

  return Boolean(data);
}

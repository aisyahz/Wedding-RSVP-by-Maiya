export type ScreenId =
  | 'splash'
  | 'login'
  | 'dashboard'
  | 'invitation_list'
  | 'create_invitation'
  | 'upload_video'
  | 'generate_link'
  | 'guest_opening'
  | 'guest_invitation'
  | 'guest_rsvp_form'
  | 'thank_you'
  | 'private_rsvp_report'
  | 'admin_rsvp'
  | 'settings';

export type InvitationStatus = 'active' | 'draft' | 'expired';

export interface BankGiftInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  qrCodeUrl?: string;
  qrCodeKey?: string;
}

export interface InvitationContact {
  id: string;
  name: string;
  relationship?: string;
  phoneNumber: string;
  whatsappNumber: string;
  enabled: boolean;
}

export interface DressCodeColor {
  name: string;
  hex: string;
}

export interface Invitation {
  id: string;
  slug: string;
  brideName: string;
  groomName: string;
  weddingDate: string; // YYYY-MM-DD
  weddingTime: string;
  eventEndTime?: string;
  venueName: string;
  venueAddress: string;
  googleMapsUrl: string;
  wazeUrl: string;
  whatsappContact: string; // e.g. +60123456789
  contacts?: InvitationContact[];
  maxPax?: number;
  dressCodeText?: string;
  dressCodeColors?: DressCodeColor[];
  wishlistUrl?: string;
  enableGiftSection?: boolean;
  bankGift?: BankGiftInfo;
  rsvpClosingDate: string;
  videoKey?: string;
  videoUrl?: string;
  posterUrl?: string;
  posterKey?: string;
  giftQrKey?: string;
  videoFileName: string;
  status: InvitationStatus;
  privatePin: string; // six numeric digits when returned by an authenticated PIN RPC
  createdAt: string;
}

export interface RsvpEntry {
  id: string;
  invitationId: string;
  guestName: string;
  attendance: 'attending' | 'declined';
  pax: number;
  wishes: string;
  submittedAt: string;
}

export interface SystemSettings {
  businessLogo: string;
  businessName: string;
  tagline: string;
  whatsappNumber: string;
  storageUsedMb: number;
  storageLimitMb: number;
  defaultExpiryDays: number;
  googleSheetsSyncEnabled?: boolean;
  googleSheetsConnectionStatus?: 'not_connected' | 'ready';
}

import { Invitation, RsvpEntry } from '../types';

export interface RsvpSyncRow {
  guestName: string;
  attendance: RsvpEntry['attendance'];
  pax: number;
  message: string;
  timestamp: string;
  status: 'submitted';
}

export interface RsvpSyncProvider {
  readonly id: 'google-sheets';
  readonly isConfigured: boolean;
  append(row: RsvpSyncRow, invitation: Invitation): Promise<{ success: boolean; error?: string }>;
}

/**
 * Integration boundary for a future server-side Google Sheets adapter.
 * OAuth credentials must never be stored or executed in the browser.
 */
export const googleSheetsSyncProvider: RsvpSyncProvider = {
  id: 'google-sheets',
  isConfigured: false,
  async append() {
    return {
      success: false,
      error: 'Google Sheets connection is not configured.',
    };
  },
};

export function toRsvpSyncRow(entry: RsvpEntry): RsvpSyncRow {
  return {
    guestName: entry.guestName,
    attendance: entry.attendance,
    pax: entry.pax,
    message: entry.wishes,
    timestamp: entry.submittedAt,
    status: 'submitted',
  };
}

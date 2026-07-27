import React, { useState } from 'react';
import { ScreenId, Invitation, RsvpEntry } from '../../types';
import { Search, Download, Trash2, Users } from 'lucide-react';

interface AdminRsvpScreenProps {
  currentScreen?: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  invitations: Invitation[];
  rsvps: RsvpEntry[];
  onDeleteRsvp: (id: string) => void;
}

export const AdminRsvpScreen: React.FC<AdminRsvpScreenProps> = ({
  invitations,
  rsvps,
  onDeleteRsvp,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvitationId, setSelectedInvitationId] = useState<string>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'attending' | 'declined'>('all');

  const filteredRsvps = rsvps.filter((r) => {
    const matchesSearch =
      r.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.wishes.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesInv = selectedInvitationId === 'all' || r.invitationId === selectedInvitationId;
    const matchesAttendance = attendanceFilter === 'all' || r.attendance === attendanceFilter;

    return matchesSearch && matchesInv && matchesAttendance;
  });

  const handleExportCsv = () => {
    const headers = 'Guest Name,Invitation,Attendance,Pax,Wishes,Submitted At\n';
    const rows = filteredRsvps
      .map((r) => {
        const inv = invitations.find((i) => i.id === r.invitationId);
        const cardName = inv ? `${inv.brideName} & ${inv.groomName}` : 'Unknown Card';
        return `"${r.guestName.replace(/"/g, '""')}","${cardName}",${r.attendance},${r.pax},"${(r.wishes || '').replace(/"/g, '""')}",${r.submittedAt}`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RSVP_Export_DigitalCardMaiya.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 min-[360px]:p-6 rounded-2xl border border-system shadow-2xs">
        <div className="min-w-0">
          <span className="text-caption uppercase tracking-wider font-semibold text-accent">
            Guest Analytics
          </span>
          <h1 className="text-heading-1 text-primary tracking-tight mt-0.5">
            RSVP Management ({rsvps.length})
          </h1>
          <p className="text-xs text-secondary mt-1">
            Track guest attendances, total pax and warm wedding wishes.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="btn-primary w-full sm:w-auto cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guest name or wishes..."
            className="w-full input-maiya pl-10"
          />
          <Search className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Invitation Selector */}
        <select
          value={selectedInvitationId}
          onChange={(e) => setSelectedInvitationId(e.target.value)}
          className="input-maiya cursor-pointer font-semibold"
        >
          <option value="all">All Invitation Cards</option>
          {invitations.map((i) => (
            <option key={i.id} value={i.id}>
              {i.brideName} & {i.groomName}
            </option>
          ))}
        </select>

        {/* Attendance Filter */}
        <select
          value={attendanceFilter}
          onChange={(e) => setAttendanceFilter(e.target.value as any)}
          className="input-maiya cursor-pointer font-semibold"
        >
          <option value="all">All Statuses</option>
          <option value="attending">✓ Attending (Hadir)</option>
          <option value="declined">✕ Declined (Tidak Hadir)</option>
        </select>
      </div>

      {/* Guest Response Rows */}
      <div className="space-y-3">
        {filteredRsvps.length === 0 ? (
          <div className="card-maiya p-12 text-center">
            <Users className="w-8 h-8 text-accent mx-auto mb-2" />
            <h3 className="text-title text-primary">
              No RSVP responses found
            </h3>
            <p className="text-xs text-secondary mt-1">
              Adjust your filters or share the invitation link with guests.
            </p>
          </div>
        ) : (
          filteredRsvps.map((rsvp) => {
            const inv = invitations.find((i) => i.id === rsvp.invitationId);
            return (
              <div
                key={rsvp.id}
                className="card-maiya card-comfortable flex min-w-0 flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-[#9B7B63]/50"
              >
                <div className="min-w-0 space-y-1 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="min-w-0 text-heading-3 text-primary break-words [overflow-wrap:anywhere]">
                      {rsvp.guestName}
                    </h3>
                    <span
                      className={`text-caption px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        rsvp.attendance === 'attending'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {rsvp.attendance === 'attending' ? `✓ Attending (${rsvp.pax} Pax)` : '✕ Declined'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-accent">
                    Card: {inv ? `${inv.brideName} & ${inv.groomName}` : 'Wedding Card'}
                  </p>

                  {rsvp.wishes && (
                    <p className="font-title italic text-sm leading-relaxed text-primary/80 bg-app p-3 rounded-xl border border-system mt-2 break-words [overflow-wrap:anywhere]">
                      “{rsvp.wishes}”
                    </p>
                  )}
                  <p className="text-caption text-secondary pt-1">
                    Submitted: {rsvp.submittedAt}
                  </p>
                </div>

                <div className="shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => {
                      if (confirm(`Delete RSVP record for ${rsvp.guestName}?`)) {
                        onDeleteRsvp(rsvp.id);
                      }
                    }}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-all cursor-pointer"
                    title="Delete RSVP"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

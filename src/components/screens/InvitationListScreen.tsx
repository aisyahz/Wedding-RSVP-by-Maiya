import React, { useState } from 'react';
import { ScreenId, Invitation, RsvpEntry } from '../../types';
import { Search, Plus, Eye, Edit3, Trash2, Copy, Calendar, MapPin } from 'lucide-react';

interface InvitationListScreenProps {
  currentScreen?: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  invitations: Invitation[];
  rsvps: RsvpEntry[];
  onSelectInvitation: (invitationId: string) => void;
  onEditInvitation: (invitation: Invitation) => void;
  onDeleteInvitation: (id: string) => void;
  onDuplicateInvitation: (invitation: Invitation) => void;
}

export const InvitationListScreen: React.FC<InvitationListScreenProps> = ({
  onNavigate,
  invitations,
  rsvps,
  onSelectInvitation,
  onEditInvitation,
  onDeleteInvitation,
  onDuplicateInvitation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'expired'>('all');

  const filteredInvitations = invitations.filter((inv) => {
    const matchesSearch =
      inv.brideName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.groomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.venueName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#D9D2CA] shadow-2xs">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#9B7B63]">
            Digital Cards Library
          </span>
          <h1 className="font-title text-2xl font-bold text-[#1E1E1C] tracking-tight mt-0.5">
            Invitations ({invitations.length})
          </h1>
          <p className="text-xs text-[#77736D] mt-1">
            Search, edit and manage digital wedding invitation links.
          </p>
        </div>

        <button
          onClick={() => onNavigate('create_invitation')}
          className="btn-primary cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Create Invitation</span>
        </button>
      </div>

      {/* Controls: Search & Filter Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by couple name or venue..."
            className="w-full input-maiya pl-10"
          />
          <Search className="w-4 h-4 text-[#77736D] absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Filter Pills */}
        <div className="flex space-x-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['all', 'active', 'draft', 'expired'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap cursor-pointer transition-all ${
                statusFilter === status
                  ? 'bg-[#1E1E1C] text-white shadow-xs'
                  : 'bg-white text-[#77736D] border border-[#D9D2CA] hover:text-[#1E1E1C]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Invitation Cards List */}
      <div className="space-y-4">
        {filteredInvitations.length === 0 ? (
          <div className="card-maiya p-12 text-center my-6">
            <h3 className="font-title text-base font-bold text-[#1E1E1C]">
              No invitations found
            </h3>
            <p className="text-xs text-[#77736D] mt-1">
              Try adjusting your search query or status filter.
            </p>
          </div>
        ) : (
          filteredInvitations.map((inv) => {
            const rsvpCount = rsvps.filter((r) => r.invitationId === inv.id).length;
            return (
              <div
                key={inv.id}
                className="card-maiya p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-[#9B7B63]/50"
              >
                {/* Header Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-bold text-[#1E1E1C]">
                      {inv.brideName} & {inv.groomName}
                    </h3>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        inv.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : inv.status === 'draft'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#77736D]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#9B7B63]" />
                      <span>{inv.weddingDate}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#9B7B63]" />
                      <span>{inv.venueName.split(',')[0]}</span>
                    </span>
                    <span>•</span>
                    <span className="text-xs font-semibold text-[#1E1E1C]">
                      {rsvpCount} RSVPs
                    </span>
                    <span>•</span>
                    <span className="text-[11px] text-[#77736D]">
                      PIN: <code className="bg-[#EFE7DF] px-1.5 py-0.5 rounded border border-[#D9D2CA] text-[#1E1E1C] font-mono font-bold">{inv.privatePin}</code>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-0 border-[#D9D2CA]/40">
                  <button
                    onClick={() => {
                      onSelectInvitation(inv.id);
                      onNavigate('generate_link');
                    }}
                    className="btn-outline h-9 px-3 text-xs gap-1.5 cursor-pointer"
                    title="Preview Invitation"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#9B7B63]" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={() => {
                      onEditInvitation(inv);
                      onNavigate('create_invitation');
                    }}
                    className="btn-outline h-9 px-3 text-xs gap-1.5 cursor-pointer"
                    title="Edit Invitation"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#9B7B63]" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => onDuplicateInvitation(inv)}
                    className="btn-outline h-9 px-3 text-xs gap-1.5 cursor-pointer"
                    title="Duplicate Card"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#9B7B63]" />
                    <span>Copy</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Delete card for ${inv.brideName} & ${inv.groomName}?`)) {
                        onDeleteInvitation(inv.id);
                      }
                    }}
                    className="h-9 px-3 text-xs text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 font-semibold inline-flex items-center gap-1 cursor-pointer transition-all"
                    title="Delete Invitation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
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

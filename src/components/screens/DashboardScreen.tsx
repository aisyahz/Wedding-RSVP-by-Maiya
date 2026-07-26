import React from 'react';
import { ScreenId, Invitation, RsvpEntry } from '../../types';
import { Plus, Mail, Users, Eye, Edit3, MessageSquare, ArrowRight, Trash2, Copy } from 'lucide-react';

interface DashboardScreenProps {
  currentScreen?: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  invitations: Invitation[];
  rsvps: RsvpEntry[];
  onSelectInvitationForPreview: (invitationId: string) => void;
  onEditInvitation?: (invitation: Invitation) => void;
  onDeleteInvitation?: (id: string) => void;
  onDuplicateInvitation?: (invitation: Invitation) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  invitations,
  rsvps,
  onSelectInvitationForPreview,
  onEditInvitation,
  onDeleteInvitation,
  onDuplicateInvitation,
}) => {
  const activeCount = invitations.filter((i) => i.status === 'active').length;
  const totalRsvpCount = rsvps.length;

  return (
    <div className="space-y-6">
      {/* Top Header & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#D9D2CA] shadow-2xs">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#9B7B63]">
            Digital Card Studio
          </span>
          <h1 className="font-title text-2xl font-bold text-[#1E1E1C] tracking-tight mt-0.5">
            Welcome back, Creator 👋
          </h1>
          <p className="text-xs text-[#77736D] mt-1">
            Manage invitations, view guest RSVP responses and share digital wedding cards.
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

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card-maiya p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#77736D] mb-2">
            <span className="text-xs font-medium text-[#77736D]">Active Invitations</span>
            <div className="w-8 h-8 rounded-lg bg-[#EFE7DF] flex items-center justify-center text-[#9B7B63]">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="font-title text-3xl font-bold text-[#1E1E1C]">
            {activeCount}
          </div>
          <span className="text-[11px] text-[#77736D] mt-1">Published live cards</span>
        </div>

        <div className="card-maiya p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#77736D] mb-2">
            <span className="text-xs font-medium text-[#77736D]">Total RSVPs</span>
            <div className="w-8 h-8 rounded-lg bg-[#EFE7DF] flex items-center justify-center text-[#9B7B63]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="font-title text-3xl font-bold text-[#1E1E1C]">
            {totalRsvpCount}
          </div>
          <span className="text-[11px] text-[#77736D] mt-1">Recorded guest responses</span>
        </div>
      </div>

      {/* Recent Invitations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-title text-lg font-bold text-[#1E1E1C]">
            Recent Invitations
          </h2>
          <button
            onClick={() => onNavigate('invitation_list')}
            className="text-xs font-semibold text-[#9B7B63] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {invitations.map((inv) => {
            const cardRsvps = rsvps.filter((r) => r.invitationId === inv.id);
            return (
              <div
                key={inv.id}
                className="card-maiya p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-[#9B7B63]/50"
              >
                <div className="space-y-1">
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
                  <p className="text-xs text-[#77736D]">
                    Date: {inv.weddingDate} • Venue: {inv.venueName}
                  </p>
                  <p className="text-xs font-medium text-[#9B7B63]">
                    {cardRsvps.length} Guest Responses
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-[#D9D2CA]/40">
                  <button
                    onClick={() => {
                      onSelectInvitationForPreview(inv.id);
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
                      if (onEditInvitation) {
                        onEditInvitation(inv);
                      } else {
                        onSelectInvitationForPreview(inv.id);
                      }
                      onNavigate('create_invitation');
                    }}
                    className="btn-outline h-9 px-3 text-xs gap-1.5 cursor-pointer"
                    title="Edit Invitation"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#9B7B63]" />
                    <span>Edit</span>
                  </button>

                  {onDuplicateInvitation && (
                    <button
                      onClick={() => onDuplicateInvitation(inv)}
                      className="btn-outline h-9 px-3 text-xs gap-1.5 cursor-pointer"
                      title="Duplicate / Copy Card"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#9B7B63]" />
                      <span>Copy</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onSelectInvitationForPreview(inv.id);
                      onNavigate('admin_rsvp');
                    }}
                    className="btn-outline h-9 px-3 text-xs gap-1.5 cursor-pointer"
                    title="View RSVPs"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#9B7B63]" />
                    <span>RSVP</span>
                  </button>

                  {onDeleteInvitation && (
                    <button
                      onClick={() => {
                        if (confirm(`Padam kad jemputan ${inv.brideName} & ${inv.groomName}? tindakan ini tidak boleh diundur.`)) {
                          onDeleteInvitation(inv.id);
                        }
                      }}
                      className="h-9 px-3 text-xs text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 font-semibold inline-flex items-center gap-1 cursor-pointer transition-all"
                      title="Delete Invitation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

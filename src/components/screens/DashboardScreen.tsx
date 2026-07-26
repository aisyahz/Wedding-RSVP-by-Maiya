import React, { useState } from 'react';
import { ScreenId, Invitation, RsvpEntry } from '../../types';
import { Plus, Mail, Users, Eye, Edit3, MessageSquare, ArrowRight, Trash2, Copy, Loader2, AlertTriangle, X } from 'lucide-react';

interface DashboardScreenProps {
  currentScreen?: ScreenId;
  onNavigate: (screen: ScreenId, slugOrId?: string) => void;
  invitations: Invitation[];
  rsvps: RsvpEntry[];
  onSelectInvitationForPreview: (invitationId: string) => void;
  onEditInvitation?: (invitation: Invitation | null) => void;
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModalTarget, setDeleteModalTarget] = useState<Invitation | null>(null);

  const activeCount = invitations.filter((i) => i.status === 'active').length;
  const totalRsvpCount = rsvps.length;

  const handleConfirmDelete = async () => {
    if (!deleteModalTarget || !onDeleteInvitation) return;
    const invId = deleteModalTarget.id;
    setDeletingId(invId);
    try {
      await onDeleteInvitation(invId);
    } catch (err: any) {
      console.error(`[DELETE_FAILED] DashboardScreen error: ${err?.message || err}`);
    } finally {
      setDeletingId(null);
      setDeleteModalTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 min-[360px]:p-6 rounded-2xl border border-[#D9D2CA] shadow-2xs">
        <div className="min-w-0">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#9B7B63]">
            Digital Card Studio
          </span>
          <h1 className="font-title text-2xl font-bold text-[#1E1E1C] tracking-tight mt-0.5">
            Selamat kembali
          </h1>
          <p className="text-xs text-[#77736D] mt-1">
            Manage invitations, view guest RSVP responses and share digital wedding cards.
          </p>
        </div>

        <button
          onClick={() => onNavigate('create_invitation')}
          className="btn-primary w-full sm:w-auto cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Create Invitation</span>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 min-[360px]:gap-4">
        <div className="card-maiya p-4 min-[360px]:p-5 flex flex-col justify-between">
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

        <div className="card-maiya p-4 min-[360px]:p-5 flex flex-col justify-between">
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
                className="card-maiya p-4 min-[360px]:p-5 flex min-w-0 flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-[#9B7B63]/50"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="min-w-0 font-serif text-lg font-bold text-[#1E1E1C] break-words [overflow-wrap:anywhere]">
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
                    Tarikh: {inv.weddingDate} • Lokasi: {inv.venueName}
                  </p>
                  <p className="text-xs font-medium text-[#9B7B63]">
                    {cardRsvps.length} Guest Responses
                  </p>
                </div>

                <div className="grid grid-cols-2 min-[430px]:flex min-[430px]:flex-wrap items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-[#D9D2CA]/40">
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
                      onNavigate('create_invitation', inv.id);
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
                      disabled={deletingId === inv.id}
                      onClick={() => setDeleteModalTarget(inv)}
                      className="h-9 px-3 text-xs text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 font-semibold inline-flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete Invitation"
                    >
                      {deletingId === inv.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>{deletingId === inv.id ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User-Friendly Delete Confirmation Modal */}
      {deleteModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div role="dialog" aria-modal="true" aria-label="Padam kad jemputan" className="card-maiya p-4 min-[360px]:p-6 max-w-md w-full min-w-0 max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white space-y-5 shadow-2xl rounded-2xl border border-[#D9D2CA] animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <button
                onClick={() => setDeleteModalTarget(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="font-title text-lg font-bold text-gray-900">
                Padam kad jemputan?
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Adakah anda pasti mahu memadamkan kad jemputan untuk{' '}
                <strong className="text-gray-900">
                  {deleteModalTarget.brideName} & {deleteModalTarget.groomName}
                </strong>
                ?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 space-y-1">
                <p className="font-bold">Tindakan ini tidak boleh diundur.</p>
                <p>
                  Semua media video, kod QR hadiah, dan rekod RSVP berkaitan kad ini akan dipadamkan secara kekal dari pangkalan data.
                </p>
              </div>
            </div>

            <div className="flex flex-col min-[390px]:flex-row items-stretch gap-3 pt-2">
              <button
                type="button"
                disabled={deletingId === deleteModalTarget.id}
                onClick={() => setDeleteModalTarget(null)}
                className="flex-1 btn-outline h-11 text-xs cursor-pointer font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingId === deleteModalTarget.id}
                onClick={handleConfirmDelete}
                className="flex-1 h-11 px-4 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {deletingId === deleteModalTarget.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Memadam...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, padam</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

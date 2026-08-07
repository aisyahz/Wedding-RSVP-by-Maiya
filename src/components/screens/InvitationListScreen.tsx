import React, { useState } from 'react';
import { ScreenId, Invitation, RsvpEntry } from '../../types';
import { Search, Plus, Eye, Edit3, Trash2, Copy, Calendar, MapPin, Loader2, AlertTriangle, X } from 'lucide-react';
import { copyText } from '../../lib/clipboard';

interface InvitationListScreenProps {
  currentScreen?: ScreenId;
  onNavigate: (screen: ScreenId, slugOrId?: string) => void;
  invitations: Invitation[];
  rsvps: RsvpEntry[];
  onDeleteInvitation: (id: string) => void;
}

export const InvitationListScreen: React.FC<InvitationListScreenProps> = ({
  onNavigate,
  invitations,
  rsvps,
  onDeleteInvitation,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModalTarget, setDeleteModalTarget] = useState<Invitation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'expired'>('all');
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null);

  const handleCopyInvitationUrl = async (invitation: Invitation) => {
    const url = `${window.location.origin.replace(/\/+$/, '')}/invite/${encodeURIComponent(invitation.slug)}`;
    if (await copyText(url)) {
      setCopiedInvitationId(invitation.id);
      window.setTimeout(() => setCopiedInvitationId((current) => current === invitation.id ? null : current), 2500);
    }
  };

  const filteredInvitations = invitations.filter((inv) => {
    const matchesSearch =
      inv.brideName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.groomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.venueName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleConfirmDelete = async () => {
    if (!deleteModalTarget || !onDeleteInvitation) return;
    const invId = deleteModalTarget.id;
    setDeletingId(invId);
    try {
      await onDeleteInvitation(invId);
    } catch (err: any) {
      console.error(`[DELETE_FAILED] InvitationListScreen error: ${err?.message || err}`);
    } finally {
      setDeletingId(null);
      setDeleteModalTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 min-[360px]:p-6 rounded-2xl border border-system shadow-2xs">
        <div className="min-w-0">
          <span className="text-caption uppercase tracking-wider font-semibold text-accent">
            Digital Cards Library
          </span>
          <h1 className="text-heading-1 text-primary tracking-tight mt-0.5">
            Invitations ({invitations.length})
          </h1>
          <p className="text-xs text-secondary mt-1">
            Search, edit and manage digital wedding invitation links.
          </p>
        </div>

        <button
          onClick={() => {
            onNavigate('create_invitation');
          }}
          className="btn-primary w-full sm:w-auto cursor-pointer self-start sm:self-auto"
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
          <Search className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Filter Pills */}
        <div className="grid grid-cols-2 min-[390px]:grid-cols-4 gap-2 w-full md:w-auto">
          {(['all', 'active', 'draft', 'expired'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`min-h-11 px-3 py-2 rounded-xl text-sm font-semibold capitalize whitespace-normal cursor-pointer transition-all ${
                statusFilter === status
                  ? 'bg-[#1E1E1C] text-white shadow-xs'
                  : 'bg-white text-secondary border border-system hover:text-primary'
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
          <div className="card-maiya p-6 min-[360px]:p-12 text-center my-6">
            <h3 className="text-title text-primary">
              No invitations found
            </h3>
            <p className="text-xs text-secondary mt-1">
              Try adjusting your search query or status filter.
            </p>
          </div>
        ) : (
          filteredInvitations.map((inv) => {
            const rsvpCount = rsvps.filter((r) => r.invitationId === inv.id).length;
            return (
              <div
                key={inv.id}
                className="card-maiya card-comfortable flex min-w-0 flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-[#9B7B63]/50"
              >
                {/* Header Info */}
                <div className="min-w-0 space-y-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="min-w-0 text-heading-3 text-primary break-words [overflow-wrap:anywhere]">
                      {inv.brideName} & {inv.groomName}
                    </h3>
                    <span
                      className={`text-caption px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
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

                  <div className="flex flex-wrap items-center gap-3 text-xs text-secondary">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-accent" />
                      <span>{inv.weddingDate}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-accent" />
                      <span className="break-words [overflow-wrap:anywhere]">{inv.venueName.split(',')[0]}</span>
                    </span>
                    <span>•</span>
                    <span className="text-xs font-semibold text-primary">
                      {rsvpCount} RSVPs
                    </span>
                    <span>•</span>
                    <span className="text-caption text-secondary">
                      PIN: <code className="bg-[#EFE7DF] px-1.5 py-0.5 rounded border border-system text-primary font-title tabular-nums font-bold">{inv.privatePin}</code>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 min-[430px]:flex min-[430px]:flex-wrap items-center gap-2 w-full md:w-auto pt-2 md:pt-0 border-t md:border-0 border-system/40">
                  <button
                    onClick={() => onNavigate('guest_opening', inv.slug)}
                    className="btn-outline h-9 px-3 text-xs gap-1.5 cursor-pointer"
                    title="Preview Invitation"
                  >
                    <Eye className="w-3.5 h-3.5 text-accent" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={() => onNavigate('create_invitation', inv.id)}
                    className="btn-outline h-9 px-3 text-xs gap-1.5 cursor-pointer"
                    title="Edit Invitation"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-accent" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => void handleCopyInvitationUrl(inv)}
                    className="btn-outline h-9 px-3 text-xs gap-1.5 cursor-pointer"
                    title="Copy Invitation URL"
                  >
                    <Copy className="w-3.5 h-3.5 text-accent" />
                    <span>{copiedInvitationId === inv.id ? 'Copied!' : 'Copy'}</span>
                  </button>

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
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* User-Friendly Delete Confirmation Modal */}
      {deleteModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div role="dialog" aria-modal="true" aria-label="Padam kad jemputan" className="card-maiya p-4 min-[360px]:p-6 max-w-md w-full min-w-0 max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white space-y-5 shadow-2xl rounded-2xl border border-system animate-in zoom-in-95">
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
              <h3 className="text-heading-3 text-primary">
                Padam kad jemputan?
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Adakah anda pasti mahu memadamkan kad jemputan untuk{' '}
                <strong className="text-primary">
                  {deleteModalTarget.brideName} & {deleteModalTarget.groomName}
                </strong>
                ?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-caption text-rose-800 space-y-1">
                <p className="font-bold">⚠️ Tindakan ini tidak boleh diundur.</p>
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
                className="btn-destructive flex-1 cursor-pointer"
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

import React, { useState } from 'react';
import { ScreenId, Invitation, RsvpEntry } from '../../types';
import { ArrowLeft, Check, CheckCircle2, X, Send, Loader2, Minus, Plus, Users } from 'lucide-react';

interface GuestRsvpFormScreenProps {
  onNavigate: (screen: ScreenId) => void;
  activeInvitation: Invitation | null;
  onAddRsvp: (
    newRsvp: Omit<RsvpEntry, 'id' | 'submittedAt'>,
  ) => Promise<{ success: boolean; error?: string }>;
}

export const GuestRsvpFormScreen: React.FC<GuestRsvpFormScreenProps> = ({
  onNavigate,
  activeInvitation,
  onAddRsvp,
}) => {
  const [guestName, setGuestName] = useState('');
  const [attendance, setAttendance] = useState<'attending' | 'declined'>('attending');
  const [pax, setPax] = useState(2);
  const [wishes, setWishes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const brideName = activeInvitation?.brideName || '';
  const groomName = activeInvitation?.groomName || '';
  const maxPax = Math.max(1, activeInvitation?.maxPax || 6);

  React.useEffect(() => {
    setPax((value) => Math.min(maxPax, Math.max(1, value)));
  }, [maxPax]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || submitSuccess) return;
    if (!guestName.trim()) {
      setSubmitError('Sila masukkan nama tetamu.');
      return;
    }
    if (!activeInvitation?.id) {
      setSubmitError('Jemputan tidak dijumpai. Sila muat semula halaman.');
      return;
    }

    setSubmitError('');
    setIsSubmitting(true);
    const result = await onAddRsvp({
      invitationId: activeInvitation.id,
      guestName: guestName.trim(),
      attendance,
      pax: attendance === 'attending' ? pax : 0,
      wishes: wishes.trim(),
    });

    if (result.success) {
      setSubmitSuccess(true);
      setIsSubmitting(false);
      return;
    }

    setSubmitError(result.error || 'RSVP tidak dapat dihantar. Sila cuba lagi.');
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-md min-w-0 w-full mx-auto space-y-4 min-[360px]:space-y-6 p-3 min-[360px]:p-4">
      {/* Top Header */}
      <div className="flex min-w-0 items-center justify-between gap-2 bg-white p-3 min-[360px]:p-5 rounded-2xl border border-system shadow-2xs">
        <button
          onClick={() => onNavigate('guest_invitation')}
          className="w-10 h-10 rounded-xl bg-app hover:bg-[#EFE7DF] text-primary flex items-center justify-center cursor-pointer transition-all border border-system"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center min-w-0">
          <span className="text-caption uppercase font-semibold text-accent tracking-wider block">
            Walimatul 'Urus
          </span>
          <h1 className="font-title text-sm min-[360px]:text-base font-bold text-primary break-words">
            Pengesahan Kehadiran
          </h1>
        </div>

        <div className="w-10" />
      </div>

      {/* Main Form Card */}
      {submitSuccess ? (
        <div className="card-maiya card-form space-y-5 text-center" role="status">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <div>
            <h2 className="font-serif text-heading-1 text-primary">Terima Kasih</h2>
            <p className="mt-2 text-sm text-secondary">Kehadiran anda telah berjaya direkodkan.</p>
          </div>
          <button type="button" onClick={() => onNavigate('guest_invitation')} className="btn-primary w-full">
            Tutup
          </button>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="card-maiya card-form space-y-5">
        <div className="text-center space-y-1 pb-3 border-b border-system/40">
          <h2 className="font-serif text-heading-1 text-primary break-words [overflow-wrap:anywhere]">
            {brideName} & {groomName}
          </h2>
          <p className="text-xs text-secondary">
            Sila sahkan kehadiran anda untuk memudahkan urusan tuan rumah.
          </p>
        </div>

        {/* Guest Name */}
        <div>
          <label className="form-label block">
            Nama Tetamu *
          </label>
          <input
            type="text"
            required
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="cth. Dato' Ahmad & Isteri"
            className="w-full input-maiya"
          />
        </div>

        {/* Attendance Toggle */}
        <div>
          <label className="form-label block">
            Kehadiran *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAttendance('attending')}
              className={`h-[50px] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                attendance === 'attending'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-white text-secondary border-system hover:bg-app'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Hadir</span>
            </button>

            <button
              type="button"
              onClick={() => setAttendance('declined')}
              className={`h-[50px] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                attendance === 'declined'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                  : 'bg-white text-secondary border-system hover:bg-app'
              }`}
            >
              <X className="w-4 h-4" />
              <span>Tidak Hadir</span>
            </button>
          </div>
        </div>

        {/* Pax Selector */}
        {attendance === 'attending' && (
          <div className="rounded-xl border border-system bg-app p-3 min-[360px]:p-4">
            <div className="flex flex-col gap-3 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between min-[360px]:gap-4">
              <div className="min-w-0">
                <span className="flex items-center gap-2 text-xs font-semibold text-primary"><Users className="h-4 w-4 text-accent" /> Jumlah Tetamu</span>
                <span className="mt-1 block text-caption text-secondary">Maksimum {maxPax} pax</span>
              </div>
              <div className="flex shrink-0 items-center justify-center gap-2" aria-label="Pilih jumlah tetamu">
                <button type="button" aria-label="Kurangkan tetamu" disabled={pax <= 1} onClick={() => setPax((value) => Math.max(1, value - 1))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-system bg-white text-primary transition-colors hover:bg-[#EFE7DF] disabled:cursor-not-allowed disabled:opacity-40"><Minus className="h-4 w-4" /></button>
                <output className="min-w-12 text-center text-lg font-bold tabular-nums text-primary" aria-live="polite">{pax}</output>
                <button type="button" aria-label="Tambah tetamu" disabled={pax >= maxPax} onClick={() => setPax((value) => Math.min(maxPax, value + 1))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-system bg-white text-primary transition-colors hover:bg-[#EFE7DF] disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        )}

        {/* Wishes Input */}
        <div>
          <label className="form-label block">
            Ucapan dan Doa
          </label>
          <textarea
            rows={3}
            value={wishes}
            onChange={(e) => setWishes(e.target.value)}
            placeholder="Tinggalkan ucapan & doa indah buat mempelai..."
            className="input-maiya"
          />
        </div>

        {/* Submit */}
        <div className="pt-2">
          {submitError && (
            <p role="alert" className="mb-3 text-center text-xs text-rose-700">
              {submitError}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !activeInvitation?.id}
            className="w-full btn-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Send className="w-4 h-4 shrink-0" />}
            <span>{isSubmitting ? 'Menghantar…' : 'Hantar RSVP'}</span>
          </button>
        </div>
      </form>
      )}
    </div>
  );
};

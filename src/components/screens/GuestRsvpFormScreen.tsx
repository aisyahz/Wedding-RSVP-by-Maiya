import React, { useState } from 'react';
import { ScreenId, Invitation, RsvpEntry } from '../../types';
import { ArrowLeft, Check, X, Send, Loader2 } from 'lucide-react';

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

  const brideName = activeInvitation?.brideName || '';
  const groomName = activeInvitation?.groomName || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
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
      onNavigate('thank_you');
      return;
    }

    setSubmitError(result.error || 'RSVP tidak dapat dihantar. Sila cuba lagi.');
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-md min-w-0 w-full mx-auto space-y-4 min-[360px]:space-y-6 p-3 min-[360px]:p-4">
      {/* Top Header */}
      <div className="flex min-w-0 items-center justify-between gap-2 bg-white p-3 min-[360px]:p-5 rounded-2xl border border-[#D9D2CA] shadow-2xs">
        <button
          onClick={() => onNavigate('guest_invitation')}
          className="w-10 h-10 rounded-xl bg-[#F7F5F2] hover:bg-[#EFE7DF] text-[#1E1E1C] flex items-center justify-center cursor-pointer transition-all border border-[#D9D2CA]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center min-w-0">
          <span className="text-[10px] uppercase font-semibold text-[#9B7B63] tracking-wider block">
            Walimatul 'Urus
          </span>
          <h1 className="font-title text-sm min-[360px]:text-base font-bold text-[#1E1E1C] break-words">
            Pengesahan Kehadiran
          </h1>
        </div>

        <div className="w-10" />
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="card-maiya p-4 min-[360px]:p-6 sm:p-8 space-y-5">
        <div className="text-center space-y-1 pb-3 border-b border-[#D9D2CA]/40">
          <h2 className="font-serif text-2xl font-bold text-[#1E1E1C] break-words [overflow-wrap:anywhere]">
            {brideName} & {groomName}
          </h2>
          <p className="text-xs text-[#77736D]">
            Sila sahkan kehadiran anda untuk memudahkan urusan tuan rumah.
          </p>
        </div>

        {/* Guest Name */}
        <div>
          <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
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
          <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
            Kehadiran *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAttendance('attending')}
              className={`h-[50px] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                attendance === 'attending'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-white text-[#77736D] border-[#D9D2CA] hover:bg-[#F7F5F2]'
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
                  : 'bg-white text-[#77736D] border-[#D9D2CA] hover:bg-[#F7F5F2]'
              }`}
            >
              <X className="w-4 h-4" />
              <span>Tidak Hadir</span>
            </button>
          </div>
        </div>

        {/* Pax Selector */}
        {attendance === 'attending' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#1E1E1C]">
                Jumlah Tetamu (Pax)
              </label>
              <span className="text-xs font-bold text-[#9B7B63]">{pax} Pax</span>
            </div>
            <div className="grid grid-cols-3 min-[360px]:grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPax(num)}
                  className={`min-h-11 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                    pax === num
                      ? 'bg-[#9B7B63] text-white border-[#9B7B63]'
                      : 'bg-white text-[#1E1E1C] border-[#D9D2CA] hover:bg-[#F7F5F2]'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Wishes Input */}
        <div>
          <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
            Ucapan dan Doa
          </label>
          <textarea
            rows={3}
            value={wishes}
            onChange={(e) => setWishes(e.target.value)}
            placeholder="Tinggalkan ucapan & doa indah buat mempelai..."
            className="w-full bg-white border border-[#D9D2CA] rounded-xl p-3 text-base text-[#1E1E1C] focus:outline-none focus:border-[#9B7B63] focus:ring-3 focus:ring-[#9B7B63]/10"
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
    </div>
  );
};

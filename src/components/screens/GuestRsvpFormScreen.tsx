import React, { useState } from 'react';
import { ScreenId, Invitation, RsvpEntry } from '../../types';
import { ArrowLeft, Check, X, Send } from 'lucide-react';

interface GuestRsvpFormScreenProps {
  onNavigate: (screen: ScreenId) => void;
  activeInvitation: Invitation | null;
  onAddRsvp: (newRsvp: Omit<RsvpEntry, 'id' | 'submittedAt'>) => void;
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

  const brideName = activeInvitation?.brideName || 'Sofea Azman';
  const groomName = activeInvitation?.groomName || 'Adam Harith';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      alert('Sila masukkan nama tetamu.');
      return;
    }

    onAddRsvp({
      invitationId: activeInvitation?.id || 'inv-001',
      guestName: guestName.trim(),
      attendance,
      pax: attendance === 'attending' ? pax : 0,
      wishes: wishes.trim() || 'Selamat Pengantin Baru! Semoga berkekalan hingga ke anak cucu.',
    });

    onNavigate('thank_you');
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-[#D9D2CA] shadow-2xs">
        <button
          onClick={() => onNavigate('guest_invitation')}
          className="w-10 h-10 rounded-xl bg-[#F7F5F2] hover:bg-[#EFE7DF] text-[#1E1E1C] flex items-center justify-center cursor-pointer transition-all border border-[#D9D2CA]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <span className="text-[10px] uppercase font-semibold text-[#9B7B63] tracking-wider block">
            Walimatul 'Urus
          </span>
          <h1 className="font-title text-base font-bold text-[#1E1E1C]">
            Pengesahan Kehadiran
          </h1>
        </div>

        <div className="w-10" />
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="card-maiya p-6 sm:p-8 space-y-5">
        <div className="text-center space-y-1 pb-3 border-b border-[#D9D2CA]/40">
          <h2 className="font-serif text-2xl font-bold text-[#1E1E1C]">
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
            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPax(num)}
                  className={`h-10 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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
            className="w-full bg-white border border-[#D9D2CA] rounded-xl p-3 text-xs text-[#1E1E1C] focus:outline-none focus:border-[#9B7B63]"
          />
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full btn-primary cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Hantar RSVP</span>
          </button>
        </div>
      </form>
    </div>
  );
};

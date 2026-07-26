import React, { useEffect } from 'react';
import { ScreenId, Invitation } from '../../types';
import confetti from 'canvas-confetti';
import { Heart, Calendar, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface ThankYouScreenProps {
  onNavigate: (screen: ScreenId) => void;
  activeInvitation: Invitation | null;
}

export const ThankYouScreen: React.FC<ThankYouScreenProps> = ({
  onNavigate,
  activeInvitation,
}) => {
  const brideName = activeInvitation?.brideName || '';
  const groomName = activeInvitation?.groomName || '';
  const weddingDate = activeInvitation?.weddingDate || '28 November 2026';

  useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#9B7B63', '#1E1E1C', '#D9D2CA', '#EFE7DF'],
      });
    } catch {
      // Fallback
    }
  }, []);

  const addToGoogleCalendar = () => {
    const title = encodeURIComponent(`Majlis Perkahwinan ${brideName} & ${groomName}`);
    const details = encodeURIComponent(`Walimatul 'Urus ${brideName} & ${groomName}. Kad Digital: https://digitalcardbymaiya.com`);
    const location = encodeURIComponent(activeInvitation?.venueName || 'Glasshouse at Seputeh');
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-md mx-auto space-y-6 text-center">
      {/* Top Badge */}
      <div className="pt-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>RSVP Berjaya Direkodkan</span>
        </span>
      </div>

      {/* Main Card */}
      <div className="card-maiya p-6 sm:p-8 space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-[#EFE7DF] text-[#9B7B63] flex items-center justify-center mx-auto border border-[#D9D2CA]">
          <Heart className="w-7 h-7 fill-[#9B7B63]" />
        </div>

        <div className="space-y-1">
          <h1 className="font-serif text-3xl font-bold text-[#1E1E1C]">
            Terima Kasih
          </h1>
          <p className="font-serif italic text-xs text-[#77736D] max-w-xs mx-auto">
            "Pengesahan kehadiran anda telah diterima dengan setinggi-tinggi penghargaan."
          </p>
        </div>

        <div className="w-12 h-px bg-[#D9D2CA] mx-auto" />

        <div className="text-xs text-[#77736D] space-y-1">
          <p className="font-title font-bold text-[#1E1E1C] text-base">
            {brideName} & {groomName}
          </p>
          <p>{weddingDate} • {activeInvitation?.venueName || 'Glasshouse at Seputeh'}</p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={addToGoogleCalendar}
            className="w-full btn-outline h-[52px] text-xs gap-2 cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-[#9B7B63]" />
            <span>Simpan ke Google Calendar</span>
          </button>

          <button
            onClick={() => onNavigate('guest_invitation')}
            className="w-full btn-primary cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Kad Jemputan</span>
          </button>
        </div>
      </div>

      <div className="text-xs text-[#77736D] pt-2">
        <span>Digital Wedding Card Powered by </span>
        <strong className="text-[#1E1E1C] font-semibold">Digital Card by Maiya</strong>
      </div>
    </div>
  );
};

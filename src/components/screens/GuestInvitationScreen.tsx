import React, { useState, useEffect, useRef } from 'react';
import { ScreenId, Invitation, RsvpEntry } from '../../types';
import { Clock, MapPin, Navigation, Phone, Gift, Copy, Lock, Volume2, VolumeX } from 'lucide-react';
import { BottomGuestNav } from '../common/BottomGuestNav';

interface GuestInvitationScreenProps {
  onNavigate: (screen: ScreenId) => void;
  activeInvitation: Invitation | null;
  rsvps: RsvpEntry[];
}

export const GuestInvitationScreen: React.FC<GuestInvitationScreenProps> = ({
  onNavigate,
  activeInvitation,
  rsvps,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [copiedBank, setCopiedBank] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn('Auto-play fallback notice:', err);
      });
    }
  }, [activeInvitation?.videoUrl, isMuted]);

  // Live countdown state
  const targetDateStr = activeInvitation?.weddingDate || '2026-11-28';
  const [timeLeft, setTimeLeft] = useState({ days: 36, hours: 22, minutes: 33, seconds: 17 });

  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(`${targetDateStr}T11:00:00`).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDateStr]);

  const brideName = activeInvitation?.brideName || 'Sofea Azman';
  const groomName = activeInvitation?.groomName || 'Adam Harith';
  const weddingDate = activeInvitation?.weddingDate || '28 NOVEMBER 2026';
  const weddingTime = activeInvitation?.weddingTime || '11:00 AM – 4:00 PM';
  const venueName = activeInvitation?.venueName || 'Glasshouse at Seputeh';
  const venueAddress = activeInvitation?.venueAddress || '17, Jalan Syed Putra, Seputeh, 50460 Kuala Lumpur';
  const videoUrl = activeInvitation?.videoUrl || '';
  const posterUrl = activeInvitation?.posterUrl || '';
  const bank = activeInvitation?.bankGift || {
    bankName: 'Maybank',
    accountNumber: '5622 4501 2345 6789',
    accountHolder: 'MAIYA CLIENT ACCOUNT',
    qrCodeUrl: activeInvitation?.bankGift?.qrCodeUrl || '',
  };

  const cardRsvps = rsvps.filter((r) => r.invitationId === activeInvitation?.id);

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(bank.accountNumber);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleSelectNavTab = (tab: 'calendar' | 'location' | 'rsvp' | 'contact' | 'gift') => {
    if (tab === 'rsvp') {
      onNavigate('guest_rsvp_form');
    }
  };

  return (
    <div className="flex-1 bg-[#F7F5F2] flex flex-col justify-between min-h-dvh relative pb-24 text-[#1E1E1C]">
      
      {/* Scrollable Container */}
      <div className="max-w-xl mx-auto space-y-6 p-4 sm:p-6 w-full">
        
        {/* Top Hero Video Card */}
        <div className="relative rounded-2xl overflow-hidden bg-[#1E1E1C] aspect-[9/12] shadow-md border border-[#D9D2CA]">
          <video
            ref={videoRef}
            key={videoUrl}
            src={videoUrl}
            poster={posterUrl || undefined}
            preload="metadata"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/50 p-5 flex flex-col justify-between text-white">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-widest text-[#EFE7DF] bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 font-semibold">
                Digital Card by Maiya
              </span>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-[#EFE7DF] flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#9B7B63]" />}
              </button>
            </div>

            <div className="text-center py-4 space-y-1">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#EFE7DF] font-semibold">
                Walimatul 'Urus
              </p>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-white">
                {brideName} <span className="text-[#9B7B63]">&</span> {groomName}
              </h1>
            </div>
          </div>
        </div>

        {/* Live Countdown */}
        <div className="card-maiya p-5 text-center space-y-3">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-[#9B7B63] flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Countdown to Wedding Day</span>
          </span>

          <div className="grid grid-cols-4 gap-2 pt-1">
            <div className="bg-[#EFE7DF] p-3 rounded-xl border border-[#D9D2CA]">
              <span className="font-title text-xl font-bold text-[#1E1E1C] block">
                {timeLeft.days}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[#77736D] font-bold">HARI</span>
            </div>

            <div className="bg-[#EFE7DF] p-3 rounded-xl border border-[#D9D2CA]">
              <span className="font-title text-xl font-bold text-[#1E1E1C] block">
                {timeLeft.hours}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[#77736D] font-bold">JAM</span>
            </div>

            <div className="bg-[#EFE7DF] p-3 rounded-xl border border-[#D9D2CA]">
              <span className="font-title text-xl font-bold text-[#1E1E1C] block">
                {timeLeft.minutes}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[#77736D] font-bold">MINIT</span>
            </div>

            <div className="bg-[#EFE7DF] p-3 rounded-xl border border-[#D9D2CA]">
              <span className="font-title text-xl font-bold text-[#1E1E1C] block">
                {timeLeft.seconds}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[#77736D] font-bold">SAAT</span>
            </div>
          </div>
        </div>

        {/* Event Date & Venue */}
        <div className="card-maiya p-6 space-y-4 text-center">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9B7B63]">
              Tarikh & Masa Majlis
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#1E1E1C]">
              {weddingDate}
            </h2>
            <p className="text-xs text-[#77736D] flex items-center justify-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#9B7B63]" />
              <span>{weddingTime}</span>
            </p>
          </div>

          <div className="w-12 h-px bg-[#D9D2CA] mx-auto" />

          <div className="space-y-1">
            <h3 className="font-title text-lg font-bold text-[#1E1E1C]">
              {venueName}
            </h3>
            <p className="text-xs text-[#77736D] max-w-xs mx-auto">
              {venueAddress}
            </p>
          </div>

          {/* Maps Navigation Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <a
              href={activeInvitation?.googleMapsUrl || 'https://maps.google.com'}
              target="_blank"
              rel="noreferrer"
              className="py-3 px-3 bg-[#F7F5F2] hover:bg-[#EFE7DF] text-[#1E1E1C] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-[#D9D2CA]"
            >
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>Google Maps</span>
            </a>

            <a
              href={activeInvitation?.wazeUrl || 'https://waze.com'}
              target="_blank"
              rel="noreferrer"
              className="py-3 px-3 bg-[#F7F5F2] hover:bg-[#EFE7DF] text-[#1E1E1C] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-[#D9D2CA]"
            >
              <Navigation className="w-4 h-4 text-sky-500" />
              <span>Waze App</span>
            </a>
          </div>
        </div>

        {/* Contact & Wishlist */}
        <div className="card-maiya p-5 space-y-3">
          <h3 className="font-title text-base font-bold text-[#1E1E1C] text-center">
            Hubungi & Wishlist
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <a
              href={`https://wa.me/${(activeInvitation?.whatsappContact || '+60123456789').replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="py-3 px-3 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-[#25D366]/30"
            >
              <Phone className="w-4 h-4" />
              <span>WhatsApp Host</span>
            </a>

            {activeInvitation?.wishlistUrl ? (
              <a
                href={activeInvitation.wishlistUrl}
                target="_blank"
                rel="noreferrer"
                className="py-3 px-3 bg-[#9B7B63]/10 text-[#9B7B63] hover:bg-[#9B7B63]/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-[#9B7B63]/30"
              >
                <Gift className="w-4 h-4" />
                <span>Wishlist Link</span>
              </a>
            ) : (
              <div className="py-3 px-3 bg-[#F7F5F2] text-[#77736D] rounded-xl text-xs font-medium flex items-center justify-center border border-[#D9D2CA]">
                <span>Wishlist Optional</span>
              </div>
            )}
          </div>
        </div>

        {/* Digital Gift Section */}
        {activeInvitation?.enableGiftSection !== false && (
          <div className="card-maiya p-6 space-y-4 text-center">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold text-[#9B7B63] tracking-widest flex items-center justify-center gap-1.5">
                <Gift className="w-3.5 h-3.5" />
                <span>Hadiah Digital / DuitNow</span>
              </span>
              <h3 className="font-serif text-xl font-bold text-[#1E1E1C]">
                {bank.bankName}
              </h3>
            </div>

            <div className="p-4 bg-[#EFE7DF] rounded-xl border border-[#D9D2CA] space-y-1">
              {bank.qrCodeUrl && (
                <div className="pb-2 flex justify-center">
                  <img src={bank.qrCodeUrl} alt="DuitNow / Bank QR" className="w-32 h-32 object-contain bg-white rounded-xl p-2 border border-[#D9D2CA] shadow-2xs" />
                </div>
              )}
              <span className="font-mono text-lg font-bold text-[#1E1E1C] block tracking-wider">
                {bank.accountNumber}
              </span>
              <span className="text-xs uppercase text-[#77736D] font-semibold block">
                {bank.accountHolder}
              </span>
            </div>

            <button
              onClick={handleCopyAccount}
              className="w-full btn-outline h-11 text-xs gap-2 cursor-pointer"
            >
              <Copy className="w-4 h-4 text-[#9B7B63]" />
              <span>{copiedBank ? 'Telah Disalin!' : 'Salin Nombor Akaun'}</span>
            </button>
          </div>
        )}

        {/* Guest Wishes Wall */}
        <div className="card-maiya p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D9D2CA]/40">
            <h3 className="font-title text-base font-bold text-[#1E1E1C]">
              Ucapan & Doa Tetamu
            </h3>
            <span className="text-xs text-[#9B7B63] font-semibold">
              {cardRsvps.length} Ucapan
            </span>
          </div>

          <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
            {cardRsvps.length === 0 ? (
              <p className="text-xs text-[#77736D] italic text-center py-6">
                Jadilah tetamu pertama menghantar ucapan!
              </p>
            ) : (
              cardRsvps.map((rsvp) => (
                <div
                  key={rsvp.id}
                  className="p-3.5 rounded-xl bg-[#F7F5F2] border border-[#D9D2CA] space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-[#1E1E1C]">
                    <span>{rsvp.guestName}</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        rsvp.attendance === 'attending'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {rsvp.attendance === 'attending' ? `✓ Hadir (${rsvp.pax} Pax)` : '✕ Tidak Hadir'}
                    </span>
                  </div>
                  <p className="font-serif italic text-[#1E1E1C]/80 text-xs">
                    "{rsvp.wishes}"
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Private Couple Access */}
        <div className="text-center pt-2">
          <button
            onClick={() => onNavigate('private_rsvp_report')}
            className="text-xs text-[#77736D] hover:text-[#1E1E1C] inline-flex items-center gap-1.5 underline cursor-pointer font-medium"
          >
            <Lock className="w-3.5 h-3.5 text-[#9B7B63]" />
            <span>Laporan RSVP Pengantin (Private PIN)</span>
          </button>
        </div>

      </div>

      {/* Fixed Bottom Guest Navigation */}
      <BottomGuestNav
        onSelectTab={handleSelectNavTab}
        activeTab="calendar"
        enableGiftSection={activeInvitation?.enableGiftSection !== false}
      />

    </div>
  );
};

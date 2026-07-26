import React, { useState, useEffect, useRef } from 'react';
import { ScreenId, Invitation } from '../../types';
import { Volume2, VolumeX, Menu, Play, X } from 'lucide-react';
import { BottomGuestNav } from '../common/BottomGuestNav';

interface GuestOpeningScreenProps {
  onNavigate: (screen: ScreenId) => void;
  activeInvitation: Invitation | null;
}

export const GuestOpeningScreen: React.FC<GuestOpeningScreenProps> = ({
  onNavigate,
  activeInvitation,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);

  const brideName = activeInvitation?.brideName || 'Sofea Azman';
  const groomName = activeInvitation?.groomName || 'Adam Harith';
  const weddingDate = activeInvitation?.weddingDate || '24 NOVEMBER 2026';
  const videoUrl = activeInvitation?.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-wedding-rings-in-a-box-41582-large.mp4';
  const posterUrl = activeInvitation?.posterUrl || '';

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn('Auto-play fallback notice:', err);
      });
    }
  }, [videoUrl, isMuted]);

  const handleOpenInvitation = () => {
    setIsMuted(false);
    onNavigate('guest_invitation');
  };

  const handleSelectNavTab = (tab: 'calendar' | 'location' | 'rsvp' | 'contact' | 'gift') => {
    if (tab === 'rsvp') {
      onNavigate('guest_rsvp_form');
    } else {
      onNavigate('guest_invitation');
    }
  };

  return (
    <div className="relative flex-1 min-h-dvh bg-[#1E1E1C] text-white flex flex-col justify-between overflow-hidden select-none">
      
      {/* Background Hero Video with Poster Image & Metadata Preload */}
      <video
        ref={videoRef}
        key={videoUrl}
        src={videoUrl}
        poster={posterUrl || undefined}
        preload="metadata"
        autoPlay
        loop
        playsInline
        muted={isMuted}
        className="absolute inset-0 w-full h-full object-cover opacity-80 transition-all duration-1000 scale-105"
      />

      {/* Editorial Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1E1E1C] via-[#1E1E1C]/40 to-black/60 pointer-events-none" />

      {/* Floating Menu Button (Top Left) */}
      <div className="absolute top-6 left-5 z-20">
        <button
          onClick={() => setShowMenuDrawer(true)}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:scale-105 cursor-pointer shadow-lg transition-transform"
          title="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Floating Music Button (Top Right) */}
      <div className="absolute top-6 right-5 z-20">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:scale-105 cursor-pointer shadow-lg transition-transform"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-[#9B7B63]" />}
        </button>
      </div>

      {/* Center Hero: Minimal Couple Names & Play Button */}
      <div className="relative z-10 text-center py-12 my-auto space-y-5 px-6">
        <p className="text-[10px] font-sans uppercase tracking-[0.3em] text-[#EFE7DF] bg-black/40 backdrop-blur-md px-3.5 py-1 rounded-full inline-block border border-white/10 font-semibold">
          Walimatul 'Urus
        </p>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-white drop-shadow-md">
          {brideName}
          <div className="my-1 text-xl font-normal italic text-[#9B7B63]">&</div>
          {groomName}
        </h1>

        <p className="font-sans text-xs uppercase tracking-[0.2em] text-[#EFE7DF] font-semibold">
          {weddingDate}
        </p>

        {/* Large Central Play/Open Button */}
        <div className="pt-6">
          <button
            onClick={handleOpenInvitation}
            className="w-16 h-16 rounded-full bg-[#9B7B63] text-white flex items-center justify-center mx-auto shadow-2xl border-2 border-white hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title="Buka Undangan"
          >
            <Play className="w-8 h-8 ml-1 fill-white text-white" />
          </button>
          <p className="text-[11px] text-[#EFE7DF] tracking-widest uppercase font-semibold mt-3 drop-shadow-sm font-sans">
            Buka Undangan
          </p>
        </div>
      </div>

      {/* Drawer Menu Modal */}
      {showMenuDrawer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-[#F7F5F2] text-[#1E1E1C] p-6 rounded-t-2xl space-y-4 max-w-md mx-auto w-full animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9D2CA]">
              <span className="font-title font-bold text-base">Digital Card by Maiya</span>
              <button
                onClick={() => setShowMenuDrawer(false)}
                className="p-1.5 rounded-full bg-[#EFE7DF] text-[#1E1E1C] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => { setShowMenuDrawer(false); onNavigate('guest_invitation'); }}
                className="w-full text-left p-3.5 rounded-xl bg-white border border-[#D9D2CA] font-semibold text-xs flex items-center justify-between cursor-pointer"
              >
                <span>Tarikh & Lokasi Majlis</span>
              </button>

              <button
                onClick={() => { setShowMenuDrawer(false); onNavigate('guest_rsvp_form'); }}
                className="w-full text-left p-3.5 rounded-xl bg-[#9B7B63] text-white font-semibold text-xs flex items-center justify-between cursor-pointer"
              >
                <span>Sahkan Kehadiran (RSVP)</span>
              </button>

              <button
                onClick={() => { setShowMenuDrawer(false); onNavigate('private_rsvp_report'); }}
                className="w-full text-left p-3.5 rounded-xl bg-white border border-[#D9D2CA] font-semibold text-xs text-[#77736D] flex items-center justify-between cursor-pointer"
              >
                <span>🔒 Laporan RSVP Pengantin (Private PIN)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Glass-style Bottom Guest Navigation Bar */}
      <BottomGuestNav
        onSelectTab={handleSelectNavTab}
        activeTab="rsvp"
        enableGiftSection={activeInvitation?.enableGiftSection !== false}
      />

    </div>
  );
};

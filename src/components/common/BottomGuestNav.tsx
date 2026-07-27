import React from 'react';
import { Calendar, MapPin, HeartHandshake, PhoneCall, Gift } from 'lucide-react';

interface BottomGuestNavProps {
  onSelectTab: (tab: 'calendar' | 'location' | 'rsvp' | 'contact' | 'gift') => void;
  activeTab?: string;
  enableGiftSection?: boolean;
}

export const BottomGuestNav: React.FC<BottomGuestNavProps> = ({
  onSelectTab,
  activeTab = 'rsvp',
  enableGiftSection = true,
}) => {
  return (
    <nav aria-label="Navigasi jemputan" className="absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-30 min-w-0 rounded-2xl border border-white/70 bg-[#F5EDE3]/82 px-1.5 py-1.5 text-[#211E1B] shadow-[0_14px_40px_rgba(25,21,18,0.25)] backdrop-blur-2xl">
      <div className="flex min-w-0 items-stretch justify-around">
      {/* 1. Kalendar */}
      <button
        onClick={() => onSelectTab('calendar')}
        aria-current={activeTab === 'calendar' ? 'page' : undefined}
        className={`flex min-w-0 min-h-12 flex-col items-center justify-center flex-1 rounded-xl px-0.5 py-1 transition-all cursor-pointer ${
          activeTab === 'calendar' ? 'bg-white/75 text-[#211E1B] shadow-sm' : 'text-[#514A44] hover:bg-white/45 hover:text-[#211E1B]'
        }`}
      >
        <Calendar className="w-4 h-4 mb-0.5" />
        <span className="text-caption leading-tight tracking-tight font-sans">Kalendar</span>
      </button>

      {/* 2. Lokasi */}
      <button
        onClick={() => onSelectTab('location')}
        aria-current={activeTab === 'location' ? 'page' : undefined}
        className={`flex min-w-0 min-h-12 flex-col items-center justify-center flex-1 rounded-xl px-0.5 py-1 transition-all cursor-pointer ${
          activeTab === 'location' ? 'bg-white/75 text-[#211E1B] shadow-sm' : 'text-[#514A44] hover:bg-white/45 hover:text-[#211E1B]'
        }`}
      >
        <MapPin className="w-4 h-4 mb-0.5" />
        <span className="text-caption leading-tight tracking-tight font-sans">Lokasi</span>
      </button>

      {/* 3. RSVP (Main Centre Action) */}
      <button
        onClick={() => onSelectTab('rsvp')}
        aria-current={activeTab === 'rsvp' ? 'page' : undefined}
        className={`flex min-w-0 min-h-12 flex-col items-center justify-center flex-1 rounded-xl px-0.5 py-1 transition-all cursor-pointer ${
          activeTab === 'rsvp' ? 'bg-white/75 text-[#211E1B] shadow-sm' : 'text-[#514A44] hover:bg-white/45 hover:text-[#211E1B]'
        }`}
        aria-label="Pergi ke bahagian RSVP"
      >
        <HeartHandshake className="w-4 h-4 mb-0.5" />
        <span className="text-caption leading-tight tracking-tight font-sans">
          RSVP
        </span>
      </button>

      {/* 4. Hubungi */}
      <button
        onClick={() => onSelectTab('contact')}
        aria-current={activeTab === 'contact' ? 'page' : undefined}
        className={`flex min-w-0 min-h-12 flex-col items-center justify-center flex-1 rounded-xl px-0.5 py-1 transition-all cursor-pointer ${
          activeTab === 'contact' ? 'bg-white/75 text-[#211E1B] shadow-sm' : 'text-[#514A44] hover:bg-white/45 hover:text-[#211E1B]'
        }`}
      >
        <PhoneCall className="w-4 h-4 mb-0.5" />
        <span className="text-caption leading-tight tracking-tight font-sans">Hubungi</span>
      </button>

      {/* 5. Hadiah */}
      {enableGiftSection && (
        <button
          onClick={() => onSelectTab('gift')}
          aria-current={activeTab === 'gift' ? 'page' : undefined}
          className={`flex min-w-0 min-h-12 flex-col items-center justify-center flex-1 rounded-xl px-0.5 py-1 transition-all cursor-pointer ${
            activeTab === 'gift' ? 'bg-white/75 text-[#211E1B] shadow-sm' : 'text-[#514A44] hover:bg-white/45 hover:text-[#211E1B]'
          }`}
        >
          <Gift className="w-4 h-4 mb-0.5" />
          <span className="text-caption leading-tight tracking-tight font-sans">Hadiah</span>
        </button>
      )}
      </div>
    </nav>
  );
};

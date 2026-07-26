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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#1E1E1C]/90 backdrop-blur-lg border-t border-[#24211F] text-white px-3 py-2 flex items-center justify-around shadow-2xl max-w-md mx-auto rounded-t-2xl pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      {/* 1. Kalendar */}
      <button
        onClick={() => onSelectTab('calendar')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
          activeTab === 'calendar' ? 'text-[#9B7B63] font-semibold' : 'text-neutral-400 hover:text-white'
        }`}
      >
        <Calendar className="w-4 h-4 mb-0.5" />
        <span className="text-[10px] tracking-tight font-sans">Kalendar</span>
      </button>

      {/* 2. Lokasi */}
      <button
        onClick={() => onSelectTab('location')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
          activeTab === 'location' ? 'text-[#9B7B63] font-semibold' : 'text-neutral-400 hover:text-white'
        }`}
      >
        <MapPin className="w-4 h-4 mb-0.5" />
        <span className="text-[10px] tracking-tight font-sans">Lokasi</span>
      </button>

      {/* 3. RSVP (Main Centre Action) */}
      <button
        onClick={() => onSelectTab('rsvp')}
        className={`flex flex-col items-center justify-center flex-1 -mt-5 cursor-pointer group ${
          activeTab === 'rsvp' ? 'text-[#9B7B63]' : 'text-neutral-400'
        }`}
        aria-label="Pergi ke bahagian RSVP"
      >
        <div className={`w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg border-2 border-[#1E1E1C] group-hover:scale-105 transition-all ${
          activeTab === 'rsvp' ? 'bg-[#9B7B63] ring-2 ring-[#9B7B63]/30' : 'bg-[#77736D]'
        }`}>
          <HeartHandshake className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold text-[#9B7B63] tracking-wider mt-0.5 uppercase font-sans">
          RSVP
        </span>
      </button>

      {/* 4. Hubungi */}
      <button
        onClick={() => onSelectTab('contact')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
          activeTab === 'contact' ? 'text-[#9B7B63] font-semibold' : 'text-neutral-400 hover:text-white'
        }`}
      >
        <PhoneCall className="w-4 h-4 mb-0.5" />
        <span className="text-[10px] tracking-tight font-sans">Hubungi</span>
      </button>

      {/* 5. Hadiah */}
      {enableGiftSection && (
        <button
          onClick={() => onSelectTab('gift')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            activeTab === 'gift' ? 'text-[#9B7B63] font-semibold' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Gift className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight font-sans">Hadiah</span>
        </button>
      )}
    </nav>
  );
};

import React from 'react';
import { Calendar, MapPin, HeartHandshake, PhoneCall, Gift } from 'lucide-react';
import { useGuestLanguage } from '../../i18n/GuestLanguageProvider';

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
  const { t } = useGuestLanguage();
  return (
    <nav aria-label={t('invitationNavigation')} className="guest-glass absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-30 min-w-0 rounded-[22px] px-1.5 py-1.5 text-[#111]">
      <div className="flex min-w-0 items-stretch justify-around">
      {/* 1. Kalendar */}
      <button
        onClick={() => onSelectTab('calendar')}
        aria-current={activeTab === 'calendar' ? 'page' : undefined}
        className={`flex min-w-0 min-h-12 flex-col items-center justify-center flex-1 rounded-xl px-0.5 py-1 transition-all cursor-pointer ${
          activeTab === 'calendar' ? 'bg-white/80 text-black shadow-sm' : 'text-black/75 hover:bg-white/45 hover:text-black'
        }`}
      >
        <Calendar className="mb-1 h-[18px] w-[18px]" strokeWidth={1.8} />
        <span className="guest-nav-label text-[9px] font-bold uppercase leading-tight tracking-[0.03em]">{t('calendar')}</span>
      </button>

      {/* 2. Lokasi */}
      <button
        onClick={() => onSelectTab('location')}
        aria-current={activeTab === 'location' ? 'page' : undefined}
        className={`flex min-w-0 min-h-12 flex-col items-center justify-center flex-1 rounded-xl px-0.5 py-1 transition-all cursor-pointer ${
          activeTab === 'location' ? 'bg-white/80 text-black shadow-sm' : 'text-black/75 hover:bg-white/45 hover:text-black'
        }`}
      >
        <MapPin className="mb-1 h-[18px] w-[18px]" strokeWidth={1.8} />
        <span className="guest-nav-label text-[9px] font-bold uppercase leading-tight tracking-[0.03em]">{t('location')}</span>
      </button>

      {/* 3. RSVP (Main Centre Action) */}
      <button
        onClick={() => onSelectTab('rsvp')}
        aria-current={activeTab === 'rsvp' ? 'page' : undefined}
        className={`flex min-w-0 min-h-12 flex-col items-center justify-center flex-1 rounded-xl px-0.5 py-1 transition-all cursor-pointer ${
          activeTab === 'rsvp' ? 'bg-white/80 text-black shadow-sm' : 'text-black/75 hover:bg-white/45 hover:text-black'
        }`}
        aria-label={t('goToRsvp')}
      >
        <HeartHandshake className="mb-1 h-[18px] w-[18px]" strokeWidth={1.8} />
        <span className="guest-nav-label text-[9px] font-bold uppercase leading-tight tracking-[0.03em]">
          RSVP
        </span>
      </button>

      {/* 4. Hubungi */}
      <button
        onClick={() => onSelectTab('contact')}
        aria-current={activeTab === 'contact' ? 'page' : undefined}
        className={`flex min-w-0 min-h-12 flex-col items-center justify-center flex-1 rounded-xl px-0.5 py-1 transition-all cursor-pointer ${
          activeTab === 'contact' ? 'bg-white/80 text-black shadow-sm' : 'text-black/75 hover:bg-white/45 hover:text-black'
        }`}
      >
        <PhoneCall className="mb-1 h-[18px] w-[18px]" strokeWidth={1.8} />
        <span className="guest-nav-label text-[9px] font-bold uppercase leading-tight tracking-[0.03em]">{t('contact')}</span>
      </button>

      {/* 5. Hadiah */}
      {enableGiftSection && (
        <button
          onClick={() => onSelectTab('gift')}
          aria-current={activeTab === 'gift' ? 'page' : undefined}
          className={`flex min-w-0 min-h-12 flex-col items-center justify-center flex-1 rounded-xl px-0.5 py-1 transition-all cursor-pointer ${
            activeTab === 'gift' ? 'bg-white/80 text-black shadow-sm' : 'text-black/75 hover:bg-white/45 hover:text-black'
          }`}
        >
          <Gift className="mb-1 h-[18px] w-[18px]" strokeWidth={1.8} />
          <span className="guest-nav-label text-[9px] font-bold uppercase leading-tight tracking-[0.03em]">{t('gifts')}</span>
        </button>
      )}
      </div>
    </nav>
  );
};

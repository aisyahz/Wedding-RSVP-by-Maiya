import React, { useState, useEffect, useRef } from 'react';
import { ScreenId, Invitation, RsvpEntry } from '../../types';
import { CalendarDays, Clock, MapPin, Navigation, Phone, Gift, Copy, Lock, Volume2, VolumeX, HeartHandshake, CheckCircle2, Shirt } from 'lucide-react';
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
  type GuestSection = 'calendar' | 'location' | 'rsvp' | 'contact' | 'gift';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const locationRef = useRef<HTMLDivElement | null>(null);
  const rsvpRef = useRef<HTMLDivElement | null>(null);
  const contactRef = useRef<HTMLDivElement | null>(null);
  const giftRef = useRef<HTMLDivElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copyToast, setCopyToast] = useState('');
  const [activeTab, setActiveTab] = useState<GuestSection>('calendar');

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn('Auto-play fallback notice:', err);
      });
    }
  }, [activeInvitation?.videoUrl, isMuted]);

  // Live countdown state
  const targetDateStr = activeInvitation?.weddingDate || '';
  const targetTimeStr = activeInvitation?.weddingTime || '11:00:00';
  const [timeLeft, setTimeLeft] = useState({ days: 36, hours: 22, minutes: 33, seconds: 17 });

  useEffect(() => {
    const calculateTime = () => {
      if (!targetDateStr) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const target = new Date(`${targetDateStr}T${targetTimeStr}`).getTime();
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
  }, [targetDateStr, targetTimeStr]);

  const brideName = activeInvitation?.brideName || '';
  const groomName = activeInvitation?.groomName || '';
  const weddingDate = activeInvitation?.weddingDate || '';
  const formatEventTime = (value?: string) => {
    const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
    if (!match) return value || '';
    const hour = Number(match[1]);
    return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
  };
  const weddingTime = formatEventTime(activeInvitation?.weddingTime);
  const venueName = activeInvitation?.venueName || '';
  const venueAddress = activeInvitation?.venueAddress || '';
  const videoUrl = activeInvitation?.videoUrl || '';
  const posterUrl = activeInvitation?.posterUrl || '';
  const bank = activeInvitation?.bankGift;
  const dressCodeText = activeInvitation?.dressCodeText?.trim() || '';
  const dressCodeColors = (activeInvitation?.dressCodeColors || []).slice(0, 5);
  const showDressCode = Boolean(dressCodeText || dressCodeColors.length);
  const parsedWeddingDate = /^\d{4}-\d{2}-\d{2}$/.test(weddingDate)
    ? new Date(`${weddingDate}T12:00:00`)
    : new Date(weddingDate);
  const hasValidWeddingDate = !Number.isNaN(parsedWeddingDate.getTime());
  const formattedWeddingDate = hasValidWeddingDate
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsedWeddingDate)
    : weddingDate;
  const weddingDay = hasValidWeddingDate
    ? new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(parsedWeddingDate)
    : '';

  const cardRsvps = rsvps.filter((r) => r.invitationId === activeInvitation?.id);

  const safeExternalUrl = (value?: string) => {
    if (!value) return '';
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.toString() : '';
    } catch {
      return '';
    }
  };

  const normalizeMalaysianPhone = (value?: string) => {
    let digits = (value || '').replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `60${digits.slice(1)}`;
    else if (digits.startsWith('1')) digits = `60${digits}`;
    return /^601\d{8,9}$/.test(digits) ? digits : '';
  };

  const googleMapsUrl = safeExternalUrl(activeInvitation?.googleMapsUrl);
  const wazeUrl = safeExternalUrl(activeInvitation?.wazeUrl);
  const wishlistUrl = safeExternalUrl(activeInvitation?.wishlistUrl);
  const whatsappNumber = normalizeMalaysianPhone(activeInvitation?.whatsappContact);
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Assalamualaikum, saya ingin bertanya mengenai majlis perkahwinan ini.')}`
    : '';
  const showGiftSection = Boolean(wishlistUrl) || activeInvitation?.enableGiftSection !== false;

  const handleCopyAccount = async () => {
    if (!bank?.accountNumber) return;
    try {
      await navigator.clipboard.writeText(bank.accountNumber);
      setCopiedBank(true);
      setCopyToast('Nombor akaun berjaya disalin.');
      window.setTimeout(() => {
        setCopiedBank(false);
        setCopyToast('');
      }, 2500);
    } catch {
      setCopyToast('Nombor akaun tidak dapat disalin. Sila cuba lagi.');
      window.setTimeout(() => setCopyToast(''), 2500);
    }
  };

  const sectionRefs: Record<GuestSection, React.RefObject<HTMLDivElement | null>> = {
    calendar: calendarRef,
    location: locationRef,
    rsvp: rsvpRef,
    contact: contactRef,
    gift: giftRef,
  };

  const handleSelectNavTab = (tab: GuestSection) => {
    const section = sectionRefs[tab].current;
    if (!section) return;
    setActiveTab(tab);
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const sections = (Object.entries(sectionRefs) as Array<[GuestSection, React.RefObject<HTMLDivElement | null>]>)
      .filter(([, ref]) => ref.current);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const matched = sections.find(([, ref]) => ref.current === visible?.target);
        if (matched) setActiveTab(matched[0]);
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0.1, 0.4, 0.7] },
    );
    sections.forEach(([, ref]) => ref.current && observer.observe(ref.current));
    return () => observer.disconnect();
  }, [activeInvitation?.id]);

  return (
    <div className="flex-1 min-w-0 bg-app flex flex-col justify-between min-h-dvh relative pb-[calc(6.5rem+env(safe-area-inset-bottom))] text-primary">
      
      {/* Scrollable Container */}
      <div className="max-w-xl min-w-0 mx-auto space-y-7 p-3 min-[360px]:p-4 sm:p-6 w-full">
        
        {/* Top Hero Video Card */}
        <div className="relative rounded-2xl overflow-hidden bg-[#1E1E1C] aspect-[9/12] shadow-md border border-system">
          {videoUrl ? (
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
          ) : posterUrl ? (
            <img
              src={posterUrl}
              alt={`Kad jemputan ${brideName} dan ${groomName}`}
              className="w-full h-full object-cover"
            />
          ) : null}

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/50 p-5 flex flex-col justify-between text-white">
            <div className="flex justify-between items-center">
              <span className="text-caption uppercase tracking-widest text-[#EFE7DF] bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 font-semibold">
                Digital Card by Maiya
              </span>

              <button
                onClick={() => setIsMuted(!isMuted)}
                disabled={!videoUrl}
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-[#EFE7DF] flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-accent" />}
              </button>
            </div>

            <div className="text-center py-4 space-y-1">
              <p className="text-caption uppercase tracking-[0.25em] text-[#EFE7DF] font-semibold">
                Walimatul 'Urus
              </p>
              <h1 className="text-display-l break-words text-white [overflow-wrap:anywhere]">
                {brideName} <span className="text-accent">&</span> {groomName}
              </h1>
            </div>
          </div>
        </div>

        {/* Live Countdown */}
        <div className="card-maiya card-comfortable text-center space-y-3">
          <span className="text-caption uppercase tracking-widest font-semibold text-accent flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Countdown to Wedding Day</span>
          </span>

          <div className="grid grid-cols-2 min-[350px]:grid-cols-4 gap-2 pt-1">
            <div className="bg-[#EFE7DF] p-3 rounded-xl border border-system">
              <span className="text-heading-2 text-primary block">
                {timeLeft.days}
              </span>
              <span className="text-caption uppercase tracking-wider text-secondary font-bold">HARI</span>
            </div>

            <div className="bg-[#EFE7DF] p-3 rounded-xl border border-system">
              <span className="text-heading-2 text-primary block">
                {timeLeft.hours}
              </span>
              <span className="text-caption uppercase tracking-wider text-secondary font-bold">JAM</span>
            </div>

            <div className="bg-[#EFE7DF] p-3 rounded-xl border border-system">
              <span className="text-heading-2 text-primary block">
                {timeLeft.minutes}
              </span>
              <span className="text-caption uppercase tracking-wider text-secondary font-bold">MINIT</span>
            </div>

            <div className="bg-[#EFE7DF] p-3 rounded-xl border border-system">
              <span className="text-heading-2 text-primary block">
                {timeLeft.seconds}
              </span>
              <span className="text-caption uppercase tracking-wider text-secondary font-bold">SAAT</span>
            </div>
          </div>
        </div>

        {/* Event Date & Venue */}
        <div className="card-maiya p-4 min-[360px]:p-6 space-y-4 text-center">
          <div ref={calendarRef} id="calendar-section" className="space-y-1 scroll-mt-24">
            <span className="text-caption font-semibold uppercase tracking-widest text-accent">
              Tarikh & Masa Majlis
            </span>
            <div className="flex items-center justify-center gap-2 text-accent">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span className="text-xs font-semibold tracking-wide">{weddingDay}</span>
            </div>
            <h2 className="guest-event-date text-heading-1 text-primary break-words [overflow-wrap:anywhere]">{formattedWeddingDate}</h2>
            <p className="text-xs text-secondary flex items-center justify-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-accent" />
              <span>{weddingTime}</span>
            </p>
          </div>

          <div className="w-12 h-px bg-[#D9D2CA] mx-auto" />

          <div ref={locationRef} id="location-section" className="space-y-1 scroll-mt-24">
            <h3 className="text-heading-3 text-primary break-words [overflow-wrap:anywhere]">
              {venueName}
            </h3>
            <p className="text-sm leading-relaxed text-secondary max-w-full mx-auto break-words [overflow-wrap:anywhere]">
              {venueAddress}
            </p>
          </div>

          {/* Maps Navigation Buttons */}
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 pt-2">
            <a
              href={googleMapsUrl || undefined}
              target={googleMapsUrl ? '_blank' : undefined}
              rel={googleMapsUrl ? 'noopener noreferrer' : undefined}
              aria-disabled={!googleMapsUrl}
              onClick={(event) => !googleMapsUrl && event.preventDefault()}
              className={`min-h-11 py-3 px-3 rounded-xl text-sm font-semibold flex min-w-0 items-center justify-center gap-2 transition-all border border-system ${
                googleMapsUrl ? 'bg-app hover:bg-[#EFE7DF] text-primary' : 'bg-app text-[#B7B1AA] cursor-not-allowed opacity-60'
              }`}
            >
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>Google Maps</span>
            </a>

            <a
              href={wazeUrl || undefined}
              target={wazeUrl ? '_blank' : undefined}
              rel={wazeUrl ? 'noopener noreferrer' : undefined}
              aria-disabled={!wazeUrl}
              onClick={(event) => !wazeUrl && event.preventDefault()}
              className={`min-h-11 py-3 px-3 rounded-xl text-sm font-semibold flex min-w-0 items-center justify-center gap-2 transition-all border border-system ${
                wazeUrl ? 'bg-app hover:bg-[#EFE7DF] text-primary' : 'bg-app text-[#B7B1AA] cursor-not-allowed opacity-60'
              }`}
            >
              <Navigation className="w-4 h-4 text-sky-500" />
              <span>Waze App</span>
            </a>
          </div>
        </div>

        {showDressCode && (
          <section className="card-maiya p-4 min-[360px]:p-6 space-y-3 text-center" aria-labelledby="dress-code-title">
            <div className="flex items-center justify-center gap-2 text-accent">
              <Shirt className="h-4 w-4" />
              <h3 id="dress-code-title" className="text-caption font-semibold uppercase tracking-widest">Dress Code</h3>
            </div>
            {dressCodeText && <p className="font-serif text-heading-3 text-primary break-words">{dressCodeText}</p>}
            {dressCodeColors.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-center gap-2.5" aria-hidden="true">
                  {dressCodeColors.map((color, index) => (
                    <span key={`${color.name}-${index}`} className="h-8 w-8 rounded-full border-2 border-white shadow-sm ring-1 ring-black/10" style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(color.hex) ? color.hex : '#9B7B63' }} />
                  ))}
                </div>
                <p className="text-sm text-secondary">{dressCodeColors.map((color) => color.name).filter(Boolean).join(' • ')}</p>
              </div>
            )}
          </section>
        )}

        {/* Contact & Wishlist */}
        <div ref={contactRef} id="contact-section" className="card-maiya card-comfortable space-y-3 scroll-mt-24">
          <h3 className="text-title text-primary text-center">
            Hubungi Wakil Pengantin
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {whatsappUrl && <a
              href={whatsappUrl || undefined}
              target={whatsappUrl ? '_blank' : undefined}
              rel={whatsappUrl ? 'noopener noreferrer' : undefined}
              aria-disabled={!whatsappUrl}
              onClick={(event) => !whatsappUrl && event.preventDefault()}
              className="min-h-11 py-3 px-3 rounded-xl text-sm font-semibold flex min-w-0 items-center justify-center gap-2 transition-all border bg-[#25D366]/10 text-[#168542] hover:bg-[#25D366]/20 border-[#25D366]/30"
            >
              <Phone className="w-4 h-4" />
              <span>WhatsApp Host</span>
            </a>}
            {!whatsappUrl && <p className="text-sm text-center text-secondary">Maklumat hubungan tidak tersedia.</p>}

          </div>
        </div>

        {/* RSVP Action */}
        <div ref={rsvpRef} id="rsvp-section" className="card-maiya p-4 min-[360px]:p-6 text-center space-y-4 scroll-mt-24">
          <div className="w-11 h-11 mx-auto rounded-full bg-[#9B7B63]/10 text-accent flex items-center justify-center">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-heading-2 text-primary">Pengesahan Kehadiran</h3>
            <p className="text-xs text-secondary">
              Sila maklumkan kehadiran anda kepada pasangan pengantin.
            </p>
          </div>
          <button
            onClick={() => onNavigate('guest_rsvp_form')}
            className="w-full btn-primary min-h-12 cursor-pointer"
          >
            Isi RSVP
          </button>
        </div>

        {/* Digital Gift Section */}
        {showGiftSection && (
          <div ref={giftRef} id="gift-section" className="card-maiya p-4 min-[360px]:p-6 space-y-4 text-center scroll-mt-24">
            <div className="space-y-1">
              <span className="text-caption uppercase font-semibold text-accent tracking-widest flex items-center justify-center gap-1.5">
                <Gift className="w-3.5 h-3.5" />
                <span>Hadiah Digital / DuitNow</span>
              </span>
              <h3 className="font-serif text-heading-2 text-primary">
                {bank?.bankName || 'Maklumat hadiah'}
              </h3>
            </div>

            {wishlistUrl && (
              <a
                href={wishlistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-11 py-3 px-3 bg-[#9B7B63]/10 text-[#765942] hover:bg-[#9B7B63]/20 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all border border-[#9B7B63]/30"
              >
                <Gift className="w-4 h-4" />
                <span>Buka Wishlist</span>
              </a>
            )}

            <div className="p-4 bg-[#EFE7DF] rounded-xl border border-system space-y-1">
              {bank?.qrCodeUrl && (
                <div className="pb-2 flex justify-center">
                  <img src={bank.qrCodeUrl} alt="Kod QR DuitNow atau akaun bank pasangan pengantin" className="w-32 h-32 max-w-full object-contain bg-white rounded-xl p-2 border border-system shadow-2xs" />
                </div>
              )}
              <span className="font-title tabular-nums text-base min-[360px]:text-lg font-bold text-primary block tracking-wide break-all">
                {bank?.accountNumber || 'Nombor akaun tidak tersedia'}
              </span>
              <span className="text-sm text-secondary font-semibold block break-words [overflow-wrap:anywhere]">
                {bank?.accountHolder || ''}
              </span>
            </div>

            <button
              onClick={handleCopyAccount}
              disabled={!bank?.accountNumber}
              className="w-full btn-outline h-11 text-xs gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="w-4 h-4 text-accent" />
              <span>{copiedBank ? 'Telah Disalin!' : 'Salin Nombor Akaun'}</span>
            </button>
          </div>
        )}

        {/* Guest Wishes Wall */}
        <div className="card-maiya card-comfortable space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-system/40">
            <h3 className="text-title text-primary">
              Ucapan & Doa Tetamu
            </h3>
            <span className="text-xs text-accent font-semibold">
              {cardRsvps.length} Ucapan
            </span>
          </div>

          <div className="space-y-3">
            {cardRsvps.length === 0 ? (
              <p className="text-xs text-secondary italic text-center py-6">
                Jadilah tetamu pertama menghantar ucapan!
              </p>
            ) : (
              cardRsvps.map((rsvp) => (
                <div
                  key={rsvp.id}
                  className="min-w-0 p-3.5 rounded-xl bg-app border border-system space-y-1.5 text-sm break-words [overflow-wrap:anywhere]"
                >
                  <div className="flex min-w-0 flex-col min-[360px]:flex-row min-[360px]:items-start justify-between gap-2 font-bold text-primary">
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">{rsvp.guestName}</span>
                    <span
                      className={`self-start max-w-full text-caption leading-4 px-2 py-0.5 rounded-full font-bold uppercase whitespace-normal ${
                        rsvp.attendance === 'attending'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {rsvp.attendance === 'attending' ? `✓ Hadir (${rsvp.pax} Pax)` : 'Tidak Hadir'}
                    </span>
                  </div>
                  {rsvp.wishes && <p className="font-serif italic text-primary/80 text-sm leading-relaxed break-words [overflow-wrap:anywhere]">
                    “{rsvp.wishes}”
                  </p>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Private Couple Access */}
        <div className="text-center pt-2">
          <button
            onClick={() => onNavigate('private_rsvp_report')}
            className="text-xs text-secondary hover:text-primary inline-flex items-center gap-1.5 underline cursor-pointer font-medium"
          >
            <Lock className="w-3.5 h-3.5 text-accent" />
            <span>Laporan RSVP Pengantin (Private PIN)</span>
          </button>
        </div>

        <footer className="pt-12 pb-4 text-center">
          <a
            href="https://digitalcardmaiya.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-caption text-[#A39E98] hover:text-secondary transition-colors"
          >
            Dibina dengan penuh kasih oleh Aisyah Zainal Studio
          </a>
        </footer>

      </div>

      {copyToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl bg-[#1E1E1C] px-4 py-2.5 text-sm font-semibold text-white shadow-xl flex items-center justify-center gap-2 text-center whitespace-normal break-words"
        >
          {copiedBank && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{copyToast}</span>
        </div>
      )}

      {/* Fixed Bottom Guest Navigation */}
      <BottomGuestNav
        onSelectTab={handleSelectNavTab}
        activeTab={activeTab}
        enableGiftSection={showGiftSection}
      />

    </div>
  );
};

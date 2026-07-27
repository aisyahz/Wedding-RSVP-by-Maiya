import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Gift,
  Leaf,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  PhoneCall,
  Send,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Invitation, RsvpEntry } from '../../types';
import { GuestBottomSheet } from '../common/GuestBottomSheet';
import { BottomGuestNav } from '../common/BottomGuestNav';

type GuestFeature = 'calendar' | 'location' | 'rsvp' | 'contact' | 'gift';

interface PremiumGuestExperienceScreenProps {
  activeInvitation: Invitation | null;
  rsvps: RsvpEntry[];
  onAddRsvp: (
    newRsvp: Omit<RsvpEntry, 'id' | 'submittedAt'>,
  ) => Promise<{ success: boolean; error?: string }>;
  initialFeature?: GuestFeature | null;
  initiallyOpened?: boolean;
}

const normalizeMalaysianPhone = (value?: string) => {
  let digits = (value || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `60${digits.slice(1)}`;
  else if (digits.startsWith('1')) digits = `60${digits}`;
  return /^601\d{8,9}$/.test(digits) ? digits : '';
};

const safeExternalUrl = (value?: string) => {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
};

const toCalendarDate = (date: string, time: string, hoursToAdd = 0) => {
  if (!date) return '';
  const value = new Date(`${date}T${time || '11:00'}`);
  value.setHours(value.getHours() + hoursToAdd);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}T${pad(value.getHours())}${pad(value.getMinutes())}00`;
};

export const PremiumGuestExperienceScreen: React.FC<PremiumGuestExperienceScreenProps> = ({
  activeInvitation,
  rsvps,
  onAddRsvp,
  initialFeature = null,
  initiallyOpened = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isOpened, setIsOpened] = useState(initiallyOpened);
  const [isOpening, setIsOpening] = useState(false);
  const [activeFeature, setActiveFeature] = useState<GuestFeature | null>(initialFeature);
  const [isMuted, setIsMuted] = useState(true);
  const [copied, setCopied] = useState(false);

  const [guestName, setGuestName] = useState('');
  const [attendance, setAttendance] = useState<'attending' | 'declined'>('attending');
  const [pax, setPax] = useState(2);
  const [wishes, setWishes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const invitation = activeInvitation;
  const videoUrl = invitation?.videoUrl || '';
  const posterUrl = invitation?.posterUrl || '';
  const bank = invitation?.bankGift;
  const googleMapsUrl = safeExternalUrl(invitation?.googleMapsUrl);
  const wazeUrl = safeExternalUrl(invitation?.wazeUrl);
  const wishlistUrl = safeExternalUrl(invitation?.wishlistUrl);
  const phone = normalizeMalaysianPhone(invitation?.whatsappContact);
  const showGift = invitation?.enableGiftSection !== false &&
    Boolean(bank?.accountNumber || bank?.qrCodeUrl || wishlistUrl);
  const invitationRsvps = rsvps.filter((entry) => entry.invitationId === invitation?.id);

  const eventDateTime = useMemo(() => {
    if (!invitation?.weddingDate) return null;
    return new Date(`${invitation.weddingDate}T${invitation.weddingTime || '11:00'}`);
  }, [invitation?.weddingDate, invitation?.weddingTime]);

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const update = () => {
      const difference = eventDateTime ? Math.max(0, eventDateTime.getTime() - Date.now()) : 0;
      setTimeLeft({
        days: Math.floor(difference / 86_400_000),
        hours: Math.floor((difference / 3_600_000) % 24),
        minutes: Math.floor((difference / 60_000) % 60),
        seconds: Math.floor((difference / 1_000) % 60),
      });
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [eventDateTime]);

  useEffect(() => {
    if (!isOpened || !videoRef.current) return;
    videoRef.current.play().catch(() => undefined);
  }, [isOpened, videoUrl]);

  const openInvitation = () => {
    if (isOpening) return;
    setIsOpening(true);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => {
      setIsOpened(true);
      setIsOpening(false);
      videoRef.current?.play().catch(() => undefined);
    }, prefersReducedMotion ? 20 : 980);
  };

  const calendarStart = toCalendarDate(invitation?.weddingDate || '', invitation?.weddingTime || '');
  const calendarEnd = toCalendarDate(invitation?.weddingDate || '', invitation?.weddingTime || '', 4);
  const eventTitle = `Majlis Perkahwinan ${invitation?.brideName || ''} & ${invitation?.groomName || ''}`;
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${calendarStart}/${calendarEnd}&location=${encodeURIComponent(`${invitation?.venueName || ''}, ${invitation?.venueAddress || ''}`)}`;

  const downloadAppleCalendar = () => {
    const content = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${calendarStart}`,
      `DTEND:${calendarEnd}`,
      `SUMMARY:${eventTitle}`,
      `LOCATION:${invitation?.venueName || ''}, ${invitation?.venueAddress || ''}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'majlis-perkahwinan.ics';
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  const copyAccount = async () => {
    if (!bank?.accountNumber) return;
    try {
      await navigator.clipboard.writeText(bank.accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const submitRsvp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invitation?.id || !guestName.trim() || isSubmitting) {
      setSubmitError('Sila masukkan nama tetamu.');
      return;
    }
    setSubmitError('');
    setIsSubmitting(true);
    const result = await onAddRsvp({
      invitationId: invitation.id,
      guestName: guestName.trim(),
      attendance,
      pax: attendance === 'attending' ? pax : 0,
      wishes: wishes.trim(),
    });
    setIsSubmitting(false);
    if (result.success) {
      setSubmitSuccess(true);
      return;
    }
    setSubmitError(result.error || 'RSVP tidak dapat dihantar. Sila cuba lagi.');
  };

  const featureTitle: Record<GuestFeature, string> = {
    calendar: 'Menuju Hari Bahagia',
    location: 'Lokasi Majlis',
    rsvp: 'RSVP & Ucapan',
    contact: 'Hubungi Keluarga',
    gift: 'Hadiah & Tanda Kasih',
  };

  return (
    <div className="relative h-dvh min-h-[480px] w-full min-w-0 overflow-hidden bg-[#171513] text-white md:h-full md:min-h-0">
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={posterUrl || undefined}
          preload="metadata"
          loop
          playsInline
          muted={isMuted}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${isOpened ? 'opacity-100' : 'opacity-70'}`}
        />
      ) : posterUrl ? (
        <img
          src={posterUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#7D6654_0%,#28231F_42%,#141210_100%)]" />
      )}

      {isOpened && (
        <button
          type="button"
          onClick={() => setIsMuted((value) => !value)}
          disabled={!videoUrl}
          aria-label={isMuted ? 'Hidupkan audio' : 'Senyapkan audio'}
          className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/25 text-white backdrop-blur-xl transition hover:bg-black/40 disabled:opacity-40"
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      )}

      {!isOpened && (
        <div className={`absolute inset-0 z-30 transition-opacity duration-500 ${isOpening ? 'pointer-events-none opacity-90' : 'opacity-100'}`}>
          <div
            className={`absolute inset-y-0 left-0 w-1/2 overflow-hidden border-r border-[#CFC1B2] bg-[#F4EDE3] transition-transform duration-[980ms] [transition-timing-function:cubic-bezier(.77,0,.18,1)] ${isOpening ? '-translate-x-full' : 'translate-x-0'}`}
          >
            <Leaf className="absolute -left-8 top-[24%] h-44 w-44 rotate-[28deg] stroke-[0.7] text-[#C9A98E]/60" />
            <Leaf className="absolute -left-9 bottom-[16%] h-40 w-40 -rotate-[18deg] stroke-[0.7] text-[#C9A98E]/45" />
          </div>
          <div
            className={`absolute inset-y-0 right-0 w-1/2 overflow-hidden border-l border-[#CFC1B2] bg-[#F4EDE3] transition-transform duration-[980ms] [transition-timing-function:cubic-bezier(.77,0,.18,1)] ${isOpening ? 'translate-x-full' : 'translate-x-0'}`}
          >
            <Leaf className="absolute -right-8 top-[24%] h-44 w-44 -rotate-[28deg] scale-x-[-1] stroke-[0.7] text-[#C9A98E]/60" />
            <Leaf className="absolute -right-9 bottom-[16%] h-40 w-40 rotate-[18deg] scale-x-[-1] stroke-[0.7] text-[#C9A98E]/45" />
          </div>

          <div className={`absolute inset-0 flex min-w-0 flex-col items-center justify-center px-5 text-center transition-all duration-500 ${isOpening ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.32em] text-[#77685C]">
              Raikan Cinta
            </p>
            <h1 className="max-w-full break-words font-serif text-[clamp(2rem,10vw,3.25rem)] font-semibold leading-[1.05] text-[#211E1B] [overflow-wrap:anywhere]">
              {invitation?.brideName}
              <span className="my-2 block text-2xl font-normal italic text-[#C9A98E]">&</span>
              {invitation?.groomName}
            </h1>
            <p className="mt-5 text-sm tracking-[0.18em] text-[#665B52]">
              {invitation?.weddingDate}
            </p>
            <button
              type="button"
              onClick={openInvitation}
              className="mt-10 min-h-12 rounded-full border border-[#2E2925] bg-[#2E2925] px-7 text-sm font-semibold text-white shadow-xl transition hover:bg-[#443C35] active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#2E2925]">
                  <ChevronRight className="h-4 w-4" />
                </span>
                Buka Undangan
              </span>
            </button>
          </div>
        </div>
      )}

      {isOpened && (
        <BottomGuestNav
          onSelectTab={setActiveFeature}
          activeTab={activeFeature || ''}
          enableGiftSection={showGift}
        />
      )}

      <GuestBottomSheet
        open={activeFeature !== null}
        title={activeFeature ? featureTitle[activeFeature] : ''}
        onClose={() => setActiveFeature(null)}
      >
        {activeFeature === 'calendar' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 min-[360px]:grid-cols-4 gap-2">
              {[
                ['Hari', timeLeft.days],
                ['Jam', timeLeft.hours],
                ['Minit', timeLeft.minutes],
                ['Saat', timeLeft.seconds],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[#D9D2CA] bg-white/75 p-3 text-center">
                  <strong className="block font-serif text-2xl text-[#1E1E1C]">{value}</strong>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#77736D]">{label}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
              <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">
                <CalendarDays className="h-5 w-5 shrink-0" />
                Google Calendar
              </a>
              <button type="button" onClick={downloadAppleCalendar} className="btn-outline w-full">
                <CalendarDays className="h-5 w-5 shrink-0" />
                Apple Calendar
              </button>
            </div>
          </div>
        )}

        {activeFeature === 'location' && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-white/75 p-5 text-center">
              <MapPin className="mx-auto mb-3 h-6 w-6 text-[#9B7B63]" />
              <h3 className="break-words font-serif text-2xl font-semibold [overflow-wrap:anywhere]">{invitation?.venueName || 'Lokasi belum tersedia'}</h3>
              {invitation?.venueAddress && <p className="mt-2 break-words text-sm leading-relaxed text-[#77736D] [overflow-wrap:anywhere]">{invitation.venueAddress}</p>}
            </div>
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
              {googleMapsUrl && <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary w-full"><MapPin className="h-5 w-5" />Google Maps</a>}
              {wazeUrl && <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="btn-outline w-full"><Navigation className="h-5 w-5" />Waze</a>}
            </div>
          </div>
        )}

        {activeFeature === 'rsvp' && (
          <div className="space-y-6">
            {!submitSuccess ? (
              <form onSubmit={submitRsvp} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Nama Tetamu *</label>
                  <input value={guestName} onChange={(event) => setGuestName(event.target.value)} required className="input-maiya" placeholder="Nama anda" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Kehadiran *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" aria-pressed={attendance === 'attending'} onClick={() => setAttendance('attending')} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${attendance === 'attending' ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-[#D9D2CA] bg-white'}`}><Check className="h-4 w-4" />Hadir</button>
                    <button type="button" aria-pressed={attendance === 'declined'} onClick={() => setAttendance('declined')} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${attendance === 'declined' ? 'border-rose-700 bg-rose-700 text-white' : 'border-[#D9D2CA] bg-white'}`}><X className="h-4 w-4" />Tidak Hadir</button>
                  </div>
                </div>
                {attendance === 'attending' && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold">Jumlah Tetamu</label>
                    <div className="grid grid-cols-3 min-[360px]:grid-cols-6 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((value) => (
                        <button type="button" key={value} onClick={() => setPax(value)} className={`min-h-11 rounded-xl border text-sm font-bold ${pax === value ? 'border-[#9B7B63] bg-[#9B7B63] text-white' : 'border-[#D9D2CA] bg-white'}`}>{value}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Ucapan dan Doa</label>
                  <textarea value={wishes} onChange={(event) => setWishes(event.target.value)} rows={3} className="w-full rounded-xl border border-[#D9D2CA] bg-white p-3 text-base focus:border-[#9B7B63] focus:outline-none" placeholder="Titipkan ucapan buat mempelai…" />
                </div>
                {submitError && <p role="alert" className="break-words text-sm text-rose-700">{submitError}</p>}
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSubmitting ? 'Menghantar…' : 'Hantar RSVP'}
                </button>
              </form>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-900">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8" />
                <h3 className="font-serif text-xl font-semibold">Terima kasih</h3>
                <p className="mt-1 text-sm">RSVP anda berjaya direkodkan.</p>
              </div>
            )}

            <div className="border-t border-[#D9D2CA] pt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-serif text-xl font-semibold">Ucapan Tetamu</h3>
                <span className="text-sm font-semibold text-[#9B7B63]">{invitationRsvps.length}</span>
              </div>
              <div className="max-h-56 space-y-3 overflow-y-auto overscroll-contain pr-1">
                {invitationRsvps.length === 0 ? (
                  <p className="py-6 text-center text-sm text-[#77736D]">Belum ada ucapan. Jadilah yang pertama.</p>
                ) : invitationRsvps.map((entry) => (
                  <article key={entry.id} className="min-w-0 rounded-2xl border border-[#D9D2CA] bg-white/75 p-4">
                    <strong className="block break-words text-sm [overflow-wrap:anywhere]">{entry.guestName}</strong>
                    {entry.wishes && <p className="mt-1 break-words font-serif text-sm italic leading-relaxed text-[#5F5A55] [overflow-wrap:anywhere]">“{entry.wishes}”</p>}
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeFeature === 'contact' && (
          <div className="rounded-2xl border border-[#D9D2CA] bg-white/75 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9B7B63]">Wakil Pengantin</p>
            <h3 className="mt-1 font-serif text-2xl font-semibold">Keluarga Pengantin</h3>
            {phone ? (
              <div className="mt-5 grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
                <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="btn-primary w-full"><Phone className="h-5 w-5" />WhatsApp</a>
                <a href={`tel:+${phone}`} className="btn-outline w-full"><PhoneCall className="h-5 w-5" />Panggilan</a>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#77736D]">Maklumat hubungan belum tersedia.</p>
            )}
          </div>
        )}

        {activeFeature === 'gift' && showGift && (
          <div className="space-y-4 text-center">
            {bank?.qrCodeUrl && <img src={bank.qrCodeUrl} alt="Kod QR hadiah" className="mx-auto aspect-square w-44 max-w-full rounded-2xl border border-[#D9D2CA] bg-white object-contain p-3" />}
            {bank?.accountNumber && (
              <div className="rounded-2xl border border-[#D9D2CA] bg-white/75 p-5">
                <p className="text-sm font-semibold text-[#77736D]">{bank.bankName}</p>
                <p className="mt-1 break-all font-mono text-xl font-bold tracking-wide">{bank.accountNumber}</p>
                <p className="mt-1 break-words text-sm [overflow-wrap:anywhere]">{bank.accountHolder}</p>
              </div>
            )}
            {bank?.accountNumber && <button type="button" onClick={copyAccount} className="btn-primary w-full"><Copy className="h-5 w-5" />{copied ? 'Telah Disalin' : 'Salin Nombor Akaun'}</button>}
            {wishlistUrl && <a href={wishlistUrl} target="_blank" rel="noopener noreferrer" className="btn-outline w-full"><Gift className="h-5 w-5" />Buka Wishlist<ExternalLink className="h-4 w-4" /></a>}
          </div>
        )}
      </GuestBottomSheet>
    </div>
  );
};

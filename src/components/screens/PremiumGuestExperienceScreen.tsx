import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Gift,
  Loader2,
  MapPin,
  Minus,
  Navigation,
  PhoneCall,
  Plus,
  Send,
  Shirt,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Invitation, RsvpEntry } from '../../types';
import { GuestBottomSheet } from '../common/GuestBottomSheet';
import { BottomGuestNav } from '../common/BottomGuestNav';
import { useGuestLanguage } from '../../i18n/GuestLanguageProvider';
import { rsvpSuccessCopy } from '../../i18n/guestTranslations';

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

const formatInvitationDate = (value: string | undefined, locale: string) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date).replace(/\./g, '').toUpperCase();
};

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M12.04 2a9.84 9.84 0 0 0-8.4 14.96L2 22l5.18-1.61A9.94 9.94 0 1 0 12.04 2Zm0 17.9a8.05 8.05 0 0 1-4.1-1.12l-.3-.18-3.07.96 1-2.99-.2-.31a8.04 8.04 0 1 1 6.67 3.64Zm4.42-6.02c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.54.12-.16.25-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2a7.22 7.22 0 0 1-1.34-1.67c-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.59 4.11 3.63.58.25 1.02.39 1.37.5.58.18 1.1.16 1.51.1.46-.07 1.43-.59 1.63-1.15.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
  </svg>
);

export const PremiumGuestExperienceScreen: React.FC<PremiumGuestExperienceScreenProps> = ({
  activeInvitation,
  rsvps,
  onAddRsvp,
  initialFeature = null,
  initiallyOpened = false,
}) => {
  const { language, setLanguage, t } = useGuestLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rsvpSubmissionLockRef = useRef(false);
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
  const enabledContacts = invitation?.contacts?.filter((contact) => contact.enabled) || [];
  const visibleContacts = invitation?.contacts?.length
    ? enabledContacts
    : invitation?.whatsappContact
      ? [{ id: 'legacy-contact', name: t('weddingFamily'), relationship: '', phoneNumber: invitation.whatsappContact, whatsappNumber: invitation.whatsappContact, enabled: true }]
      : [];
  const maxPax = Math.min(999, Math.max(1, Number(invitation?.maxPax) || 6));
  const dressCodeText = invitation?.dressCodeText?.trim() || '';
  const dressCodeColors = (invitation?.dressCodeColors || []).slice(0, 5);
  const showGift = invitation?.enableGiftSection !== false &&
    Boolean(bank?.accountNumber || bank?.qrCodeUrl || wishlistUrl);
  const invitationRsvps = rsvps.filter((entry) => entry.invitationId === invitation?.id);

  const eventDateTime = useMemo(() => {
    if (!invitation?.weddingDate) return null;
    return new Date(`${invitation.weddingDate}T${invitation.weddingTime || '11:00'}`);
  }, [invitation?.weddingDate, invitation?.weddingTime]);

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    setPax((current) => Math.min(current, maxPax));
  }, [maxPax]);

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
    setIsMuted(false);
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {
        if (videoRef.current) videoRef.current.muted = true;
        setIsMuted(true);
        videoRef.current?.play().catch(() => undefined);
      });
    }
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => {
      setIsOpened(true);
      setIsOpening(false);
      videoRef.current?.play().catch(() => undefined);
    }, prefersReducedMotion ? 20 : 980);
  };

  const calendarStart = toCalendarDate(invitation?.weddingDate || '', invitation?.weddingTime || '');
  const calendarEnd = toCalendarDate(invitation?.weddingDate || '', invitation?.weddingTime || '', 4);
  const eventTitle = t('eventTitle', { names: `${invitation?.brideName || ''} & ${invitation?.groomName || ''}` });
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
    if (rsvpSubmissionLockRef.current || isSubmitting || submitSuccess) return;
    if (!invitation?.id || !guestName.trim()) {
      setSubmitError(t('nameRequired'));
      return;
    }
    rsvpSubmissionLockRef.current = true;
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const result = await onAddRsvp({
        invitationId: invitation.id,
        guestName: guestName.trim(),
        attendance,
        pax: attendance === 'attending' ? pax : 0,
        wishes: wishes.trim(),
      });
      if (result.success) {
        setSubmitSuccess(true);
        return;
      }
      setSubmitError(t('submitError'));
    } finally {
      setIsSubmitting(false);
      rsvpSubmissionLockRef.current = false;
    }
  };

  const featureTitle: Record<GuestFeature, string> = {
    calendar: t('calendarTitle'),
    location: t('locationTitle'),
    rsvp: t('rsvpTitle'),
    contact: t('contactTitle'),
    gift: t('giftsTitle'),
  };

  return (
    <div className="guest-experience relative h-dvh min-h-[480px] w-full min-w-0 overflow-hidden bg-[#171513] text-white md:h-full md:min-h-0">
      <div className="guest-glass-control absolute left-4 top-[calc(1rem+env(safe-area-inset-top))] z-50 flex rounded-full p-1 text-[10px] font-bold text-black shadow-sm" role="group" aria-label={t('language')}>
        {(['bm', 'en'] as const).map((option) => (
          <button key={option} type="button" onClick={() => setLanguage(option)} aria-pressed={language === option} className={`min-h-9 rounded-full px-3 uppercase transition ${language === option ? 'bg-black text-white' : 'text-black/65'}`}>
            {option}
          </button>
        ))}
      </div>
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
          aria-label={isMuted ? t('turnOnAudio') : t('muteAudio')}
          className="guest-glass-control absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-20 flex h-12 w-12 items-center justify-center rounded-full text-black transition hover:bg-white disabled:opacity-40"
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      )}

      {!isOpened && (
        <div className={`absolute inset-0 z-30 transition-opacity duration-500 ${isOpening ? 'pointer-events-none opacity-90' : 'opacity-100'}`}>
          <div className={`absolute inset-y-0 left-0 w-1/2 border-r border-black/10 bg-white/90 shadow-[inset_-18px_0_36px_rgba(0,0,0,0.035)] backdrop-blur-2xl transition-transform duration-[980ms] [transition-timing-function:cubic-bezier(.77,0,.18,1)] ${isOpening ? '-translate-x-full' : 'translate-x-0'}`} />
          <div className={`absolute inset-y-0 right-0 w-1/2 border-l border-white/80 bg-white/90 shadow-[inset_18px_0_36px_rgba(0,0,0,0.035)] backdrop-blur-2xl transition-transform duration-[980ms] [transition-timing-function:cubic-bezier(.77,0,.18,1)] ${isOpening ? 'translate-x-full' : 'translate-x-0'}`} />

          <div className={`absolute inset-0 flex min-w-0 flex-col items-center justify-center px-5 text-center transition-all duration-500 ${isOpening ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
            <p className="guest-love-quote mb-6 text-[1.75rem] leading-none text-black/75">
              {t('celebrateLove')}
            </p>
            <h1 className="guest-couple-name max-w-full break-words text-[clamp(1.75rem,9.25vw,2.8rem)] font-semibold uppercase leading-[1.08] tracking-[0.04em] text-black [overflow-wrap:anywhere]">
              {invitation?.brideName}
              <span className="my-2 block text-2xl font-normal text-black/70">&</span>
              {invitation?.groomName}
            </h1>
            <div className="my-6 h-px w-24 bg-black/20" />
            <p className="guest-event-date text-sm font-semibold uppercase tracking-[0.26em] text-black/80">
              {formatInvitationDate(invitation?.weddingDate, language === 'bm' ? 'ms-MY' : 'en-MY')}
            </p>
            <button
              type="button"
              onClick={openInvitation}
              className="guest-glass-control mt-10 min-h-[52px] rounded-full px-7 text-xs font-bold uppercase tracking-[0.1em] text-black transition hover:bg-white active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-2">
                {t('openInvitation')}
                <ChevronRight className="h-4 w-4" />
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
            <div className="guest-glass-control rounded-[24px] p-5 text-center">
              <CalendarDays className="mx-auto mb-2 h-5 w-5 text-black/65" />
              <p className="guest-event-date text-lg font-semibold text-black">{formatInvitationDate(invitation?.weddingDate, language === 'bm' ? 'ms-MY' : 'en-MY')}</p>
              {invitation?.weddingTime && <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-black/55">{invitation.weddingTime}</p>}
            </div>
            <div className="grid grid-cols-2 min-[360px]:grid-cols-4 gap-2">
              {[
                [t('days'), timeLeft.days],
                [t('hours'), timeLeft.hours],
                [t('minutes'), timeLeft.minutes],
                [t('seconds'), timeLeft.seconds],
              ].map(([label, value]) => (
                <div key={label} className="guest-glass-control rounded-2xl p-3 text-center">
                  <strong className="guest-countdown-number block text-2xl font-bold tabular-nums text-black">{value}</strong>
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-black/60">{label}</span>
                </div>
              ))}
            </div>
            {(dressCodeText || dressCodeColors.length > 0) && (
              <div className="guest-glass-control rounded-[24px] p-5 text-center">
                <div className="mb-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-black/65"><Shirt className="h-4 w-4" />Dress Code</div>
                {dressCodeText && <p className="guest-location-title text-lg font-semibold text-black">{dressCodeText}</p>}
                {dressCodeColors.length > 0 && <div className="mt-3 space-y-2"><div className="flex flex-wrap justify-center gap-2.5" aria-hidden="true">{dressCodeColors.map((color, index) => <span key={`${color.name}-${index}`} className="h-8 w-8 rounded-full border-2 border-white shadow-sm ring-1 ring-black/10" style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(color.hex) ? color.hex : '#9B7B63' }} />)}</div><p className="text-xs font-semibold text-black/60">{dressCodeColors.map((color) => color.name).filter(Boolean).join(' • ')}</p></div>}
              </div>
            )}
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
            <div className="guest-glass-control rounded-[24px] p-6 text-center">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white/65">
                <MapPin className="h-6 w-6 text-black" strokeWidth={1.7} />
              </span>
              <h3 className="guest-location-title break-words text-2xl font-semibold uppercase leading-tight tracking-[0.025em] text-black [overflow-wrap:anywhere]">{invitation?.venueName || t('venueUnavailable')}</h3>
              {invitation?.venueAddress && <p className="mt-3 break-words text-xs font-semibold uppercase leading-relaxed tracking-[0.04em] text-black/60 [overflow-wrap:anywhere]">{invitation.venueAddress}</p>}
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
                  <label className="mb-1.5 block text-sm font-semibold">{t('guestName')} *</label>
                  <input value={guestName} onChange={(event) => setGuestName(event.target.value)} required className="input-maiya" placeholder={t('yourName')} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">{t('attendance')} *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" aria-pressed={attendance === 'attending'} onClick={() => setAttendance('attending')} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${attendance === 'attending' ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-system bg-white'}`}><Check className="h-4 w-4" />{t('attending')}</button>
                    <button type="button" aria-pressed={attendance === 'declined'} onClick={() => setAttendance('declined')} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${attendance === 'declined' ? 'border-rose-700 bg-rose-700 text-white' : 'border-system bg-white'}`}><X className="h-4 w-4" />{t('notAttending')}</button>
                  </div>
                </div>
                {attendance === 'attending' && (
                  <div className="rounded-xl border border-system bg-white/70 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div><span className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-accent" />{t('guestCount')}</span><span className="mt-1 block text-[11px] text-black/50">Maksimum {maxPax} pax</span></div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button type="button" aria-label="Kurangkan tetamu" disabled={pax <= 1} onClick={() => setPax((value) => Math.max(1, value - 1))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-system bg-white disabled:opacity-40"><Minus className="h-4 w-4" /></button>
                        <output className="min-w-10 text-center text-lg font-bold tabular-nums" aria-live="polite">{pax}</output>
                        <button type="button" aria-label="Tambah tetamu" disabled={pax >= maxPax} onClick={() => setPax((value) => Math.min(maxPax, value + 1))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-system bg-white disabled:opacity-40"><Plus className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">{t('messagePrayer')}</label>
                  <textarea value={wishes} onChange={(event) => setWishes(event.target.value)} rows={3} className="input-maiya" placeholder={t('messagePlaceholder')} />
                </div>
                {submitError && <p role="alert" className="break-words text-sm text-rose-700">{submitError}</p>}
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSubmitting ? t('submitting') : t('submitRsvp')}
                </button>
              </form>
            ) : (
              <div className="rounded-[24px] border border-emerald-200/80 bg-gradient-to-b from-emerald-50 to-white px-5 py-8 text-center text-emerald-900 shadow-sm">
                <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-700 text-white shadow-md"><CheckCircle2 className="h-9 w-9" /></span>
                <h3 className="font-serif text-2xl font-semibold uppercase tracking-[0.08em]">{rsvpSuccessCopy.titleBm}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/55">{rsvpSuccessCopy.titleEn}</p>
                <div className="mx-auto my-5 h-px w-14 bg-emerald-800/20" />
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-black/75">{rsvpSuccessCopy.messageBm}</p>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-black/55">{rsvpSuccessCopy.messageEn}</p>
                <button type="button" onClick={() => setActiveFeature(null)} className="btn-primary mt-7 w-full uppercase tracking-[0.08em]">
                  {rsvpSuccessCopy.close}
                </button>
              </div>
            )}

            {!submitSuccess && <div className="border-t border-system pt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-serif text-heading-2">{t('guestMessages')}</h3>
                <span className="text-sm font-semibold text-accent">{invitationRsvps.length}</span>
              </div>
              <div className="max-h-56 space-y-3 overflow-y-auto overscroll-contain pr-1">
                {invitationRsvps.length === 0 ? (
                  <p className="py-6 text-center text-sm text-secondary">{t('noMessages')}</p>
                ) : invitationRsvps.map((entry) => (
                  <article key={entry.id} className="min-w-0 rounded-2xl border border-system bg-white/75 p-4">
                    <strong className="block break-words text-sm [overflow-wrap:anywhere]">{entry.guestName}</strong>
                    {entry.wishes && <p className="mt-1 break-words font-serif text-sm italic leading-relaxed text-[#5F5A55] [overflow-wrap:anywhere]">“{entry.wishes}”</p>}
                  </article>
                ))}
              </div>
            </div>}
          </div>
        )}

        {activeFeature === 'contact' && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/60">{t('weddingRepresentative')}</p>
            {visibleContacts.length > 0 ? (
              <div className="space-y-3 pt-2">
                {visibleContacts.map((contact) => {
                  const whatsapp = normalizeMalaysianPhone(contact.whatsappNumber);
                  const phone = normalizeMalaysianPhone(contact.phoneNumber);
                  return (
                    <article key={contact.id} className="guest-glass-control rounded-2xl p-4">
                      {contact.relationship && <p className="break-words text-[10px] font-bold uppercase tracking-[0.12em] text-black/55 [overflow-wrap:anywhere]">{contact.relationship}</p>}
                      <h4 className="mt-1 break-words text-base font-bold uppercase tracking-[0.04em] text-black [overflow-wrap:anywhere]">{contact.name || t('weddingRepresentative')}</h4>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {whatsapp && <a aria-label={`WhatsApp ${contact.name || t('weddingRepresentative')}`} href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn-primary w-full px-2"><WhatsAppIcon className="h-5 w-5" /><span className="text-[10px] uppercase min-[360px]:text-xs">WhatsApp</span></a>}
                        {phone && <a aria-label={`${t('call')} ${contact.name || t('weddingRepresentative')}`} href={`tel:+${phone}`} className="btn-outline w-full px-2"><PhoneCall className="h-5 w-5" /><span className="text-[10px] uppercase min-[360px]:text-xs">{t('call')}</span></a>}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-secondary">{t('contactUnavailable')}</p>
            )}
          </div>
        )}

        {activeFeature === 'gift' && showGift && (
          <div className="space-y-4 text-center">
            {bank?.qrCodeUrl && <img src={bank.qrCodeUrl} alt={t('giftQrAlt')} className="mx-auto aspect-square w-44 max-w-full rounded-2xl border border-system bg-white object-contain p-3" />}
            {bank?.accountNumber && (
              <div className="rounded-2xl border border-system bg-white/75 p-5">
                <p className="text-sm font-semibold text-secondary">{bank.bankName}</p>
                <p className="mt-1 break-all font-title tabular-nums text-xl font-bold tracking-wide">{bank.accountNumber}</p>
                <p className="mt-1 break-words text-sm [overflow-wrap:anywhere]">{bank.accountHolder}</p>
              </div>
            )}
            {bank?.accountNumber && <button type="button" onClick={copyAccount} className="btn-primary w-full"><Copy className="h-5 w-5" />{copied ? t('copied') : t('copyAccount')}</button>}
            {wishlistUrl && <a href={wishlistUrl} target="_blank" rel="noopener noreferrer" className="btn-outline w-full"><Gift className="h-5 w-5" />{t('openWishlist')}<ExternalLink className="h-4 w-4" /></a>}
          </div>
        )}
      </GuestBottomSheet>
    </div>
  );
};

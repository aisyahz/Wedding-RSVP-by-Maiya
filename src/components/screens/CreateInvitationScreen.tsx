import React, { useEffect, useRef, useState } from 'react';
import { ScreenId, Invitation, InvitationContact, DressCodeColor } from '../../types';
import { VIDEO_ACCEPT } from '../../lib/videoValidation';
import { ArrowLeft, ArrowRight, Upload, CheckCircle, Loader2, AlertCircle, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { MediaProviderService } from '../../lib/mediaProvider';

interface CreateInvitationScreenProps {
  onNavigate: (screen: ScreenId, slugOrId?: string) => void;
  editingInvitation?: Invitation | null;
  onSaveInvitation: (invitation: Partial<Invitation>) => Promise<Invitation | null>;
  onVideoFileSelected: (file: File | null) => void;
}

const createContact = (whatsappNumber = ''): InvitationContact => ({
  id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: '',
  relationship: '',
  phoneNumber: whatsappNumber,
  whatsappNumber,
  enabled: true,
});

const initialContacts = (invitation?: Invitation | null): InvitationContact[] =>
  invitation?.contacts?.length
    ? invitation.contacts.slice(0, 3)
    : [createContact(invitation?.whatsappContact || '')];

const normalizeDateForInput = (value?: string | null): string => {
  const raw = String(value || '').trim();
  const isoDate = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

const createDressCodeColor = (): DressCodeColor => ({ name: '', hex: '#9B7B63' });

export const CreateInvitationScreen: React.FC<CreateInvitationScreenProps> = ({
  onNavigate,
  editingInvitation,
  onSaveInvitation,
  onVideoFileSelected,
}) => {
  const [step, setStep] = useState<number>(1);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [stepError, setStepError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const [selectedVideoPreviewUrl, setSelectedVideoPreviewUrl] = useState('');
  const [isVideoPreviewLoading, setIsVideoPreviewLoading] = useState(false);
  const [videoPreviewError, setVideoPreviewError] = useState('');
  const [creationSlugSuffix] = useState(() => Date.now().toString().slice(-6));

  // Form State
  const [brideName, setBrideName] = useState(editingInvitation?.brideName || '');
  const [groomName, setGroomName] = useState(editingInvitation?.groomName || '');
  const [weddingDate, setWeddingDate] = useState(normalizeDateForInput(editingInvitation?.weddingDate));
  const [weddingTime, setWeddingTime] = useState(editingInvitation?.weddingTime || '');

  const [venueName, setVenueName] = useState(editingInvitation?.venueName || '');
  const [venueAddress, setVenueAddress] = useState(editingInvitation?.venueAddress || '');
  const [googleMapsUrl, setGoogleMapsUrl] = useState(editingInvitation?.googleMapsUrl || '');
  const [wazeUrl, setWazeUrl] = useState(editingInvitation?.wazeUrl || '');

  const [contacts, setContacts] = useState<InvitationContact[]>(() => initialContacts(editingInvitation));
  const [maxPax, setMaxPax] = useState(editingInvitation?.maxPax || 6);
  const [dressCodeText, setDressCodeText] = useState(editingInvitation?.dressCodeText || '');
  const [dressCodeColors, setDressCodeColors] = useState<DressCodeColor[]>(editingInvitation?.dressCodeColors || []);
  const [rsvpClosingDate, setRsvpClosingDate] = useState(editingInvitation?.rsvpClosingDate || '');
  const [wishlistUrl, setWishlistUrl] = useState(editingInvitation?.wishlistUrl || '');
  const [enableGiftSection, setEnableGiftSection] = useState<boolean>(
    editingInvitation?.enableGiftSection !== undefined ? editingInvitation.enableGiftSection : true
  );
  const [bankName, setBankName] = useState(editingInvitation?.bankGift?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(editingInvitation?.bankGift?.accountNumber || '');
  const [accountHolder, setAccountHolder] = useState(editingInvitation?.bankGift?.accountHolder || '');
  const [qrCodeUrl, setQrCodeUrl] = useState(editingInvitation?.bankGift?.qrCodeUrl || '');

  const [videoUrl, setVideoUrl] = useState(editingInvitation?.videoUrl || '');
  const [videoFileName, setVideoFileName] = useState(editingInvitation?.videoFileName || '');
  const [privatePin, setPrivatePin] = useState(editingInvitation?.privatePin || '');

  useEffect(() => {
    if (editingInvitation) {
      setBrideName(editingInvitation.brideName || '');
      setGroomName(editingInvitation.groomName || '');
      setWeddingDate(normalizeDateForInput(editingInvitation.weddingDate));
      setWeddingTime(editingInvitation.weddingTime || '');
      setVenueName(editingInvitation.venueName || '');
      setVenueAddress(editingInvitation.venueAddress || '');
      setGoogleMapsUrl(editingInvitation.googleMapsUrl || '');
      setWazeUrl(editingInvitation.wazeUrl || '');
      setContacts(initialContacts(editingInvitation));
      setMaxPax(editingInvitation.maxPax || 6);
      setDressCodeText(editingInvitation.dressCodeText || '');
      setDressCodeColors(editingInvitation.dressCodeColors || []);
      setRsvpClosingDate(editingInvitation.rsvpClosingDate || '');
      setWishlistUrl(editingInvitation.wishlistUrl || '');
      setEnableGiftSection(editingInvitation.enableGiftSection !== undefined ? editingInvitation.enableGiftSection : true);
      setBankName(editingInvitation.bankGift?.bankName || '');
      setAccountNumber(editingInvitation.bankGift?.accountNumber || '');
      setAccountHolder(editingInvitation.bankGift?.accountHolder || '');
      setQrCodeUrl(editingInvitation.bankGift?.qrCodeUrl || '');
      setVideoUrl(editingInvitation.videoUrl || '');
      setVideoFileName(editingInvitation.videoFileName || '');
      setPrivatePin(editingInvitation.privatePin || '');
    }
  }, [editingInvitation?.id]);

  useEffect(() => {
    return () => {
      if (selectedVideoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(selectedVideoPreviewUrl);
      }
    };
  }, [selectedVideoPreviewUrl]);

  const slugBase = (brideName && groomName
    ? `${brideName.split(' ')[0]}-${groomName.split(' ')[0]}`
    : 'wedding-invite'
  ).toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const generatedSlug = editingInvitation?.slug ||
    `${slugBase || 'wedding-invite'}-${creationSlugSuffix}`;

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setStepError('');
    if (step === 1) {
      const requiredFields = [
        { value: brideName, label: 'Bride Name', id: 'bride-name' },
        { value: groomName, label: 'Groom Name', id: 'groom-name' },
        { value: weddingDate, label: 'Wedding Date', id: 'wedding-date' },
        { value: weddingTime, label: 'Event Time', id: 'wedding-time' },
      ];
      const missing = requiredFields.find((field) => !field.value.trim());
      if (missing) {
        setStepError(`${missing.label} is required.`);
        const field = document.getElementById(missing.id);
        field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        field?.focus();
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(weddingDate)) {
        setStepError('Wedding Date must be a valid date.');
        document.getElementById('wedding-date')?.focus();
        return;
      }
    }
    if (step < 5) {
      setStep(step + 1);
    } else {
      await handlePublish();
    }
  };

  const handlePublish = async () => {
    if (isPublishing) return;
    setIsPublishing(true);
    const primaryContact = contacts.find((contact) => contact.enabled && (contact.whatsappNumber || contact.phoneNumber));
    const data: Partial<Invitation> = {
      id: editingInvitation?.id || `inv-${Date.now()}`,
      slug: generatedSlug,
      brideName,
      groomName,
      weddingDate,
      weddingTime,
      venueName,
      venueAddress,
      googleMapsUrl,
      wazeUrl,
      whatsappContact: primaryContact?.whatsappNumber || primaryContact?.phoneNumber || '',
      contacts,
      maxPax,
      dressCodeText,
      dressCodeColors: dressCodeColors.filter((color) => color.name.trim()),
      wishlistUrl,
      enableGiftSection,
      bankGift: {
        bankName,
        accountNumber,
        accountHolder,
        qrCodeUrl,
      },
      rsvpClosingDate,
      privatePin,
      status: 'active',
      videoKey: editingInvitation?.videoKey,
      videoUrl: editingInvitation?.videoUrl,
      posterUrl: editingInvitation?.posterUrl,
      posterKey: editingInvitation?.posterKey,
      giftQrKey: editingInvitation?.giftQrKey,
      videoFileName: editingInvitation ? videoFileName : undefined,
    };

    try {
      const savedInvitation = await onSaveInvitation(data);
      if (!savedInvitation?.id) return;
      onNavigate('upload_video', savedInvitation.id);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleFormPaste = (event: React.ClipboardEvent<HTMLFormElement>) => {
    const field = event.target;
    if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLTextAreaElement)) return;
    if (field.disabled || field.readOnly) return;
    if (field instanceof HTMLInputElement && !['text', 'tel', 'url', 'email', 'search'].includes(field.type)) return;

    const pastedText = event.clipboardData.getData('text/plain');
    if (!pastedText) return;

    event.preventDefault();
    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? start;
    const nextValue = `${field.value.slice(0, start)}${pastedText}${field.value.slice(end)}`;
    const prototype = field instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const nativeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    nativeValueSetter?.call(field, nextValue);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    window.requestAnimationFrame(() => {
      const caretPosition = start + pastedText.length;
      field.setSelectionRange(caretPosition, caretPosition);
    });
  };

  return (
    <div className="max-w-2xl min-w-0 w-full mx-auto space-y-4 min-[360px]:space-y-6">
      {/* Top Header Navigation */}
      <div className="flex min-w-0 items-center justify-between gap-2 bg-white p-3 min-[360px]:p-5 rounded-2xl border border-system shadow-2xs">
        <button
          onClick={() => {
            if (step > 1) setStep(step - 1);
            else onNavigate('invitation_list');
          }}
          className="w-10 h-10 rounded-xl bg-app hover:bg-[#EFE7DF] text-primary flex items-center justify-center cursor-pointer transition-all border border-system"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center min-w-0">
          <span className="text-caption uppercase font-semibold text-accent tracking-wider block">
            Step {step} of 5
          </span>
          <h1 className="text-title text-primary">
            {step === 1 && 'Wedding & Couple Details'}
            {step === 2 && 'Venue & Map Links'}
            {step === 3 && 'Contacts & Gift Preferences'}
            {step === 4 && 'Upload Video Card'}
            {step === 5 && 'Preview & Generate Link'}
          </h1>
        </div>

        <div className="w-10" />
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-5 gap-1.5 min-[360px]:gap-2 px-1" aria-label={`Langkah ${step} daripada 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i <= step ? 'bg-[#9B7B63]' : 'bg-[#D9D2CA]'
            }`}
          />
        ))}
      </div>

      {/* Form Container */}
      <form
        ref={formRef}
        onSubmit={handleNext}
        onPasteCapture={handleFormPaste}
        onInvalidCapture={(event) => {
          if (step !== 1) return;
          const target = event.target as HTMLInputElement;
          const firstInvalid = formRef.current?.querySelector<HTMLInputElement>(':invalid');
          if (target !== firstInvalid) return;
          const label = target.dataset.fieldLabel || 'This field';
          setStepError(target.validity.valueMissing
            ? `${label} is required.`
            : target.validationMessage || `${label} is invalid.`);
          window.requestAnimationFrame(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.focus();
          });
        }}
        className="card-maiya card-form space-y-6"
      >
        
        {/* STEP 1: Couple Details */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-heading-3 text-primary border-b border-system/40 pb-3">
              Couple Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label block">
                  Bride Name *
                </label>
                <input
                  id="bride-name"
                  data-field-label="Bride Name"
                  type="text"
                  required
                  value={brideName}
                  onChange={(e) => setBrideName(e.target.value)}
                  placeholder="e.g. Sofea Azman"
                  className="w-full input-maiya"
                />
              </div>

              <div>
                <label className="form-label block">
                  Groom Name *
                </label>
                <input
                  id="groom-name"
                  data-field-label="Groom Name"
                  type="text"
                  required
                  value={groomName}
                  onChange={(e) => setGroomName(e.target.value)}
                  placeholder="e.g. Adam Harith"
                  className="w-full input-maiya"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label block">
                  Wedding Date *
                </label>
                <input
                  id="wedding-date"
                  data-field-label="Wedding Date"
                  type="date"
                  required
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  className="w-full input-maiya"
                />
              </div>

              <div>
                <label className="form-label block">
                  Event Time *
                </label>
                <input
                  id="wedding-time"
                  data-field-label="Event Time"
                  type="text"
                  required
                  value={weddingTime}
                  onChange={(e) => setWeddingTime(e.target.value)}
                  placeholder="e.g. 11:00 AM – 4:00 PM"
                  className="w-full input-maiya"
                />
              </div>
            </div>
            {stepError && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{stepError}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Venue */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-heading-3 text-primary border-b border-system/40 pb-3">
              Venue Location & Directions
            </h2>

            <div>
              <label className="form-label block">
                Venue Name *
              </label>
              <input
                type="text"
                required
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. Glasshouse at Seputeh"
                className="w-full input-maiya"
              />
            </div>

            <div>
              <label className="form-label block">
                Full Venue Address *
              </label>
              <textarea
                rows={3}
                required
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                placeholder="17, Jalan Syed Putra, Seputeh, 50460 Kuala Lumpur"
                className="input-maiya"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label block">
                  Google Maps Link
                </label>
                <input
                  type="url"
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="w-full input-maiya"
                />
              </div>

              <div>
                <label className="form-label block">
                  Waze Link
                </label>
                <input
                  type="url"
                  value={wazeUrl}
                  onChange={(e) => setWazeUrl(e.target.value)}
                  placeholder="https://waze.com/..."
                  className="w-full input-maiya"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Contact & Extras */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-heading-3 text-primary border-b border-system/40 pb-3">
              Guest Contacts & Gift Registry
            </h2>

            <div className="space-y-3">
              <div className="flex flex-col items-start gap-3 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-primary">Guest Contacts</h3>
                  <p className="text-xs text-secondary">Up to 3 contacts. Only enabled contacts appear to guests.</p>
                </div>
                <button
                  type="button"
                  disabled={contacts.length >= 3}
                  onClick={() => setContacts((current) => [...current, createContact()])}
                  className="btn-outline shrink-0 px-3 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Add Contact
                </button>
              </div>
              {contacts.map((contact, index) => (
                <div key={contact.id} className="space-y-3 rounded-xl border border-system bg-white p-3 min-[360px]:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-accent">Contact {index + 1}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={contact.enabled}
                          onChange={(event) => setContacts((current) => current.map((item) => item.id === contact.id ? { ...item, enabled: event.target.checked } : item))}
                          className="h-5 w-5 rounded"
                        />
                        Enabled
                      </label>
                      <button type="button" aria-label={`Remove contact ${index + 1}`} onClick={() => setContacts((current) => current.filter((item) => item.id !== contact.id))} className="flex h-11 w-11 items-center justify-center rounded-xl text-rose-700 hover:bg-rose-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input required={contact.enabled} value={contact.name} onChange={(event) => setContacts((current) => current.map((item) => item.id === contact.id ? { ...item, name: event.target.value } : item))} placeholder="Name *" className="input-maiya" />
                    <input value={contact.relationship || ''} onChange={(event) => setContacts((current) => current.map((item) => item.id === contact.id ? { ...item, relationship: event.target.value } : item))} placeholder="Relationship (optional)" className="input-maiya" />
                    <input type="tel" inputMode="tel" required={contact.enabled && !contact.whatsappNumber} value={contact.phoneNumber} onChange={(event) => setContacts((current) => current.map((item) => item.id === contact.id ? { ...item, phoneNumber: event.target.value } : item))} placeholder="Phone number" className="input-maiya" />
                    <input type="tel" inputMode="tel" required={contact.enabled && !contact.phoneNumber} value={contact.whatsappNumber} onChange={(event) => setContacts((current) => current.map((item) => item.id === contact.id ? { ...item, whatsappNumber: event.target.value } : item))} placeholder="WhatsApp number" className="input-maiya" />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label block">
                  RSVP Closing Date *
                </label>
                <input
                  type="date"
                  required
                  value={rsvpClosingDate}
                  onChange={(e) => setRsvpClosingDate(e.target.value)}
                  className="w-full input-maiya"
                />
              </div>
              <div>
                <label className="form-label block">
                  Maximum RSVP Pax *
                </label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  required
                  value={maxPax}
                  onChange={(event) => setMaxPax(Math.min(999, Math.max(1, Number(event.target.value) || 1)))}
                  className="w-full input-maiya"
                />
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-system bg-white p-3 min-[360px]:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-primary">Dress Code (Optional)</h3>
                  <p className="text-xs text-secondary">Add a note and up to 5 suggested colours.</p>
                </div>
                <button type="button" disabled={dressCodeColors.length >= 5} onClick={() => setDressCodeColors((colors) => [...colors, createDressCodeColor()])} className="btn-outline w-full shrink-0 px-3 min-[390px]:w-auto disabled:cursor-not-allowed disabled:opacity-50">
                  <Plus className="h-4 w-4" /> Add Colour
                </button>
              </div>
              <input value={dressCodeText} onChange={(event) => setDressCodeText(event.target.value)} placeholder="e.g. Formal / Earth tones" className="input-maiya" />
              {dressCodeColors.map((color, index) => (
                <div key={index} className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)_2.75rem] items-center gap-2">
                  <input type="color" aria-label={`Dress code colour ${index + 1}`} value={/^#[0-9a-f]{6}$/i.test(color.hex) ? color.hex : '#9B7B63'} onChange={(event) => setDressCodeColors((colors) => colors.map((item, itemIndex) => itemIndex === index ? { ...item, hex: event.target.value } : item))} className="h-11 w-12 cursor-pointer rounded-lg border border-system bg-white p-1" />
                  <input value={color.name} onChange={(event) => setDressCodeColors((colors) => colors.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="Colour name" className="input-maiya" />
                  <button type="button" aria-label={`Remove dress code colour ${index + 1}`} onClick={() => setDressCodeColors((colors) => colors.filter((_, itemIndex) => itemIndex !== index))} className="flex h-11 w-11 items-center justify-center rounded-xl text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>

            <div>
              <label className="form-label block">
                Wishlist URL (Optional)
              </label>
              <input
                type="url"
                value={wishlistUrl}
                onChange={(e) => setWishlistUrl(e.target.value)}
                placeholder="https://shopee.com.my/wishlist"
                className="w-full input-maiya"
              />
            </div>

            {/* Gift Toggle */}
            <div className="flex items-center justify-between p-4 bg-[#EFE7DF] rounded-xl border border-system">
              <div>
                <span className="text-xs font-semibold text-primary block">Enable Gift Section</span>
                <span className="text-caption text-secondary">Provide bank transfer details or DuitNow QR for monetary gifts</span>
              </div>
              <input
                type="checkbox"
                checked={enableGiftSection}
                onChange={(e) => setEnableGiftSection(e.target.checked)}
                className="w-5 h-5 rounded text-accent focus:ring-[#9B7B63] cursor-pointer"
              />
            </div>

            {enableGiftSection && (
              <div className="p-4 bg-white rounded-xl border border-system space-y-3">
                <span className="text-xs font-semibold text-accent block">Bank Details & Gift QR</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                  <input
                    type="text"
                    placeholder="Bank Name (e.g. Maybank)"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="input-maiya"
                  />
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="input-maiya"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Account Holder Name"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full input-maiya"
                />

                {/* Gift QR Image Upload */}
                <div className="pt-2 border-t border-system/40">
                  <label className="block text-caption font-semibold text-primary mb-1">
                    DuitNow / Bank QR Code Image
                  </label>
                  {qrCodeUrl && (
                    <div className="mb-2 flex items-center gap-2">
                      <img src={qrCodeUrl} alt="Gift QR" className="w-16 h-16 object-contain rounded-lg border border-system bg-white p-1" />
                      <span className="text-xs text-emerald-700 font-medium break-words">Imej QR bersedia</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const tempId = editingInvitation?.id || `inv-${Date.now()}`;
                      const { data } = await MediaProviderService.uploadMedia(file, tempId, 'gift-qr');
                      if (data?.publicUrl) {
                        setQrCodeUrl(data.publicUrl);
                      }
                    }}
                    className="text-xs text-secondary file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EFE7DF] file:text-primary hover:file:bg-[#9B7B63] hover:file:text-white cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Upload Video */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-heading-3 text-primary border-b border-system/40 pb-3">
              Upload Video Card
            </h2>
            <p className="text-xs text-secondary">
              Select high quality MP4 video card file for full-screen guest opening experience.
            </p>

            <div className="border-2 border-dashed border-[#9B7B63]/60 rounded-2xl p-6 bg-[#EFE7DF]/50 text-center space-y-3">
              <Upload className="w-8 h-8 text-accent mx-auto" />
              <div>
                <p className="text-sm font-semibold text-primary break-words [overflow-wrap:anywhere]">{videoFileName}</p>
                <p className="text-xs text-secondary mt-0.5">Format MP4 atau MOV • Maksimum 100MB</p>
              </div>

              <label className="btn-outline h-10 text-xs px-4 cursor-pointer inline-flex items-center gap-1.5">
                <span>Replace Video File</span>
                <input
                  type="file"
                  accept={VIDEO_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (selectedVideoPreviewUrl.startsWith('blob:')) {
                      URL.revokeObjectURL(selectedVideoPreviewUrl);
                    }
                    const objectUrl = file ? URL.createObjectURL(file) : '';
                    setSelectedVideoPreviewUrl(objectUrl);
                    setVideoFileName(file?.name || editingInvitation?.videoFileName || '');
                    setVideoPreviewError('');
                    onVideoFileSelected(file);
                  }}
                />
              </label>
            </div>

            {/* Video Preview */}
            <div className="rounded-xl overflow-hidden bg-[#24211F] min-h-44 max-h-[220px] relative border border-system">
              {(selectedVideoPreviewUrl || videoUrl) ? (
                <video
                  ref={videoPreviewRef}
                  key={selectedVideoPreviewUrl || videoUrl}
                  src={selectedVideoPreviewUrl || videoUrl}
                  poster={editingInvitation?.posterUrl || undefined}
                  controls
                  playsInline
                  preload="metadata"
                  onLoadStart={() => {
                    setIsVideoPreviewLoading(true);
                    setVideoPreviewError('');
                  }}
                  onCanPlay={() => setIsVideoPreviewLoading(false)}
                  onError={() => {
                    setIsVideoPreviewLoading(false);
                    setVideoPreviewError('Video tidak dapat dimainkan. Pastikan fail MP4 menggunakan codec H.264 dan audio AAC.');
                  }}
                  className="w-full h-full min-h-44 object-cover"
                />
              ) : (
                <div className="min-h-44 flex items-center justify-center p-5 text-center text-sm text-white/70">
                  Tiada video tersedia untuk pratonton.
                </div>
              )}
              {isVideoPreviewLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-white pointer-events-none">
                  <Loader2 className="w-7 h-7 animate-spin" />
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-[#1E1E1C]/80 backdrop-blur-md text-white text-caption px-2.5 py-1 rounded-full font-sans">
                Video Card Preview
              </div>
            </div>
            {videoPreviewError && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{videoPreviewError}</span>
              </div>
            )}
            {(selectedVideoPreviewUrl || videoUrl) && !videoPreviewError && (
              <button
                type="button"
                onClick={() => {
                  if (!videoPreviewRef.current) return;
                  videoPreviewRef.current.currentTime = 0;
                  videoPreviewRef.current.play().catch(() => undefined);
                }}
                className="btn-outline h-11 w-full"
              >
                <RotateCcw className="h-4 w-4" />
                Main Semula
              </button>
            )}
          </div>
        )}

        {/* STEP 5: Preview & Publish */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-heading-3 text-primary border-b border-system/40 pb-3">
              Review & Generate Link
            </h2>

            <div className="p-5 bg-[#EFE7DF] rounded-2xl border border-system space-y-2">
              <span className="text-caption text-accent font-semibold uppercase tracking-wider block">
                Summary Overview
              </span>
              <p className="text-xl font-bold font-title text-primary">{brideName} & {groomName}</p>
              <p className="text-xs text-secondary">Date: {weddingDate} • {weddingTime}</p>
              <p className="text-xs text-secondary">Venue: {venueName}</p>
              <p className="text-xs font-title tabular-nums font-semibold text-accent pt-1">
                Slug: /invite/{generatedSlug}
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-system space-y-1">
              <span className="text-xs font-semibold text-primary block">
                🔒 Couple Private RSVP Report Access
              </span>
              <p className="text-xs text-secondary">
                {editingInvitation
                  ? 'The couple uses their 6-digit security PIN to view private guest RSVP responses.'
                  : 'A unique 6-digit PIN will be securely generated upon creation and remain available on the Generate Link page.'}
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="sticky bottom-0 z-20 -mx-4 flex min-h-[68px] items-center justify-end border-t border-system/40 bg-white/95 px-4 py-3 backdrop-blur-sm md:static md:mx-0 md:min-h-0 md:border-t-0 md:bg-transparent md:px-0 md:py-0">
          {step < 5 ? (
            <button type="submit" className="w-full sm:w-auto btn-primary cursor-pointer">
              <span>Continue to Step {step + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className="w-full sm:w-auto btn-accent cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              <span>{isPublishing ? 'Menyimpan…' : 'Generate Link'}</span>
            </button>
          )}
        </div>

      </form>
    </div>
  );
};

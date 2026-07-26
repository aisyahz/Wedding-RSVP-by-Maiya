import React, { useState } from 'react';
import { ScreenId, Invitation } from '../../types';
import { ArrowLeft, ArrowRight, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { MediaProviderService } from '../../lib/mediaProvider';

interface CreateInvitationScreenProps {
  onNavigate: (screen: ScreenId, slugOrId?: string) => void;
  editingInvitation?: Invitation | null;
  onSaveInvitation: (invitation: Partial<Invitation>) => Promise<Invitation | null>;
  onVideoFileSelected: (file: File | null) => void;
}

export const CreateInvitationScreen: React.FC<CreateInvitationScreenProps> = ({
  onNavigate,
  editingInvitation,
  onSaveInvitation,
  onVideoFileSelected,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isPublishing, setIsPublishing] = useState(false);

  // Form State
  const [brideName, setBrideName] = useState(editingInvitation?.brideName || '');
  const [groomName, setGroomName] = useState(editingInvitation?.groomName || '');
  const [weddingDate, setWeddingDate] = useState(editingInvitation?.weddingDate || '');
  const [weddingTime, setWeddingTime] = useState(editingInvitation?.weddingTime || '');

  const [venueName, setVenueName] = useState(editingInvitation?.venueName || '');
  const [venueAddress, setVenueAddress] = useState(editingInvitation?.venueAddress || '');
  const [googleMapsUrl, setGoogleMapsUrl] = useState(editingInvitation?.googleMapsUrl || '');
  const [wazeUrl, setWazeUrl] = useState(editingInvitation?.wazeUrl || '');

  const [whatsappContact, setWhatsappContact] = useState(editingInvitation?.whatsappContact || '');
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

  React.useEffect(() => {
    if (editingInvitation) {
      setBrideName(editingInvitation.brideName || '');
      setGroomName(editingInvitation.groomName || '');
      setWeddingDate(editingInvitation.weddingDate || '');
      setWeddingTime(editingInvitation.weddingTime || '');
      setVenueName(editingInvitation.venueName || '');
      setVenueAddress(editingInvitation.venueAddress || '');
      setGoogleMapsUrl(editingInvitation.googleMapsUrl || '');
      setWazeUrl(editingInvitation.wazeUrl || '');
      setWhatsappContact(editingInvitation.whatsappContact || '');
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
  }, [editingInvitation]);

  const generatedSlug = (brideName && groomName
    ? `${brideName.split(' ')[0]}-${groomName.split(' ')[0]}`
    : 'wedding-invite'
  ).toLowerCase().replace(/[^a-z0-9-]/g, '');

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 5) {
      setStep(step + 1);
    } else {
      await handlePublish();
    }
  };

  const handlePublish = async () => {
    if (isPublishing) return;
    setIsPublishing(true);
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
      whatsappContact,
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

  return (
    <div className="max-w-2xl min-w-0 w-full mx-auto space-y-4 min-[360px]:space-y-6">
      {/* Top Header Navigation */}
      <div className="flex min-w-0 items-center justify-between gap-2 bg-white p-3 min-[360px]:p-5 rounded-2xl border border-[#D9D2CA] shadow-2xs">
        <button
          onClick={() => {
            if (step > 1) setStep(step - 1);
            else onNavigate('invitation_list');
          }}
          className="w-10 h-10 rounded-xl bg-[#F7F5F2] hover:bg-[#EFE7DF] text-[#1E1E1C] flex items-center justify-center cursor-pointer transition-all border border-[#D9D2CA]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center min-w-0">
          <span className="text-[10px] uppercase font-semibold text-[#9B7B63] tracking-wider block">
            Step {step} of 5
          </span>
          <h1 className="font-title text-base font-bold text-[#1E1E1C]">
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
      <form onSubmit={handleNext} className="card-maiya p-4 min-[360px]:p-6 md:p-8 space-y-6">
        
        {/* STEP 1: Couple Details */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-title text-lg font-bold text-[#1E1E1C] border-b border-[#D9D2CA]/40 pb-3">
              Couple Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
                  Bride Name *
                </label>
                <input
                  type="text"
                  required
                  value={brideName}
                  onChange={(e) => setBrideName(e.target.value)}
                  placeholder="e.g. Sofea Azman"
                  className="w-full input-maiya"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
                  Groom Name *
                </label>
                <input
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
                <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
                  Wedding Date *
                </label>
                <input
                  type="date"
                  required
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  className="w-full input-maiya"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
                  Event Time *
                </label>
                <input
                  type="text"
                  required
                  value={weddingTime}
                  onChange={(e) => setWeddingTime(e.target.value)}
                  placeholder="e.g. 11:00 AM – 4:00 PM"
                  className="w-full input-maiya"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Venue */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-title text-lg font-bold text-[#1E1E1C] border-b border-[#D9D2CA]/40 pb-3">
              Venue Location & Directions
            </h2>

            <div>
              <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
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
              <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
                Full Venue Address *
              </label>
              <textarea
                rows={3}
                required
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                placeholder="17, Jalan Syed Putra, Seputeh, 50460 Kuala Lumpur"
                className="w-full bg-white border border-[#D9D2CA] rounded-xl p-3 text-base text-[#1E1E1C] focus:outline-none focus:border-[#9B7B63] focus:ring-3 focus:ring-[#9B7B63]/10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
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
                <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
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
            <h2 className="font-title text-lg font-bold text-[#1E1E1C] border-b border-[#D9D2CA]/40 pb-3">
              Guest Contacts & Gift Registry
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
                  WhatsApp Contact Number *
                </label>
                <input
                  type="text"
                  required
                  value={whatsappContact}
                  onChange={(e) => setWhatsappContact(e.target.value)}
                  placeholder="+60123456789"
                  className="w-full input-maiya"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
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
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
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
            <div className="flex items-center justify-between p-4 bg-[#EFE7DF] rounded-xl border border-[#D9D2CA]">
              <div>
                <span className="text-xs font-semibold text-[#1E1E1C] block">Enable Gift Section</span>
                <span className="text-[11px] text-[#77736D]">Provide bank transfer details or DuitNow QR for monetary gifts</span>
              </div>
              <input
                type="checkbox"
                checked={enableGiftSection}
                onChange={(e) => setEnableGiftSection(e.target.checked)}
                className="w-5 h-5 rounded text-[#9B7B63] focus:ring-[#9B7B63] cursor-pointer"
              />
            </div>

            {enableGiftSection && (
              <div className="p-4 bg-white rounded-xl border border-[#D9D2CA] space-y-3">
                <span className="text-xs font-semibold text-[#9B7B63] block">Bank Details & Gift QR</span>
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
                <div className="pt-2 border-t border-[#D9D2CA]/40">
                  <label className="block text-[11px] font-semibold text-[#1E1E1C] mb-1">
                    DuitNow / Bank QR Code Image
                  </label>
                  {qrCodeUrl && (
                    <div className="mb-2 flex items-center gap-2">
                      <img src={qrCodeUrl} alt="Gift QR" className="w-16 h-16 object-contain rounded-lg border border-[#D9D2CA] bg-white p-1" />
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
                    className="text-xs text-[#77736D] file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EFE7DF] file:text-[#1E1E1C] hover:file:bg-[#9B7B63] hover:file:text-white cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Upload Video */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-title text-lg font-bold text-[#1E1E1C] border-b border-[#D9D2CA]/40 pb-3">
              Upload Video Card
            </h2>
            <p className="text-xs text-[#77736D]">
              Select high quality MP4 video card file for full-screen guest opening experience.
            </p>

            <div className="border-2 border-dashed border-[#9B7B63]/60 rounded-2xl p-6 bg-[#EFE7DF]/50 text-center space-y-3">
              <Upload className="w-8 h-8 text-[#9B7B63] mx-auto" />
              <div>
                <p className="text-sm font-semibold text-[#1E1E1C] break-words [overflow-wrap:anywhere]">{videoFileName}</p>
                <p className="text-xs text-[#77736D] mt-0.5">Format MP4 • Maksimum 50MB</p>
              </div>

              <label className="btn-outline h-10 text-xs px-4 cursor-pointer inline-flex items-center gap-1.5">
                <span>Replace Video File</span>
                <input
                  type="file"
                  accept="video/mp4"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setVideoFileName(file?.name || '');
                    onVideoFileSelected(file);
                  }}
                />
              </label>
            </div>

            {/* Video Preview */}
            <div className="rounded-xl overflow-hidden bg-[#24211F] max-h-[220px] relative border border-[#D9D2CA]">
              <video
                src={videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-[#1E1E1C]/80 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full font-sans">
                Video Card Preview
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Preview & Publish */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="font-title text-lg font-bold text-[#1E1E1C] border-b border-[#D9D2CA]/40 pb-3">
              Review & Generate Link
            </h2>

            <div className="p-5 bg-[#EFE7DF] rounded-2xl border border-[#D9D2CA] space-y-2">
              <span className="text-[10px] text-[#9B7B63] font-semibold uppercase tracking-wider block">
                Summary Overview
              </span>
              <p className="text-xl font-bold font-serif text-[#1E1E1C]">{brideName} & {groomName}</p>
              <p className="text-xs text-[#77736D]">Date: {weddingDate} • {weddingTime}</p>
              <p className="text-xs text-[#77736D]">Venue: {venueName}</p>
              <p className="text-xs font-mono font-semibold text-[#9B7B63] pt-1">
                Slug: digitalcardbymaiya.com/invite/{generatedSlug}
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-[#D9D2CA] space-y-1">
              <span className="text-xs font-semibold text-[#1E1E1C] block">
                🔒 Couple Private RSVP Report Access
              </span>
              <p className="text-xs text-[#77736D]">
                {editingInvitation
                  ? 'The couple uses their 6-digit security PIN to view private guest RSVP responses.'
                  : 'A unique 6-digit PIN will be securely generated upon creation and displayed once for your records.'}
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
            <div className="pt-4 border-t border-[#D9D2CA]/40 flex flex-col min-[390px]:flex-row justify-end gap-2">
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

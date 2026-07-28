import React, { useEffect, useState } from 'react';
import { ScreenId, Invitation } from '../../types';
import { CheckCircle, Copy, Eye, Share2, Sparkles, Lock } from 'lucide-react';
import { copyText } from '../../lib/clipboard';


interface GenerateLinkScreenProps {
  onNavigate: (screen: ScreenId) => void;
  activeInvitation: Invitation | null;
}

export const GenerateLinkScreen: React.FC<GenerateLinkScreenProps> = ({
  onNavigate,
  activeInvitation,
}) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  const slug = activeInvitation?.slug || '';
  const brideName = activeInvitation?.brideName || '';
  const groomName = activeInvitation?.groomName || '';
  const configuredPublicUrl = String((import.meta as any).env?.VITE_PUBLIC_SITE_URL || '').trim();
  const publicOrigin = configuredPublicUrl.startsWith('http')
    ? configuredPublicUrl.replace(/\/+$/, '')
    : window.location.origin.replace(/\/+$/, '');
  const generatedUrl = `${publicOrigin}/invite/${encodeURIComponent(slug)}`;

  const handleCopy = async () => {
    setCopyError('');
    const success = await copyText(generatedUrl);
    if (!success) {
      setCopied(false);
      setCopyError('Pautan tidak dapat disalin. Sila pilih dan salin secara manual.');
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = `Assalamu’alaikum & Salam Sejahtera.\n\nKami berbesar hati menjemput Dato'/Datin/Tuan/Puan/Encik/Cik ke Majlis Perkahwinan ${brideName} & ${groomName}.\n\nSila klik pautan kad jemputan digital di bawah untuk maklumat lanjut & pengesahan RSVP:\n\n${generatedUrl}\n\nTerima kasih!`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="max-w-xl min-w-0 w-full mx-auto space-y-6">
      {/* Top Banner */}
      <div className="text-center space-y-2 bg-white p-4 min-[360px]:p-6 rounded-2xl border border-system shadow-2xs">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Card Live & Active</span>
        </span>
        <h1 className="text-heading-1 text-primary">
          {brideName} & {groomName}
        </h1>
        <p className="text-xs text-secondary">
          Digital Wedding Card is published and ready for guests
        </p>
      </div>

      {/* Main Card */}
      <div className="card-maiya card-form space-y-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#EFE7DF] text-accent flex items-center justify-center mx-auto border border-system">
          <Sparkles className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-heading-3 text-primary">
            Generated Link
          </h2>
          <p className="text-xs text-secondary mt-1">
            Copy or share the unique link below with the couple or guests
          </p>
        </div>

        {/* Generated Link Field */}
        <div className="bg-app border border-system rounded-xl p-3 flex flex-col min-[390px]:flex-row min-w-0 items-stretch min-[390px]:items-center justify-between gap-2">
          <span className="min-w-0 font-title tabular-nums text-sm text-primary break-all font-medium">
            {generatedUrl}
          </span>
          <button
            onClick={handleCopy}
            className="btn-accent min-h-11 px-3 gap-1 cursor-pointer shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>
        {copyError && <p role="alert" className="-mt-4 text-xs text-error">{copyError}</p>}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => onNavigate('guest_opening')}
            className="w-full btn-primary cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Invitation</span>
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="btn-secondary w-full cursor-pointer !border-[#25D366] !bg-[#25D366] hover:!border-[#20BA5A] hover:!bg-[#20BA5A]"
          >
            <Share2 className="w-4 h-4" />
            <span>Share via WhatsApp</span>
          </button>
        </div>

        {/* PIN info note */}
        <div className="text-sm text-secondary pt-3 border-t border-system/40 flex flex-wrap items-center justify-center gap-1.5 font-medium break-words">
          <Lock className="w-3.5 h-3.5 text-accent" />
          <span>Private RSVP Report PIN: <code className="bg-[#EFE7DF] px-1.5 py-0.5 rounded text-primary font-title tabular-nums font-bold">{activeInvitation?.privatePin || '1234'}</code></span>
        </div>
      </div>

      <div className="text-center pt-2">
        <button
          onClick={() => onNavigate('dashboard')}
          className="text-xs font-semibold text-accent hover:underline cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

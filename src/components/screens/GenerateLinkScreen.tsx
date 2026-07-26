import React, { useEffect, useState } from 'react';
import { ScreenId, Invitation } from '../../types';
import confetti from 'canvas-confetti';
import { CheckCircle, Copy, Eye, Share2, Sparkles, Lock } from 'lucide-react';

interface GenerateLinkScreenProps {
  onNavigate: (screen: ScreenId) => void;
  activeInvitation: Invitation | null;
}

export const GenerateLinkScreen: React.FC<GenerateLinkScreenProps> = ({
  onNavigate,
  activeInvitation,
}) => {
  const [copied, setCopied] = useState(false);

  const slug = activeInvitation?.slug || '';
  const brideName = activeInvitation?.brideName || '';
  const groomName = activeInvitation?.groomName || '';
  const generatedUrl = `https://digitalcardbymaiya.com/invite/${slug}`;

  useEffect(() => {
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#9B7B63', '#1E1E1C', '#D9D2CA', '#EFE7DF'],
      });
    } catch {
      // Fallback
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = `Assalamu’alaikum & Salam Sejahtera.\n\nKami berbesar hati menjemput Dato'/Datin/Tuan/Puan/Encik/Cik ke Majlis Perkahwinan ${brideName} & ${groomName}.\n\nSila klik pautan kad jemputan digital di bawah untuk maklumat lanjut & pengesahan RSVP:\n\n${generatedUrl}\n\nTerima kasih!`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="max-w-xl min-w-0 w-full mx-auto space-y-6">
      {/* Top Banner */}
      <div className="text-center space-y-2 bg-white p-4 min-[360px]:p-6 rounded-2xl border border-[#D9D2CA] shadow-2xs">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Card Live & Active</span>
        </span>
        <h1 className="font-serif text-2xl font-bold text-[#1E1E1C]">
          {brideName} & {groomName}
        </h1>
        <p className="text-xs text-[#77736D]">
          Digital Wedding Card is published and ready for guests
        </p>
      </div>

      {/* Main Card */}
      <div className="card-maiya p-4 min-[360px]:p-6 sm:p-8 space-y-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#EFE7DF] text-[#9B7B63] flex items-center justify-center mx-auto border border-[#D9D2CA]">
          <Sparkles className="w-6 h-6" />
        </div>

        <div>
          <h2 className="font-title text-lg font-bold text-[#1E1E1C]">
            Generated Link
          </h2>
          <p className="text-xs text-[#77736D] mt-1">
            Copy or share the unique link below with the couple or guests
          </p>
        </div>

        {/* Generated Link Field */}
        <div className="bg-[#F7F5F2] border border-[#D9D2CA] rounded-xl p-3 flex flex-col min-[390px]:flex-row min-w-0 items-stretch min-[390px]:items-center justify-between gap-2">
          <span className="min-w-0 font-mono text-sm text-[#1E1E1C] break-all font-medium">
            {generatedUrl}
          </span>
          <button
            onClick={handleCopy}
            className="btn-accent min-h-11 px-3 gap-1 cursor-pointer shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
          </button>
        </div>

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
            className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-semibold h-[52px] rounded-xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>Share via WhatsApp</span>
          </button>
        </div>

        {/* PIN info note */}
        <div className="text-sm text-[#77736D] pt-3 border-t border-[#D9D2CA]/40 flex flex-wrap items-center justify-center gap-1.5 font-medium break-words">
          <Lock className="w-3.5 h-3.5 text-[#9B7B63]" />
          <span>Private RSVP Report PIN: <code className="bg-[#EFE7DF] px-1.5 py-0.5 rounded text-[#1E1E1C] font-mono font-bold">{activeInvitation?.privatePin || '1234'}</code></span>
        </div>
      </div>

      <div className="text-center pt-2">
        <button
          onClick={() => onNavigate('dashboard')}
          className="text-xs font-semibold text-[#9B7B63] hover:underline cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

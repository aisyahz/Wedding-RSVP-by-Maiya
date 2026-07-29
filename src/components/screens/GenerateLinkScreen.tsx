import React, { useEffect, useState } from 'react';
import { ScreenId, Invitation } from '../../types';
import { CheckCircle, Copy, Eye, Share2, Lock, ExternalLink } from 'lucide-react';
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
  const [isCopying, setIsCopying] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [reportCopied, setReportCopied] = useState(false);
  const [isCopyingReport, setIsCopyingReport] = useState(false);
  const [reportCopyError, setReportCopyError] = useState('');

  const slug = activeInvitation?.slug || '';
  const brideName = activeInvitation?.brideName || '';
  const groomName = activeInvitation?.groomName || '';
  const configuredPublicUrl = String((import.meta as any).env?.VITE_PUBLIC_SITE_URL || '').trim();
  const publicOrigin = configuredPublicUrl.startsWith('http')
    ? configuredPublicUrl.replace(/\/+$/, '')
    : window.location.origin.replace(/\/+$/, '');
  const generatedUrl = `${publicOrigin}/invite/${encodeURIComponent(slug)}`;
  const reportUrl = `${publicOrigin}/report/${encodeURIComponent(slug)}`;

  const handleCopy = async () => {
    if (isCopying || !generatedUrl) return;
    setIsCopying(true);
    setCopyError('');
    try {
      const success = await copyText(generatedUrl);
      if (!success) {
        setCopied(false);
        setCopyError('Pautan tidak dapat disalin. Sila pilih dan salin secara manual.');
        return;
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } finally {
      setIsCopying(false);
    }
  };

  const handleWhatsAppShare = () => {
    const text = `Assalamu’alaikum & Salam Sejahtera.\n\nKami berbesar hati menjemput Dato'/Datin/Tuan/Puan/Encik/Cik ke Majlis Perkahwinan ${brideName} & ${groomName}.\n\nSila klik pautan kad jemputan digital di bawah untuk maklumat lanjut & pengesahan RSVP:\n\n${generatedUrl}\n\nTerima kasih!`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleReportCopy = async () => {
    if (isCopyingReport || !reportUrl) return;
    setIsCopyingReport(true);
    setReportCopyError('');
    try {
      const success = await copyText(reportUrl);
      if (!success) {
        setReportCopied(false);
        setReportCopyError('Report link could not be copied. Please copy it manually.');
        return;
      }
      setReportCopied(true);
      window.setTimeout(() => setReportCopied(false), 2500);
    } finally {
      setIsCopyingReport(false);
    }
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

      <div className="card-maiya card-form space-y-7">
        <section className="space-y-4" aria-labelledby="invitation-link-heading">
          <div>
            <h2 id="invitation-link-heading" className="text-heading-3 text-primary">
              Invitation Link
            </h2>
            <p className="mt-1 text-xs text-secondary">
              Copy or share this public link with your guests.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-system bg-app">
            <div className="select-all break-all px-4 py-3 font-title text-sm font-medium text-primary">
              {generatedUrl}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={isCopying || !slug}
              aria-label="Copy invitation link"
              className="btn-accent w-full rounded-none border-x-0 border-b-0 cursor-pointer"
            >
              <Copy className="h-4 w-4" />
              <span>{isCopying ? 'Copying…' : copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <p aria-live="polite" className={`text-xs ${copyError ? 'text-error' : copied ? 'text-success' : 'sr-only'}`}>
            {copyError || (copied ? 'Invitation link copied.' : '')}
          </p>

          <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
            <button
              type="button"
              onClick={() => onNavigate('guest_opening')}
              className="w-full btn-primary cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="btn-secondary w-full cursor-pointer !border-[#25D366] !bg-[#25D366] hover:!border-[#20BA5A] hover:!bg-[#20BA5A]"
            >
              <Share2 className="w-4 h-4" />
              <span>Share via WhatsApp</span>
            </button>
          </div>
        </section>

        <section className="space-y-4 border-t border-system pt-7" aria-labelledby="private-report-heading">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-system bg-[#EFE7DF] text-accent">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h2 id="private-report-heading" className="text-heading-3 text-primary">
                Private RSVP Report
              </h2>
              <p className="mt-1 text-xs text-secondary">
                Keep this report link and PIN private.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-system bg-app">
            <div className="select-all break-all px-4 py-3 font-title text-sm font-medium text-primary">
              {reportUrl}
            </div>
            <button
              type="button"
              onClick={handleReportCopy}
              disabled={isCopyingReport || !slug}
              className="btn-outline w-full rounded-none border-x-0 border-b-0 cursor-pointer"
            >
              <Copy className="h-4 w-4" />
              <span>{isCopyingReport ? 'Copying…' : reportCopied ? 'Copied!' : 'Copy Report Link'}</span>
            </button>
          </div>
          <p aria-live="polite" className={`text-xs ${reportCopyError ? 'text-error' : reportCopied ? 'text-success' : 'sr-only'}`}>
            {reportCopyError || (reportCopied ? 'Private report link copied.' : '')}
          </p>

          <div className="flex items-center justify-between rounded-xl border border-system bg-[#EFE7DF]/60 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-secondary">PIN</span>
            <code className="font-title text-lg font-bold tabular-nums tracking-[0.18em] text-primary">
              {activeInvitation?.privatePin || '1234'}
            </code>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('private_rsvp_report')}
            className="btn-primary w-full cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open RSVP Report</span>
          </button>
        </section>
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

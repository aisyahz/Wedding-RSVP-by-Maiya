import React, { useEffect, useState } from 'react';
import { ScreenId, Invitation } from '../../types';
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
  Share2,
  Lock,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { copyText } from '../../lib/clipboard';
import { generateInvitationPin, getInvitationPin } from '../../lib/supabase';


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
  const [isPinVisible, setIsPinVisible] = useState(false);
  const [securityPin, setSecurityPin] = useState('');
  const [pinStatus, setPinStatus] = useState<'loading' | 'missing' | 'exists' | 'error'>('loading');
  const [pinStatusRefresh, setPinStatusRefresh] = useState(0);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [isGeneratingPin, setIsGeneratingPin] = useState(false);
  const [showRegenerateConfirmation, setShowRegenerateConfirmation] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);

  const slug = activeInvitation?.slug || '';
  const brideName = activeInvitation?.brideName || '';
  const groomName = activeInvitation?.groomName || '';
  const publicOrigin = window.location.origin.replace(/\/+$/, '');
  const generatedUrl = `${publicOrigin}/invite/${encodeURIComponent(slug)}`;
  const reportUrl = `${publicOrigin}/report/${encodeURIComponent(slug)}`;
  useEffect(() => {
    if (!activeInvitation?.id) {
      setPinStatus('error');
      setPinError('Invitation information is unavailable.');
      return;
    }

    setSecurityPin('');
    setPinStatus('loading');
    setPinError('');
    let cancelled = false;

    async function loadPin() {
      const result = await getInvitationPin(activeInvitation!.id);
      if (cancelled) return;
      if (result.error) {
        setPinStatus('error');
        setPinError(result.error);
        return;
      }
      setSecurityPin(result.plainPin || '');
      setPinStatus(result.hasPin ? 'exists' : 'missing');
    }

    void loadPin();
    return () => {
      cancelled = true;
    };
  }, [activeInvitation?.id, pinStatusRefresh]);

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

  const handlePinCopy = async () => {
    if (!securityPin) return;
    const success = await copyText(securityPin);
    setPinCopied(success);
    if (success) window.setTimeout(() => setPinCopied(false), 2500);
  };

  const handleGeneratePin = async (replaceExisting: boolean) => {
    if (!activeInvitation?.id || isGeneratingPin) return;
    setIsGeneratingPin(true);
    setPinError('');
    setPinSuccess('');
    try {
      const result = await generateInvitationPin(activeInvitation.id, replaceExisting);
      if (!result.plainPin || result.error) {
        setPinError(result.error || 'Unable to generate the security PIN.');
        return;
      }
      setSecurityPin(result.plainPin);
      setPinStatus('exists');
      setIsPinVisible(false);
      setPinSuccess(
        replaceExisting
          ? 'Security PIN regenerated successfully.'
          : 'Security PIN generated successfully.',
      );
      setShowRegenerateConfirmation(false);
    } finally {
      setIsGeneratingPin(false);
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
                Couple RSVP Dashboard
              </h2>
              <p className="mt-1 text-xs text-secondary">
                Only the bride and groom should have access to this dashboard.
              </p>
            </div>
          </div>

          {pinStatus === 'loading' && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-system bg-app p-5 text-sm text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking security PIN…</span>
            </div>
          )}

          {pinStatus === 'error' && (
            <div role="alert" className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="break-words">{pinError}</span>
              </div>
              <button
                type="button"
                onClick={() => setPinStatusRefresh((value) => value + 1)}
                className="btn-outline h-10 w-full cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          )}

          {pinStatus === 'missing' && (
            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>No security PIN has been generated for this invitation yet.</p>
              </div>
              {pinError && <p role="alert" className="text-xs text-rose-700">{pinError}</p>}
              <button
                type="button"
                onClick={() => void handleGeneratePin(false)}
                disabled={isGeneratingPin}
                className="btn-primary w-full cursor-pointer"
              >
                {isGeneratingPin ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                <span>{isGeneratingPin ? 'Generating PIN…' : 'Generate 6-Digit PIN'}</span>
              </button>
            </div>
          )}

          {pinStatus === 'exists' && (
            <>
              {pinSuccess && (
                <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                  {pinSuccess}
                </p>
              )}
              {pinError && <p role="alert" className="text-sm text-rose-700">{pinError}</p>}

              <div className="overflow-hidden rounded-xl border border-system bg-app">
                <div className="select-all break-all px-4 py-3 font-title text-sm font-medium text-primary">
                  {reportUrl}
                </div>
                <button
                  type="button"
                  onClick={handleReportCopy}
                  disabled={isCopyingReport || !slug}
                  aria-label="Copy private RSVP dashboard link"
                  className="btn-outline w-full rounded-none border-x-0 border-b-0 cursor-pointer"
                >
                  <Copy className="h-4 w-4" />
                  <span>{isCopyingReport ? 'Copying…' : reportCopied ? 'Copied!' : 'Copy Dashboard Link'}</span>
                </button>
              </div>
              <p aria-live="polite" className={`text-xs ${reportCopyError ? 'text-error' : reportCopied ? 'text-success' : 'sr-only'}`}>
                {reportCopyError || (reportCopied ? 'Private dashboard link copied.' : '')}
              </p>

              <div className="space-y-3 rounded-xl border border-system bg-[#EFE7DF]/60 p-4">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-secondary">Security PIN</span>
                    <code className="mt-1 block min-h-6 break-all font-title text-lg font-bold tabular-nums tracking-[0.18em] text-primary">
                      {securityPin ? isPinVisible ? securityPin : '••••••' : '••••••'}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPinVisible((visible) => !visible)}
                    aria-label={isPinVisible ? 'Hide security PIN' : 'View security PIN'}
                    aria-pressed={isPinVisible}
                    className="btn-ghost h-10 shrink-0 px-3 text-xs cursor-pointer"
                  >
                    {isPinVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span>{isPinVisible ? 'Hide PIN' : 'View PIN'}</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void handlePinCopy()}
                  aria-label="Copy security PIN"
                  className="btn-outline h-10 w-full cursor-pointer"
                >
                  <Copy className="h-4 w-4" />
                  <span>{pinCopied ? 'PIN Copied!' : 'Copy PIN'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('private_rsvp_report')}
                className="btn-primary w-full cursor-pointer"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open RSVP Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRegenerateConfirmation(true)}
                className="btn-ghost w-full cursor-pointer text-xs"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Regenerate PIN</span>
              </button>
            </>
          )}
        </section>
      </div>

      {showRegenerateConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="regenerate-pin-title" className="w-full max-w-sm rounded-2xl border border-system bg-white p-5 shadow-2xl">
            <h2 id="regenerate-pin-title" className="text-heading-3 text-primary">Regenerate Security PIN?</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              The current PIN will stop working immediately. The couple will need to use the newly generated PIN.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowRegenerateConfirmation(false)}
                disabled={isGeneratingPin}
                className="btn-outline cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleGeneratePin(true)}
                disabled={isGeneratingPin}
                className="btn-primary cursor-pointer"
              >
                {isGeneratingPin && <Loader2 className="h-4 w-4 animate-spin" />}
                Regenerate PIN
              </button>
            </div>
          </div>
        </div>
      )}

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

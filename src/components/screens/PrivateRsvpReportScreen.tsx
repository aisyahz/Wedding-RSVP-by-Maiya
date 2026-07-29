import React, { useState } from 'react';
import { ScreenId, Invitation, RsvpEntry } from '../../types';
import { Lock, Download, ArrowLeft, ShieldAlert, KeyRound, Loader2 } from 'lucide-react';
import { getPrivateCoupleRsvpReport } from '../../lib/supabase';

interface PrivateRsvpReportScreenProps {
  onNavigate: (screen: ScreenId) => void;
  activeInvitation: Invitation | null;
  rsvps?: RsvpEntry[];
}

export const PrivateRsvpReportScreen: React.FC<PrivateRsvpReportScreenProps> = ({
  onNavigate,
  activeInvitation,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [reportData, setReportData] = useState<RsvpEntry[]>([]);
  const [reportBride, setReportBride] = useState(activeInvitation?.brideName || '');
  const [reportGroom, setReportGroom] = useState(activeInvitation?.groomName || '');

  const slug = activeInvitation?.slug || '';
  const brideName = reportBride || activeInvitation?.brideName || 'Pengantin';
  const groomName = reportGroom || activeInvitation?.groomName || 'Pengantin';

  const attendingRsvps = reportData.filter((r) => r.attendance === 'attending');
  const totalPax = attendingRsvps.reduce((acc, r) => acc + r.pax, 0);

  const handleUnlockPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setErrorMessage('');

    if (!slug) {
      setErrorMessage('Pautan kad jemputan tidak ditemui.');
      setIsVerifying(false);
      return;
    }

    const {
      data,
      brideName: bName,
      groomName: gName,
      error,
      errorCode,
    } = await getPrivateCoupleRsvpReport(slug, pinInput);

    setIsVerifying(false);

    if (error) {
      const friendlyMessages = {
        no_pin: 'A security PIN has not been generated for this invitation. Please contact the invitation administrator.',
        invalid_pin: 'PIN tidak sah. Sila semak dan cuba lagi. / Invalid PIN. Please check and try again.',
        not_found: 'Invitation not found.',
        system: 'Unable to verify the PIN right now. Please try again.',
      } as const;
      setErrorMessage(errorCode ? friendlyMessages[errorCode] : error);
    } else {
      setReportData(data);
      if (bName) setReportBride(bName);
      if (gName) setReportGroom(gName);
      setIsUnlocked(true);
      setErrorMessage('');
    }
  };

  const handleDownloadCsv = () => {
    const headers = 'Guest Name,Attendance,Pax,Wishes,Submitted At\n';
    const rows = reportData
      .map(
        (r) =>
          `"${r.guestName.replace(/"/g, '""')}",${r.attendance},${r.pax},"${(r.wishes || '').replace(/"/g, '""')}",${r.submittedAt}`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RSVP_Report_${brideName}_and_${groomName}.csv`;
    a.click();
  };

  // State 1: Locked PIN Verification Screen
  if (!isUnlocked) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-md space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="relative rounded-2xl border border-system bg-white px-4 py-5 text-center shadow-2xs sm:p-5">
          <button
            type="button"
            onClick={() => onNavigate('guest_invitation')}
            aria-label="Kembali ke kad jemputan"
            className="absolute left-3 top-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-system bg-app text-primary transition-all hover:bg-[#EFE7DF] sm:left-5 sm:top-5 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="px-9">
            <span className="text-caption uppercase font-semibold text-accent tracking-wider block">
              Akses Pengantin
            </span>
            <h1 className="mt-1 text-title leading-tight text-primary">
              Laporan RSVP Sulit
            </h1>
          </div>
        </div>

        {/* PIN Form Card */}
        <form onSubmit={handleUnlockPin} className="card-maiya space-y-5 px-4 py-6 text-center sm:p-7">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-system bg-[#EFE7DF] text-accent">
            <KeyRound className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-heading-3 leading-tight text-primary">
              Akses Laporan RSVP
            </h2>
            <p className="mx-auto max-w-xs text-xs leading-relaxed text-secondary">
              Masukkan PIN keselamatan untuk melihat laporan RSVP tetamu.
            </p>
            <p className="pt-1 break-words font-title text-sm font-bold leading-snug text-primary">
              {brideName} & {groomName}
            </p>
          </div>

          {errorMessage && (
            <div role="alert" aria-live="assertive" className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold flex items-start justify-center gap-2 text-left">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="mx-auto w-full max-w-xs">
            <label htmlFor="private-rsvp-pin" className="form-label block">
              6-Digit Security PIN
            </label>
            <input
              id="private-rsvp-pin"
              name="security-pin"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              className="input-maiya w-full px-3 text-center font-title text-xl tabular-nums tracking-[0.35em] sm:tracking-[0.5em]"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying}
            className="btn-primary mx-auto flex w-full max-w-xs cursor-pointer items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Mengesahkan PIN...</span>
              </>
            ) : (
              <span>Buka Laporan RSVP</span>
            )}
          </button>
        </form>
      </div>
    );
  }

  // State 2: Unlocked Read-Only Dashboard
  return (
    <div className="mx-auto w-full min-w-0 max-w-xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-system bg-white p-4 shadow-2xs sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsUnlocked(false)}
            aria-label="Kunci semula laporan RSVP"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-system bg-app text-primary transition-all hover:bg-[#EFE7DF] sm:h-10 sm:w-10"
            title="Kunci Semula"
          >
            <Lock className="w-4 h-4" />
          </button>

          <span className="text-caption uppercase font-semibold text-accent tracking-wider block">
            Akses Pengantin • Sulit
          </span>
          <button
            type="button"
            onClick={handleDownloadCsv}
            aria-label="Muat turun laporan CSV"
            className="btn-accent h-9 shrink-0 cursor-pointer gap-1 px-3 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
        <div className="mt-4 border-t border-system/60 pt-4 text-center">
          <h1 className="text-title leading-tight text-primary">Laporan RSVP</h1>
          <p className="mt-1 break-words font-title text-sm font-semibold leading-snug text-secondary">
            {brideName} & {groomName}
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <div className="card-maiya px-3 py-4 text-center sm:p-5">
          <span className="text-caption uppercase font-semibold text-secondary tracking-wider block">
            Respon Hadir
          </span>
          <span className="mt-1 block text-2xl font-bold text-primary sm:text-heading-1">
            {attendingRsvps.length}
          </span>
        </div>

        <div className="card-maiya px-3 py-4 text-center sm:p-5">
          <span className="text-caption uppercase font-semibold text-secondary tracking-wider block">
            Jumlah Pax Hadir
          </span>
          <span className="mt-1 block text-2xl font-bold text-accent sm:text-heading-1">
            {totalPax} Pax
          </span>
        </div>
      </div>

      {/* Guest Responses List */}
      <div className="card-maiya space-y-3 p-4 sm:p-5">
        <h2 className="text-title text-primary border-b border-system/40 pb-2">
          Senarai Tetamu ({reportData.length})
        </h2>

        <div className="space-y-2.5">
          {reportData.length === 0 ? (
            <p className="text-xs text-secondary italic text-center py-6">
              Tiada rekod RSVP setakat ini.
            </p>
          ) : (
            reportData.map((rsvp) => (
              <div
                key={rsvp.id}
                className="flex min-w-0 flex-col gap-3 rounded-xl border border-system bg-app p-3.5 text-sm min-[390px]:flex-row min-[390px]:items-start min-[390px]:justify-between"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex min-w-0 items-start gap-2">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        rsvp.attendance === 'attending' ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    />
                    <span className="min-w-0 font-bold text-primary break-words [overflow-wrap:anywhere]">{rsvp.guestName}</span>
                  </div>
                  {rsvp.wishes && (
                    <p className="text-secondary italic text-sm break-words [overflow-wrap:anywhere]">
                      “{rsvp.wishes}”
                    </p>
                  )}
                </div>

                <span
                  className={`self-start max-w-full px-2.5 py-0.5 rounded-full text-xs font-bold uppercase whitespace-normal ${
                    rsvp.attendance === 'attending'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {rsvp.attendance === 'attending' ? `${rsvp.pax} Pax` : 'Tidak Hadir'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-1">
        <button
          type="button"
          onClick={handleDownloadCsv}
          className="btn-outline w-full cursor-pointer"
        >
          <Download className="w-4 h-4 text-accent" />
          <span>Muat Turun Laporan CSV</span>
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => onNavigate('guest_invitation')}
            className="text-xs font-semibold text-accent hover:underline cursor-pointer"
          >
            Kembali ke Kad Jemputan Tetamu
          </button>
        </div>
      </div>
    </div>
  );
};

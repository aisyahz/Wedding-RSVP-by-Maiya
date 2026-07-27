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

    const { data, brideName: bName, groomName: gName, error } = await getPrivateCoupleRsvpReport(slug, pinInput);

    setIsVerifying(false);

    if (error) {
      setErrorMessage(error);
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
    <div className="max-w-md min-w-0 w-full mx-auto space-y-4 min-[360px]:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-system shadow-2xs">
          <button
            onClick={() => onNavigate('guest_invitation')}
            className="w-10 h-10 rounded-xl bg-app hover:bg-[#EFE7DF] text-primary flex items-center justify-center cursor-pointer transition-all border border-system"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <span className="text-caption uppercase font-semibold text-accent tracking-wider block">
              Akses Pengantin
            </span>
            <h1 className="text-title text-primary">
              Laporan RSVP Sulit
            </h1>
          </div>

          <div className="w-10" />
        </div>

        {/* PIN Form Card */}
        <form onSubmit={handleUnlockPin} className="card-maiya card-form space-y-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#EFE7DF] text-accent flex items-center justify-center mx-auto border border-system">
            <KeyRound className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-heading-3 text-primary">
              Pengesahan PIN Pengantin
            </h2>
            <p className="text-xs text-secondary mt-1">
              Masukkan 6-digit PIN keselamatan untuk melihat laporan RSVP <strong className="text-primary">{brideName} & {groomName}</strong>
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="form-label block">
              6-Digit Security PIN
            </label>
            <input
              type="password"
              maxLength={6}
              required
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••••"
              className="w-full text-center tracking-[0.5em] font-title tabular-nums text-xl input-maiya"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full btn-primary cursor-pointer flex items-center justify-center gap-2"
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
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-system shadow-2xs">
        <button
          onClick={() => setIsUnlocked(false)}
          className="w-10 h-10 rounded-xl bg-app hover:bg-[#EFE7DF] text-primary flex items-center justify-center cursor-pointer transition-all border border-system"
          title="Kunci Semula"
        >
          <Lock className="w-4 h-4" />
        </button>

        <div className="text-center">
          <span className="text-caption uppercase font-semibold text-accent tracking-wider block">
            Akses Pengantin • Sulit
          </span>
          <h1 className="text-title text-primary">
            Laporan RSVP ({brideName} & {groomName})
          </h1>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="btn-accent h-9 px-3 text-xs gap-1 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>CSV</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-maiya p-5 text-center">
          <span className="text-caption uppercase font-semibold text-secondary tracking-wider block">
            Respon Hadir
          </span>
          <span className="text-heading-1 text-primary mt-1 block">
            {attendingRsvps.length}
          </span>
        </div>

        <div className="card-maiya p-5 text-center">
          <span className="text-caption uppercase font-semibold text-secondary tracking-wider block">
            Jumlah Pax Hadir
          </span>
          <span className="text-heading-1 text-accent mt-1 block">
            {totalPax} Pax
          </span>
        </div>
      </div>

      {/* Guest Responses List */}
      <div className="card-maiya p-5 space-y-3">
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
                className="flex min-w-0 flex-col min-[360px]:flex-row min-[360px]:items-start justify-between gap-2 bg-app p-3.5 rounded-xl border border-system text-sm"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex min-w-0 items-start gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
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
          onClick={handleDownloadCsv}
          className="btn-outline w-full cursor-pointer"
        >
          <Download className="w-4 h-4 text-accent" />
          <span>Muat Turun Laporan CSV</span>
        </button>

        <div className="text-center">
          <button
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

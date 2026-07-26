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
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-[#D9D2CA] shadow-2xs">
          <button
            onClick={() => onNavigate('guest_invitation')}
            className="w-10 h-10 rounded-xl bg-[#F7F5F2] hover:bg-[#EFE7DF] text-[#1E1E1C] flex items-center justify-center cursor-pointer transition-all border border-[#D9D2CA]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <span className="text-[10px] uppercase font-semibold text-[#9B7B63] tracking-wider block">
              Akses Pengantin
            </span>
            <h1 className="font-title text-base font-bold text-[#1E1E1C]">
              Laporan RSVP Sulit
            </h1>
          </div>

          <div className="w-10" />
        </div>

        {/* PIN Form Card */}
        <form onSubmit={handleUnlockPin} className="card-maiya p-6 sm:p-8 space-y-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#EFE7DF] text-[#9B7B63] flex items-center justify-center mx-auto border border-[#D9D2CA]">
            <KeyRound className="w-6 h-6" />
          </div>

          <div>
            <h2 className="font-title text-lg font-bold text-[#1E1E1C]">
              Pengesahan PIN Pengantin
            </h2>
            <p className="text-xs text-[#77736D] mt-1">
              Masukkan 6-digit PIN keselamatan untuk melihat laporan RSVP <strong className="text-[#1E1E1C]">{brideName} & {groomName}</strong>
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
              6-Digit Security PIN
            </label>
            <input
              type="password"
              maxLength={6}
              required
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••••"
              className="w-full text-center tracking-[0.5em] font-mono text-xl input-maiya"
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
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-[#D9D2CA] shadow-2xs">
        <button
          onClick={() => setIsUnlocked(false)}
          className="w-10 h-10 rounded-xl bg-[#F7F5F2] hover:bg-[#EFE7DF] text-[#1E1E1C] flex items-center justify-center cursor-pointer transition-all border border-[#D9D2CA]"
          title="Kunci Semula"
        >
          <Lock className="w-4 h-4" />
        </button>

        <div className="text-center">
          <span className="text-[10px] uppercase font-semibold text-[#9B7B63] tracking-wider block">
            Akses Pengantin • Sulit
          </span>
          <h1 className="font-title text-base font-bold text-[#1E1E1C]">
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
          <span className="text-[10px] uppercase font-semibold text-[#77736D] tracking-wider block">
            Respon Hadir
          </span>
          <span className="font-title text-2xl font-bold text-[#1E1E1C] mt-1 block">
            {attendingRsvps.length}
          </span>
        </div>

        <div className="card-maiya p-5 text-center">
          <span className="text-[10px] uppercase font-semibold text-[#77736D] tracking-wider block">
            Jumlah Pax Hadir
          </span>
          <span className="font-title text-2xl font-bold text-[#9B7B63] mt-1 block">
            {totalPax} Pax
          </span>
        </div>
      </div>

      {/* Guest Responses List */}
      <div className="card-maiya p-5 space-y-3">
        <h2 className="font-title text-base font-bold text-[#1E1E1C] border-b border-[#D9D2CA]/40 pb-2">
          Senarai Tetamu ({reportData.length})
        </h2>

        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
          {reportData.length === 0 ? (
            <p className="text-xs text-[#77736D] italic text-center py-6">
              Tiada rekod RSVP setakat ini.
            </p>
          ) : (
            reportData.map((rsvp) => (
              <div
                key={rsvp.id}
                className="flex justify-between items-center bg-[#F7F5F2] p-3.5 rounded-xl border border-[#D9D2CA] text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        rsvp.attendance === 'attending' ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    />
                    <span className="font-bold text-[#1E1E1C]">{rsvp.guestName}</span>
                  </div>
                  {rsvp.wishes && (
                    <p className="text-[#77736D] italic text-[11px] truncate max-w-[220px]">
                      "{rsvp.wishes}"
                    </p>
                  )}
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
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
          className="w-full btn-outline h-[52px] text-xs gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#9B7B63]" />
          <span>Muat Turun Laporan CSV</span>
        </button>

        <div className="text-center">
          <button
            onClick={() => onNavigate('guest_invitation')}
            className="text-xs font-semibold text-[#9B7B63] hover:underline cursor-pointer"
          >
            Kembali ke Kad Jemputan Tetamu
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { ScreenId, SystemSettings } from '../../types';
import { Building, Phone, HardDrive, Clock, LogOut, Save, ShieldCheck, Info, Sheet, ExternalLink } from 'lucide-react';
import { googleSheetsSyncProvider } from '../../lib/rsvpSyncProvider';

interface SettingsScreenProps {
  currentScreen?: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onLogout,
}) => {
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  const [defaultExpiryDays, setDefaultExpiryDays] = useState(settings.defaultExpiryDays);
  const [googleSheetsSyncEnabled, setGoogleSheetsSyncEnabled] = useState(Boolean(settings.googleSheetsSyncEnabled));
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      businessName,
      tagline,
      whatsappNumber,
      defaultExpiryDays: Number(defaultExpiryDays),
      googleSheetsSyncEnabled,
      googleSheetsConnectionStatus: googleSheetsSyncProvider.isConfigured ? 'ready' : 'not_connected',
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const storagePercentage = Math.round((settings.storageUsedMb / settings.storageLimitMb) * 100);

  return (
    <div className="max-w-2xl min-w-0 w-full mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-4 min-[360px]:p-6 rounded-2xl border border-[#D9D2CA] shadow-2xs flex flex-col min-[390px]:flex-row min-[390px]:items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1E1E1C] text-white font-title font-bold flex items-center justify-center text-xl shadow-xs">
            M
          </div>
          <div className="min-w-0">
            <h1 className="font-title text-lg font-bold text-[#1E1E1C]">
              Brand Settings
            </h1>
            <p className="text-sm text-[#77736D]">
              Manage the business identity and default invitation preferences.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#9B7B63] bg-[#EFE7DF] px-3 py-1 rounded-full border border-[#D9D2CA]">
          <ShieldCheck className="w-4 h-4" />
          <span>Admin</span>
        </span>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="card-maiya p-4 min-[360px]:p-6 md:p-8 space-y-5">
        <div className="flex items-center justify-between border-b border-[#D9D2CA]/40 pb-3">
          <h2 className="font-title text-base font-bold text-[#1E1E1C]">
            Brand Configuration
          </h2>
          {isSaved && (
            <span className="text-xs text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full font-semibold border border-emerald-200">
              Settings Saved
            </span>
          )}
        </div>

        <div>
          <label htmlFor="business-name" className="flex items-center gap-1.5 text-sm font-semibold text-[#1E1E1C] mb-1.5">
            Business display name
            <Info title="Shown as the admin brand name. This does not change invitation couple names." className="h-4 w-4 text-[#77736D]" aria-label="Business name information" />
          </label>
          <div className="relative">
            <input
              type="text"
              id="business-name"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full input-maiya pl-10"
              placeholder="Example: Digital Card by Maiya"
              aria-describedby="business-name-help"
            />
            <Building className="w-4 h-4 text-[#77736D] absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
          <p id="business-name-help" className="mt-1.5 text-sm leading-relaxed text-[#77736D]">The name staff see throughout the administration area.</p>
        </div>

        <div>
          <label htmlFor="brand-tagline" className="flex items-center gap-1.5 text-sm font-semibold text-[#1E1E1C] mb-1.5">
            Brand tagline
            <Info title="A short supporting phrase for your wedding invitation service." className="h-4 w-4 text-[#77736D]" aria-label="Brand tagline information" />
          </label>
          <input
            id="brand-tagline"
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full input-maiya"
            placeholder="Example: Elegant invitations, beautifully shared"
            aria-describedby="brand-tagline-help"
          />
          <p id="brand-tagline-help" className="mt-1.5 text-sm leading-relaxed text-[#77736D]">Keep it concise—around 40–60 characters works best.</p>
        </div>

        <div>
          <label htmlFor="support-whatsapp" className="flex items-center gap-1.5 text-sm font-semibold text-[#1E1E1C] mb-1.5">
            Customer support WhatsApp
            <Info title="Used when administrators or customers need help. It is separate from invitation contacts." className="h-4 w-4 text-[#77736D]" aria-label="Support WhatsApp information" />
          </label>
          <div className="relative">
            <input
              type="text"
              id="support-whatsapp"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full input-maiya pl-10"
              placeholder="Example: +60123456789"
              inputMode="tel"
              aria-describedby="support-whatsapp-help"
            />
            <Phone className="w-4 h-4 text-[#77736D] absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
          <p id="support-whatsapp-help" className="mt-1.5 text-sm leading-relaxed text-[#77736D]">Include the country code and omit spaces where possible.</p>
        </div>

        <div>
          <label htmlFor="default-expiry" className="flex items-center gap-1.5 text-sm font-semibold text-[#1E1E1C] mb-1.5">
            Default invitation link expiry
            <Info title="Sets the suggested active period for new invitations. Existing invitations are unchanged." className="h-4 w-4 text-[#77736D]" aria-label="Link expiry information" />
          </label>
          <div className="relative">
            <input
              type="number"
              id="default-expiry"
              min={1}
              max={365}
              value={defaultExpiryDays}
              onChange={(e) => setDefaultExpiryDays(Number(e.target.value))}
              className="w-full input-maiya pl-10"
              placeholder="Example: 30"
              aria-describedby="default-expiry-help"
            />
            <Clock className="w-4 h-4 text-[#77736D] absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
          <p id="default-expiry-help" className="mt-1.5 text-sm leading-relaxed text-[#77736D]">Number of days a newly generated invitation link should remain active.</p>
        </div>

        <div className="pt-2">
          <button type="submit" className="w-full btn-primary cursor-pointer">
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      <section className="card-maiya p-4 min-[360px]:p-6 space-y-4" aria-labelledby="google-sheets-heading">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Sheet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="google-sheets-heading" className="font-title text-base font-bold text-[#1E1E1C]">Google Sheets RSVP sync</h2>
              <p className="mt-1 text-sm leading-relaxed text-[#77736D]">Append Guest Name, Attendance, Pax, Message, Timestamp, and Status after each successful RSVP.</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Setup required</span>
        </div>

        <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-[#D9D2CA] bg-[#F7F5F2] p-3">
          <span>
            <span className="block text-sm font-semibold text-[#1E1E1C]">Sync RSVP to Google Sheets</span>
            <span className="mt-0.5 block text-sm text-[#77736D]">Your preference is saved; syncing starts after a secure Google connection is configured.</span>
          </span>
          <input
            type="checkbox"
            checked={googleSheetsSyncEnabled}
            onChange={(event) => {
              const enabled = event.target.checked;
              setGoogleSheetsSyncEnabled(enabled);
              onUpdateSettings({
                ...settings,
                businessName,
                tagline,
                whatsappNumber,
                defaultExpiryDays: Number(defaultExpiryDays),
                googleSheetsSyncEnabled: enabled,
                googleSheetsConnectionStatus: googleSheetsSyncProvider.isConfigured ? 'ready' : 'not_connected',
              });
            }}
            className="h-6 w-6 shrink-0 cursor-pointer rounded text-[#9B7B63]"
          />
        </label>

        <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm leading-relaxed text-blue-900">
          The integration boundary is ready, but Google authorization is intentionally not handled in the browser. A secure server-side adapter can be connected later without replacing the RSVP dashboard or submission flow.
        </div>
        <button type="button" disabled className="btn-outline w-full cursor-not-allowed opacity-60" title="Available after the secure Google integration is configured">
          <ExternalLink className="h-4 w-4" /> Connect Google Sheet
        </button>
      </section>

      {/* Cloud Storage CDN Metric */}
      <div className="card-maiya p-4 min-[360px]:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#1E1E1C] flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#9B7B63]" />
            <span>Cloud Video CDN Storage</span>
          </span>
          <span className="text-xs font-mono font-bold text-[#77736D]">
            {settings.storageUsedMb} MB / {settings.storageLimitMb} MB
          </span>
        </div>

        <div className="w-full h-2.5 bg-[#EFE7DF] rounded-full overflow-hidden p-0.5 border border-[#D9D2CA]">
          <div
            className="h-full bg-[#9B7B63] rounded-full transition-all duration-300"
            style={{ width: `${storagePercentage}%` }}
          />
        </div>
        <p className="text-xs text-[#77736D]">
          {storagePercentage}% storage consumed. High-speed video edge server network active for instant MP4 video playback.
        </p>
      </div>

      {/* Logout */}
      <div className="pt-2">
        <button
          onClick={onLogout}
          className="w-full h-[52px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl border border-rose-200 flex items-center justify-center gap-2 text-xs transition-all cursor-pointer shadow-xs"
        >
          <LogOut className="w-4 h-4 text-rose-600" />
          <span>Sign Out Admin Account</span>
        </button>
      </div>
    </div>
  );
};

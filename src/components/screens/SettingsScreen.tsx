import React, { useState } from 'react';
import { AlertCircle, Check, ExternalLink, HardDrive, Loader2, LogOut, Save, Settings, Sheet } from 'lucide-react';
import { ScreenId, SystemSettings } from '../../types';
import { googleSheetsSyncProvider } from '../../lib/rsvpSyncProvider';

interface SettingsScreenProps {
  currentScreen?: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void;
  isLoading?: boolean;
  loadError?: string;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onLogout,
  isLoading = false,
  loadError = '',
}) => {
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  const [defaultExpiryDays, setDefaultExpiryDays] = useState(settings.defaultExpiryDays);
  const [googleSheetsSyncEnabled, setGoogleSheetsSyncEnabled] = useState(Boolean(settings.googleSheetsSyncEnabled));
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  React.useEffect(() => {
    setBusinessName(settings.businessName);
    setTagline(settings.tagline);
    setWhatsappNumber(settings.whatsappNumber);
    setDefaultExpiryDays(settings.defaultExpiryDays);
    setGoogleSheetsSyncEnabled(Boolean(settings.googleSheetsSyncEnabled));
  }, [settings]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving || isLoading) return;

    setIsSaving(true);
    setIsSaved(false);
    setSaveError('');
    const result = await onUpdateSettings({
      ...settings,
      businessName,
      tagline,
      whatsappNumber,
      defaultExpiryDays: Number(defaultExpiryDays),
      googleSheetsSyncEnabled,
      googleSheetsConnectionStatus: googleSheetsSyncProvider.isConfigured ? 'ready' : 'not_connected',
    });
    setIsSaving(false);
    if (!result.success) {
      setSaveError(result.error || 'Settings could not be saved. Please try again.');
      return;
    }
    setIsSaved(true);
    window.setTimeout(() => setIsSaved(false), 2500);
  };

  const storagePercentage = Math.round((settings.storageUsedMb / settings.storageLimitMb) * 100);

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl space-y-5 pb-2">
      <header className="px-1 pt-1">
        <div className="flex items-center gap-2.5">
          <Settings className="h-5 w-5 text-accent" aria-hidden="true" />
          <h1 className="text-heading-2 tracking-tight text-primary">Settings</h1>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-secondary">
          Manage your brand and invitation preferences.
        </p>
      </header>

      {isLoading && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-system bg-white p-3 text-sm text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading saved settings…</span>
        </div>
      )}

      {loadError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Supabase settings could not be loaded. Showing cached values. {loadError}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="overflow-hidden rounded-xl border border-system bg-white">
        <section className="space-y-4 p-4 min-[390px]:p-5" aria-labelledby="brand-configuration-heading">
          <div className="flex min-h-7 items-center justify-between gap-3">
            <h2 id="brand-configuration-heading" className="text-title text-primary">
              Brand Configuration
            </h2>
            {isSaved && (
              <span role="status" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <Check className="h-4 w-4" /> Saved
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="business-name" className="block text-sm font-semibold text-primary">
              Business Display Name
            </label>
            <input
              id="business-name"
              type="text"
              required
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              className="input-maiya w-full"
              placeholder="Digital Card by Maiya"
              aria-describedby="business-name-help"
            />
            <p id="business-name-help" className="text-xs leading-relaxed text-secondary">
              Displayed throughout the admin portal.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="brand-tagline" className="block text-sm font-semibold text-primary">
              Brand Tagline
            </label>
            <input
              id="brand-tagline"
              type="text"
              value={tagline}
              onChange={(event) => setTagline(event.target.value)}
              className="input-maiya w-full"
              placeholder="Elegant invitations, beautifully shared"
              aria-describedby="brand-tagline-help"
            />
            <p id="brand-tagline-help" className="text-xs leading-relaxed text-secondary">
              A short phrase that represents your service.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="support-whatsapp" className="block text-sm font-semibold text-primary">
              Support WhatsApp
            </label>
            <input
              id="support-whatsapp"
              type="tel"
              inputMode="tel"
              value={whatsappNumber}
              onChange={(event) => setWhatsappNumber(event.target.value)}
              className="input-maiya w-full"
              placeholder="+60123456789"
              aria-describedby="support-whatsapp-help"
            />
            <p id="support-whatsapp-help" className="text-xs leading-relaxed text-secondary">
              Include the country code.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="default-expiry" className="block text-sm font-semibold text-primary">
              Default Link Expiry
            </label>
            <div className="relative">
              <input
                id="default-expiry"
                type="number"
                min={1}
                max={365}
                value={defaultExpiryDays}
                onChange={(event) => setDefaultExpiryDays(Number(event.target.value))}
                className="input-maiya w-full !pr-16"
                placeholder="30"
                aria-describedby="default-expiry-help"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-secondary">
                days
              </span>
            </div>
            <p id="default-expiry-help" className="text-xs leading-relaxed text-secondary">
              Applied to newly generated invitation links.
            </p>
          </div>
        </section>

        <div className="border-t border-system bg-white p-3 min-[390px]:p-4">
          {saveError && (
            <p role="alert" className="mb-3 flex items-start gap-2 text-xs font-semibold text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{saveError}</span>
            </p>
          )}
          <button type="submit" disabled={isSaving || isLoading} className="btn-primary w-full cursor-pointer">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{isSaving ? 'Saving Settings…' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-xl border border-system bg-white" aria-labelledby="google-sheets-heading">
        <div className="flex items-start gap-3 p-4 min-[390px]:p-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Sheet className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="google-sheets-heading" className="font-title text-sm font-bold text-primary">
                Google Sheets RSVP Sync
              </h2>
              <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                Setup required
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-secondary">
              Add successful RSVP responses to a connected sheet.
            </p>
          </div>
        </div>

        <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 border-t border-[#E8E3DE] px-4 py-3 min-[390px]:px-5">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-primary">Enable RSVP sync</span>
            <span className="block text-xs text-secondary">Starts after Google is connected.</span>
          </span>
          <input
            type="checkbox"
            checked={googleSheetsSyncEnabled}
            onChange={(event) => setGoogleSheetsSyncEnabled(event.target.checked)}
            className="h-6 w-6 shrink-0 rounded text-accent"
          />
        </label>

        <div className="border-t border-[#E8E3DE] p-3 min-[390px]:p-4">
          <button type="button" disabled className="btn-outline w-full cursor-not-allowed opacity-60" title="Available after secure Google integration is configured">
            <ExternalLink className="h-4 w-4" /> Connect Google Sheet
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-system bg-white p-4 min-[390px]:p-5" aria-labelledby="storage-heading">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h2 id="storage-heading" className="flex min-w-0 items-center gap-2 text-sm font-bold text-primary">
            <HardDrive className="h-[18px] w-[18px] shrink-0 text-accent" />
            Video Storage
          </h2>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-secondary">
            {settings.storageUsedMb} / {settings.storageLimitMb} MB
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EFE7DF]">
          <div className="h-full rounded-full bg-[#9B7B63] transition-all duration-300" style={{ width: `${storagePercentage}%` }} />
        </div>
        <p className="mt-2 text-xs text-secondary">{storagePercentage}% used</p>
      </section>

      <button
        type="button"
        onClick={onLogout}
        className="btn-ghost w-full !text-[var(--color-error)]"
      >
        <LogOut className="h-[18px] w-[18px]" />
        <span>Sign Out</span>
      </button>
    </div>
  );
};

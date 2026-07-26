import React, { useState } from 'react';
import { ScreenId, SystemSettings } from '../../types';
import { Building, Phone, HardDrive, Clock, LogOut, Save, ShieldCheck } from 'lucide-react';

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
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      businessName,
      tagline,
      whatsappNumber,
      defaultExpiryDays: Number(defaultExpiryDays),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const storagePercentage = Math.round((settings.storageUsedMb / settings.storageLimitMb) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#D9D2CA] shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1E1E1C] text-white font-title font-bold flex items-center justify-center text-xl shadow-xs">
            M
          </div>
          <div>
            <h1 className="font-title text-lg font-bold text-[#1E1E1C]">
              Brand Settings
            </h1>
            <p className="text-xs text-[#77736D]">
              System Configuration & Storage Engine
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#9B7B63] bg-[#EFE7DF] px-3 py-1 rounded-full border border-[#D9D2CA]">
          <ShieldCheck className="w-4 h-4" />
          <span>Admin</span>
        </span>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="card-maiya p-6 md:p-8 space-y-5">
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
          <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
            Business Name
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full input-maiya pl-10"
            />
            <Building className="w-4 h-4 text-[#77736D] absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
            Brand Tagline
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full input-maiya"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
            Support WhatsApp Number
          </label>
          <div className="relative">
            <input
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full input-maiya pl-10"
            />
            <Phone className="w-4 h-4 text-[#77736D] absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
            Default Link Expiry (Days)
          </label>
          <div className="relative">
            <input
              type="number"
              value={defaultExpiryDays}
              onChange={(e) => setDefaultExpiryDays(Number(e.target.value))}
              className="w-full input-maiya pl-10"
            />
            <Clock className="w-4 h-4 text-[#77736D] absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" className="w-full btn-primary cursor-pointer">
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Cloud Storage CDN Metric */}
      <div className="card-maiya p-6 space-y-3">
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

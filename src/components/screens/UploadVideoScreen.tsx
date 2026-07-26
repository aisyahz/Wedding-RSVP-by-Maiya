import React, { useState } from 'react';
import { ScreenId, Invitation } from '../../types';
import { SAMPLE_VIDEOS } from '../../data/mockData';
import { ArrowLeft, UploadCloud, Film, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { uploadVideoToSupabase, isSupabaseConfigured } from '../../lib/supabase';

interface UploadVideoScreenProps {
  onNavigate: (screen: ScreenId) => void;
  activeInvitation: Invitation | null;
  onUpdateVideo: (videoUrl: string, fileName: string) => void;
}

export const UploadVideoScreen: React.FC<UploadVideoScreenProps> = ({
  onNavigate,
  activeInvitation,
  onUpdateVideo,
}) => {
  const [currentVideoUrl, setCurrentVideoUrl] = useState(
    activeInvitation?.videoUrl || SAMPLE_VIDEOS[0].url
  );
  const [currentFileName, setCurrentFileName] = useState(
    activeInvitation?.videoFileName || SAMPLE_VIDEOS[0].name
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploadSuccess('');

    if (!file.name.toLowerCase().endsWith('.mp4') && file.type !== 'video/mp4') {
      setUploadError('Sila muat naik fail video berformat MP4 sahaja.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('Saiz fail video melebihi had maksimum 50 MB.');
      return;
    }

    setIsUploading(true);

    const slug = activeInvitation?.slug || 'wedding-card';
    const { publicUrl, error } = await uploadVideoToSupabase(file, slug);

    setIsUploading(false);

    if (error || !publicUrl) {
      setUploadError(error || 'Ralat muat naik video ke Supabase Storage.');
      return;
    }

    setCurrentVideoUrl(publicUrl);
    setCurrentFileName(file.name);
    onUpdateVideo(publicUrl, file.name);
    setUploadSuccess('Video berjaya dimuat naik ke Supabase invitation-videos bucket!');
  };

  const handleSelectSample = (sample: typeof SAMPLE_VIDEOS[0]) => {
    setUploadError('');
    setUploadSuccess('');
    setCurrentVideoUrl(sample.url);
    setCurrentFileName(sample.name);
    onUpdateVideo(sample.url, sample.name);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-[#D9D2CA] shadow-2xs">
        <button
          onClick={() => onNavigate('create_invitation')}
          className="w-10 h-10 rounded-xl bg-[#F7F5F2] hover:bg-[#EFE7DF] text-[#1E1E1C] flex items-center justify-center cursor-pointer transition-all border border-[#D9D2CA]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <span className="text-[10px] uppercase font-semibold text-[#9B7B63] tracking-wider block">
            Media Asset Studio {isSupabaseConfigured ? '• Supabase Storage' : ''}
          </span>
          <h1 className="font-title text-base font-bold text-[#1E1E1C]">
            Upload Video
          </h1>
        </div>

        <div className="w-10" />
      </div>

      {/* Main Card */}
      <div className="card-maiya p-6 md:p-8 space-y-6">
        {/* Status Alerts */}
        {uploadError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        {/* Video Preview */}
        <div className="relative rounded-2xl overflow-hidden bg-[#24211F] aspect-[9/14] max-h-[280px] mx-auto w-full max-w-[220px] shadow-md border border-[#D9D2CA] group">
          <video
            key={currentVideoUrl}
            src={currentVideoUrl}
            loop
            muted
            playsInline
            autoPlay
            className="w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-3 flex flex-col justify-between text-white">
            <div className="flex items-center justify-between">
              <span className="text-[9px] bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 text-white font-mono">
                MP4 • Max 50MB
              </span>
              <Film className="w-3.5 h-3.5 text-white" />
            </div>

            <div>
              <p className="font-serif text-sm font-bold text-white">
                {activeInvitation ? `${activeInvitation.brideName} ♡ ${activeInvitation.groomName}` : 'Adam ♡ Sofea'}
              </p>
              <p className="text-[10px] text-white/80 truncate">
                {currentFileName}
              </p>
            </div>
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div className="relative border-2 border-dashed border-[#9B7B63]/60 rounded-2xl p-6 text-center bg-[#EFE7DF]/40 hover:bg-[#EFE7DF]/80 transition-all cursor-pointer">
          <input
            type="file"
            accept="video/mp4"
            disabled={isUploading}
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#1E1E1C] text-white flex items-center justify-center shadow-xs">
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#9B7B63]" />
              ) : (
                <UploadCloud className="w-5 h-5" />
              )}
            </div>
            <p className="font-title text-sm font-bold text-[#1E1E1C]">
              {isUploading ? 'Uploading to Supabase Storage...' : 'Upload Customer Video (MP4)'}
            </p>
            <p className="text-xs text-[#77736D]">
              Format: MP4 only • Max 50MB • High speed video CDN
            </p>
          </div>
        </div>

        {/* Sample Templates */}
        <div className="space-y-2">
          <span className="text-xs text-[#77736D] font-semibold uppercase tracking-wider block">
            Or Choose Preset Wedding Loop:
          </span>
          <div className="grid grid-cols-2 gap-3">
            {SAMPLE_VIDEOS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center space-x-2 cursor-pointer ${
                  currentVideoUrl === sample.url
                    ? 'border-[#9B7B63] bg-[#EFE7DF] font-semibold text-[#1E1E1C]'
                    : 'border-[#D9D2CA] bg-white text-[#77736D] hover:bg-[#F7F5F2]'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-[#9B7B63]/20 text-[#9B7B63] flex items-center justify-center font-title text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                <span className="truncate text-xs">{sample.name.split('.')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-[#D9D2CA]/40 flex justify-end">
          <button
            onClick={() => onNavigate('generate_link')}
            className="w-full sm:w-auto btn-primary cursor-pointer"
          >
            <span>Continue to Preview & Link</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

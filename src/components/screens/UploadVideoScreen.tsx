import React, { useState, useEffect, useRef } from 'react';
import { ScreenId, Invitation } from '../../types';
import {
  ArrowLeft,
  UploadCloud,
  Film,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Sparkles,
  Play,
  Activity,
  Terminal
} from 'lucide-react';
import { MediaProviderService, UploadProgress } from '../../lib/mediaProvider';
import { updateInvitationInSupabase } from '../../lib/supabase';

interface UploadVideoScreenProps {
  onNavigate: (screen: ScreenId) => void;
  activeInvitation: Invitation | null;
  initialVideoFile?: File | null;
  onUpdateVideo: (
    invitationId: string,
    videoKey: string,
    videoUrl: string,
    fileName: string
  ) => Promise<{ success: boolean; error?: string }>;
  onPendingVideoCleared?: (reason: string) => void;
}

export const UploadVideoScreen: React.FC<UploadVideoScreenProps> = ({
  onNavigate,
  activeInvitation,
  initialVideoFile,
  onUpdateVideo,
  onPendingVideoCleared,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [currentVideoUrl, setCurrentVideoUrl] = useState(
    activeInvitation?.videoUrl || ''
  );
  const [currentFileName, setCurrentFileName] = useState(
    initialVideoFile?.name || activeInvitation?.videoFileName || ''
  );
  const [currentPosterUrl, setCurrentPosterUrl] = useState(
    activeInvitation?.posterUrl || ''
  );

  // Local File & Object URL Preview State
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(initialVideoFile || null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadWarning, setUploadWarning] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Diagnostic State
  const [localPreviewCreated, setLocalPreviewCreated] = useState(false);
  const [videoMetadataLoaded, setVideoMetadataLoaded] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoErrorDetails, setVideoErrorDetails] = useState('');
  const [presignStatus, setPresignStatus] = useState<string>('Belum Diminta');
  const [r2PutStatus, setR2PutStatus] = useState<string>('Belum Diminta');
  const [finalPublicUrl, setFinalPublicUrl] = useState<string>(
    activeInvitation?.videoUrl || ''
  );
  const [publicUrlPlaybackResult, setPublicUrlPlaybackResult] = useState<string>('Belum Diuji');

  const invId = activeInvitation?.id || '';

  useEffect(() => {
    if (!initialVideoFile || localPreviewUrl) return;
    const objectUrl = URL.createObjectURL(initialVideoFile);
    setLocalPreviewUrl(objectUrl);
    setLocalPreviewCreated(true);
  }, [initialVideoFile, localPreviewUrl]);

  // Revoke Object URL on unmount or when localPreviewUrl changes
  useEffect(() => {
    return () => {
      if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  // Reload video element whenever source changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [localPreviewUrl, currentVideoUrl]);

  // Handle Local MP4 File Selection for Preview (Does NOT auto-upload immediately)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.info('[R2_DIAGNOSTIC] Video selected', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || null,
      fileObjectExists: file instanceof File,
    });

    setUploadError('');
    setUploadWarning('');
    setUploadSuccess('');
    setVideoErrorDetails('');
    setUploadProgress(null);

    // 1. Format Validation (.mp4 / video/mp4)
    const isMp4 = file.name.toLowerCase().endsWith('.mp4') || file.type === 'video/mp4';
    if (!isMp4) {
      setUploadError('Sila pilih fail video berformat MP4 (.mp4) sahaja.');
      return;
    }

    // 2. Hard Size Limit (50MB)
    if (file.size > 50 * 1024 * 1024) {
      setUploadError(`Saiz fail video (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi had maksimum 50 MB.`);
      return;
    }

    // 3. Warning Size Limit (15MB)
    if (file.size > 15 * 1024 * 1024) {
      setUploadWarning(
        `Amaran: Saiz video ini ialah ${(file.size / (1024 * 1024)).toFixed(1)} MB. Saiz melebihi 15MB boleh menyebabkan muat turun tetamu menjadi perlahan. Disyorkan saiz bawah 15MB.`
      );
    }

    // Revoke previous object URL if existing
    if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(localPreviewUrl);
    }

    // Create Browser Object URL for immediate local preview
    const objectUrl = URL.createObjectURL(file);
    console.log(`[VIDEO_PREVIEW_BLOB_CREATED] Blob URL: ${objectUrl}, File: ${file.name}, MIME: ${file.type || 'video/mp4'}, Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);
    setSelectedVideoFile(file);
    setLocalPreviewUrl(objectUrl);
    setCurrentFileName(file.name);
    setLocalPreviewCreated(true);
    setVideoMetadataLoaded(false);
    setVideoDuration(null);
    setUploadSuccess('Fail MP4 dipilih! Anda boleh menguji tontonan di bawah sebelum memuat naik ke R2 CDN.');
  };

  // Perform actual R2 Upload
  const performR2Upload = async (): Promise<boolean> => {
    if (!selectedVideoFile) {
      if (activeInvitation?.videoKey && activeInvitation.videoUrl) return true;
      setUploadError('Fail video tidak tersedia. Sila pilih semula fail MP4 sebelum meneruskan.');
      return false;
    }
    if (!invId) {
      setUploadError('ID jemputan tiada. Muat naik dihentikan sebelum presign.');
      return false;
    }

    setUploadError('');
    setUploadWarning('');
    setUploadSuccess('');
    setIsUploading(true);
    setPresignStatus('Meminta Presigned URL...');
    setR2PutStatus('Menunggu...');

    try {
      // 1. Upload file to Cloudflare R2 via presigned URL
      const { data, error } = await MediaProviderService.uploadMedia(
        selectedVideoFile,
        invId,
        'video',
        (prog) => setUploadProgress(prog)
      );

      if (error || !data) {
        setIsUploading(false);
        setPresignStatus('Gagal / Ralat');
        setR2PutStatus('Gagal');
        setUploadError(error || 'Ralat muat naik video ke Cloudflare R2.');
        return false;
      }

      setPresignStatus('200 OK (Diluluskan)');
      setR2PutStatus('200 OK (Berjaya Diisi)');
      const publicUrl = data.publicUrl;
      setFinalPublicUrl(publicUrl);

      if (data.warningMsg) {
        setUploadWarning(data.warningMsg);
      }

      // 2. Persist only after the R2 PUT succeeds.
      console.info('[R2_DIAGNOSTIC] Before Supabase update', {
        video_key: data.videoKey,
        video_url: data.publicUrl,
        video_file_name: selectedVideoFile.name,
      });
      const persistence = await onUpdateVideo(
        invId,
        data.videoKey,
        data.publicUrl,
        selectedVideoFile.name
      );
      console.info('[R2_DIAGNOSTIC] Supabase update result', {
        success: persistence.success,
        error: persistence.error || null,
      });
      if (!persistence.success) {
        setIsUploading(false);
        setUploadError(
          `Video dimuat naik ke R2 tetapi gagal disimpan di Supabase: ${persistence.error || 'Ralat tidak diketahui'}`
        );
        return false;
      }

      setIsUploading(false);
      setCurrentVideoUrl(publicUrl);
      setPublicUrlPlaybackResult('Sedia Untuk Tontonan Tetamu');
      setUploadSuccess('Video MP4 berjaya dimuat naik & disimpan di Cloudflare R2 CDN!');
      console.info('[R2_DIAGNOSTIC] Clearing pending video file', {
        reason: 'R2 PUT and Supabase persistence succeeded',
      });
      setSelectedVideoFile(null);
      onPendingVideoCleared?.('R2 PUT and Supabase persistence succeeded');
      return true;
    } catch (err: any) {
      setIsUploading(false);
      setUploadError(`Ralat Muat Naik R2: ${err.message || err}`);
      return false;
    }
  };

  // Handle WebP Poster Upload to Cloudflare R2
  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploadSuccess('');

    setIsUploading(true);

    const oldPosterKey = activeInvitation?.posterKey;

    const { data, error } = await MediaProviderService.uploadMedia(
      file,
      invId,
      'poster'
    );

    setIsUploading(false);

    if (error || !data) {
      setUploadError(error || 'Ralat muat naik imej poster ke Cloudflare R2.');
      return;
    }

    if (activeInvitation?.id) {
      const { error: posterDbError } = await updateInvitationInSupabase(activeInvitation.id, {
        posterKey: data.videoKey,
        posterUrl: data.publicUrl,
      });
      if (posterDbError) {
        setUploadError(`Poster dimuat naik tetapi gagal disimpan: ${posterDbError}`);
        return;
      }
    }

    if (oldPosterKey && oldPosterKey !== data.videoKey) {
      MediaProviderService.deleteMedia(invId, 'poster').catch((e) =>
        console.warn('Notice: Clean old poster exception:', e)
      );
    }

    setCurrentPosterUrl(data.publicUrl);
    setUploadSuccess('Imej poster WebP berjaya dimuat naik ke Cloudflare R2!');
  };

  const handleProceed = async () => {
    const ok = await performR2Upload();
    if (!ok) return;
    onNavigate('generate_link');
  };

  const activeVideoSrc = localPreviewUrl || currentVideoUrl;

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
            Media Storage • Cloudflare R2 CDN
          </span>
          <h1 className="font-title text-base font-bold text-[#1E1E1C]">
            Upload Video & Poster
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

        {uploadWarning && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{uploadWarning}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        {/* Video Error Message Banner if codec / media load fails */}
        {videoErrorDetails && (
          <div className="p-3.5 bg-rose-100 border border-rose-300 text-rose-900 text-xs rounded-xl flex items-start gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Ralat Tontonan Video:</p>
              <p>{videoErrorDetails}</p>
            </div>
          </div>
        )}

        {/* Admin Local / Public Video Preview Box with Interactive Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1E1E1C] flex items-center gap-1.5">
              <Film className="w-4 h-4 text-[#9B7B63]" />
              <span>Pratonton Admin (Uji Bunyi & Video)</span>
            </span>
            {selectedVideoFile ? (
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold border border-amber-300">
                Lokal (Belum Dimuat Naik)
              </span>
            ) : (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-300">
                R2 CDN Aktif
              </span>
            )}
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-[#24211F] aspect-[9/14] max-h-[320px] mx-auto w-full max-w-[240px] shadow-md border border-[#D9D2CA]">
            <video
              ref={videoRef}
              key={activeVideoSrc}
              src={activeVideoSrc}
              poster={currentPosterUrl || undefined}
              controls
              playsInline
              preload="metadata"
              onLoadedMetadata={(e) => {
                const duration = e.currentTarget.duration;
                console.log('[VIDEO_LOADED_METADATA]', {
                  currentSrc: e.currentTarget.currentSrc,
                  duration,
                  videoWidth: e.currentTarget.videoWidth,
                  videoHeight: e.currentTarget.videoHeight,
                  readyState: e.currentTarget.readyState,
                  networkState: e.currentTarget.networkState,
                });
                setVideoMetadataLoaded(true);
                setVideoDuration(Number.isFinite(duration) ? duration : null);
                setVideoErrorDetails('');
              }}
              onCanPlay={(e) => {
                console.log('[VIDEO_CAN_PLAY]', {
                  currentSrc: e.currentTarget.currentSrc,
                  readyState: e.currentTarget.readyState,
                  networkState: e.currentTarget.networkState,
                });
              }}
              onError={(e) => {
                const err = e.currentTarget.error;
                const mediaErrObj = {
                  code: err?.code,
                  message: err?.message,
                  currentSrc: e.currentTarget.currentSrc,
                  readyState: e.currentTarget.readyState,
                  networkState: e.currentTarget.networkState,
                };
                console.error('[VIDEO_MEDIA_ERROR]', mediaErrObj);
                const msg = 'This MP4 codec is not supported. Please export the video as H.264 video with AAC audio.';
                setVideoErrorDetails(msg);
              }}
              className="w-full h-full object-cover"
            />

            <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
              <span className="text-[9px] bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 text-white font-mono">
                {selectedVideoFile ? 'MP4 Lokal' : 'MP4 R2 CDN'}
              </span>
              {videoDuration && (
                <span className="text-[9px] bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 text-white font-mono">
                  {videoDuration.toFixed(1)}s
                </span>
              )}
            </div>
          </div>

          {selectedVideoFile && (
            <div className="text-[11px] font-mono text-[#77736D] text-center space-y-0.5 pt-1">
              <div>MIME Type: <span className="font-bold text-[#1E1E1C]">{selectedVideoFile.type || 'video/mp4'}</span></div>
              <div>File Size: <span className="font-bold text-[#1E1E1C]">{(selectedVideoFile.size / (1024 * 1024)).toFixed(2)} MB</span></div>
            </div>
          )}
        </div>

        {/* Upload Progress Bar */}
        {isUploading && uploadProgress && (
          <div className="p-4 bg-[#F7F5F2] rounded-xl border border-[#D9D2CA] space-y-2">
            <div className="flex justify-between items-center text-xs text-[#1E1E1C] font-semibold">
              <span>Memuat naik ke Cloudflare R2...</span>
              <span className="font-mono text-[#9B7B63]">{uploadProgress.percentage}%</span>
            </div>
            <div className="w-full bg-[#EFE7DF] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#9B7B63] h-full transition-all duration-200"
                style={{ width: `${uploadProgress.percentage}%` }}
              />
            </div>
            <div className="text-[10px] text-[#77736D] text-right font-mono">
              {(uploadProgress.loadedBytes / (1024 * 1024)).toFixed(1)} MB / {(uploadProgress.totalBytes / (1024 * 1024)).toFixed(1)} MB
            </div>
          </div>
        )}

        {/* Drag & Drop Upload Zone for Video */}
        <div className="space-y-3">
          <div className="relative border-2 border-dashed border-[#9B7B63]/60 rounded-2xl p-6 text-center bg-[#EFE7DF]/40 hover:bg-[#EFE7DF]/80 transition-all cursor-pointer">
            <input
              type="file"
              accept="video/mp4"
              disabled={isUploading}
              onChange={handleFileSelect}
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
                {selectedVideoFile ? 'Tukar Fail Video MP4' : 'Pilih Fail Video Jemputan (MP4)'}
              </p>
              <p className="text-xs text-[#77736D]">
                Format: MP4 sahaja • Maksimum 50MB (Had Keras) • Amaran jika &gt;15MB
              </p>
            </div>
          </div>

          {/* Explicit Manual Upload Button when file selected */}
          {selectedVideoFile && !isUploading && (
            <button
              type="button"
              onClick={performR2Upload}
              className="w-full py-3 bg-[#9B7B63] hover:bg-[#8A6A52] text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Muat Naik "{selectedVideoFile.name}" ke Cloudflare R2 Sekarang</span>
            </button>
          )}
        </div>

        {/* Optional WebP Poster Image Upload Zone */}
        <div className="p-4 bg-white rounded-2xl border border-[#D9D2CA] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#9B7B63]" />
              <span className="text-xs font-bold text-[#1E1E1C]">
                WebP Poster Image (Sebelum Video Dimainkan)
              </span>
            </div>
            {currentPosterUrl && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-semibold">
                Poster Aktif
              </span>
            )}
          </div>
          <p className="text-xs text-[#77736D]">
            Paparkan poster imej pantas sebelum video penuh dimuatkan oleh tetamu.
          </p>

          <div className="relative border border-dashed border-[#D9D2CA] rounded-xl p-3 text-center bg-[#F7F5F2] hover:bg-[#EFE7DF]/50 transition-all cursor-pointer">
            <input
              type="file"
              accept="image/*"
              disabled={isUploading}
              onChange={handlePosterUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#1E1E1C]">
              <Sparkles className="w-4 h-4 text-[#9B7B63]" />
              <span>Muat Naik Imej Poster (WebP / JPG / PNG)</span>
            </div>
          </div>
        </div>

        {/* Runtime Diagnostic Report Panel */}
        <div className="p-4 bg-[#1E1E1C] text-white rounded-2xl border border-black/40 space-y-2.5 font-mono text-[11px]">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 text-[#9B7B63]">
              <Terminal className="w-4 h-4" />
              <span className="font-bold tracking-wider uppercase text-xs">Laporan Diagnostik Video Runtime</span>
            </div>
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-white/60">Local Preview URL Created:</span>{' '}
              <span className={localPreviewCreated ? 'text-emerald-400 font-bold' : 'text-white/40'}>
                {localPreviewCreated ? 'Ya (blob: URL)' : 'Tidak'}
              </span>
            </div>

            <div>
              <span className="text-white/60">Metadata Loaded:</span>{' '}
              <span className={videoMetadataLoaded ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {videoMetadataLoaded ? 'Ya' : 'Menunggu / Belum'}
              </span>
            </div>

            <div>
              <span className="text-white/60">Video Duration:</span>{' '}
              <span className="text-white font-bold">
                {videoDuration ? `${videoDuration.toFixed(1)} saat` : 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-white/60">Presign Status:</span>{' '}
              <span className="text-sky-300 font-bold">{presignStatus}</span>
            </div>

            <div>
              <span className="text-white/60">R2 PUT Status:</span>{' '}
              <span className="text-sky-300 font-bold">{r2PutStatus}</span>
            </div>

            <div>
              <span className="text-white/60">Public Playback:</span>{' '}
              <span className="text-emerald-300 font-bold">{publicUrlPlaybackResult}</span>
            </div>
          </div>

          <div className="pt-1 border-t border-white/10 text-[10px] truncate text-white/70">
            <span className="text-white/40">Final Public URL:</span> {finalPublicUrl || 'Belum dimuat naik ke R2'}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-[#D9D2CA]/40 flex justify-end">
          <button
            onClick={handleProceed}
            disabled={isUploading}
            className="w-full sm:w-auto btn-primary cursor-pointer disabled:opacity-50"
          >
            <span>
              {selectedVideoFile ? 'Muat Naik R2 & Teruskan' : 'Teruskan ke Pratonton & Pautan'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};



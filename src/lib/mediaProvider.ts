import { supabase } from './supabase';
import { buildR2PublicUrl } from './mediaUrl';

export type MediaType = 'video' | 'poster' | 'gift-qr' | 'all';

export interface UploadProgress {
  percentage: number;
  loadedBytes: number;
  totalBytes: number;
}

export interface UploadMediaResult {
  /** Runtime-only URL. Never persist this value. */
  publicUrl: string;
  objectKey: string;
  warningMsg?: string;
}

// Get bearer token from Supabase Auth session
async function getAdminToken(): Promise<string | null> {
  if (!supabase) return 'dev-token';
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || 'dev-token';
}

/**
 * Media Provider Service Abstraction
 * Currently uses Cloudflare R2 via serverless presigned PUT URLs.
 * Can be replaced by Cloudflare Stream or another provider seamlessly.
 */
export const MediaProviderService = {
  /**
   * Upload media file (MP4 video, WebP poster, or Gift QR image)
   */
  async uploadMedia(
    file: File,
    invitationId: string,
    mediaType: 'video' | 'poster' | 'gift-qr',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ data: UploadMediaResult | null; error?: string }> {
    // 1. Frontend validation
    let warningMsg: string | undefined = undefined;

    if (mediaType === 'video') {
      const isMp4 = file.name.toLowerCase().endsWith('.mp4') || file.type === 'video/mp4';
      if (!isMp4) {
        return { data: null, error: 'Hanya fail format MP4 (.mp4) yang disokong.' };
      }
      if (file.size > 52428800) { // 50MB limit
        return { data: null, error: 'Saiz fail video melebihi had maksimum 50 MB.' };
      }
      if (file.size > 15728640) { // 15MB warning
        warningMsg = 'Fail video melebihi 15MB. Disyorkan saiz bawah 15MB untuk kelajuan muat naik & tontonan tetamu yang optimum.';
      }
    } else if (mediaType === 'poster' || mediaType === 'gift-qr') {
      if (!file.type.startsWith('image/')) {
        return { data: null, error: 'Sila muat naik fail imej yang sah (WebP, PNG, JPG).' };
      }
      if (file.size > 10485760) { // 10MB limit
        return { data: null, error: 'Saiz fail imej melebihi had 10 MB.' };
      }
    }

    try {
      // 2. Request presigned upload URL from backend API
      const token = await getAdminToken();
      const presignRes = await fetch('/api/r2/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          invitationId,
          mediaType,
          contentType: file.type || (mediaType === 'video' ? 'video/mp4' : 'image/webp'),
          contentLength: file.size,
        }),
      });

      if (!presignRes.ok) {
        const errJson = await presignRes.json().catch(() => ({}));
        return { data: null, error: errJson.error || 'Gagal menjana pautan muat naik R2.' };
      }

      const { presignedUrl, objectKey } = await presignRes.json();

      // 3. Upload file directly to Cloudflare R2 using presigned PUT URL
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presignedUrl, true);
        xhr.setRequestHeader('Content-Type', file.type || (mediaType === 'video' ? 'video/mp4' : 'image/webp'));

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percentage = Math.round((e.loaded / e.total) * 100);
              onProgress({ percentage, loadedBytes: e.loaded, totalBytes: e.total });
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Muat naik R2 gagal dengan status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Ralat rangkaian semasa muat naik ke Cloudflare R2.'));
        xhr.send(file);
      });

      return {
        data: {
          publicUrl: buildR2PublicUrl(objectKey),
          objectKey,
          warningMsg,
        },
      };
    } catch (err: any) {
      console.error('MediaProviderService upload error:', err);
      return { data: null, error: err.message || 'Muat naik media ke R2 gagal.' };
    }
  },

  /**
   * Delete media object from R2 via authenticated backend endpoint
   */
  async deleteMedia(
    invitationId: string,
    mediaType: MediaType
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await getAdminToken();
      const res = await fetch('/api/r2/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ invitationId, mediaType }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return { success: false, error: errJson.error || 'Gagal memadam fail dari R2.' };
      }

      return { success: true };
    } catch (err: any) {
      console.error('MediaProviderService delete error:', err);
      return { success: false, error: err.message || 'Ralat memadam fail media.' };
    }
  },
};

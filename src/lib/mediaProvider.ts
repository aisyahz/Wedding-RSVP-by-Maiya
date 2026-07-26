import { supabase } from './supabase';

export type MediaType = 'video' | 'poster' | 'gift-qr' | 'all';

export interface UploadProgress {
  percentage: number;
  loadedBytes: number;
  totalBytes: number;
}

export interface UploadMediaResult {
  publicUrl: string;
  videoKey: string;
  warningMsg?: string;
}

// Get bearer token from Supabase Auth session
async function getAdminToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  console.info('[AUTH_DIAGNOSTIC]', {
    sessionExists: Boolean(session),
    userId: session?.user?.id || null,
    accessTokenExists: Boolean(session?.access_token),
  });
  return session?.access_token || null;
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
      if (!token) {
        return { data: null, error: 'Authentication required. Please sign in again.' };
      }
      const contentType = mediaType === 'video'
        ? 'video/mp4'
        : (file.type || 'image/webp');
      console.info('[R2_DIAGNOSTIC] Before presign', {
        invitationId,
        fileName: file.name,
        contentType,
        objectType: mediaType,
      });
      const presignRes = await fetch('/api/r2/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          invitationId,
          mediaType,
          fileName: file.name,
          contentType,
          contentLength: file.size,
        }),
      });

      const presignJson = await presignRes.json().catch(() => ({}));
      console.info('[R2_DIAGNOSTIC] Presign response', {
        httpStatus: presignRes.status,
        videoKey: presignJson.videoKey || presignJson.key || null,
        publicUrl: presignJson.publicUrl || null,
        uploadUrlExists: Boolean(presignJson.uploadUrl),
      });
      if (!presignRes.ok) {
        return { data: null, error: presignJson.error || 'Gagal menjana pautan muat naik R2.' };
      }

      const { uploadUrl, videoKey, publicUrl } = presignJson;
      if (!uploadUrl || !videoKey || !publicUrl) {
        return {
          data: null,
          error: 'Respons presign tidak lengkap: uploadUrl, videoKey atau publicUrl tiada.',
        };
      }

      // 3. Upload file directly to Cloudflare R2 using presigned PUT URL
      console.info('[R2_DIAGNOSTIC] Before PUT', {
        fileObjectExists: file instanceof File,
        fileSize: file.size,
        contentType,
      });
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', contentType);

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percentage = Math.round((e.loaded / e.total) * 100);
              onProgress({ percentage, loadedBytes: e.loaded, totalBytes: e.total });
            }
          };
        }

        xhr.onload = () => {
          console.info('[R2_DIAGNOSTIC] PUT response', {
            httpStatus: xhr.status,
            responseBody: xhr.status >= 200 && xhr.status < 300
              ? null
              : (xhr.responseText || null),
          });
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(
              `Muat naik R2 gagal dengan status ${xhr.status}` +
              (xhr.responseText ? `: ${xhr.responseText}` : '')
            ));
          }
        };

        xhr.onerror = () => reject(new Error('Ralat rangkaian semasa muat naik ke Cloudflare R2.'));
        xhr.send(file);
      });

      return {
        data: {
          publicUrl,
          videoKey,
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
      if (!token) {
        return { success: false, error: 'Authentication required. Please sign in again.' };
      }
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

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

interface R2BucketBinding {
  delete(keys: string | string[]): Promise<void>;
}

interface Env {
  ASSETS: AssetsBinding;
  MEDIA_BUCKET: R2BucketBinding;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  CLOUDFLARE_R2_ACCOUNT_ID: string;
  CLOUDFLARE_R2_ACCESS_KEY_ID: string;
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: string;
  CLOUDFLARE_R2_PUBLIC_DOMAIN: string;
}

type MediaType = 'video' | 'poster' | 'gift-qr';
type DeleteMediaType = MediaType | 'all';

interface PresignBody {
  invitationId?: unknown;
  fileName?: unknown;
  mediaType?: unknown;
  contentType?: unknown;
  contentLength?: unknown;
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function validatedInvitationId(value: unknown): string {
  const invitationId = requiredString(value, 'invitationId');
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(invitationId)) {
    throw new Error('invitationId contains invalid characters');
  }
  return invitationId;
}

function validatedFileName(value: unknown): string {
  const fileName = requiredString(value, 'fileName');
  if (fileName.length > 255 || /[\/\\\0]/.test(fileName)) {
    throw new Error('fileName is invalid');
  }
  return fileName;
}

function validatedContentLength(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error('contentLength must be a positive integer');
  }
  return value;
}

function objectKeyFor(
  invitationId: string,
  mediaType: MediaType,
  contentType: string,
  contentLength: number,
  fileName: string,
): string {
  if (mediaType === 'video') {
    if (contentType !== 'video/mp4' || !fileName.toLowerCase().endsWith('.mp4')) {
      throw new Error('Invalid video format. Only MP4 videos are supported.');
    }
    if (contentLength > 50 * 1024 * 1024) {
      throw new Error('Video file size exceeds maximum limit of 50 MB.');
    }
    return `invitations/${invitationId}/video.mp4`;
  }

  if (!contentType.startsWith('image/')) {
    throw new Error(`Invalid ${mediaType} image format.`);
  }
  if (contentLength > 10 * 1024 * 1024) {
    throw new Error(`${mediaType} image exceeds maximum limit of 10 MB.`);
  }
  return `invitations/${invitationId}/${mediaType === 'poster' ? 'poster.webp' : 'gift-qr.webp'}`;
}

async function authenticate(request: Request, env: Env): Promise<Response | null> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ') || authorization.length <= 7) {
    return json({ error: 'Unauthorized: Missing or invalid Authorization header' }, 401);
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return json({ error: 'Worker Supabase authentication bindings are not configured.' }, 500);
  }

  try {
    const response = await fetch(`${env.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: {
        authorization,
        apikey: env.SUPABASE_ANON_KEY,
      },
    });
    if (!response.ok) {
      return json({ error: 'Unauthorized: Invalid or expired access token' }, 401);
    }
    const user = await response.json() as { id?: unknown };
    if (typeof user.id !== 'string' || !user.id) {
      return json({ error: 'Unauthorized: Invalid or expired access token' }, 401);
    }
    return null;
  } catch {
    return json({ error: 'Unauthorized: Auth validation exception' }, 401);
  }
}

function signingClient(env: Env): S3Client | null {
  if (
    !env.CLOUDFLARE_R2_ACCOUNT_ID ||
    !env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    !env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  ) {
    return null;
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
  });
}

async function readJson(request: Request): Promise<PresignBody> {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new Error('Content-Type must be application/json');
  }
  return await request.json() as PresignBody;
}

async function presign(request: Request, env: Env): Promise<Response> {
  const authFailure = await authenticate(request, env);
  if (authFailure) return authFailure;

  try {
    const body = await readJson(request);
    const invitationId = validatedInvitationId(body.invitationId);
    const fileName = validatedFileName(body.fileName);
    const mediaType = requiredString(body.mediaType, 'mediaType');
    if (!['video', 'poster', 'gift-qr'].includes(mediaType)) {
      return json({ error: 'Unsupported mediaType. Allowed: video, poster, gift-qr' }, 400);
    }
    const contentType = requiredString(body.contentType, 'contentType').toLowerCase();
    const contentLength = validatedContentLength(body.contentLength);
    const objectKey = objectKeyFor(
      invitationId,
      mediaType as MediaType,
      contentType,
      contentLength,
      fileName,
    );

    const client = signingClient(env);
    if (!client) {
      return json({ error: 'Cloudflare R2 signing secrets are not configured on the Worker.' }, 500);
    }
    const publicDomain = env.CLOUDFLARE_R2_PUBLIC_DOMAIN?.replace(/\/+$/, '');
    if (!publicDomain) {
      return json({ error: 'CLOUDFLARE_R2_PUBLIC_DOMAIN is not configured on the Worker.' }, 500);
    }

    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: 'maiya-invitation-media',
        Key: objectKey,
        ContentType: contentType,
      }),
      { expiresIn: 900 },
    );

    return json({
      uploadUrl,
      videoKey: objectKey,
      publicUrl: `${publicDomain}/${objectKey}`,
    });
  } catch (error) {
    return json({ error: errorMessage(error) }, 400);
  }
}

async function deleteMedia(request: Request, env: Env): Promise<Response> {
  const authFailure = await authenticate(request, env);
  if (authFailure) return authFailure;

  try {
    const body = await readJson(request);
    const invitationId = validatedInvitationId(body.invitationId);
    const mediaType = requiredString(body.mediaType, 'mediaType') as DeleteMediaType;
    const names: Record<MediaType, string> = {
      video: 'video.mp4',
      poster: 'poster.webp',
      'gift-qr': 'gift-qr.webp',
    };
    const selected = mediaType === 'all'
      ? Object.keys(names) as MediaType[]
      : [mediaType as MediaType];
    if (selected.some((type) => !(type in names))) {
      return json({ error: 'Invalid mediaType for deletion.' }, 400);
    }
    const keys = selected.map((type) => `invitations/${invitationId}/${names[type]}`);
    await env.MEDIA_BUCKET.delete(keys);
    return json({ success: true, deletedKeys: keys });
  } catch (error) {
    return json({ error: errorMessage(error) }, 400);
  }
}

async function handleApi(request: Request, env: Env, pathname: string): Promise<Response> {
  if (pathname === '/api/health' && request.method === 'GET') {
    return json({ ok: true, runtime: 'cloudflare-worker' });
  }
  if (pathname === '/api/r2/presign' && request.method === 'POST') {
    return presign(request, env);
  }
  if (pathname === '/api/r2/delete' && request.method === 'POST') {
    return deleteMedia(request, env);
  }
  return json({ error: 'API route not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return handleApi(request, env, pathname);
    }
    return env.ASSETS.fetch(request);
  },
};

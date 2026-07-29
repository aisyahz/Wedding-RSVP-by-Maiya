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
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  DEFAULT_SOCIAL_PREVIEW_IMAGE_URL?: string;
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

const INVITATION_DESCRIPTION = 'You are warmly invited to celebrate our special day.';

interface SocialInvitation {
  bride_name?: string;
  groom_name?: string;
  poster_url?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function publicImageUrl(value?: string | null): string {
  const candidate = value?.trim() || '';
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function socialHead(
  title: string,
  description: string,
  canonicalUrl: string,
  imageUrl: string,
  isDefaultImage: boolean,
): string {
  const titleHtml = escapeHtml(title);
  const descriptionHtml = escapeHtml(description);
  const canonicalHtml = escapeHtml(canonicalUrl);
  const imageHtml = escapeHtml(imageUrl);
  return `<!-- SEO_DYNAMIC_START -->
    <title>${titleHtml}</title>
    <meta name="description" content="${descriptionHtml}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${canonicalHtml}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${titleHtml}" />
    <meta property="og:description" content="${descriptionHtml}" />
    <meta property="og:image" content="${imageHtml}" />
    <meta property="og:image:secure_url" content="${imageHtml}" />
    <meta property="og:image:alt" content="Digital Card by Maiya wedding invitation preview" />
    ${isDefaultImage ? '<meta property="og:image:type" content="image/png" />' : ''}
    ${isDefaultImage ? '<meta property="og:image:width" content="1366" />' : ''}
    ${isDefaultImage ? '<meta property="og:image:height" content="1361" />' : ''}
    <meta property="og:url" content="${canonicalHtml}" />
    <meta property="og:site_name" content="Digital Card by Maiya" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${titleHtml}" />
    <meta name="twitter:description" content="${descriptionHtml}" />
    <meta name="twitter:image" content="${imageHtml}" />
    <!-- SEO_DYNAMIC_END -->`;
}

async function invitationMetadataResponse(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const assetResponse = await env.ASSETS.fetch(request);
  if (!assetResponse.ok || !assetResponse.headers.get('content-type')?.includes('text/html')) {
    return assetResponse;
  }

  const requestUrl = new URL(request.url);
  const canonicalUrl = `${requestUrl.origin}/invite/${encodeURIComponent(slug)}`;
  const configuredDefault = publicImageUrl(env.DEFAULT_SOCIAL_PREVIEW_IMAGE_URL);
  const defaultImage = configuredDefault || `${requestUrl.origin}/maiya-social-preview.png`;
  const supabaseUrl = env.SUPABASE_URL?.trim() || env.VITE_SUPABASE_URL?.trim();
  const supabaseAnonKey = env.SUPABASE_ANON_KEY?.trim() || env.VITE_SUPABASE_ANON_KEY?.trim();
  let invitation: SocialInvitation | null = null;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const endpoint = new URL(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/invitations`);
      endpoint.searchParams.set('select', 'bride_name,groom_name,poster_url');
      endpoint.searchParams.set('slug', `eq.${slug}`);
      endpoint.searchParams.set('status', 'eq.active');
      endpoint.searchParams.set('limit', '1');
      const invitationResponse = await fetch(endpoint, {
        headers: {
          apikey: supabaseAnonKey,
          authorization: `Bearer ${supabaseAnonKey}`,
          accept: 'application/json',
        },
      });
      if (invitationResponse.ok) {
        const rows = await invitationResponse.json() as SocialInvitation[];
        invitation = rows[0] || null;
      }
    } catch {
      // Keep serving the React app with brand metadata if metadata lookup is unavailable.
    }
  }

  const brideName = invitation?.bride_name?.trim() || '';
  const groomName = invitation?.groom_name?.trim() || '';
  const title = brideName && groomName
    ? `${brideName} & ${groomName} | Digital Wedding Invitation`
    : 'Digital Card by Maiya | Digital Wedding Invitation';
  const image = publicImageUrl(invitation?.poster_url) || defaultImage;
  const html = (await assetResponse.text()).replace(
    /<!-- SEO_DYNAMIC_START -->[\s\S]*?<!-- SEO_DYNAMIC_END -->/,
    socialHead(
      title,
      INVITATION_DESCRIPTION,
      canonicalUrl,
      image,
      image === defaultImage,
    ),
  );
  const headers = new Headers(assetResponse.headers);
  headers.set('content-type', 'text/html; charset=UTF-8');
  headers.set('cache-control', 'public, max-age=60');
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  return new Response(request.method === 'HEAD' ? null : html, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers,
  });
}

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
    const lowerName = fileName.toLowerCase();
    const isMp4 = contentType === 'video/mp4' && lowerName.endsWith('.mp4');
    const isMov = (
      contentType === 'video/quicktime' ||
      contentType === 'video/x-quicktime' ||
      contentType === 'video/mov'
    ) && lowerName.endsWith('.mov');
    if (!isMp4 && !isMov) {
      throw new Error('Invalid video format. Only MP4 and MOV videos are supported.');
    }
    if (contentLength > 100 * 1024 * 1024) {
      throw new Error('Video file size exceeds maximum limit of 100 MB.');
    }
    return `invitations/${invitationId}/video.${isMov ? 'mov' : 'mp4'}`;
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

  const bindingDiagnostics = {
    stage: 'binding-check',
    supabaseUrlExists: Boolean(env.SUPABASE_URL?.trim()),
    supabaseAnonKeyExists: Boolean(env.SUPABASE_ANON_KEY?.trim()),
    viteSupabaseUrlExists: Boolean(env.VITE_SUPABASE_URL?.trim()),
    viteSupabaseAnonKeyExists: Boolean(env.VITE_SUPABASE_ANON_KEY?.trim()),
  };
  const supabaseUrl = env.SUPABASE_URL?.trim() || env.VITE_SUPABASE_URL?.trim();
  const supabaseAnonKey = env.SUPABASE_ANON_KEY?.trim() || env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) {
    return json(bindingDiagnostics, 500);
  }

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: {
        authorization,
        apikey: supabaseAnonKey,
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
    const invitationMatch = request.method === 'GET' || request.method === 'HEAD'
      ? pathname.match(/^\/invite\/([^/]+)\/?$/)
      : null;
    if (invitationMatch) {
      return invitationMetadataResponse(request, env, decodeURIComponent(invitationMatch[1]));
    }
    return env.ASSETS.fetch(request);
  },
};

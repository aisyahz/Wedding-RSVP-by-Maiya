import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Supabase admin validator
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

const DEFAULT_TITLE = 'Maiya Digital Invitation | Elegant Wedding RSVP';
const DEFAULT_DESCRIPTION = 'Create and share elegant digital wedding invitations with RSVP, guest messages, event details, maps, photos, and video invitations.';

function publicSiteUrl(req?: Request): string {
  const configured = process.env.VITE_PUBLIC_SITE_URL || process.env.APP_URL || '';
  if (configured) return configured.replace(/\/+$/, '');
  return req ? `${req.protocol}://${req.get('host')}` : '';
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function stablePublicImage(value: unknown): string {
  const url = String(value || '').trim();
  if (!/^https?:\/\//i.test(url)) return '';
  if (/[?&]X-Amz-/i.test(url)) return '';
  return url;
}

function r2PublicUrl(key: unknown): string {
  const domain = String(process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || '').replace(/\/+$/, '');
  const objectKey = String(key || '').replace(/^\/+/, '');
  return domain && objectKey ? `${domain}/${objectKey}` : '';
}

function replaceSeoHead(html: string, metadata: {
  title: string;
  description: string;
  canonicalUrl: string;
  image: string;
  imageAlt: string;
  type: 'website';
  robots: string;
  structuredData?: unknown;
}): string {
  const head = `
    <title>${escapeHtml(metadata.title)}</title>
    <meta name="description" content="${escapeHtml(metadata.description)}" />
    <meta name="author" content="Maiya Digital Invitation" />
    <meta name="robots" content="${escapeHtml(metadata.robots)}" />
    <meta name="theme-color" content="#1E1E1C" />
    <meta name="application-name" content="Maiya Digital Invitation" />
    <meta name="format-detection" content="telephone=no, email=no, address=no" />
    <link rel="canonical" href="${escapeHtml(metadata.canonicalUrl)}" />
    <meta property="og:type" content="${metadata.type}" />
    <meta property="og:title" content="${escapeHtml(metadata.title)}" />
    <meta property="og:description" content="${escapeHtml(metadata.description)}" />
    <meta property="og:url" content="${escapeHtml(metadata.canonicalUrl)}" />
    <meta property="og:image" content="${escapeHtml(metadata.image)}" />
    <meta property="og:image:alt" content="${escapeHtml(metadata.imageAlt)}" />
    <meta property="og:site_name" content="Maiya Digital Invitation" />
    <meta property="og:locale" content="en_MY" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(metadata.title)}" />
    <meta name="twitter:description" content="${escapeHtml(metadata.description)}" />
    <meta name="twitter:image" content="${escapeHtml(metadata.image)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(metadata.imageAlt)}" />
    ${metadata.structuredData ? `<script type="application/ld+json" id="maiya-event-structured-data">${safeJson(metadata.structuredData)}</script>` : ''}
  `;

  return html.replace(
    /<!-- SEO_DYNAMIC_START -->[\s\S]*?<!-- SEO_DYNAMIC_END -->/,
    `<!-- SEO_DYNAMIC_START -->${head}<!-- SEO_DYNAMIC_END -->`
  );
}

function xmlEscape(value: unknown): string {
  return escapeHtml(value);
}

// Helper to get S3 / R2 Client
function getR2Client() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucketName, accountId };
}

// Middleware: Verify Supabase Admin Token
async function verifySupabaseAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!supabase) {
    // If Supabase credentials are missing on server, fallback allow for dev preview
    (req as any).user = { id: 'dev-admin' };
    next();
    return;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired access token' });
      return;
    }
    (req as any).user = user;
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Unauthorized: Auth validation exception' });
    return;
  }
}

// ====================================================================
// R2 API ROUTES
// ====================================================================

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', r2Configured: Boolean(process.env.CLOUDFLARE_R2_ACCOUNT_ID) });
});

app.get('/robots.txt', (req: Request, res: Response) => {
  const siteUrl = publicSiteUrl(req);
  res.type('text/plain').send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /admin',
    'Disallow: /dashboard',
    'Disallow: /login',
    'Disallow: /settings',
    'Disallow: /rsvp',
    'Disallow: /report/',
    'Disallow: /invitations',
    'Disallow: /create',
    'Disallow: /edit',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
  ].join('\n'));
});

app.get('/sitemap.xml', async (req: Request, res: Response) => {
  const siteUrl = publicSiteUrl(req);
  const urls: Array<{ loc: string; lastmod?: string }> = [];

  if (supabase) {
    const { data, error } = await supabase
      .from('invitations')
      .select('slug, updated_at')
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Sitemap invitation lookup failed:', error.message);
    } else {
      for (const invitation of data || []) {
        if (!invitation.slug) continue;
        urls.push({
          loc: `${siteUrl}/invite/${encodeURIComponent(invitation.slug)}`,
          lastmod: invitation.updated_at
            ? new Date(invitation.updated_at).toISOString()
            : undefined,
        });
      }
    }
  }

  const entries = urls.map(({ loc, lastmod }) => [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    ...(lastmod ? [`    <lastmod>${xmlEscape(lastmod)}</lastmod>`] : []),
    '  </url>',
  ].join('\n')).join('\n');

  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`
  );
});

// 1. Generate Presigned Upload URL (Max 15 min validity)
app.post('/api/r2/presign', verifySupabaseAdmin, async (req: Request, res: Response): Promise<void> => {
  const { invitationId, mediaType, contentType, contentLength } = req.body;

  if (!invitationId || !mediaType) {
    res.status(400).json({ error: 'Missing required parameters: invitationId and mediaType' });
    return;
  }

  const r2 = getR2Client();
  if (!r2) {
    res.status(500).json({ error: 'Cloudflare R2 environment variables are not configured on server.' });
    return;
  }

  // Validate Media Type, Content-Type and Content-Length
  let objectKey = '';
  if (mediaType === 'video') {
    if (contentType !== 'video/mp4') {
      res.status(400).json({ error: 'Invalid video format. Only MP4 videos are supported.' });
      return;
    }
    if (contentLength && contentLength > 52428800) { // 50MB
      res.status(400).json({ error: 'Video file size exceeds maximum limit of 50 MB.' });
      return;
    }
    objectKey = `invitations/${invitationId}/video.mp4`;
  } else if (mediaType === 'poster') {
    if (!contentType || !contentType.startsWith('image/')) {
      res.status(400).json({ error: 'Invalid poster image format.' });
      return;
    }
    if (contentLength && contentLength > 10485760) { // 10MB
      res.status(400).json({ error: 'Poster image exceeds maximum limit of 10 MB.' });
      return;
    }
    objectKey = `invitations/${invitationId}/poster.webp`;
  } else if (mediaType === 'gift-qr') {
    if (!contentType || !contentType.startsWith('image/')) {
      res.status(400).json({ error: 'Invalid Gift QR image format.' });
      return;
    }
    if (contentLength && contentLength > 10485760) { // 10MB
      res.status(400).json({ error: 'Gift QR image exceeds maximum limit of 10 MB.' });
      return;
    }
    objectKey = `invitations/${invitationId}/gift-qr.webp`;
  } else {
    res.status(400).json({ error: 'Unsupported mediaType. Allowed: video, poster, gift-qr' });
    return;
  }

  try {
    const command = new PutObjectCommand({
      Bucket: r2.bucketName,
      Key: objectKey,
      ContentType: contentType,
    });

    // 15 minutes = 900 seconds
    const presignedUrl = await getSignedUrl(r2.client, command, { expiresIn: 900 });

    res.json({
      presignedUrl,
      objectKey,
    });
  } catch (err: any) {
    console.error('Error generating presigned URL:', err);
    res.status(500).json({ error: err.message || 'Failed to generate presigned upload URL' });
  }
});

// 2. Server-side Delete Media Endpoint
app.post('/api/r2/delete', verifySupabaseAdmin, async (req: Request, res: Response): Promise<void> => {
  const { invitationId, mediaType } = req.body;

  if (!invitationId || !mediaType) {
    res.status(400).json({ error: 'Missing required parameters: invitationId and mediaType' });
    return;
  }

  const r2 = getR2Client();
  if (!r2) {
    res.status(500).json({ error: 'Cloudflare R2 environment variables are not configured.' });
    return;
  }

  // Verify invitation existence in Supabase if configured
  if (supabase) {
    const { data: inv } = await supabase.from('invitations').select('id').eq('id', invitationId).single();
    if (!inv) {
      console.warn(`R2 delete warning: Invitation ${invitationId} not found in Supabase table.`);
    }
  }

  // Derive object key server-side safely
  const keysToDelete: string[] = [];
  if (mediaType === 'video') {
    keysToDelete.push(`invitations/${invitationId}/video.mp4`);
  } else if (mediaType === 'poster') {
    keysToDelete.push(`invitations/${invitationId}/poster.webp`);
  } else if (mediaType === 'gift-qr') {
    keysToDelete.push(`invitations/${invitationId}/gift-qr.webp`);
  } else if (mediaType === 'all') {
    keysToDelete.push(`invitations/${invitationId}/video.mp4`);
    keysToDelete.push(`invitations/${invitationId}/poster.webp`);
    keysToDelete.push(`invitations/${invitationId}/gift-qr.webp`);
  } else {
    res.status(400).json({ error: 'Invalid mediaType for deletion.' });
    return;
  }

  try {
    await Promise.all(
      keysToDelete.map((key) =>
        r2.client.send(
          new DeleteObjectCommand({
            Bucket: r2.bucketName,
            Key: key,
          })
        ).catch((e) => {
          console.warn(`Notice: Failed to delete R2 key ${key}:`, e.message);
        })
      )
    );

    res.json({ success: true, deletedKeys: keysToDelete });
  } catch (err: any) {
    console.error('Error deleting R2 object:', err);
    res.status(500).json({ error: err.message || 'Failed to delete R2 object' });
  }
});

// ====================================================================
// VITE / STATIC SERVING PIPELINE
// ====================================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    app.use(express.static(distPath));

    app.get('/invite/:slug*', async (req: Request, res: Response) => {
      const siteUrl = publicSiteUrl(req);
      const canonicalUrl = `${siteUrl}/invite/${encodeURIComponent(req.params.slug)}`;
      let html = await readFile(indexPath, 'utf8');

      if (!supabase) {
        res.type('html').send(replaceSeoHead(html, {
          title: DEFAULT_TITLE,
          description: DEFAULT_DESCRIPTION,
          canonicalUrl,
          image: `${siteUrl}/maiya-social-preview.png`,
          imageAlt: 'Maiya Digital Invitation elegant wedding RSVP stationery',
          type: 'website',
          robots: 'noindex, nofollow',
        }));
        return;
      }

      const { data: invitation } = await supabase
        .from('invitations')
        .select('slug, bride_name, groom_name, wedding_date, wedding_time, venue_name, venue_address, poster_url, poster_key')
        .eq('slug', req.params.slug)
        .eq('status', 'active')
        .maybeSingle();

      if (!invitation) {
        res.status(404).type('html').send(replaceSeoHead(html, {
          title: 'Invitation Not Found | Maiya',
          description: DEFAULT_DESCRIPTION,
          canonicalUrl,
          image: `${siteUrl}/maiya-social-preview.png`,
          imageAlt: 'Maiya Digital Invitation elegant wedding RSVP stationery',
          type: 'website',
          robots: 'noindex, nofollow',
        }));
        return;
      }

      const title = `${invitation.bride_name} & ${invitation.groom_name} Wedding Invitation | Maiya`;
      const description = `You are invited to celebrate the wedding of ${invitation.bride_name} and ${invitation.groom_name}. View event details and RSVP online.`;
      const image =
        stablePublicImage(r2PublicUrl(invitation.poster_key)) ||
        stablePublicImage(invitation.poster_url) ||
        `${siteUrl}/maiya-social-preview.png`;
      const imageAlt = `${invitation.bride_name} and ${invitation.groom_name} wedding invitation`;
      const event: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: `${invitation.bride_name} & ${invitation.groom_name} Wedding`,
        description,
        startDate: invitation.wedding_date && invitation.wedding_time
          ? `${invitation.wedding_date}T${invitation.wedding_time}`
          : invitation.wedding_date,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        url: canonicalUrl,
        image: [image],
      };
      if (invitation.venue_name || invitation.venue_address) {
        event.location = {
          '@type': 'Place',
          ...(invitation.venue_name ? { name: invitation.venue_name } : {}),
          ...(invitation.venue_address
            ? { address: { '@type': 'PostalAddress', streetAddress: invitation.venue_address } }
            : {}),
        };
      }

      html = replaceSeoHead(html, {
        title,
        description,
        canonicalUrl,
        image,
        imageAlt,
        type: 'website',
        robots: 'index, follow, max-image-preview:large',
        structuredData: event,
      });
      res.type('html').send(html);
    });

    app.get('*', async (req: Request, res: Response) => {
      const siteUrl = publicSiteUrl(req);
      const html = await readFile(indexPath, 'utf8');
      res.type('html').send(replaceSeoHead(html, {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        canonicalUrl: `${siteUrl}${req.path}`,
        image: `${siteUrl}/maiya-social-preview.png`,
        imageAlt: 'Maiya Digital Invitation elegant wedding RSVP stationery',
        type: 'website',
        robots: 'noindex, nofollow',
      }));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

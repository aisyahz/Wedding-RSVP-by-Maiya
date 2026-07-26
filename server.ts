import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Supabase admin validator
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

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
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

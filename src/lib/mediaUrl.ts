declare const __CLOUDFLARE_R2_PUBLIC_DOMAIN__: string;

const CLOUDFLARE_R2_PUBLIC_DOMAIN = String(
  __CLOUDFLARE_R2_PUBLIC_DOMAIN__ || ''
).replace(/\/+$/, '');

export function buildR2PublicUrl(videoKey?: string | null): string {
  if (!videoKey || !CLOUDFLARE_R2_PUBLIC_DOMAIN) return '';
  return `${CLOUDFLARE_R2_PUBLIC_DOMAIN}/${videoKey.replace(/^\/+/, '')}`;
}

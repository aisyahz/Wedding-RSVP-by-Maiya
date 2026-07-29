import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Invitation } from '../types';
import { buildR2PublicUrl } from '../lib/mediaUrl';

const DEFAULT_TITLE = 'Maiya Digital Invitation | Elegant Wedding RSVP';
const DEFAULT_DESCRIPTION =
  'Create and share elegant digital wedding invitations with RSVP, guest messages, event details, maps, photos, and video invitations.';
const DEFAULT_IMAGE_PATH = '/maiya-social-preview.png';
const PRIVATE_ROUTE_TITLES: Array<[RegExp, string]> = [
  [/^\/login$/, 'Admin Login | Maiya Digital Invitation'],
  [/^\/dashboard$/, 'Dashboard | Maiya Digital Invitation'],
  [/^\/invitations(?:\/|$)/, 'Invitation Management | Maiya'],
  [/^\/rsvp$/, 'RSVP Management | Maiya'],
  [/^\/settings$/, 'Settings | Maiya Digital Invitation'],
  [/^\/report\//, 'Private RSVP Report | Maiya'],
];

const env = (import.meta as any).env || {};

function normalizedSiteUrl(): string {
  const configured = String(env.VITE_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
  return configured || window.location.origin;
}

function stablePublicImage(invitation?: Invitation | null): string {
  const candidate = invitation?.posterKey
    ? buildR2PublicUrl(invitation.posterKey)
    : invitation?.posterUrl || '';

  if (!/^https?:\/\//i.test(candidate)) return '';
  if (/^blob:/i.test(candidate) || /[?&]X-Amz-/i.test(candidate)) return '';
  return candidate;
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
}

function upsertCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
}

export function SeoMetadata({ invitation }: { invitation?: Invitation | null }) {
  const location = useLocation();

  useEffect(() => {
    const siteUrl = normalizedSiteUrl();
    const isInvitationRoute = /^\/invite\/[^/]+/.test(location.pathname);
    const activeInvitation =
      isInvitationRoute && invitation?.slug && location.pathname.includes(`/invite/${invitation.slug}`)
        ? invitation
        : null;

    const canonicalPath = activeInvitation
      ? `/invite/${activeInvitation.slug}`
      : location.pathname;
    const canonicalUrl = `${siteUrl}${canonicalPath}`;
    const privateTitle = PRIVATE_ROUTE_TITLES.find(([pattern]) =>
      pattern.test(location.pathname)
    )?.[1];
    const title = activeInvitation
      ? `${activeInvitation.brideName} & ${activeInvitation.groomName} | Digital Wedding Invitation`
      : privateTitle || DEFAULT_TITLE;
    const description = activeInvitation
      ? 'You are warmly invited to celebrate our special day.'
      : DEFAULT_DESCRIPTION;
    const image =
      stablePublicImage(activeInvitation) || `${siteUrl}${DEFAULT_IMAGE_PATH}`;
    const imageAlt = activeInvitation
      ? `${activeInvitation.brideName} and ${activeInvitation.groomName} wedding invitation`
      : 'Maiya Digital Invitation elegant wedding RSVP stationery';
    const robots = activeInvitation
      ? 'index, follow, max-image-preview:large'
      : 'noindex, nofollow';

    document.title = title;
    document.documentElement.lang = 'en-MY';
    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[name="robots"]', { name: 'robots', content: robots });
    upsertMeta('meta[property="og:type"]', {
      property: 'og:type',
      content: 'website',
    });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image });
    upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: imageAlt });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image });
    upsertMeta('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt', content: imageAlt });
    upsertCanonical(canonicalUrl);

    document.getElementById('maiya-event-structured-data')?.remove();
    if (activeInvitation) {
      const event: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: `${activeInvitation.brideName} & ${activeInvitation.groomName} Wedding`,
        description,
        startDate: activeInvitation.weddingDate,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        url: canonicalUrl,
      };
      if (activeInvitation.venueName || activeInvitation.venueAddress) {
        event.location = {
          '@type': 'Place',
          ...(activeInvitation.venueName ? { name: activeInvitation.venueName } : {}),
          ...(activeInvitation.venueAddress
            ? { address: { '@type': 'PostalAddress', streetAddress: activeInvitation.venueAddress } }
            : {}),
        };
      }
      if (image) event.image = [image];

      const script = document.createElement('script');
      script.id = 'maiya-event-structured-data';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(event);
      document.head.appendChild(script);
    }
  }, [invitation, location.pathname]);

  return null;
}

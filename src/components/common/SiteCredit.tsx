import React from 'react';

interface SiteCreditProps {
  guest?: boolean;
}

const INSTAGRAM_URL =
  'https://www.instagram.com/etahhhhhhhh?igsh=eW8yNXVvNGE4a281&utm_source=qr';

export const SiteCredit: React.FC<SiteCreditProps> = ({ guest = false }) => (
  <p
    className={
      guest
        ? 'text-center text-[7px] leading-none tracking-[0.06em] text-white/45 drop-shadow-sm'
        : 'text-center text-[10px] text-secondary/80'
    }
  >
    Website built by{' '}
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="AZ Studio on Instagram"
      className="font-semibold underline decoration-current/30 underline-offset-2 transition-opacity hover:opacity-75"
    >
      AZ Studio
    </a>
  </p>
);

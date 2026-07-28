export type GuestLanguage = 'bm' | 'en';

export const guestTranslations = {
  bm: {
    language: 'Bahasa', celebrateLove: 'Raikan Cinta', openInvitation: 'Buka Undangan',
    invitationNavigation: 'Navigasi jemputan', calendar: 'Kalendar', location: 'Lokasi', rsvp: 'RSVP', contact: 'Hubungi', gifts: 'Hadiah',
    calendarTitle: 'Menuju Hari Bahagia', locationTitle: 'Lokasi Majlis', rsvpTitle: 'RSVP & Ucapan', contactTitle: 'Hubungi Keluarga', giftsTitle: 'Hadiah & Tanda Kasih',
    days: 'Hari', hours: 'Jam', minutes: 'Minit', seconds: 'Saat', venueUnavailable: 'Lokasi belum tersedia',
    guestName: 'Nama Tetamu', yourName: 'Nama anda', attendance: 'Kehadiran', attending: 'Hadir', notAttending: 'Tidak Hadir',
    guestCount: 'Jumlah Tetamu', messagePrayer: 'Ucapan dan Doa', messagePlaceholder: 'Titipkan ucapan buat mempelai…',
    submitRsvp: 'Hantar RSVP', submitting: 'Menghantar…', nameRequired: 'Sila masukkan nama tetamu.', submitError: 'RSVP tidak dapat dihantar. Sila cuba lagi.',
    thankYou: 'Terima Kasih', successMessage: 'Kehadiran anda berjaya direkodkan.', close: 'Tutup',
    guestMessages: 'Ucapan Tetamu', noMessages: 'Belum ada ucapan. Jadilah yang pertama.',
    weddingRepresentative: 'Wakil Pengantin', weddingFamily: 'Keluarga Pengantin', contactUnavailable: 'Maklumat hubungan belum tersedia.', call: 'Hubungi',
    giftQrAlt: 'Kod QR hadiah', copied: 'Telah Disalin', copyAccount: 'Salin Nombor Akaun', openWishlist: 'Buka Wishlist',
    turnOnAudio: 'Hidupkan audio', muteAudio: 'Senyapkan audio', closePanel: 'Tutup panel', closeNamedPanel: 'Tutup {title}',
    expandedPanel: 'Panel dikembangkan. Seret ke bawah untuk mengecilkan.', compactPanel: 'Panel ringkas. Seret ke atas untuk mengembangkan.',
    goToRsvp: 'Pergi ke bahagian RSVP', eventTitle: 'Majlis Perkahwinan {names}',
  },
  en: {
    language: 'Language', celebrateLove: 'Celebrate Love', openInvitation: 'Open Invitation',
    invitationNavigation: 'Invitation navigation', calendar: 'Calendar', location: 'Location', rsvp: 'RSVP', contact: 'Contact', gifts: 'Gifts',
    calendarTitle: 'Countdown to the Celebration', locationTitle: 'Event Location', rsvpTitle: 'RSVP & Message', contactTitle: 'Contact the Family', giftsTitle: 'Gifts & Well Wishes',
    days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds', venueUnavailable: 'Location not available',
    guestName: 'Guest Name', yourName: 'Your name', attendance: 'Attendance', attending: 'Attending', notAttending: 'Not Attending',
    guestCount: 'Number of Guests', messagePrayer: 'Message & Prayer', messagePlaceholder: 'Write your message and prayer for the couple…',
    submitRsvp: 'Submit RSVP', submitting: 'Submitting…', nameRequired: 'Please enter the guest name.', submitError: 'RSVP could not be submitted. Please try again.',
    thankYou: 'Thank You', successMessage: 'Your attendance has been successfully recorded.', close: 'Close',
    guestMessages: 'Guest Messages', noMessages: 'No messages yet. Be the first.',
    weddingRepresentative: 'Wedding Representative', weddingFamily: 'Wedding Family', contactUnavailable: 'Contact information is not available yet.', call: 'Call',
    giftQrAlt: 'Gift QR code', copied: 'Copied', copyAccount: 'Copy Account Number', openWishlist: 'Open Wishlist',
    turnOnAudio: 'Turn on audio', muteAudio: 'Mute audio', closePanel: 'Close panel', closeNamedPanel: 'Close {title}',
    expandedPanel: 'Panel expanded. Drag down to collapse.', compactPanel: 'Panel collapsed. Drag up to expand.',
    goToRsvp: 'Go to the RSVP section', eventTitle: 'Wedding Celebration of {names}',
  },
} as const;

export type GuestTranslationKey = keyof typeof guestTranslations.bm;

import React, { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { Invitation, RsvpEntry, SystemSettings, ScreenId } from './types';
import { INITIAL_SETTINGS } from './data/mockData';
import {
  getInvitations,
  getInvitationById,
  getRsvps,
  createInvitationWithPin,
  updateInvitationInSupabase,
  deleteInvitationFromSupabase,
  addRsvpToSupabase,
  deleteRsvpFromSupabase,
  getInvitationBySlug,
  logoutAdmin,
  isSupabaseConfigured,
  supabase,
} from './lib/supabase';
import { CheckCircle2, AlertCircle, Loader2, KeyRound, Copy } from 'lucide-react';
import { SeoMetadata } from './components/SeoMetadata';

// Layouts
import { AdminLayout } from './components/layout/AdminLayout';
import { GuestLayout } from './components/layout/GuestLayout';

// Screen Imports
import { AdminLoginScreen } from './components/screens/AdminLoginScreen';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { InvitationListScreen } from './components/screens/InvitationListScreen';
import { CreateInvitationScreen } from './components/screens/CreateInvitationScreen';
import { UploadVideoScreen } from './components/screens/UploadVideoScreen';
import { GenerateLinkScreen } from './components/screens/GenerateLinkScreen';
import { PremiumGuestExperienceScreen } from './components/screens/PremiumGuestExperienceScreen';
import { ThankYouScreen } from './components/screens/ThankYouScreen';
import { PrivateRsvpReportScreen } from './components/screens/PrivateRsvpReportScreen';
import { AdminRsvpScreen } from './components/screens/AdminRsvpScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';

function NavigationAdapter({
  children,
  selectedInvitationId = '',
  activeInvitation = null,
}: {
  children: (onNavigate: (screen: ScreenId, slugOrId?: string) => void) => React.ReactNode;
  selectedInvitationId?: string;
  activeInvitation?: Invitation | null;
}) {
  const navigate = useNavigate();
  const handleNavigate = (screen: ScreenId, slugOrId?: string) => {
    let target = '/dashboard';
    switch (screen) {
      case 'login': target = '/login'; break;
      case 'dashboard': target = '/dashboard'; break;
      case 'invitation_list': target = '/invitations'; break;
      case 'create_invitation':
        target = slugOrId ? `/invitations/${slugOrId}/edit` : '/invitations/new';
        break;
      case 'upload_video': target = `/invitations/${slugOrId || selectedInvitationId}/upload-video`; break;
      case 'generate_link': target = `/invitations/${slugOrId || selectedInvitationId}/generate-link`; break;
      case 'guest_opening': {
        const slug = slugOrId || activeInvitation?.slug;
        if (!slug) return;
        target = `/invite/${slug}`;
        break;
      }
      case 'guest_invitation': {
        const slug = slugOrId || activeInvitation?.slug;
        if (!slug) return;
        target = `/invite/${slug}/details`;
        break;
      }
      case 'guest_rsvp_form': {
        const slug = slugOrId || activeInvitation?.slug;
        if (!slug) return;
        target = `/invite/${slug}/rsvp`;
        break;
      }
      case 'thank_you': {
        const slug = slugOrId || activeInvitation?.slug;
        if (!slug) return;
        target = `/invite/${slug}/thank-you`;
        break;
      }
      case 'private_rsvp_report': {
        const slug = slugOrId || activeInvitation?.slug;
        if (!slug) return;
        target = `/report/${slug}`;
        break;
      }
      case 'admin_rsvp': target = '/rsvp'; break;
      case 'settings': target = '/settings'; break;
    }
    navigate(target);
  };

  return <>{children(handleNavigate)}</>;
}

function DiagnosticRedirect({ to }: { to: string; reason: string }) {
  return <Navigate to={to} replace />;
}

interface EditInvitationRouteProps {
  invitations: Invitation[];
  editingInvitation: Invitation | null;
  activeInvitation: Invitation | null;
  selectedInvitationId: string;
  setInvitations: React.Dispatch<React.SetStateAction<Invitation[]>>;
  setEditingInvitation: React.Dispatch<React.SetStateAction<Invitation | null>>;
  setSelectedInvitationId: React.Dispatch<React.SetStateAction<string>>;
  onSaveInvitation: (invitation: Partial<Invitation>) => Promise<Invitation | null>;
  onVideoFileSelected: React.Dispatch<React.SetStateAction<File | null>>;
}

function EditInvitationRoute({
  invitations,
  editingInvitation,
  activeInvitation,
  selectedInvitationId,
  setInvitations,
  setEditingInvitation,
  setSelectedInvitationId,
  onSaveInvitation,
  onVideoFileSelected,
}: EditInvitationRouteProps) {
  const { id } = useParams<{ id: string }>();
  const [fetchedInvitation, setFetchedInvitation] = useState<Invitation | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const inv =
    invitations.find((item) => item.id === id) ||
    (editingInvitation?.id === id ? editingInvitation : null) ||
    (fetchedInvitation?.id === id ? fetchedInvitation : null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsFetching(true);
    setFetchError('');

    async function loadInvitation() {
      const { data, error } = await getInvitationById(id!);
      if (cancelled) return;
      setIsFetching(false);
      if (!data) {
        setFetchError(error || 'Rekod jemputan tidak ditemui.');
        return;
      }

      setFetchedInvitation(data);
      setEditingInvitation(data);
      setSelectedInvitationId(data.id);
      setInvitations((previous) =>
        previous.some((item) => item.id === data.id)
          ? previous.map((item) => item.id === data.id ? data : item)
          : [data, ...previous],
      );
    }

    void loadInvitation();
    return () => {
      cancelled = true;
    };
  }, [id, setEditingInvitation, setInvitations, setSelectedInvitationId]);

  if (isFetching && !inv) {
    return (
      <div className="max-w-2xl mx-auto card-maiya p-6 flex items-center justify-center gap-3 text-sm text-[#77736D]">
        <Loader2 className="w-5 h-5 animate-spin text-[#9B7B63]" />
        <span>Memuatkan maklumat jemputan…</span>
      </div>
    );
  }

  if (!inv && fetchError) {
    return (
      <div className="max-w-2xl mx-auto card-maiya p-6 text-rose-800">
        <h1 className="font-title font-bold">Jemputan tidak dapat disunting</h1>
        <p className="mt-2 text-sm">{fetchError}</p>
      </div>
    );
  }

  return (
    <NavigationAdapter selectedInvitationId={selectedInvitationId} activeInvitation={inv || activeInvitation}>
      {(onNavigate) => (
        <CreateInvitationScreen
          onNavigate={onNavigate}
          editingInvitation={inv}
          onSaveInvitation={onSaveInvitation}
          onVideoFileSelected={onVideoFileSelected}
        />
      )}
    </NavigationAdapter>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [rsvps, setRsvps] = useState<RsvpEntry[]>([]);
  const [selectedInvitationId, setSelectedInvitationId] = useState<string>('');
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [seoInvitation, setSeoInvitation] = useState<Invitation | null>(null);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [pendingUploadInvitation, setPendingUploadInvitation] = useState<Invitation | null>(null);

  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [createdPinModal, setCreatedPinModal] = useState<{
    brideName: string;
    groomName: string;
    pin: string;
    slug: string;
  } | null>(null);

  // Restore and continuously track the real Supabase Auth session.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSession(null);
      setIsAuthReady(true);
      return;
    }

    let active = true;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setIsAuthReady(true);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      const restoredSession = error ? null : data.session;
      setSession(restoredSession);
      setIsAuthReady(true);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Load admin data only after a real authenticated session is restored.
  useEffect(() => {
    if (!isAuthReady) return;
    if (!session?.access_token || !session.user) {
      setInvitations([]);
      setRsvps([]);
      setIsLoadingData(false);
      return;
    }

    async function initData() {
      setIsLoadingData(true);
      const [invRes, rsvpRes] = await Promise.all([getInvitations(), getRsvps()]);

      if (invRes.data) {
        setInvitations(invRes.data);
        if (invRes.data.length > 0) {
          setSelectedInvitationId(invRes.data[0].id);
        }
      }
      if (rsvpRes.data) {
        setRsvps(rsvpRes.data);
      }
      setIsLoadingData(false);
    }

    initData();
  }, [isAuthReady, session?.access_token, session?.user]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const activeInvitation =
    invitations.find((i) => i.id === selectedInvitationId) || invitations[0] || null;

  const handleSaveInvitation = async (invData: Partial<Invitation>): Promise<Invitation | null> => {
    if (editingInvitation) {
      // EDIT EXISTING INVITATION
      const { data: updatedInv, error } = await updateInvitationInSupabase(editingInvitation.id, invData);
      if (error || !updatedInv) {
        showToast('error', `Gagal mengemas kini kad: ${error || 'Ralat simpan'}`);
        return null;
      }

      setInvitations((prev) => prev.map((item) => (item.id === updatedInv.id ? updatedInv : item)));
      setEditingInvitation(null);
      showToast('success', 'Tetapan kad jemputan berjaya dikemas kini!');
      return updatedInv;
    } else {
      // CREATE NEW INVITATION WITH GENERATED PIN RPC
      const { data, error } = await createInvitationWithPin(invData);
      if (error || !data) {
        showToast('error', `Gagal mencipta kad jemputan: ${error || 'Ralat cipta'}`);
        return null;
      }

      const { invitation: newInv, plainPin } = data;
      setInvitations((prev) => [newInv, ...prev]);
      setSelectedInvitationId(newInv.id);
      setPendingUploadInvitation(newInv);

      // Show generated 6-digit PIN modal once after creation
      setCreatedPinModal({
        brideName: newInv.brideName,
        groomName: newInv.groomName,
        pin: plainPin,
        slug: newInv.slug,
      });

      showToast('success', 'Kad jemputan baharu & PIN keselamatan 6-digit berjaya dicipta!');
      return newInv;
    }
  };

  const handleEditInvitation = (inv: Invitation | null) => {
    setEditingInvitation(inv);
    if (inv) {
      setSelectedInvitationId(inv.id);
    }
  };

  const handleDeleteInvitation = async (id: string) => {
    if (!id || typeof id !== 'string') {
      showToast('error', 'Ralat ID kad jemputan tidak sah.');
      return;
    }

    const { success, warning, error } = await deleteInvitationFromSupabase(id);
    if (!success) {
      showToast('error', `Gagal memadamkan kad jemputan: ${error}`);
      return;
    }

    setInvitations((prev) => prev.filter((i) => i.id !== id));
    if (selectedInvitationId === id && invitations.length > 1) {
      const remaining = invitations.filter((i) => i.id !== id);
      setSelectedInvitationId(remaining[0]?.id || '');
    }
    if (warning) {
      showToast('error', `Kad dipadam, tetapi media R2 mungkin masih wujud: ${warning}`);
    } else {
      showToast('success', 'Kad jemputan berjaya dipadamkan.');
    }
  };

  const handleDuplicateInvitation = async (inv: Invitation) => {
    const duplicatedData: Partial<Invitation> = {
      brideName: `${inv.brideName} (Salinan)`,
      groomName: inv.groomName,
      slug: `${inv.slug}-salinan-${Date.now().toString().slice(-4)}`,
      weddingDate: inv.weddingDate,
      weddingTime: inv.weddingTime,
      venueName: inv.venueName,
      venueAddress: inv.venueAddress,
      googleMapsUrl: inv.googleMapsUrl,
      wazeUrl: inv.wazeUrl,
      whatsappContact: inv.whatsappContact,
      wishlistUrl: inv.wishlistUrl,
      enableGiftSection: inv.enableGiftSection,
      bankGift: inv.bankGift,
      rsvpClosingDate: inv.rsvpClosingDate,
      videoKey: inv.videoKey,
      videoFileName: inv.videoFileName,
      status: 'active',
    };

    const { data, error } = await createInvitationWithPin(duplicatedData);
    if (error || !data) {
      showToast('error', `Gagal menyalin kad: ${error}`);
      return;
    }

    setInvitations((prev) => [data.invitation, ...prev]);
    setCreatedPinModal({
      brideName: data.invitation.brideName,
      groomName: data.invitation.groomName,
      pin: data.plainPin,
      slug: data.invitation.slug,
    });
    showToast('success', 'Salinan kad jemputan berjaya dicipta!');
  };

  const handleUpdateVideo = async (
    invitationId: string,
    videoKey: string,
    videoUrl: string,
    fileName: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await updateInvitationInSupabase(invitationId, {
      videoKey,
      videoUrl,
      videoFileName: fileName,
    });
    if (!data || error) {
      const exactError = error || 'Supabase returned no updated invitation';
      showToast('error', `Gagal menyimpan video: ${exactError}`);
      return { success: false, error: exactError };
    }

    setInvitations((prev) => prev.map((i) => (i.id === data.id ? data : i)));
    setPendingVideoFile(null);
    setPendingUploadInvitation(null);
    showToast('success', 'Video kad jemputan berjaya dikemas kini!');
    return { success: true };
  };

  const handleAddRsvp = async (newRsvp: Omit<RsvpEntry, 'id' | 'submittedAt'>) => {
    const { data: savedRsvp, error } = await addRsvpToSupabase(newRsvp);
    if (error || !savedRsvp) {
      const message = error || 'RSVP tidak dapat disimpan.';
      showToast('error', `Ralat menghantar RSVP: ${message}`);
      return { success: false, error: message };
    }

    setRsvps((prev) => [savedRsvp, ...prev]);
    showToast('success', 'Terima kasih! Kehadiran anda telah berjaya direkodkan.');
    return { success: true };
  };

  const handleDeleteRsvp = async (id: string) => {
    const { success, error } = await deleteRsvpFromSupabase(id);
    if (!success) {
      showToast('error', `Gagal memadam RSVP: ${error}`);
      return;
    }

    setRsvps((prev) => prev.filter((r) => r.id !== id));
    showToast('success', 'Rekod RSVP dipadamkan.');
  };

  const handleLogout = async () => {
    const result = await logoutAdmin();
    if (result.success) setSession(null);
  };

  // Wrapper for Upload Video by ID
  function UploadVideoWrapper() {
    const { id } = useParams<{ id: string }>();
    const [fetchedInvitation, setFetchedInvitation] = useState<Invitation | null>(null);
    const [fetchError, setFetchError] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const inv =
      invitations.find((i) => i.id === id) ||
      (pendingUploadInvitation?.id === id ? pendingUploadInvitation : null) ||
      (activeInvitation?.id === id ? activeInvitation : null) ||
      fetchedInvitation;

    useEffect(() => {
      if (!id) {
        setFetchError('ID jemputan tiada pada URL. Muat naik tidak boleh diteruskan.');
        return;
      }
      let cancelled = false;
      setIsFetching(true);
      getInvitationById(id).then(({ data, error }) => {
        if (cancelled) return;
        setIsFetching(false);
        if (data) {
          setFetchedInvitation(data);
          setInvitations((prev) => prev.some((item) => item.id === data.id) ? prev : [data, ...prev]);
        } else {
          setFetchError(error || 'Rekod jemputan tidak ditemui.');
        }
      });
      return () => {
        cancelled = true;
      };
    }, [id]);

    if (!id || (!inv && fetchError)) {
      return (
        <div className="max-w-2xl mx-auto card-maiya p-6 text-rose-800">
          <h1 className="font-title font-bold">Video upload unavailable</h1>
          <p className="mt-2 text-sm">{fetchError || 'ID jemputan tiada pada URL.'}</p>
        </div>
      );
    }

    if (!inv && isFetching) {
      return (
        <div className="max-w-2xl mx-auto card-maiya p-6 flex items-center justify-center gap-3 text-sm text-[#77736D]">
          <Loader2 className="w-5 h-5 animate-spin text-[#9B7B63]" />
          <span>Memuatkan jemputan…</span>
        </div>
      );
    }
    return (
      <NavigationAdapter selectedInvitationId={selectedInvitationId} activeInvitation={activeInvitation}>
        {(onNavigate) => (
          <UploadVideoScreen
            onNavigate={onNavigate}
            activeInvitation={inv}
            onUpdateVideo={handleUpdateVideo}
            initialVideoFile={pendingVideoFile}
            onPendingVideoCleared={() => setPendingVideoFile(null)}
          />
        )}
      </NavigationAdapter>
    );
  }

  // Wrapper for Generate/Preview Link by ID
  function PreviewWrapper() {
    const { id } = useParams<{ id: string }>();
    const [fetchedInvitation, setFetchedInvitation] = useState<Invitation | null>(null);
    const [fetchError, setFetchError] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const inv =
      invitations.find((i) => i.id === id) ||
      (activeInvitation?.id === id ? activeInvitation : null) ||
      fetchedInvitation;

    useEffect(() => {
      if (!id) return;
      let cancelled = false;
      setIsFetching(true);
      getInvitationById(id).then(({ data, error }) => {
        if (cancelled) return;
        setIsFetching(false);
        if (data) {
          setFetchedInvitation(data);
          setSelectedInvitationId(data.id);
          setInvitations((prev) =>
            prev.some((item) => item.id === data.id)
              ? prev.map((item) => item.id === data.id ? data : item)
              : [data, ...prev],
          );
        } else {
          setFetchError(error || 'Rekod jemputan tidak ditemui.');
        }
      });
      return () => {
        cancelled = true;
      };
    }, [id]);

    if (isFetching && !inv) {
      return (
        <div className="max-w-xl mx-auto card-maiya p-6 flex items-center justify-center gap-3 text-sm text-[#77736D]">
          <Loader2 className="w-5 h-5 animate-spin text-[#9B7B63]" />
          <span>Memuatkan pautan jemputan…</span>
        </div>
      );
    }

    if (!inv && fetchError) {
      return (
        <div className="max-w-xl mx-auto card-maiya p-6 text-rose-800">
          <h1 className="font-title font-bold">Pautan tidak dapat dijana</h1>
          <p className="mt-2 text-sm">{fetchError}</p>
        </div>
      );
    }
    return (
      <NavigationAdapter selectedInvitationId={selectedInvitationId} activeInvitation={inv || activeInvitation}>
        {(onNavigate) => (
          <GenerateLinkScreen
            onNavigate={onNavigate}
            activeInvitation={inv}
          />
        )}
      </NavigationAdapter>
    );
  }

  // Public Guest Route Component (Dynamic fetch by slug)
  function GuestRouteWrapper({
    renderScreen,
  }: {
    renderScreen: (
      inv: Invitation | null,
      onNavigate: (screen: ScreenId) => void,
      loading: boolean,
      errorMsg?: string
    ) => React.ReactNode;
  }) {
    const { slug } = useParams<{ slug: string }>();
    const [fetchedInv, setFetchedInv] = useState<Invitation | null>(
      invitations.find((i) => i.slug === slug) || null
    );
    const [loading, setLoading] = useState<boolean>(!fetchedInv);
    const [errorMsg, setErrorMsg] = useState<string>('');

    useEffect(() => {
      let isMounted = true;
      async function loadBySlug() {
        if (!slug) return;
        setSeoInvitation(null);
        const memoryInv = invitations.find((i) => i.slug === slug);
        if (memoryInv) {
          setFetchedInv(memoryInv);
          setSeoInvitation(memoryInv);
          setLoading(false);
          return;
        }

        setLoading(true);
        const { data, error } = await getInvitationBySlug(slug);
        if (isMounted) {
          if (data) {
            setFetchedInv(data);
            setSeoInvitation(data);
            setErrorMsg('');
          } else {
            setSeoInvitation(null);
            setErrorMsg(error || 'Kad jemputan tidak dijumpai atau telah tamat tempoh.');
          }
          setLoading(false);
        }
      }

      loadBySlug();
      return () => {
        isMounted = false;
      };
    }, [slug, invitations]);

    return (
      <NavigationAdapter selectedInvitationId={selectedInvitationId} activeInvitation={activeInvitation}>
        {(onNavigate) => {
          const navHandler = (screen: ScreenId) => onNavigate(screen, slug);
          if (loading) {
            return (
              <div className="min-h-dvh bg-[#1E1E1C] flex flex-col items-center justify-center p-6 text-white text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#9B7B63]" />
                <p className="font-serif text-sm">Memuatkan kad jemputan...</p>
              </div>
            );
          }
          if (errorMsg && !fetchedInv) {
            return (
              <div className="min-h-dvh bg-[#1E1E1C] flex flex-col items-center justify-center p-6 text-white text-center space-y-4">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                <h1 className="font-title text-xl font-bold">Kad Tidak Dijumpai</h1>
                <p className="text-xs text-[#D9D2CA] max-w-xs">{errorMsg}</p>
              </div>
            );
          }
          return <>{renderScreen(fetchedInv, navHandler, loading, errorMsg)}</>;
        }}
      </NavigationAdapter>
    );
  }

  return (
    <BrowserRouter>
      <SeoMetadata invitation={seoInvitation} />
      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed top-[calc(0.75rem+env(safe-area-inset-top))] left-3 right-3 sm:left-auto sm:right-4 z-50 sm:max-w-sm animate-in fade-in slide-in-from-top duration-300">
          <div
            className={`p-4 rounded-xl shadow-lg border flex items-center gap-3 text-xs font-semibold ${
              notification.type === 'success'
                ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
                : 'bg-rose-950 text-rose-100 border-rose-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* 6-Digit Generated PIN Overlay Modal */}
      {createdPinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-label="PIN keselamatan jemputan" className="card-maiya p-4 min-[360px]:p-6 max-w-md w-full min-w-0 max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white space-y-5 text-center shadow-2xl rounded-2xl border border-[#D9D2CA] animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-[#EFE7DF] text-[#9B7B63] flex items-center justify-center mx-auto border border-[#D9D2CA]">
              <KeyRound className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#9B7B63] tracking-widest">
                Kad Berjaya Dicipta
              </span>
              <h2 className="font-title text-xl font-bold text-[#1E1E1C]">
                PIN Keselamatan Peribadi Pasangan
              </h2>
              <p className="text-xs text-[#77736D]">
                For <strong>{createdPinModal.brideName} & {createdPinModal.groomName}</strong>
              </p>
            </div>

            <div className="p-4 bg-[#F7F5F2] rounded-xl border border-[#D9D2CA] space-y-2">
              <span className="text-xs font-semibold text-[#77736D] block uppercase">
                PIN Keselamatan 6 Digit
              </span>
              <div className="font-mono text-3xl font-extrabold tracking-[0.4em] text-[#1E1E1C]">
                {createdPinModal.pin}
              </div>
              <p className="text-[11px] text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-2 text-left">
                ⚠️ <strong>PENTING:</strong> Simpan atau catat PIN 6-digit ini. PIN ini dipaparkan <strong>SEKALI SAHAJA</strong> dan tidak disimpan dalam teks biasa untuk keselamatan.
              </p>
            </div>

            <div className="flex flex-col min-[360px]:flex-row gap-2 pt-1">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdPinModal.pin);
                  showToast('success', 'PIN 6-digit berjaya disalin!');
                }}
                className="flex-1 btn-outline h-11 text-xs gap-1.5 cursor-pointer"
              >
                <Copy className="w-4 h-4 text-[#9B7B63]" />
                <span>Salin PIN</span>
              </button>
              <button
                onClick={() => setCreatedPinModal(null)}
                className="flex-1 btn-primary h-11 text-xs cursor-pointer"
              >
                <span>Selesai</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Database Connection Info Banner */}
      {isLoadingData && (
        <div className="bg-[#1E1E1C] text-white py-1.5 px-4 text-center text-[11px] font-medium flex items-center justify-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9B7B63]" />
          <span>Sistem sedang memuatkan data jemputan dari Supabase Database...</span>
        </div>
      )}

      <Routes>
        {/* Admin Login Route */}
        <Route
          path="/login"
          element={
            isAuthReady && session?.access_token && session.user ? (
              <DiagnosticRedirect
                to="/dashboard"
                reason="Authenticated session already exists"
              />
            ) : (
              <NavigationAdapter selectedInvitationId={selectedInvitationId} activeInvitation={activeInvitation}>
                {(onNavigate) => (
                  <AdminLoginScreen
                    onNavigate={onNavigate}
                    onLoginSuccess={(authenticatedSession) => setSession(authenticatedSession)}
                  />
                )}
              </NavigationAdapter>
            )
          }
        />

        {/* Protected Admin Routes */}
        <Route
          element={
            !isAuthReady ? (
              <div className="min-h-dvh flex flex-col items-center justify-center gap-3 p-6 text-center text-[#77736D]">
                <Loader2 className="w-7 h-7 animate-spin text-[#9B7B63]" />
                <span className="text-sm">Menyemak sesi pentadbir…</span>
              </div>
            ) : session?.access_token && session.user ? (
              <AdminLayout onLogout={handleLogout} />
            ) : (
              <DiagnosticRedirect
                to="/login"
                reason="Protected admin route requested without an authenticated session"
              />
            )
          }
        >
          <Route
            path="/dashboard"
            element={
              <NavigationAdapter selectedInvitationId={selectedInvitationId} activeInvitation={activeInvitation}>
                {(onNavigate) => (
                  <DashboardScreen
                    currentScreen="dashboard"
                    onNavigate={onNavigate}
                    invitations={invitations}
                    rsvps={rsvps}
                    onSelectInvitationForPreview={(id) => setSelectedInvitationId(id)}
                    onEditInvitation={handleEditInvitation}
                    onDeleteInvitation={handleDeleteInvitation}
                    onDuplicateInvitation={handleDuplicateInvitation}
                  />
                )}
              </NavigationAdapter>
            }
          />

          <Route
            path="/invitations"
            element={
              <NavigationAdapter selectedInvitationId={selectedInvitationId} activeInvitation={activeInvitation}>
                {(onNavigate) => (
                  <InvitationListScreen
                    currentScreen="invitation_list"
                    onNavigate={onNavigate}
                    invitations={invitations}
                    rsvps={rsvps}
                    onSelectInvitation={(id) => setSelectedInvitationId(id)}
                    onEditInvitation={handleEditInvitation}
                    onDeleteInvitation={handleDeleteInvitation}
                    onDuplicateInvitation={handleDuplicateInvitation}
                  />
                )}
              </NavigationAdapter>
            }
          />

          <Route
            path="/invitations/new"
            element={
              <NavigationAdapter selectedInvitationId={selectedInvitationId} activeInvitation={activeInvitation}>
                {(onNavigate) => (
                  <CreateInvitationScreen
                    onNavigate={onNavigate}
                    editingInvitation={null}
                    onSaveInvitation={handleSaveInvitation}
                    onVideoFileSelected={setPendingVideoFile}
                  />
                )}
              </NavigationAdapter>
            }
          />

          <Route
            path="/invitations/:id/edit"
            element={
              <EditInvitationRoute
                invitations={invitations}
                editingInvitation={editingInvitation}
                activeInvitation={activeInvitation}
                selectedInvitationId={selectedInvitationId}
                setInvitations={setInvitations}
                setEditingInvitation={setEditingInvitation}
                setSelectedInvitationId={setSelectedInvitationId}
                onSaveInvitation={handleSaveInvitation}
                onVideoFileSelected={setPendingVideoFile}
              />
            }
          />
          <Route path="/invitations/:id/upload-video" element={<UploadVideoWrapper />} />
          <Route path="/invitations/:id/generate-link" element={<PreviewWrapper />} />
          <Route path="/invitations/:id/preview" element={<PreviewWrapper />} />

          <Route
            path="/rsvp"
            element={
              <NavigationAdapter selectedInvitationId={selectedInvitationId} activeInvitation={activeInvitation}>
                {(onNavigate) => (
                  <AdminRsvpScreen
                    currentScreen="admin_rsvp"
                    onNavigate={onNavigate}
                    invitations={invitations}
                    rsvps={rsvps}
                    onDeleteRsvp={handleDeleteRsvp}
                  />
                )}
              </NavigationAdapter>
            }
          />

          <Route
            path="/settings"
            element={
              <NavigationAdapter selectedInvitationId={selectedInvitationId} activeInvitation={activeInvitation}>
                {(onNavigate) => (
                  <SettingsScreen
                    currentScreen="settings"
                    onNavigate={onNavigate}
                    settings={settings}
                    onUpdateSettings={setSettings}
                    onLogout={handleLogout}
                  />
                )}
              </NavigationAdapter>
            }
          />
        </Route>

        {/* Public Guest Invitation Routes */}
        <Route element={<GuestLayout />}>
          <Route
            path="/invite/:slug"
            element={
              <GuestRouteWrapper
                renderScreen={(inv, onNavigate) => (
                  <PremiumGuestExperienceScreen
                    activeInvitation={inv}
                    rsvps={rsvps}
                    onAddRsvp={handleAddRsvp}
                  />
                )}
              />
            }
          />
          <Route
            path="/invite/:slug/opening"
            element={
              <GuestRouteWrapper
                renderScreen={(inv, onNavigate) => (
                  <PremiumGuestExperienceScreen
                    activeInvitation={inv}
                    rsvps={rsvps}
                    onAddRsvp={handleAddRsvp}
                  />
                )}
              />
            }
          />
          <Route
            path="/invite/:slug/details"
            element={
              <GuestRouteWrapper
                renderScreen={(inv, onNavigate) => (
                  <PremiumGuestExperienceScreen
                    activeInvitation={inv}
                    rsvps={rsvps}
                    onAddRsvp={handleAddRsvp}
                    initiallyOpened
                  />
                )}
              />
            }
          />
          <Route
            path="/invite/:slug/rsvp"
            element={
              <GuestRouteWrapper
                renderScreen={(inv, onNavigate) => (
                  <PremiumGuestExperienceScreen
                    activeInvitation={inv}
                    rsvps={rsvps}
                    onAddRsvp={handleAddRsvp}
                    initiallyOpened
                    initialFeature="rsvp"
                  />
                )}
              />
            }
          />
          <Route
            path="/invite/:slug/thank-you"
            element={
              <GuestRouteWrapper
                renderScreen={(inv, onNavigate) => (
                  <ThankYouScreen onNavigate={onNavigate} activeInvitation={inv} />
                )}
              />
            }
          />
          <Route
            path="/report/:slug"
            element={
              <GuestRouteWrapper
                renderScreen={(inv, onNavigate) => (
                  <PrivateRsvpReportScreen
                    onNavigate={onNavigate}
                    activeInvitation={inv}
                    rsvps={rsvps}
                  />
                )}
              />
            }
          />
        </Route>

        {/* Default Redirects */}
        <Route
          path="/"
          element={
            <DiagnosticRedirect
              to={session?.access_token && session.user ? '/dashboard' : '/login'}
              reason="Root route default"
            />
          }
        />
        <Route
          path="*"
          element={
            <DiagnosticRedirect
              to={session?.access_token && session.user ? '/dashboard' : '/login'}
              reason="No React Router route matched the current pathname"
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}


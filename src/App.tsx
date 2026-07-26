import React, { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
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
import { GuestOpeningScreen } from './components/screens/GuestOpeningScreen';
import { GuestInvitationScreen } from './components/screens/GuestInvitationScreen';
import { GuestRsvpFormScreen } from './components/screens/GuestRsvpFormScreen';
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
  const location = useLocation();

  const handleNavigate = (screen: ScreenId, slugOrId?: string) => {
    let target = '/dashboard';
    switch (screen) {
      case 'login': target = '/login'; break;
      case 'dashboard': target = '/dashboard'; break;
      case 'invitation_list': target = '/invitations'; break;
      case 'create_invitation': target = '/invitations/new'; break;
      case 'upload_video': target = `/invitations/${slugOrId || selectedInvitationId}/upload-video`; break;
      case 'generate_link': target = `/invitations/${slugOrId || selectedInvitationId}/generate-link`; break;
      case 'guest_opening': target = `/invite/${slugOrId || activeInvitation?.slug || 'adam-sofea'}`; break;
      case 'guest_invitation': target = `/invite/${slugOrId || activeInvitation?.slug || 'adam-sofea'}/details`; break;
      case 'guest_rsvp_form': target = `/invite/${slugOrId || activeInvitation?.slug || 'adam-sofea'}/rsvp`; break;
      case 'thank_you': target = `/invite/${slugOrId || activeInvitation?.slug || 'adam-sofea'}/thank-you`; break;
      case 'private_rsvp_report': target = `/report/${slugOrId || activeInvitation?.slug || 'adam-sofea'}`; break;
      case 'admin_rsvp': target = '/rsvp'; break;
      case 'settings': target = '/settings'; break;
    }
    console.info('[ROUTING_DIAGNOSTIC] Navigating', {
      currentPathname: location.pathname,
      screen,
      target,
    });
    navigate(target);
    window.setTimeout(() => {
      console.info('[ROUTING_DIAGNOSTIC] Pathname after navigation', {
        requestedTarget: target,
        currentPathname: window.location.pathname,
      });
    }, 0);
  };

  return <>{children(handleNavigate)}</>;
}

function DiagnosticRedirect({ to, reason }: { to: string; reason: string }) {
  useEffect(() => {
    console.warn('[ROUTING_DIAGNOSTIC] Redirect', {
      currentPathname: window.location.pathname,
      redirectTarget: to,
      reason,
    });
  }, [reason, to]);
  return <Navigate to={to} replace />;
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
      console.info('[AUTH_DIAGNOSTIC]', {
        sessionExists: false,
        userId: null,
        accessTokenExists: false,
      });
      setSession(null);
      setIsAuthReady(true);
      return;
    }

    let active = true;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      console.info('[AUTH_DIAGNOSTIC]', {
        sessionExists: Boolean(nextSession),
        userId: nextSession?.user?.id || null,
        accessTokenExists: Boolean(nextSession?.access_token),
      });
      setSession(nextSession);
      setIsAuthReady(true);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      const restoredSession = error ? null : data.session;
      console.info('[AUTH_DIAGNOSTIC]', {
        sessionExists: Boolean(restoredSession),
        userId: restoredSession?.user?.id || null,
        accessTokenExists: Boolean(restoredSession?.access_token),
      });
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
      console.info('[R2_DIAGNOSTIC] Invitation created', {
        invitationId: newInv.id,
      });
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
    console.log(`[DELETE_HANDLER_RECEIVED_ID] App.tsx handleDeleteInvitation received ID: ${id}`);
    if (!id || typeof id !== 'string') {
      console.error(`[DELETE_FAILED] Invalid invitation ID received: ${id}`);
      showToast('error', 'Ralat ID kad jemputan tidak sah.');
      return;
    }

    const { success, error } = await deleteInvitationFromSupabase(id);
    if (!success) {
      console.error(`[DELETE_FAILED] App.tsx deletion failed: ${error}`);
      showToast('error', `Gagal memadamkan kad jemputan: ${error}`);
      return;
    }

    setInvitations((prev) => prev.filter((i) => i.id !== id));
    if (selectedInvitationId === id && invitations.length > 1) {
      const remaining = invitations.filter((i) => i.id !== id);
      setSelectedInvitationId(remaining[0]?.id || '');
    }
    console.log(`[DELETE_SUCCESS] Successfully updated local state after deleting ID: ${id}`);
    showToast('success', 'Invitation deleted successfully.');
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
    console.info('[R2_DIAGNOSTIC] Before Supabase update', {
      video_key: videoKey,
      video_url: videoUrl,
      video_file_name: fileName,
    });
    const { data, error } = await updateInvitationInSupabase(invitationId, {
      videoKey,
      videoUrl,
      videoFileName: fileName,
    });
    console.info('[R2_DIAGNOSTIC] Supabase update result', {
      success: Boolean(data && !error),
      error: error || null,
    });
    if (!data || error) {
      const exactError = error || 'Supabase returned no updated invitation';
      showToast('error', `Gagal menyimpan video: ${exactError}`);
      return { success: false, error: exactError };
    }

    setInvitations((prev) => prev.map((i) => (i.id === data.id ? data : i)));
    console.info('[R2_DIAGNOSTIC] Clearing pending upload state', {
      reason: 'Supabase video persistence succeeded',
      invitationId,
    });
    setPendingVideoFile(null);
    setPendingUploadInvitation(null);
    showToast('success', 'Video kad jemputan berjaya dikemas kini!');
    return { success: true };
  };

  const handleAddRsvp = async (newRsvp: Omit<RsvpEntry, 'id' | 'submittedAt'>) => {
    const { data: savedRsvp, error } = await addRsvpToSupabase(newRsvp);
    if (error || !savedRsvp) {
      showToast('error', `Ralat menghantar RSVP: ${error}`);
      return;
    }

    setRsvps((prev) => [savedRsvp, ...prev]);
    showToast('success', 'Terima kasih! Kehadiran anda telah berjaya direkodkan.');
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

  // Wrapper for Edit Invitation by ID
  function EditInvitationWrapper() {
    const { id } = useParams<{ id: string }>();
    const inv = invitations.find((i) => i.id === id) || editingInvitation;
    return (
      <NavigationAdapter selectedInvitationId={selectedInvitationId} activeInvitation={activeInvitation}>
        {(onNavigate) => (
          <CreateInvitationScreen
            onNavigate={onNavigate}
            editingInvitation={inv}
            onSaveInvitation={handleSaveInvitation}
            onVideoFileSelected={setPendingVideoFile}
          />
        )}
      </NavigationAdapter>
    );
  }

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
      console.info('[ROUTING_DIAGNOSTIC] UploadVideoWrapper mounted', {
        currentPathname: window.location.pathname,
        routeParamId: id || null,
        pendingFileExists: pendingVideoFile instanceof File,
      });
      if (!id) {
        setFetchError('ID jemputan tiada pada URL. Muat naik tidak boleh diteruskan.');
        console.error('[ROUTING_DIAGNOSTIC] Upload route error', {
          reason: 'route param ID missing',
          redirectTarget: null,
        });
        return;
      }
      let cancelled = false;
      setIsFetching(true);
      getInvitationById(id).then(({ data, error }) => {
        if (cancelled) return;
        console.info('[ROUTING_DIAGNOSTIC] Invitation record fetch result', {
          routeParamId: id,
          found: Boolean(data),
          error: error || null,
        });
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
      return <div className="max-w-2xl mx-auto card-maiya p-6">Loading invitation…</div>;
    }
    return (
      <NavigationAdapter selectedInvitationId={selectedInvitationId} activeInvitation={activeInvitation}>
        {(onNavigate) => (
          <UploadVideoScreen
            onNavigate={onNavigate}
            activeInvitation={inv}
            onUpdateVideo={handleUpdateVideo}
            initialVideoFile={pendingVideoFile}
            onPendingVideoCleared={(reason) => {
              console.info('[R2_DIAGNOSTIC] Parent pending video clear requested', { reason });
              setPendingVideoFile(null);
            }}
          />
        )}
      </NavigationAdapter>
    );
  }

  // Wrapper for Generate/Preview Link by ID
  function PreviewWrapper() {
    const { id } = useParams<{ id: string }>();
    const inv = invitations.find((i) => i.id === id) || activeInvitation;
    return (
      <NavigationAdapter selectedInvitationId={selectedInvitationId} activeInvitation={activeInvitation}>
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
        <div className="fixed top-4 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-top duration-300">
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
          <div className="card-maiya p-6 max-w-md w-full bg-white space-y-5 text-center shadow-2xl rounded-2xl border border-[#D9D2CA] animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-[#EFE7DF] text-[#9B7B63] flex items-center justify-center mx-auto border border-[#D9D2CA]">
              <KeyRound className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#9B7B63] tracking-widest">
                Card Created Successfully
              </span>
              <h2 className="font-title text-xl font-bold text-[#1E1E1C]">
                Couple Private Security PIN
              </h2>
              <p className="text-xs text-[#77736D]">
                For <strong>{createdPinModal.brideName} & {createdPinModal.groomName}</strong>
              </p>
            </div>

            <div className="p-4 bg-[#F7F5F2] rounded-xl border border-[#D9D2CA] space-y-2">
              <span className="text-xs font-semibold text-[#77736D] block uppercase">
                6-Digit Generated Security PIN
              </span>
              <div className="font-mono text-3xl font-extrabold tracking-[0.4em] text-[#1E1E1C]">
                {createdPinModal.pin}
              </div>
              <p className="text-[11px] text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-2 text-left">
                ⚠️ <strong>PENTING:</strong> Simpan atau catat PIN 6-digit ini. PIN ini dipaparkan <strong>SEKALI SAHAJA</strong> dan tidak disimpan dalam teks biasa untuk keselamatan.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
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
              <div className="p-6 text-center">Checking authentication…</div>
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

          <Route path="/invitations/:id/edit" element={<EditInvitationWrapper />} />
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
                  <GuestOpeningScreen onNavigate={onNavigate} activeInvitation={inv} />
                )}
              />
            }
          />
          <Route
            path="/invite/:slug/opening"
            element={
              <GuestRouteWrapper
                renderScreen={(inv, onNavigate) => (
                  <GuestOpeningScreen onNavigate={onNavigate} activeInvitation={inv} />
                )}
              />
            }
          />
          <Route
            path="/invite/:slug/details"
            element={
              <GuestRouteWrapper
                renderScreen={(inv, onNavigate) => (
                  <GuestInvitationScreen
                    onNavigate={onNavigate}
                    activeInvitation={inv}
                    rsvps={rsvps}
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
                  <GuestRsvpFormScreen
                    onNavigate={onNavigate}
                    activeInvitation={inv}
                    onAddRsvp={handleAddRsvp}
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


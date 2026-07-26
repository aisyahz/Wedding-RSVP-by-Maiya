import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { Invitation, RsvpEntry, SystemSettings, ScreenId } from './types';
import { INITIAL_INVITATIONS, INITIAL_RSVPS, INITIAL_SETTINGS } from './data/mockData';
import {
  getInvitations,
  getRsvps,
  saveInvitationToSupabase,
  deleteInvitationFromSupabase,
  addRsvpToSupabase,
  deleteRsvpFromSupabase,
  isSupabaseConfigured,
} from './lib/supabase';
import { Database, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [invitations, setInvitations] = useState<Invitation[]>(INITIAL_INVITATIONS);
  const [rsvps, setRsvps] = useState<RsvpEntry[]>(INITIAL_RSVPS);
  const [selectedInvitationId, setSelectedInvitationId] = useState<string>('inv-001');
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);

  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load initial data from Supabase / Storage
  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingData(true);
      const [invRes, rsvpRes] = await Promise.all([getInvitations(), getRsvps()]);

      if (invRes.data && invRes.data.length > 0) {
        setInvitations(invRes.data);
        setSelectedInvitationId(invRes.data[0].id);
      }
      if (rsvpRes.data) {
        setRsvps(rsvpRes.data);
      }
      setIsLoadingData(false);
    }

    loadInitialData();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const activeInvitation =
    invitations.find((i) => i.id === selectedInvitationId) || invitations[0] || null;

  const handleSaveInvitation = async (invData: Partial<Invitation>) => {
    const isEditing = Boolean(editingInvitation);
    const targetPayload = isEditing ? { ...editingInvitation, ...invData } : invData;

    const { data: savedInv, error } = await saveInvitationToSupabase(targetPayload);

    if (error || !savedInv) {
      showToast('error', `Error saving invitation: ${error || 'Failed'}`);
      return;
    }

    if (isEditing) {
      setInvitations((prev) => prev.map((item) => (item.id === savedInv.id ? savedInv : item)));
      setEditingInvitation(null);
      showToast('success', 'Tetapan kad jemputan berjaya dikemas kini!');
    } else {
      setInvitations((prev) => [savedInv, ...prev]);
      setSelectedInvitationId(savedInv.id);
      showToast('success', 'Kad jemputan baharu berjaya dicipta!');
    }
  };

  const handleEditInvitation = (inv: Invitation) => {
    setEditingInvitation(inv);
    setSelectedInvitationId(inv.id);
  };

  const handleDeleteInvitation = async (id: string) => {
    const { success, error } = await deleteInvitationFromSupabase(id);
    if (!success) {
      showToast('error', `Failed to delete invitation: ${error}`);
      return;
    }

    setInvitations((prev) => prev.filter((i) => i.id !== id));
    if (selectedInvitationId === id && invitations.length > 1) {
      setSelectedInvitationId(invitations.find((i) => i.id !== id)?.id || '');
    }
    showToast('success', 'Kad jemputan telah dipadam.');
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
      videoUrl: inv.videoUrl,
      videoFileName: inv.videoFileName,
      privatePin: inv.privatePin,
      status: 'active',
    };

    const { data: saved, error } = await saveInvitationToSupabase(duplicatedData);
    if (error || !saved) {
      showToast('error', `Duplicate error: ${error}`);
      return;
    }

    setInvitations((prev) => [saved, ...prev]);
    showToast('success', 'Salinan kad jemputan berjaya dicipta!');
  };

  const handleUpdateVideo = async (videoUrl: string, fileName: string) => {
    if (activeInvitation) {
      const updatedInv = { ...activeInvitation, videoUrl, videoFileName: fileName };
      const { data, error } = await saveInvitationToSupabase(updatedInv);
      if (data) {
        setInvitations((prev) => prev.map((i) => (i.id === data.id ? data : i)));
        showToast('success', 'Video kad jemputan berjaya dikemas kini!');
      } else if (error) {
        showToast('error', `Failed to update video: ${error}`);
      }
    }
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
      showToast('error', `Failed to delete RSVP: ${error}`);
      return;
    }

    setRsvps((prev) => prev.filter((r) => r.id !== id));
    showToast('success', 'Rekod RSVP dipadamkan.');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  // Helper hook for screens that rely on navigate(ScreenId)
  function NavigationAdapter({ children }: { children: (onNavigate: (screen: ScreenId, slugOrId?: string) => void) => React.ReactNode }) {
    const navigate = useNavigate();

    const handleNavigate = (screen: ScreenId, slugOrId?: string) => {
      switch (screen) {
        case 'login':
          navigate('/login');
          break;
        case 'dashboard':
          navigate('/dashboard');
          break;
        case 'invitation_list':
          navigate('/invitations');
          break;
        case 'create_invitation':
          navigate('/invitations/new');
          break;
        case 'upload_video':
          navigate(`/invitations/${slugOrId || selectedInvitationId}/upload-video`);
          break;
        case 'generate_link':
          navigate(`/invitations/${slugOrId || selectedInvitationId}/preview`);
          break;
        case 'guest_opening': {
          const targetSlug = slugOrId || activeInvitation?.slug || 'adam-sofea';
          navigate(`/invite/${targetSlug}`);
          break;
        }
        case 'guest_invitation': {
          const targetSlug = slugOrId || activeInvitation?.slug || 'adam-sofea';
          navigate(`/invite/${targetSlug}/details`);
          break;
        }
        case 'guest_rsvp_form': {
          const targetSlug = slugOrId || activeInvitation?.slug || 'adam-sofea';
          navigate(`/invite/${targetSlug}/rsvp`);
          break;
        }
        case 'thank_you': {
          const targetSlug = slugOrId || activeInvitation?.slug || 'adam-sofea';
          navigate(`/invite/${targetSlug}/thank-you`);
          break;
        }
        case 'private_rsvp_report': {
          const targetSlug = slugOrId || activeInvitation?.slug || 'adam-sofea';
          navigate(`/report/${targetSlug}`);
          break;
        }
        case 'admin_rsvp':
          navigate('/rsvp');
          break;
        case 'settings':
          navigate('/settings');
          break;
        default:
          navigate('/dashboard');
      }
    };

    return <>{children(handleNavigate)}</>;
  }

  // Wrapper for Edit Invitation by ID
  function EditInvitationWrapper() {
    const { id } = useParams<{ id: string }>();
    const inv = invitations.find((i) => i.id === id) || editingInvitation;
    return (
      <NavigationAdapter>
        {(onNavigate) => (
          <CreateInvitationScreen
            onNavigate={onNavigate}
            editingInvitation={inv}
            onSaveInvitation={handleSaveInvitation}
          />
        )}
      </NavigationAdapter>
    );
  }

  // Wrapper for Upload Video by ID
  function UploadVideoWrapper() {
    const { id } = useParams<{ id: string }>();
    const inv = invitations.find((i) => i.id === id) || activeInvitation;
    return (
      <NavigationAdapter>
        {(onNavigate) => (
          <UploadVideoScreen
            onNavigate={onNavigate}
            activeInvitation={inv}
            onUpdateVideo={handleUpdateVideo}
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
      <NavigationAdapter>
        {(onNavigate) => (
          <GenerateLinkScreen
            onNavigate={onNavigate}
            activeInvitation={inv}
          />
        )}
      </NavigationAdapter>
    );
  }

  // Wrapper for Guest Opening Page
  function GuestOpeningWrapper() {
    const { slug } = useParams<{ slug: string }>();
    const inv = invitations.find((i) => i.slug === slug) || activeInvitation;
    return (
      <NavigationAdapter>
        {(onNavigate) => (
          <GuestOpeningScreen
            onNavigate={(screen) => onNavigate(screen, inv?.slug)}
            activeInvitation={inv}
          />
        )}
      </NavigationAdapter>
    );
  }

  // Wrapper for Guest Details Page
  function GuestInvitationWrapper() {
    const { slug } = useParams<{ slug: string }>();
    const inv = invitations.find((i) => i.slug === slug) || activeInvitation;
    return (
      <NavigationAdapter>
        {(onNavigate) => (
          <GuestInvitationScreen
            onNavigate={(screen) => onNavigate(screen, inv?.slug)}
            activeInvitation={inv}
            rsvps={rsvps}
          />
        )}
      </NavigationAdapter>
    );
  }

  // Wrapper for Guest RSVP Form Page
  function GuestRsvpFormWrapper() {
    const { slug } = useParams<{ slug: string }>();
    const inv = invitations.find((i) => i.slug === slug) || activeInvitation;
    return (
      <NavigationAdapter>
        {(onNavigate) => (
          <GuestRsvpFormScreen
            onNavigate={(screen) => onNavigate(screen, inv?.slug)}
            activeInvitation={inv}
            onAddRsvp={handleAddRsvp}
          />
        )}
      </NavigationAdapter>
    );
  }

  // Wrapper for Thank You Page
  function ThankYouWrapper() {
    const { slug } = useParams<{ slug: string }>();
    const inv = invitations.find((i) => i.slug === slug) || activeInvitation;
    return (
      <NavigationAdapter>
        {(onNavigate) => (
          <ThankYouScreen
            onNavigate={(screen) => onNavigate(screen, inv?.slug)}
            activeInvitation={inv}
          />
        )}
      </NavigationAdapter>
    );
  }

  // Wrapper for Private RSVP Report Page
  function PrivateRsvpReportWrapper() {
    const { slug } = useParams<{ slug: string }>();
    const inv = invitations.find((i) => i.slug === slug) || activeInvitation;
    return (
      <NavigationAdapter>
        {(onNavigate) => (
          <PrivateRsvpReportScreen
            onNavigate={(screen) => onNavigate(screen, inv?.slug)}
            activeInvitation={inv}
            rsvps={rsvps}
          />
        )}
      </NavigationAdapter>
    );
  }

  return (
    <BrowserRouter>
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

      {/* Database Connection Info Banner in Admin Header */}
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
            <NavigationAdapter>
              {(onNavigate) => (
                <AdminLoginScreen
                  onNavigate={onNavigate}
                  onLoginSuccess={() => setIsAuthenticated(true)}
                />
              )}
            </NavigationAdapter>
          }
        />

        {/* Protected Admin Routes */}
        <Route
          element={
            isAuthenticated ? (
              <AdminLayout onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route
            path="/dashboard"
            element={
              <NavigationAdapter>
                {(onNavigate) => (
                  <DashboardScreen
                    currentScreen="dashboard"
                    onNavigate={onNavigate}
                    invitations={invitations}
                    rsvps={rsvps}
                    onSelectInvitationForPreview={(id) => setSelectedInvitationId(id)}
                  />
                )}
              </NavigationAdapter>
            }
          />

          <Route
            path="/invitations"
            element={
              <NavigationAdapter>
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
              <NavigationAdapter>
                {(onNavigate) => (
                  <CreateInvitationScreen
                    onNavigate={onNavigate}
                    editingInvitation={null}
                    onSaveInvitation={handleSaveInvitation}
                  />
                )}
              </NavigationAdapter>
            }
          />

          <Route path="/invitations/:id/edit" element={<EditInvitationWrapper />} />
          <Route path="/invitations/:id/upload-video" element={<UploadVideoWrapper />} />
          <Route path="/invitations/:id/preview" element={<PreviewWrapper />} />

          <Route
            path="/rsvp"
            element={
              <NavigationAdapter>
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
              <NavigationAdapter>
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
          <Route path="/invite/:slug" element={<GuestOpeningWrapper />} />
          <Route path="/invite/:slug/opening" element={<GuestOpeningWrapper />} />
          <Route path="/invite/:slug/details" element={<GuestInvitationWrapper />} />
          <Route path="/invite/:slug/rsvp" element={<GuestRsvpFormWrapper />} />
          <Route path="/invite/:slug/thank-you" element={<ThankYouWrapper />} />
          <Route path="/report/:slug" element={<PrivateRsvpReportWrapper />} />
        </Route>

        {/* Default Redirects */}
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

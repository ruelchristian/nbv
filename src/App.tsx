import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from './services/firebase';
import { firestoreService, ADMIN_EMAILS, checkIsUserAdmin, isMainAdmin, MAIN_ADMIN_EMAIL } from './services/firestoreService';
import { Service, BusinessSettings, Appointment } from './types';
import { DEFAULT_BUSINESS_SETTINGS, DEFAULT_SERVICES } from './services/seedData';
import { setGmailAccessToken } from './services/gmail';
import { User as UserIcon, Shield as ShieldIcon, LogIn } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { NotificationBanner } from './components/NotificationBanner';
import { FlutterCompanionModal } from './components/FlutterCompanionModal';
import { DownloadAppModal } from './components/DownloadAppModal';
import { ConfirmedLocationModal } from './components/ConfirmedLocationQR';
import { HomePage } from './pages/HomePage';
import { ServicesPage } from './pages/ServicesPage';
import { BookingWizardPage } from './pages/BookingWizardPage';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_BUSINESS_SETTINGS);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<Service | null>(null);
  const [isFlutterModalOpen, setIsFlutterModalOpen] = useState<boolean>(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [tokenWarning, setTokenWarning] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authErrorNotice, setAuthErrorNotice] = useState<string | null>(null);

  const [isFirestoreAdmin, setIsFirestoreAdmin] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser) {
      checkIsUserAdmin(currentUser.email, currentUser.uid).then((res) => {
        setIsFirestoreAdmin(res);
      });
    } else {
      setIsFirestoreAdmin(false);
    }
  }, [currentUser]);

  // Check admin privileges: rayanat.barbosa@gmail.com (Main Admin), VITE_ADMIN_EMAILS, Firestore admins collection, or test session
  const isTestSessionAdmin = Boolean(
    typeof window !== 'undefined' &&
    currentUser?.email &&
    sessionStorage.getItem('nbv_test_admin')?.toLowerCase().trim() === currentUser.email.toLowerCase().trim()
  );

  const isAdmin = Boolean(
    currentUser?.email && (
      isMainAdmin(currentUser.email) ||
      ADMIN_EMAILS.includes(currentUser.email.toLowerCase()) ||
      isFirestoreAdmin ||
      isTestSessionAdmin
    )
  );

  // Admins manage the business via Owner Portal ('admin'); redirect away from client 'customer' bookings view
  useEffect(() => {
    if (isAdmin && currentTab === 'customer') {
      setCurrentTab('admin');
    }
  }, [isAdmin, currentTab]);

  // Listen to Auth State Changes & Global Unhandled Token/WebSocket Rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      if (
        msg.includes('token-service-api-has-not-been-used') ||
        msg.includes('securetoken.googleapis.com') ||
        msg.includes('Unexpected state (ID: 3c6b)') ||
        msg.includes('Could not reach Cloud Firestore backend') ||
        msg.includes("Cannot read properties of undefined (reading 'send')") ||
        msg.includes('WebSocket') ||
        msg.includes('cancelled-popup-request') ||
        msg.includes('popup-blocked') ||
        msg.includes('popup-closed-by-user') ||
        msg.includes('auth/cancelled-popup-request') ||
        msg.includes('auth/popup-blocked')
      ) {
        event.preventDefault();
        if (msg.includes('token-service') || msg.includes('securetoken')) {
          setTokenWarning('Google Cloud Secure Token Service API is pending activation or propagation for project 627336521817.');
        } else if (msg.includes('popup-blocked')) {
          setAuthErrorNotice('Your browser blocked the sign-in pop-up window. Please allow pop-ups for this site, or try clicking Sign In again.');
        }
      }
    };

    const handleError = (event: ErrorEvent) => {
      const msg = event.message || '';
      if (
        msg.includes("Cannot read properties of undefined (reading 'send')") ||
        msg.includes('WebSocket') ||
        msg.includes('Could not reach Cloud Firestore backend') ||
        msg.includes('cancelled-popup-request') ||
        msg.includes('popup-blocked') ||
        msg.includes('popup-closed-by-user') ||
        msg.includes('auth/cancelled-popup-request') ||
        msg.includes('auth/popup-blocked')
      ) {
        event.preventDefault();
        if (msg.includes('popup-blocked')) {
          setAuthErrorNotice('Your browser blocked the sign-in pop-up window. Please allow pop-ups for this site, or try clicking Sign In again.');
        }
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    const handleTestAuthChange = () => {
      try {
        const testEmail = sessionStorage.getItem('nbv_test_admin');
        if (testEmail) {
          const clean = testEmail.toLowerCase().trim();
          setCurrentUser({
            uid: 'test_admin_uid',
            email: clean,
            displayName: isMainAdmin(clean) ? 'Ruel Umel (Main Admin)' : 'Salon Sub-Admin',
          } as any);
        } else if (!auth.currentUser) {
          setCurrentUser(null);
        }
      } catch {
        // Ignore storage access errors
      }
    };

    window.addEventListener('nbv_auth_change', handleTestAuthChange);
    handleTestAuthChange();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        firestoreService.claimGuestAppointments(user.uid, user.email || undefined);
        try {
          await user.getIdToken();
          setTokenWarning(null);
        } catch {
          // Token handled
        }
      } else {
        try {
          const testEmail = sessionStorage.getItem('nbv_test_admin');
          if (testEmail) {
            const clean = testEmail.toLowerCase().trim();
            setCurrentUser({
              uid: 'test_admin_uid',
              email: clean,
              displayName: isMainAdmin(clean) ? 'Rayana Barbosa (Main Admin)' : 'Salon Sub-Admin',
            } as any);
            return;
          }
        } catch {
          // Ignore
        }
        setCurrentUser(null);
        setTokenWarning(null);
      }
    });

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
      window.removeEventListener('nbv_auth_change', handleTestAuthChange);
      unsubscribe();
    };
  }, []);

  // Fetch Initial Data with offline resilience & instant render (1.5s max timeout)
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const fetchWithTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
        ]);
      };

      const [fetchedServices, fetchedSettings] = await Promise.all([
        fetchWithTimeout(firestoreService.getServices(), 1500, DEFAULT_SERVICES),
        fetchWithTimeout(firestoreService.getSettings(), 1500, DEFAULT_BUSINESS_SETTINGS),
      ]);

      const cleaned = (fetchedServices && fetchedServices.length > 0 ? fetchedServices : DEFAULT_SERVICES)
        .filter((s) => !s.name.toLowerCase().includes('screaming flower'));
      setServices(cleaned);
      setSettings(fetchedSettings || DEFAULT_BUSINESS_SETTINGS);

      // Load appointments
      try {
        if (currentUser) {
          const appts = await fetchWithTimeout(
            firestoreService.getAppointments(isAdmin ? undefined : currentUser.uid),
            1500,
            firestoreService.getLocalAppointments()
          );
          setAppointments(appts || []);
        } else {
          // Unauthenticated guest: load locally stored appointments without querying protected Firestore collection
          const localAppts = firestoreService.getLocalAppointments();
          setAppointments(localAppts || []);
        }
      } catch (apptErr) {
        console.warn('Appointments load notice:', apptErr);
        setAppointments(firestoreService.getLocalAppointments());
      }
    } catch (err) {
      console.warn('Notice loading from Firestore, keeping initial defaults:', err);
      setServices(DEFAULT_SERVICES);
      setSettings(DEFAULT_BUSINESS_SETTINGS);
      setAppointments(firestoreService.getLocalAppointments());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [currentUser, isAdmin]);

  // Handle Google Sign-in via Popup per skill guideline
  const handleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setAuthErrorNotice(null);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(auth, provider);
      setTokenWarning(null);
      setAuthErrorNotice(null);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const code = (error as { code?: string })?.code || '';

      if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
        setAuthErrorNotice(
          'Your browser blocked the sign-in pop-up window. Please allow pop-ups for this site, or tap Try Sign In Again.'
        );
        console.warn('Sign-in popup blocked by browser');
      } else if (code === 'auth/cancelled-popup-request' || msg.includes('cancelled-popup-request')) {
        console.warn('Sign-in popup request superseded');
      } else if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
        console.warn('Sign-in popup closed by user');
      } else if (msg.includes('token-service-api-has-not-been-used') || msg.includes('securetoken.googleapis.com')) {
        setTokenWarning('Google Cloud Secure Token Service API is pending activation or propagation for project 627336521817.');
      } else {
        console.warn('Sign-in note:', msg);
        setAuthErrorNotice(`Unable to sign in: ${msg}`);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setGmailAccessToken(null);
      setTokenWarning(null);
      if (currentTab === 'admin') setCurrentTab('home');
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  const handleNavigateToBooking = (service?: Service) => {
    if (service) setSelectedServiceForBooking(service);
    setCurrentTab('book');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAF7F4] text-[#231F20] flex flex-col font-sans selection:bg-[#FCEBEE] selection:text-[#8B3A56] overflow-x-hidden">
      {/* Real-time Web Notifications Banner */}
      <NotificationBanner />

      {/* Google Cloud API Propagation / STS Notice */}
      {tokenWarning && (
        <div className="bg-[#FFF8E7] border-b border-[#F5C77E] text-[#805B10] px-4 py-2.5 text-xs sm:text-sm">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[#E69138] animate-pulse shrink-0" />
              <span>
                <strong>Cloud Auth Notice:</strong> Google Cloud Secure Token Service API is activating for project 627336521817. App operates smoothly with local catalog &amp; offline booking.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="https://console.developers.google.com/apis/api/securetoken.googleapis.com/overview?project=627336521817"
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold hover:text-[#5E3E00]"
              >
                Enable in Cloud Console &rarr;
              </a>
              <button
                type="button"
                onClick={handleSignOut}
                className="ml-2 px-2 py-0.5 rounded bg-[#F5C77E]/40 hover:bg-[#F5C77E]/80 text-[#5E3E00] font-medium text-xs transition-colors"
              >
                Sign Out to Guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up blocked or Sign-in Notice */}
      {authErrorNotice && (
        <div className="bg-[#FFF8E7] border-b border-[#F5C77E] text-[#805B10] px-4 py-2.5 text-xs sm:text-sm">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#E69138] shrink-0" />
              <span>{authErrorNotice}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="px-3 py-1 rounded-full bg-[#8B3A56] hover:bg-[#722A42] text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
              >
                {isSigningIn ? 'Connecting...' : 'Try Sign In Again'}
              </button>
              <button
                type="button"
                onClick={() => setAuthErrorNotice(null)}
                className="px-2 py-1 text-xs text-[#805B10] hover:text-[#5E3E00] font-medium cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 24/7 Online Access Ribbon */}
      <div className="bg-[#231F20] text-white text-[11px] py-1.5 px-4 text-center flex flex-wrap items-center justify-center gap-2 tracking-wide">
        <span className="inline-flex items-center gap-1.5 text-[#A7F3D0] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
          24/7 Online Portal Active
        </span>
        <span className="text-gray-400">•</span>
        <span className="text-gray-200">
          Browse designs &amp; submit requests anytime 24/7 • Service appointments conducted on <strong>Sundays &amp; Mondays</strong>
        </span>
      </div>

      {/* Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        currentUser={currentUser}
        isAdmin={isAdmin}
        isSigningIn={isSigningIn}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
      />

      {/* Main Page Router */}
      <main className="flex-1 w-full overflow-y-visible">
        {isLoading && services.length === 0 ? (
          <div className="py-32 text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-3 border-[#8B3A56] border-t-transparent animate-spin mx-auto" />
            <p className="font-serif text-lg text-[#231F20]">Connecting to Cloud Firestore...</p>
          </div>
        ) : (
          <>
            {currentTab === 'home' && (
              <HomePage
                services={services}
                settings={settings}
                onNavigate={(tab, srv) => {
                  if (srv) setSelectedServiceForBooking(srv);
                  setCurrentTab(tab);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {currentTab === 'services' && (
              <ServicesPage
                services={services}
                onBookService={(srv) => handleNavigateToBooking(srv)}
              />
            )}

            {currentTab === 'book' && (
              <BookingWizardPage
                services={services}
                settings={settings}
                initialService={selectedServiceForBooking}
                currentUser={currentUser}
                onBookingComplete={() => {
                  loadInitialData();
                }}
                onNavigate={(tab) => {
                  setCurrentTab(tab);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {currentTab === 'customer' && (
              currentUser ? (
                <CustomerDashboard
                  appointments={appointments}
                  currentUser={currentUser}
                  settings={settings}
                  onRefresh={loadInitialData}
                  onNavigateToBooking={() => handleNavigateToBooking()}
                  onSignIn={handleSignIn}
                />
              ) : (
                <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-[#FCEBEE] border border-[#F3B8C3] text-[#8B3A56] flex items-center justify-center mx-auto shadow-xs">
                    <UserIcon className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#231F20]">
                      Sign In to View Your Bookings
                    </h2>
                    <p className="text-xs sm:text-sm text-[#5C5257] leading-relaxed">
                      Please sign in with your Google account to view your scheduled sessions, access confirmed studio directions, and track your loyalty reward stamps.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={handleSignIn}
                      disabled={isSigningIn}
                      className="w-full sm:w-auto px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider text-white bg-[#8B3A56] hover:bg-[#722A42] transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{isSigningIn ? 'Connecting...' : 'Sign In with Google'}</span>
                    </button>
                    <button
                      onClick={() => setCurrentTab('home')}
                      className="w-full sm:w-auto px-5 py-3 rounded-full text-xs font-semibold text-[#5C5257] hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      Back to Home
                    </button>
                  </div>
                </div>
              )
            )}

            {currentTab === 'admin' && (
              isAdmin ? (
                <AdminDashboard
                  appointments={appointments}
                  services={services}
                  settings={settings}
                  isAdmin={isAdmin}
                  currentUser={currentUser}
                  onRefresh={loadInitialData}
                  onUpdateSettings={(newSettings: BusinessSettings) => setSettings(newSettings)}
                  onSignInAdmin={handleSignIn}
                />
              ) : (
                <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-[#FEF3C7] border border-[#F5C77E] text-[#B45309] flex items-center justify-center mx-auto shadow-xs">
                    <ShieldIcon className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#231F20]">
                      Owner Portal Restricted
                    </h2>
                    <p className="text-xs sm:text-sm text-[#5C5257] leading-relaxed">
                      {currentUser ? (
                        <>Signed in as <strong>{currentUser.email}</strong>. This account does not have owner privileges for Nails by Vril.</>
                      ) : (
                        <>Access to this portal is restricted to authorized studio owners only. Please sign in with your owner Google account.</>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={handleSignIn}
                      disabled={isSigningIn}
                      className="w-full sm:w-auto px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider text-white bg-[#8B3A56] hover:bg-[#722A42] transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{currentUser ? 'Switch Account' : 'Sign In as Owner'}</span>
                    </button>
                    <button
                      onClick={() => setCurrentTab('home')}
                      className="w-full sm:w-auto px-5 py-3 rounded-full text-xs font-semibold text-[#5C5257] hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      Back to Home
                    </button>
                  </div>
                </div>
              )
            )}
          </>
        )}
      </main>

      {/* Footer with Studio Info and Download Actions */}
      <Footer
        settings={settings}
        currentUser={currentUser}
        isAdmin={isAdmin}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenCompanionModal={() => setIsFlutterModalOpen(true)}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        onOpenLocationQRModal={() => setIsLocationModalOpen(true)}
        onSignIn={handleSignIn}
      />

      {/* Client PWA Download & Mobile Install Modal */}
      <DownloadAppModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        onOpenFlutterCode={() => setIsFlutterModalOpen(true)}
      />

      {/* Confirmed Studio Location & Google Maps QR Code Modal */}
      <ConfirmedLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        customerName={currentUser?.displayName || undefined}
        isConfirmed={false}
      />

      {/* Exportable Flutter/Dart Code Companion Modal */}
      <FlutterCompanionModal
        isOpen={isFlutterModalOpen}
        onClose={() => setIsFlutterModalOpen(false)}
      />
    </div>
  );
}

import React, { useState } from 'react';
import { Appointment, BusinessSettings, Service, AppointmentStatus } from '../types';
import { firestoreService, isMainAdmin, MAIN_ADMIN_EMAIL, AdminAccount } from '../services/firestoreService';
import {
  sendAppointmentConfirmationEmail,
  sendAppointmentRejectionEmail,
  generateGmailComposeUrl,
  generateGmailRejectionComposeUrl,
} from '../services/gmail';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Crown,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  Plus,
  Trash2,
  Save,
  Home,
  MapPin,
  Sparkles,
  Eye,
  X,
  Send,
  Lock,
  Layers,
  Settings,
} from 'lucide-react';

export interface AdminDashboardProps {
  appointments: Appointment[];
  services: Service[];
  settings: BusinessSettings;
  isAdmin: boolean;
  currentUser: { uid?: string; email?: string | null; displayName?: string | null } | null;
  onRefresh: () => void;
  onUpdateSettings: (newSettings: BusinessSettings) => void;
  onSignInAdmin: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  appointments,
  services,
  settings,
  isAdmin,
  currentUser,
  onRefresh,
  onUpdateSettings,
  onSignInAdmin,
}) => {
  // Tabs
  const [activeSubTab, setActiveSubTab] = useState<'appointments' | 'schedule' | 'settings' | 'services'>('appointments');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals & Active actions
  const [inspoPreviewUrl, setInspoPreviewUrl] = useState<string | null>(null);
  const [rejectingAppt, setRejectingAppt] = useState<Appointment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Requested slot is unavailable');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Blocked Date Input
  const [newBlockedDate, setNewBlockedDate] = useState('');

  // Editable settings local state
  const [formSettings, setFormSettings] = useState<BusinessSettings>(settings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Dynamic Admin Accounts Management
  const [adminAccountsList, setAdminAccountsList] = useState<AdminAccount[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  const isCurrentUserMainAdmin = isMainAdmin(currentUser?.email);

  React.useEffect(() => {
    firestoreService.getAdminsList().then((res) => setAdminAccountsList(res));
  }, []);

  // Sync settings when prop updates
  React.useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  const successTimerRef = React.useRef<any>(null);
  const errorTimerRef = React.useRef<any>(null);

  const showToast = (success?: string, error?: string) => {
    if (success) {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      setActionSuccessMessage(success);
      successTimerRef.current = setTimeout(() => setActionSuccessMessage(null), 4000);
    }
    if (error) {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      setActionErrorMessage(error);
      errorTimerRef.current = setTimeout(() => setActionErrorMessage(null), 5000);
    }
  };

  // 1. Confirm Appointment Handler
  const handleConfirmAppointment = async (appt: Appointment) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      // 1. Update Firestore status
      await firestoreService.updateAppointmentStatus(appt.id, 'confirmed');

      // 2. Best-effort email notification via Gmail API
      try {
        await sendAppointmentConfirmationEmail(appt);
        showToast(`Appointment confirmed and confirmation email sent to ${appt.customerEmail}!`);
      } catch (emailErr) {
        // If OAuth fails or was not authenticated, notify admin and provide direct fallback link
        showToast(
          `Appointment confirmed! (Tip: Use the "Open in Gmail" button to send confirmation email if auto-send is pending Google approval)`
        );
      }

      onRefresh();
    } catch (err: unknown) {
      showToast(undefined, err instanceof Error ? err.message : 'Failed to confirm appointment');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 2. Complete Appointment Handler
  const handleCompleteAppointment = async (appt: Appointment) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      await firestoreService.updateAppointmentStatus(appt.id, 'completed');
      showToast(`Appointment marked as completed. Loyalty stamp credited to customer!`);
      onRefresh();
    } catch (err: unknown) {
      showToast(undefined, err instanceof Error ? err.message : 'Failed to complete appointment');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 3. Reject / Cancel Appointment Handler
  const handleExecuteRejection = async () => {
    if (!rejectingAppt || isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      await firestoreService.updateAppointmentStatus(
        rejectingAppt.id,
        'cancelled',
        rejectionReason
      );

      try {
        await sendAppointmentRejectionEmail(rejectingAppt, { reason: rejectionReason });
        showToast(`Appointment cancelled and customer notified via email.`);
      } catch {
        showToast(`Appointment cancelled. Slot lock released.`);
      }

      setRejectingAppt(null);
      setRejectionReason('Requested slot is unavailable');
      onRefresh();
    } catch (err: unknown) {
      showToast(undefined, err instanceof Error ? err.message : 'Failed to cancel appointment');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 4. Block / Unblock Dates
  const handleAddBlockedDate = async () => {
    if (!newBlockedDate) return;
    const currentBlocked = formSettings.blockedDates || [];
    if (currentBlocked.includes(newBlockedDate)) {
      showToast(undefined, 'This date is already blocked.');
      return;
    }

    const updatedBlocked = [...currentBlocked, newBlockedDate].sort();
    const updatedSettings = { ...formSettings, blockedDates: updatedBlocked };
    setFormSettings(updatedSettings);

    try {
      await firestoreService.updateSettings({ blockedDates: updatedBlocked });
      onUpdateSettings(updatedSettings);
      setNewBlockedDate('');
      showToast(`Date ${newBlockedDate} added to blocked holidays.`);
    } catch (err) {
      showToast(undefined, 'Failed to update blocked dates');
    }
  };

  const handleRemoveBlockedDate = async (dateToRemove: string) => {
    const updatedBlocked = (formSettings.blockedDates || []).filter((d) => d !== dateToRemove);
    const updatedSettings = { ...formSettings, blockedDates: updatedBlocked };
    setFormSettings(updatedSettings);

    try {
      await firestoreService.updateSettings({ blockedDates: updatedBlocked });
      onUpdateSettings(updatedSettings);
      showToast(`Date ${dateToRemove} unblocked.`);
    } catch (err) {
      showToast(undefined, 'Failed to unblock date');
    }
  };

  // 5. Save Business Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await firestoreService.updateSettings(formSettings);
      onUpdateSettings(formSettings);
      showToast('Studio settings saved and published successfully!');
    } catch (err) {
      showToast(undefined, 'Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Filter Appointments
  const filteredAppointments = appointments.filter((appt) => {
    const matchesStatus = statusFilter === 'all' || appt.status === statusFilter;
    const matchesQuery =
      searchQuery === '' ||
      appt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appt.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appt.customerPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appt.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appt.appointmentDate.includes(searchQuery);
    return matchesStatus && matchesQuery;
  });

  // Calculate Metrics
  const totalCount = appointments.length;
  const pendingCount = appointments.filter((a) => a.status === 'pending').length;
  const confirmedCount = appointments.filter((a) => a.status === 'confirmed').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const totalRevenue = appointments
    .filter((a) => a.status === 'confirmed' || a.status === 'completed')
    .reduce((sum, a) => sum + (Number(a.servicePrice) || 0), 0);

  // Status Badge Component
  const renderStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#D1FAE5] text-[#047857] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Confirmed</span>
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FEE2E2] text-[#B91C1C] flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>Cancelled</span>
          </span>
        );
      case 'rescheduled':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E0E7FF] text-[#3730A3] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Rescheduled</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#B45309] flex items-center gap-1 animate-pulse">
            <AlertCircle className="w-3 h-3" />
            <span>Pending Review</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-left">
      {/* Toast Alerts */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-2xl bg-[#D1FAE5] border border-[#A7F3D0] text-[#065F46] text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs">
          <span>{actionSuccessMessage}</span>
          <button onClick={() => setActionSuccessMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionErrorMessage && (
        <div className="p-4 rounded-2xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs">
          <span>{actionErrorMessage}</span>
          <button onClick={() => setActionErrorMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Notice Banner if not signed in as Rayanat */}
      {!isAdmin && (
        <div className="bg-[#FFF8E7] border border-[#F5C77E] rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#805B10]">
                Owner Portal Access Notice
              </h3>
              <p className="text-xs text-[#805B10]/80 mt-1">
                Main Admin: <strong>{MAIN_ADMIN_EMAIL}</strong>.
                {currentUser ? ` Currently active as ${currentUser.email} (${isCurrentUserMainAdmin ? 'Main Admin' : 'Sub-Admin'}).` : ' You are viewing in preview mode as a guest.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignInAdmin}
            className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#8B3A56] hover:bg-[#722A42] text-white shadow-xs cursor-pointer shrink-0"
          >
            Sign In with Google
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-[#EFE8E9] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FCEBEE] border border-[#F3B8C3] text-[#8B3A56] flex items-center justify-center font-serif text-2xl font-bold shrink-0">
            {isCurrentUserMainAdmin ? (
              <Crown className="w-7 h-7 text-[#8B3A56]" />
            ) : (
              <Shield className="w-7 h-7" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#231F20]">
                Owner &amp; Studio Portal
              </h1>
              {isAdmin && (
                isCurrentUserMainAdmin ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gradient-to-r from-[#8B3A56] to-[#601F35] text-amber-200 border border-amber-400/30 shadow-xs flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-300" />
                    <span>Main Admin</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#FCEBEE] text-[#8B3A56] border border-[#F3B8C3] shadow-xs flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#8B3A56]" />
                    <span>Sub-Admin</span>
                  </span>
                )
              )}
            </div>
            <p className="text-xs text-[#7A6E74] mt-0.5">
              Manage client appointments, adjust blocked calendar dates, send confirmations, and configure studio settings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl border border-[#E5D5DA] text-[#7A6E74] hover:text-[#231F20] hover:bg-[#FAF7F4] transition-colors cursor-pointer"
            title="Refresh Appointments"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EFE8E9] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#7A6E74] uppercase">Total Bookings</span>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-[#231F20] mt-1">{totalCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EFE8E9] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#B45309] uppercase">Pending Requests</span>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-[#B45309] mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EFE8E9] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#047857] uppercase">Confirmed</span>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-[#047857] mt-1">{confirmedCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EFE8E9] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#8B3A56] uppercase">Est. Revenue</span>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-[#8B3A56] mt-1">₱{totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex items-center border-b border-[#EFE8E9] gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSubTab('appointments')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'appointments'
              ? 'bg-[#8B3A56] text-white shadow-2xs'
              : 'text-[#7A6E74] hover:bg-[#FAF4F5]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Appointments ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('schedule')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'schedule'
              ? 'bg-[#8B3A56] text-white shadow-2xs'
              : 'text-[#7A6E74] hover:bg-[#FAF4F5]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Schedule &amp; Holidays ({formSettings.blockedDates?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'settings'
              ? 'bg-[#8B3A56] text-white shadow-2xs'
              : 'text-[#7A6E74] hover:bg-[#FAF4F5]'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Business Settings</span>
        </button>

        <button
          onClick={() => setActiveSubTab('services')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'services'
              ? 'bg-[#8B3A56] text-white shadow-2xs'
              : 'text-[#7A6E74] hover:bg-[#FAF4F5]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Services Catalog ({services.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: APPOINTMENTS */}
      {activeSubTab === 'appointments' && (
        <div className="space-y-6">
          {/* Controls: Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#7A6E74] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by client, phone, email, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap cursor-pointer transition-colors ${
                    statusFilter === status
                      ? 'bg-[#231F20] text-white'
                      : 'bg-white border border-[#E5D5DA] text-[#5C5257] hover:bg-[#FAF4F5]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* List of Appointments */}
          {filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#EFE8E9] space-y-3">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="font-serif text-lg text-[#231F20]">No appointments found</p>
              <p className="text-xs text-[#7A6E74]">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try clearing your filters or search terms.'
                  : 'Appointments submitted by clients will appear here in real-time.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appt) => {
                const gmailComposeUrl = generateGmailComposeUrl(appt);
                const gmailRejectUrl = generateGmailRejectionComposeUrl(appt, undefined, appt.cancellationReason || 'Slot unavailable');

                return (
                  <div
                    key={appt.id}
                    className="bg-white rounded-3xl p-6 border border-[#EFE8E9] hover:border-[#F3B8C3] transition-all shadow-2xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#FAF4F5] pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FAF4F5] border border-[#F3B8C3] text-[#8B3A56] flex items-center justify-center font-bold text-sm">
                          {appt.customerName ? appt.customerName[0].toUpperCase() : 'C'}
                        </div>
                        <div>
                          <h3 className="font-serif text-lg font-bold text-[#231F20]">
                            {appt.customerName}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#7A6E74]">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <a href={`tel:${appt.customerPhone}`} className="hover:underline">
                                {appt.customerPhone}
                              </a>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <a href={`mailto:${appt.customerEmail}`} className="hover:underline">
                                {appt.customerEmail}
                              </a>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {renderStatusBadge(appt.status)}
                      </div>
                    </div>

                    {/* Appointment Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#5C5257]">
                      {/* Col 1: Service */}
                      <div className="bg-[#FAF7F4] p-3.5 rounded-2xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#7A6E74]">Service</span>
                        <p className="font-semibold text-sm text-[#231F20]">{appt.serviceName}</p>
                        <p className="text-[#8B3A56] font-bold">₱{appt.servicePrice} • {appt.serviceDurationMinutes} mins</p>
                        {appt.isHomeService ? (
                          <div className="pt-1 flex items-center gap-1 text-[#047857] font-medium">
                            <Home className="w-3.5 h-3.5" />
                            <span>Home Service ({appt.clientCount || 1} client{appt.clientCount && appt.clientCount > 1 ? 's' : ''})</span>
                          </div>
                        ) : (
                          <div className="pt-1 flex items-center gap-1 text-[#8B3A56] font-medium">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>In-Studio (Pasig City)</span>
                          </div>
                        )}
                      </div>

                      {/* Col 2: Date & Time */}
                      <div className="bg-[#FAF7F4] p-3.5 rounded-2xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#7A6E74]">Schedule</span>
                        <p className="font-semibold text-sm text-[#231F20] flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#8B3A56]" />
                          <span>{appt.appointmentDate}</span>
                        </p>
                        <p className="text-[#7A6E74] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#8B3A56]" />
                          <span>{appt.startTime} – {appt.endTime || 'Approx 3 hrs'}</span>
                        </p>
                      </div>

                      {/* Col 3: Customer Notes & Inspo */}
                      <div className="bg-[#FAF7F4] p-3.5 rounded-2xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#7A6E74]">Client Notes</span>
                        <p className="text-[#231F20] line-clamp-2">
                          {appt.customerNotes || 'No specific requests provided.'}
                        </p>
                        {appt.homeServiceAddress && (
                          <p className="text-[#805B10] text-[11px] font-medium">
                            <strong>Address:</strong> {appt.homeServiceAddress}
                          </p>
                        )}
                        {appt.inspoImageUrl && (
                          <button
                            type="button"
                            onClick={() => setInspoPreviewUrl(appt.inspoImageUrl || null)}
                            className="text-[#8B3A56] hover:underline flex items-center gap-1 font-semibold pt-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Inspo Photo</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#FAF4F5]">
                      <div className="flex items-center gap-2">
                        {appt.customerEmail && (
                          <a
                            href={gmailComposeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl border border-[#E5D5DA] hover:border-[#8B3A56] text-[#5C5257] hover:text-[#8B3A56] text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            <span>Open in Gmail</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {appt.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleConfirmAppointment(appt)}
                              disabled={isProcessingAction}
                              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#047857] hover:bg-[#065F46] text-white flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Confirm &amp; Send Email</span>
                            </button>

                            <button
                              onClick={() => setRejectingAppt(appt)}
                              disabled={isProcessingAction}
                              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEE2E2] flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Decline / Cancel</span>
                            </button>
                          </>
                        )}

                        {appt.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => handleCompleteAppointment(appt)}
                              disabled={isProcessingAction}
                              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#8B3A56] hover:bg-[#722A42] text-white flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark as Completed</span>
                            </button>

                            <button
                              onClick={() => setRejectingAppt(appt)}
                              disabled={isProcessingAction}
                              className="px-3 py-2 rounded-xl text-xs font-medium text-[#7A6E74] hover:text-[#B91C1C] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                            >
                              Cancel Booking
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: SCHEDULE & BLOCKED HOLIDAYS */}
      {activeSubTab === 'schedule' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE8E9] space-y-6">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#231F20]">
              Working Days &amp; Calendar Block Management
            </h2>
            <p className="text-xs text-[#7A6E74] mt-1">
              Prevent bookings on personal days, holidays, or fully booked dates. Nails by Vril operates on <strong>Sundays and Mondays</strong>.
            </p>
          </div>

          {/* Add Date to Block */}
          <div className="bg-[#FAF7F4] p-5 rounded-2xl border border-[#EFE8E9] flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-auto flex-1">
              <label className="block text-[11px] font-bold text-[#7A6E74] uppercase mb-1">
                Select Date to Block (Closed Day)
              </label>
              <input
                type="date"
                value={newBlockedDate}
                onChange={(e) => setNewBlockedDate(e.target.value)}
                className="w-full sm:w-64 px-3.5 py-2 text-xs rounded-xl bg-white border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
              />
            </div>
            <button
              onClick={handleAddBlockedDate}
              disabled={!newBlockedDate}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#8B3A56] hover:bg-[#722A42] text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-2 sm:mt-5"
            >
              <Plus className="w-4 h-4" />
              <span>Block Selected Date</span>
            </button>
          </div>

          {/* Blocked Dates List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A6E74]">
              Currently Blocked Dates ({formSettings.blockedDates?.length || 0})
            </h3>
            {(!formSettings.blockedDates || formSettings.blockedDates.length === 0) ? (
              <p className="text-xs text-[#7A6E74] italic">No dates blocked. All Sundays and Mondays are currently open for booking.</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {formSettings.blockedDates.map((date) => (
                  <div
                    key={date}
                    className="px-3.5 py-2 rounded-xl bg-[#FAF4F5] border border-[#F3B8C3] text-xs font-medium text-[#8B3A56] flex items-center gap-2 shadow-2xs"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{date}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBlockedDate(date)}
                      className="text-[#7A6E74] hover:text-[#B91C1C] transition-colors cursor-pointer"
                      title="Unblock date"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: BUSINESS SETTINGS */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE8E9] space-y-6">
            <div className="flex items-center justify-between border-b border-[#FAF4F5] pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#231F20]">
                  Salon Profile &amp; Contact Information
                </h2>
                <p className="text-xs text-[#7A6E74] mt-0.5">
                  These settings update your public storefront, booking notices, and customer communications.
                </p>
              </div>
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-6 py-2.5 rounded-full text-xs font-semibold bg-[#8B3A56] hover:bg-[#722A42] text-white flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingSettings ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#5C5257] mb-1">Business Name</label>
                <input
                  type="text"
                  value={formSettings.businessName}
                  onChange={(e) => setFormSettings({ ...formSettings, businessName: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F4] border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5C5257] mb-1">Tagline</label>
                <input
                  type="text"
                  value={formSettings.tagline}
                  onChange={(e) => setFormSettings({ ...formSettings, tagline: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F4] border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5C5257] mb-1">Instagram Handle</label>
                <input
                  type="text"
                  value={formSettings.instagramHandle}
                  onChange={(e) => setFormSettings({ ...formSettings, instagramHandle: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F4] border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5C5257] mb-1">Instagram URL</label>
                <input
                  type="url"
                  value={formSettings.instagramUrl}
                  onChange={(e) => setFormSettings({ ...formSettings, instagramUrl: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F4] border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5C5257] mb-1">Contact Email</label>
                <input
                  type="email"
                  value={formSettings.contactEmail}
                  onChange={(e) => setFormSettings({ ...formSettings, contactEmail: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F4] border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5C5257] mb-1">Location / City</label>
                <input
                  type="text"
                  value={formSettings.location}
                  onChange={(e) => setFormSettings({ ...formSettings, location: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F4] border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#5C5257] mb-1">Google Maps Pin URL</label>
                <input
                  type="url"
                  value={formSettings.googleMapsUrl || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, googleMapsUrl: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F4] border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#5C5257] mb-1">Home Service Notice / Policy</label>
                <textarea
                  rows={2}
                  value={formSettings.homeServiceNotice}
                  onChange={(e) => setFormSettings({ ...formSettings, homeServiceNotice: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F4] border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                />
              </div>
            </div>
          </form>

          {/* Dynamic Admin Accounts Management Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE8E9] space-y-6">
            <div className="flex items-center justify-between border-b border-[#FAF4F5] pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#231F20] flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#8B3A56]" />
                  <span>Authorized Owner &amp; Sub-Admin Accounts</span>
                </h2>
                <p className="text-xs text-[#7A6E74] mt-0.5">
                  Rayana is the Main Admin. Sub-admins have operational access to manage appointments, calendar blocks, and salon settings, but cannot add or remove other sub-admins.
                </p>
              </div>
            </div>

            {/* Add Sub-Admin Form: Only available for Main Admin */}
            {isCurrentUserMainAdmin ? (
              <div className="bg-[#FAF7F4] p-5 rounded-2xl border border-[#EFE8E9] flex flex-col sm:flex-row items-center gap-3">
                <div className="w-full sm:w-auto flex-1">
                  <label className="block text-[11px] font-bold text-[#7A6E74] uppercase mb-1">
                    Add New Sub-Admin Google Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. subadmin@gmail.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  disabled={!newAdminEmail || isAddingAdmin}
                  onClick={async () => {
                    if (!newAdminEmail.trim()) return;
                    setIsAddingAdmin(true);
                    try {
                      await firestoreService.addAdminEmail(newAdminEmail, currentUser?.email || undefined);
                      const updated = await firestoreService.getAdminsList();
                      setAdminAccountsList(updated);
                      setNewAdminEmail('');
                      showToast(`Granted sub-admin access to ${newAdminEmail}!`);
                    } catch (err) {
                      showToast(undefined, err instanceof Error ? err.message : 'Failed to add sub-admin');
                    } finally {
                      setIsAddingAdmin(false);
                    }
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#8B3A56] hover:bg-[#722A42] text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-2 sm:mt-5 disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddingAdmin ? 'Granting...' : 'Grant Sub-Admin Access'}</span>
                </button>
              </div>
            ) : (
              <div className="bg-[#FFF8E7] border border-[#F5C77E] p-4 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
                <div className="text-xs text-[#805B10]">
                  <p className="font-bold">Sub-Admin Restriction</p>
                  <p className="mt-0.5 leading-relaxed">
                    You are signed in with Sub-Admin access. Sub-admins cannot add or remove other sub-admins. Only the Main Admin (<strong>{MAIN_ADMIN_EMAIL}</strong>) can manage admin accounts.
                  </p>
                </div>
              </div>
            )}

            {/* Admin Accounts List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A6E74]">
                Active Administrators ({adminAccountsList.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {adminAccountsList.map((admin) => {
                  const isMain = isMainAdmin(admin.email);
                  return (
                    <div
                      key={admin.id || admin.email}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                        isMain ? 'bg-[#FFFDF9] border-[#F0D5BE]' : 'bg-[#FAF7F4] border-[#EFE8E9]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isMain
                              ? 'bg-gradient-to-br from-[#8B3A56] to-[#601F35] text-amber-200'
                              : 'bg-[#FCEBEE] text-[#8B3A56]'
                          }`}
                        >
                          {isMain ? (
                            <Crown className="w-4 h-4 text-amber-300" />
                          ) : (
                            admin.email.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#231F20] truncate">{admin.email}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {isMain ? (
                              <span className="text-[10px] bg-gradient-to-r from-[#8B3A56] to-[#601F35] text-amber-200 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-300/30 flex items-center gap-1">
                                <Crown className="w-3 h-3 text-amber-300" />
                                <span>Main Admin</span>
                              </span>
                            ) : (
                              <span className="text-[10px] bg-[#FAF0F3] text-[#8B3A56] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#F3B8C3] flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Sub-Admin</span>
                              </span>
                            )}
                            {isMain && (
                              <span className="text-[10px] text-amber-800 font-medium">(Permanent)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sub-admins can be removed, but ONLY by the Main Admin. Rayana can never be removed. */}
                      {!isMain && isCurrentUserMainAdmin && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Revoke sub-admin access for ${admin.email}?`)) {
                              try {
                                await firestoreService.removeAdminEmail(admin.email, currentUser?.email || undefined);
                                const updated = await firestoreService.getAdminsList();
                                setAdminAccountsList(updated);
                                showToast(`Revoked sub-admin access for ${admin.email}`);
                              } catch (err) {
                                showToast(undefined, err instanceof Error ? err.message : 'Failed to revoke sub-admin');
                              }
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                          title={`Revoke Sub-Admin Access for ${admin.email}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SERVICES CATALOG */}
      {activeSubTab === 'services' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE8E9] space-y-6">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#231F20]">
              Active Services &amp; Price List
            </h2>
            <p className="text-xs text-[#7A6E74] mt-0.5">
              Approved core catalog offered to clients.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="p-4 rounded-2xl border border-[#EFE8E9] bg-[#FAF7F4] flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <h4 className="font-serif text-base font-bold text-[#231F20]">{service.name}</h4>
                  <p className="text-xs text-[#7A6E74]">{service.category} • {service.durationMinutes} mins</p>
                  <p className="font-bold text-sm text-[#8B3A56]">₱{service.price}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#D1FAE5] text-[#047857]">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inspo Preview Modal */}
      {inspoPreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-[#F3B8C3] relative">
            <div className="flex items-center justify-between border-b border-[#FAF4F5] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#231F20]">Client Inspiration Photo</h3>
              <button
                onClick={() => setInspoPreviewUrl(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-hidden rounded-2xl bg-gray-50 flex items-center justify-center">
              <img
                src={inspoPreviewUrl}
                alt="Client Inspiration"
                className="max-h-96 w-auto object-contain"
              />
            </div>
            <div className="text-right">
              <button
                onClick={() => setInspoPreviewUrl(null)}
                className="px-5 py-2 rounded-full text-xs font-semibold bg-[#8B3A56] text-white hover:bg-[#722A42]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection / Cancellation Reason Modal */}
      {rejectingAppt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#FECACA]">
            <div className="flex items-center justify-between border-b border-[#FAF4F5] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#B91C1C]">Decline Appointment Request</h3>
              <button
                onClick={() => setRejectingAppt(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#5C5257]">
              Please specify the reason for cancelling <strong>{rejectingAppt.customerName}&apos;s</strong> booking for {rejectingAppt.appointmentDate}:
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F4] border border-[#E5D5DA] focus:border-[#B91C1C] focus:outline-hidden"
              placeholder="e.g. The requested slot has already been booked. Please pick another Sunday or Monday."
            />
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setRejectingAppt(null)}
                className="px-4 py-2 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Go Back
              </button>
              <button
                onClick={handleExecuteRejection}
                disabled={isProcessingAction}
                className="px-5 py-2 rounded-full text-xs font-semibold bg-[#B91C1C] text-white hover:bg-[#991B1B]"
              >
                {isProcessingAction ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

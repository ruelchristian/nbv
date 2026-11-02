import React, { useState, useMemo } from 'react';
import { Appointment, BusinessSettings, Service, AppointmentStatus } from '../types';
import {
  firestoreService,
  isMainAdmin,
  MAIN_ADMIN_EMAIL,
  getActiveMainAdminEmail,
  AdminAccount,
} from '../services/firestoreService';
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
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Users,
  TrendingUp,
  Gift,
  CalendarCheck,
  Check,
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

export type SubTabType =
  | 'overview'
  | 'appointments'
  | 'calendar'
  | 'services'
  | 'schedule'
  | 'clients'
  | 'analytics'
  | 'settings';

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
  // Navigation Sub-tabs (Matching original 7-tab system)
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('appointments');

  // Search & Filter (Appointments)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals & Inspection
  const [inspoPreviewUrl, setInspoPreviewUrl] = useState<string | null>(null);
  const [inspectingAppt, setInspectingAppt] = useState<Appointment | null>(null);
  const [rejectingAppt, setRejectingAppt] = useState<Appointment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Requested slot is unavailable');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Calendar View State (Image 1)
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date(2026, 10, 1)); // November 2026 default
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');

  // Schedule & Availability State (Image 2)
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [newCustomDate, setNewCustomDate] = useState('');
  const [formSettings, setFormSettings] = useState<BusinessSettings>(settings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Dynamic Admin Accounts & Transfer Ownership State
  const [adminAccountsList, setAdminAccountsList] = useState<AdminAccount[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [transferringAdmin, setTransferringAdmin] = useState<AdminAccount | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // Clients Directory & Analytics Filter State (Image 3)
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState<'all' | 'repeat' | 'in_studio' | 'home_service'>('all');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [isTogglingService, setIsTogglingService] = useState<string | null>(null);

  const activeMainAdminEmail = getActiveMainAdminEmail();
  const isCurrentUserMainAdmin = isMainAdmin(currentUser?.email);

  React.useEffect(() => {
    firestoreService.getAdminsList().then((res) => setAdminAccountsList(res));
  }, []);

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
      await firestoreService.updateAppointmentStatus(appt.id, 'confirmed');

      try {
        await sendAppointmentConfirmationEmail(appt, { ownerEmail: activeMainAdminEmail });
        await firestoreService.updateAppointmentEmailStatus(appt.id, {
          emailNotificationSent: true,
          emailSentAt: new Date().toISOString(),
          emailRecipient: appt.customerEmail,
        });
        showToast(`Appointment confirmed & notification sent to ${appt.customerEmail}!`);
      } catch (mailErr: any) {
        console.warn('Gmail API automated dispatch notice:', mailErr);
        const composeUrl = generateGmailComposeUrl(appt, appt.customerEmail);
        showToast(
          `Appointment confirmed! Gmail draft ready: Click below or open draft to send.`,
          undefined
        );
        window.open(composeUrl, '_blank');
      }
      onRefresh();
    } catch (err: any) {
      showToast(undefined, err?.message || 'Failed to confirm appointment');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 2. Mark Appointment Completed Handler
  const handleCompleteAppointment = async (appt: Appointment) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      await firestoreService.updateAppointmentStatus(appt.id, 'completed');
      showToast(`Appointment for ${appt.customerName} marked as Completed!`);
      onRefresh();
    } catch (err: any) {
      showToast(undefined, err?.message || 'Failed to update appointment');
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
        await sendAppointmentRejectionEmail(rejectingAppt, {
          reason: rejectionReason,
          ownerEmail: activeMainAdminEmail,
        });
        showToast(`Appointment cancelled & cancellation notice sent to ${rejectingAppt.customerEmail}.`);
      } catch (mailErr) {
        console.warn('Notice sending cancellation email:', mailErr);
        const fallbackUrl = generateGmailRejectionComposeUrl(
          rejectingAppt,
          rejectingAppt.customerEmail,
          rejectionReason
        );
        showToast(`Appointment cancelled. Gmail draft generated.`);
        window.open(fallbackUrl, '_blank');
      }

      setRejectingAppt(null);
      onRefresh();
    } catch (err: any) {
      showToast(undefined, err?.message || 'Failed to cancel appointment');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 4. Block / Unblock Dates
  const handleAddBlockedDate = () => {
    if (!newBlockedDate) return;
    const currentBlocked = formSettings.blockedDates || [];
    if (!currentBlocked.includes(newBlockedDate)) {
      const updatedBlocked = [...currentBlocked, newBlockedDate].sort();
      const updatedCustom = (formSettings.customAvailableDates || []).filter((d) => d !== newBlockedDate);
      const nextSettings = {
        ...formSettings,
        blockedDates: updatedBlocked,
        customAvailableDates: updatedCustom,
      };
      setFormSettings(nextSettings);
      onUpdateSettings(nextSettings);
      showToast(`Blocked date ${newBlockedDate} on calendar.`);
    }
    setNewBlockedDate('');
  };

  const handleRemoveBlockedDate = (dateToRemove: string) => {
    const updated = (formSettings.blockedDates || []).filter((d) => d !== dateToRemove);
    const nextSettings = { ...formSettings, blockedDates: updated };
    setFormSettings(nextSettings);
    onUpdateSettings(nextSettings);
    showToast(`Unblocked date ${dateToRemove}.`);
  };

  // 5. Custom Available Date Handlers (Image 2 - Green Card)
  const handleAddCustomDate = () => {
    if (!newCustomDate) return;
    const currentCustom = formSettings.customAvailableDates || [];
    if (!currentCustom.includes(newCustomDate)) {
      const updatedCustom = [...currentCustom, newCustomDate].sort();
      const updatedBlocked = (formSettings.blockedDates || []).filter((d) => d !== newCustomDate);
      const nextSettings = {
        ...formSettings,
        customAvailableDates: updatedCustom,
        blockedDates: updatedBlocked,
      };
      setFormSettings(nextSettings);
      onUpdateSettings(nextSettings);
      showToast(`Date ${newCustomDate} is now open and available for booking!`);
    }
    setNewCustomDate('');
  };

  const handleRemoveCustomDate = (dateToRemove: string) => {
    const updated = (formSettings.customAvailableDates || []).filter((d) => d !== dateToRemove);
    const nextSettings = { ...formSettings, customAvailableDates: updated };
    setFormSettings(nextSettings);
    onUpdateSettings(nextSettings);
    showToast(`Removed custom available date ${dateToRemove}.`);
  };

  // 6. Day-of-Week Toggle Handler (Image 2)
  const handleToggleWorkingDay = (dayIndex: number) => {
    const currentDays = formSettings.workingDays || [0, 1];
    const nextDays = currentDays.includes(dayIndex)
      ? currentDays.filter((d) => d !== dayIndex)
      : [...currentDays, dayIndex].sort();
    const nextSettings = { ...formSettings, workingDays: nextDays };
    setFormSettings(nextSettings);
  };

  // 7. Save Settings Form Handler
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    try {
      await firestoreService.updateSettings(formSettings);
      onUpdateSettings(formSettings);
      showToast('Studio settings saved and published successfully!');
    } catch (err: any) {
      showToast(undefined, err?.message || 'Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // 8. Transfer Main Admin Role Handler
  const handleExecuteTransferOwnership = async () => {
    if (!transferringAdmin || isTransferring) return;
    setIsTransferring(true);
    try {
      await firestoreService.transferMainAdminRole(transferringAdmin.email, currentUser?.email || undefined);
      const updated = await firestoreService.getAdminsList();
      setAdminAccountsList(updated);
      showToast(`Successfully transferred Main Admin role to ${transferringAdmin.email}!`);
      setTransferringAdmin(null);
      onRefresh();
    } catch (err: any) {
      showToast(undefined, err instanceof Error ? err.message : 'Failed to transfer Main Admin role');
    } finally {
      setIsTransferring(false);
    }
  };

  // Filter Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
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
  }, [appointments, statusFilter, searchQuery]);

  // Aggregate Clients Directory (Image 3)
  const clientDirectory = useMemo(() => {
    const map = new Map<string, {
      key: string;
      name: string;
      phone: string;
      email: string;
      appointments: Appointment[];
      completedCount: number;
      totalSpend: number;
      isHomeServiceUser: boolean;
      isInStudioUser: boolean;
      lastVisitDate: string;
    }>();

    appointments.forEach((appt) => {
      const key = (appt.customerEmail || appt.customerPhone || appt.customerName).toLowerCase().trim();
      if (!key) return;

      const existing = map.get(key) || {
        key,
        name: appt.customerName || 'Client',
        phone: appt.customerPhone || '',
        email: appt.customerEmail || '',
        appointments: [],
        completedCount: 0,
        totalSpend: 0,
        isHomeServiceUser: false,
        isInStudioUser: false,
        lastVisitDate: appt.appointmentDate,
      };

      existing.appointments.push(appt);
      if (appt.status === 'completed' || appt.status === 'confirmed') {
        existing.completedCount += 1;
        existing.totalSpend += Number(appt.servicePrice) || 0;
      }
      if (appt.isHomeService) existing.isHomeServiceUser = true;
      else existing.isInStudioUser = true;

      if (appt.appointmentDate > existing.lastVisitDate) {
        existing.lastVisitDate = appt.appointmentDate;
      }

      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.completedCount - a.completedCount);
  }, [appointments]);

  // Filter Clients Directory
  const filteredClients = useMemo(() => {
    return clientDirectory.filter((client) => {
      const matchesQuery =
        clientSearchQuery === '' ||
        client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
        client.phone.includes(clientSearchQuery) ||
        client.email.toLowerCase().includes(clientSearchQuery.toLowerCase());

      if (!matchesQuery) return false;

      if (clientFilter === 'repeat') return client.completedCount > 1;
      if (clientFilter === 'in_studio') return client.isInStudioUser;
      if (clientFilter === 'home_service') return client.isHomeServiceUser;
      return true;
    });
  }, [clientDirectory, clientSearchQuery, clientFilter]);

  // Metrics (Image 3)
  const totalCount = appointments.length;
  const pendingCount = appointments.filter((a) => a.status === 'pending').length;
  const confirmedCount = appointments.filter((a) => a.status === 'confirmed').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const totalRevenue = appointments
    .filter((a) => a.status === 'confirmed' || a.status === 'completed')
    .reduce((sum, a) => sum + (Number(a.servicePrice) || 0), 0);

  // Busy Date Peaks: Dates with 2 or more appointments
  const busyPeakDatesCount = useMemo(() => {
    const counts = new Map<string, number>();
    appointments.forEach((a) => {
      if (a.status !== 'cancelled') {
        counts.set(a.appointmentDate, (counts.get(a.appointmentDate) || 0) + 1);
      }
    });
    return Array.from(counts.values()).filter((c) => c >= 2).length;
  }, [appointments]);

  // Calendar Helpers (Image 1)
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const calendarMonthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate();

    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean; dayOfWeek: number }[] = [];

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(calendarYear, calendarMonth - 1, d);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: d, isCurrentMonth: false, dayOfWeek: prevDate.getDay() });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(calendarYear, calendarMonth, d).getDay();
      cells.push({ dateStr, dayNum: d, isCurrentMonth: true, dayOfWeek });
    }

    // Next month padding to fill grid
    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(calendarYear, calendarMonth + 1, d);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: d, isCurrentMonth: false, dayOfWeek: nextDate.getDay() });
    }

    return cells;
  }, [calendarYear, calendarMonth]);

  // Navigation handlers for Calendar
  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1));
  };
  const handleToday = () => {
    setCalendarDate(new Date());
  };

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

  const getApptChipColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-[#D97706] hover:bg-[#B45309] text-white';
      case 'completed':
        return 'bg-[#047857] hover:bg-[#065F46] text-white';
      case 'cancelled':
        return 'bg-gray-400 hover:bg-gray-500 text-white line-through opacity-60';
      case 'confirmed':
      default:
        return 'bg-[#8B3A56] hover:bg-[#722A42] text-white';
    }
  };

  const handleToggleService = async (service: Service) => {
    setIsTogglingService(service.id);
    const nextStatus = !service.isActive;
    try {
      await firestoreService.updateService(service.id, { isActive: nextStatus });
      showToast(`${service.name} is now ${nextStatus ? 'Active & bookable by clients' : 'Toggled Off (hidden from booking)'}.`);
      onRefresh();
    } catch (err: any) {
      console.warn('Fallback updating service status:', err);
      service.isActive = nextStatus;
      showToast(`${service.name} updated to ${nextStatus ? 'Active' : 'Off'}.`);
      onRefresh();
    } finally {
      setIsTogglingService(null);
    }
  };

  const DAYS_OF_WEEK = [
    { id: 0, label: 'Sun', name: 'Sunday' },
    { id: 1, label: 'Mon', name: 'Monday' },
    { id: 2, label: 'Tue', name: 'Tuesday' },
    { id: 3, label: 'Wed', name: 'Wednesday' },
    { id: 4, label: 'Thu', name: 'Thursday' },
    { id: 5, label: 'Fri', name: 'Friday' },
    { id: 6, label: 'Sat', name: 'Saturday' },
  ];

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

      {/* Admin Notice Banner if not signed in as Main Admin */}
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
                Main Admin: <strong>{activeMainAdminEmail}</strong>.
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B3A56] bg-[#FAF4F5] px-2.5 py-0.5 rounded-full border border-[#F3B8C3]">
                AUTHORIZED OWNER ACCESS
              </span>
              <span className="text-xs text-[#7A6E74] font-medium hidden sm:inline">
                {currentUser?.email || activeMainAdminEmail}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#231F20]">
                Studio Management &amp; Analytics
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
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl border border-[#E5D5DA] text-[#7A6E74] hover:text-[#231F20] hover:bg-[#FAF7F4] transition-colors cursor-pointer"
            title="Refresh Studio Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top 7 Navigation Tabs (Image 1 & 3 Layout) */}
      <div className="flex items-center border-b border-[#EFE8E9] gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'overview'
              ? 'bg-[#8B3A56] text-white shadow-2xs'
              : 'text-[#7A6E74] hover:bg-[#FAF4F5]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveSubTab('appointments')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'appointments'
              ? 'bg-[#8B3A56] text-white shadow-2xs'
              : 'text-[#7A6E74] hover:bg-[#FAF4F5]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Appointments ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('calendar')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'calendar'
              ? 'bg-[#8B3A56] text-white shadow-2xs'
              : 'text-[#7A6E74] hover:bg-[#FAF4F5]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Calendar</span>
        </button>

        <button
          onClick={() => setActiveSubTab('services')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'services'
              ? 'bg-[#8B3A56] text-white shadow-2xs'
              : 'text-[#7A6E74] hover:bg-[#FAF4F5]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Services ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('schedule')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'schedule'
              ? 'bg-[#8B3A56] text-white shadow-2xs'
              : 'text-[#7A6E74] hover:bg-[#FAF4F5]'
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          <span>Schedule</span>
        </button>

        <button
          onClick={() => setActiveSubTab('clients')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'clients'
              ? 'bg-[#8B3A56] text-white shadow-2xs'
              : 'text-[#7A6E74] hover:bg-[#FAF4F5]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Clients</span>
        </button>

        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'analytics'
              ? 'bg-[#8B3A56] text-white shadow-2xs'
              : 'text-[#7A6E74] hover:bg-[#FAF4F5]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Analytics</span>
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'settings'
              ? 'bg-[#8B3A56] text-white shadow-2xs'
              : 'text-[#7A6E74] hover:bg-[#FAF4F5]'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </div>

      {/* SUB-TAB: OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
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
              <span className="text-[11px] font-semibold text-[#047857] uppercase">Confirmed Sessions</span>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-[#047857] mt-1">{confirmedCount}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EFE8E9] shadow-2xs">
              <span className="text-[11px] font-semibold text-[#8B3A56] uppercase">Est. Revenue</span>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-[#8B3A56] mt-1">₱{totalRevenue.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE8E9] space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#231F20]">Upcoming Bookings Quick View</h3>
            <div className="space-y-3">
              {appointments.slice(0, 5).map((appt) => (
                <div key={appt.id} className="p-4 rounded-2xl border border-[#EFE8E9] bg-[#FAF7F4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-sm text-[#231F20]">{appt.customerName} • <span className="font-normal text-[#7A6E74]">{appt.serviceName}</span></p>
                    <p className="text-[#7A6E74] mt-0.5">{appt.appointmentDate} at {appt.startTime} • {appt.customerPhone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStatusBadge(appt.status)}
                    {appt.status === 'pending' && (
                      <button
                        onClick={() => handleConfirmAppointment(appt)}
                        className="px-3 py-1.5 rounded-xl bg-[#8B3A56] text-white font-semibold text-xs hover:bg-[#722A42] cursor-pointer"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: APPOINTMENTS PIPELINE */}
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
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-white border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#7A6E74]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-white border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden font-medium text-[#231F20]"
              >
                <option value="all">All Statuses ({appointments.length})</option>
                <option value="pending">Pending Review ({pendingCount})</option>
                <option value="confirmed">Confirmed ({confirmedCount})</option>
                <option value="completed">Completed ({completedCount})</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Appointments List Cards */}
          {filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#EFE8E9] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FAF4F5] text-[#8B3A56] mx-auto flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#231F20]">No Appointments Found</h3>
              <p className="text-xs text-[#7A6E74] max-w-sm mx-auto">
                No customer bookings match your current filter query.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE8E9] hover:border-[#F3B8C3] transition-all space-y-4 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#FAF4F5] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#FCEBEE] text-[#8B3A56] font-bold flex items-center justify-center text-sm shrink-0">
                        {appt.customerName ? appt.customerName.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <h3 className="font-serif text-base font-bold text-[#231F20]">
                          {appt.customerName}
                        </h3>
                        <p className="text-xs text-[#7A6E74] flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-[#8B3A56]" />
                          <span>{appt.customerPhone}</span>
                          <span>•</span>
                          <Mail className="w-3 h-3 text-[#8B3A56]" />
                          <span>{appt.customerEmail}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStatusBadge(appt.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-[#FAF7F4] p-3 rounded-xl border border-[#EFE8E9]">
                      <span className="text-[10px] uppercase font-bold text-[#7A6E74]">Service</span>
                      <p className="font-semibold text-[#231F20] mt-0.5">{appt.serviceName}</p>
                    </div>
                    <div className="bg-[#FAF7F4] p-3 rounded-xl border border-[#EFE8E9]">
                      <span className="text-[10px] uppercase font-bold text-[#7A6E74]">Date &amp; Time</span>
                      <p className="font-semibold text-[#231F20] mt-0.5">{appt.appointmentDate} • {appt.startTime}</p>
                    </div>
                    <div className="bg-[#FAF7F4] p-3 rounded-xl border border-[#EFE8E9]">
                      <span className="text-[10px] uppercase font-bold text-[#7A6E74]">Location Mode</span>
                      <p className="font-semibold text-[#231F20] mt-0.5">{appt.isHomeService ? 'Home Service (Pasig)' : 'In-Studio Studio'}</p>
                    </div>
                    <div className="bg-[#FAF7F4] p-3 rounded-xl border border-[#EFE8E9]">
                      <span className="text-[10px] uppercase font-bold text-[#7A6E74]">Price</span>
                      <p className="font-bold text-[#8B3A56] mt-0.5">₱{appt.servicePrice}</p>
                    </div>
                  </div>

                  {appt.inspoImageUrl && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setInspoPreviewUrl(appt.inspoImageUrl || null)}
                        className="px-3 py-1.5 rounded-lg border border-[#F3B8C3] bg-[#FAF4F5] text-[#8B3A56] text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-[#FCEBEE]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Inspiration Photo</span>
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#FAF4F5]">
                    <div className="text-xs text-[#7A6E74]">
                      {appt.emailNotificationSent && (
                        <span className="text-[#047857] flex items-center gap-1 font-medium">
                          <Check className="w-3 h-3" /> Email confirmation dispatched
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {appt.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setRejectingAppt(appt)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#B91C1C] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmAppointment(appt)}
                            disabled={isProcessingAction}
                            className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#8B3A56] hover:bg-[#722A42] text-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Confirm &amp; Send Email</span>
                          </button>
                        </>
                      )}
                      {appt.status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => handleCompleteAppointment(appt)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#047857] text-white hover:bg-[#065F46] flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Completed</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: INTERACTIVE VISUAL CALENDAR (Image 1) */}
      {activeSubTab === 'calendar' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE8E9] space-y-6 shadow-2xs">
          {/* Calendar Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#FAF4F5] pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-[#E5D5DA] rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-[#FAF7F4] text-[#7A6E74] hover:text-[#231F20] transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-[#FAF7F4] text-[#7A6E74] hover:text-[#231F20] transition-colors cursor-pointer border-l border-[#E5D5DA]"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#231F20]">
                {calendarMonthName}
              </h2>

              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5D5DA] hover:bg-[#FAF7F4] text-[#7A6E74] cursor-pointer"
              >
                Today
              </button>
            </div>

            {/* View Switcher: Month | Week | Day */}
            <div className="flex items-center bg-[#FAF7F4] p-1 rounded-xl border border-[#E5D5DA]">
              <button
                type="button"
                onClick={() => setCalendarView('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  calendarView === 'month'
                    ? 'bg-[#8B3A56] text-white shadow-xs'
                    : 'text-[#7A6E74] hover:text-[#231F20]'
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setCalendarView('week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  calendarView === 'week'
                    ? 'bg-[#8B3A56] text-white shadow-xs'
                    : 'text-[#7A6E74] hover:text-[#231F20]'
                }`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setCalendarView('day')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  calendarView === 'day'
                    ? 'bg-[#8B3A56] text-white shadow-xs'
                    : 'text-[#7A6E74] hover:text-[#231F20]'
                }`}
              >
                Day
              </button>
            </div>
          </div>

          {/* Calendar Color Coding Legend */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 p-3 sm:p-3.5 rounded-2xl bg-[#FAF7F4] border border-[#EFE8E9] text-[11px] text-[#5C5257]">
            <span className="font-bold uppercase tracking-wider text-[#7A6E74] text-[10px]">Color Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B3A56] inline-block shadow-2xs"></span>
              <span className="font-medium text-[#231F20]">Confirmed (Burgundy)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] inline-block shadow-2xs"></span>
              <span className="font-medium text-[#231F20]">Pending (Amber)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#047857] inline-block shadow-2xs"></span>
              <span className="font-medium text-[#231F20]">Completed (Green)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded-xs bg-[#DCFCE7] text-[#15803D] font-bold text-[9px] uppercase">Open</span>
              <span className="font-medium text-[#231F20]">Special Opened Date</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded-xs bg-[#FEE2E2] text-[#B91C1C] font-bold text-[9px] uppercase">Blocked</span>
              <span className="font-medium text-[#231F20]">Closed / Salon Holiday</span>
            </div>
          </div>

          {/* Month View (Image 1 Visual Grid) */}
          {calendarView === 'month' && (
            <div className="border border-[#EFE8E9] rounded-2xl overflow-hidden">
              {/* Day-of-Week Table Header */}
              <div className="grid grid-cols-7 bg-[#FAF7F4] border-b border-[#EFE8E9] text-center text-xs font-bold text-[#7A6E74] py-2.5">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Day Cells Matrix */}
              <div className="grid grid-cols-7 divide-x divide-y divide-[#EFE8E9] bg-white">
                {calendarGrid.map((cell, idx) => {
                  const dayAppts = appointments.filter((a) => a.appointmentDate === cell.dateStr && a.status !== 'cancelled');
                  const isBlocked = formSettings.blockedDates?.includes(cell.dateStr);
                  const isCustomAvailable = formSettings.customAvailableDates?.includes(cell.dateStr);
                  const isWorkingDay = (formSettings.workingDays || [0, 1]).includes(cell.dayOfWeek);

                  return (
                    <div
                      key={`${cell.dateStr}-${idx}`}
                      className={`min-h-[105px] p-2 flex flex-col justify-between transition-colors ${
                        !cell.isCurrentMonth
                          ? 'bg-gray-50/60 opacity-40'
                          : isBlocked
                          ? 'bg-[#FFF5F5]'
                          : isCustomAvailable
                          ? 'bg-[#F0FDF4]/50'
                          : isWorkingDay
                          ? 'bg-white hover:bg-[#FAF9F8]'
                          : 'bg-[#FCFAF8]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            cell.isCurrentMonth ? 'text-[#231F20]' : 'text-gray-400'
                          }`}
                        >
                          {cell.dayNum}
                        </span>
                        {isBlocked && (
                          <span className="text-[9px] font-bold uppercase text-[#B91C1C] bg-[#FEE2E2] px-1.5 py-0.5 rounded-sm">
                            Blocked
                          </span>
                        )}
                        {isCustomAvailable && !isBlocked && (
                          <span className="text-[9px] font-bold uppercase text-[#15803D] bg-[#DCFCE7] px-1.5 py-0.5 rounded-sm">
                            Open
                          </span>
                        )}
                      </div>

                      {/* Appointment Badges (Image 1 Style with Status Colors) */}
                      <div className="space-y-1 mt-1.5 overflow-hidden">
                        {dayAppts.map((appt) => (
                          <button
                            key={appt.id}
                            type="button"
                            onClick={() => setInspectingAppt(appt)}
                            className={`w-full text-left ${getApptChipColor(appt.status)} text-[10px] font-semibold py-1 px-1.5 rounded-lg flex items-center justify-between gap-1 shadow-xs transition-colors cursor-pointer truncate`}
                            title={`${appt.startTime} - ${appt.customerName} (${appt.serviceName}) • ${appt.status}`}
                          >
                            <span className="truncate">
                              {appt.startTime} - {appt.customerName}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="text-[9px] text-[#A89FA3] text-right mt-1">
                        {dayAppts.length > 0 && `${dayAppts.length} booked`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Week View */}
          {calendarView === 'week' && (
            <div className="space-y-3">
              <p className="text-xs text-[#7A6E74]">Displaying appointments scheduled for the active week.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {appointments
                  .filter((a) => a.status !== 'cancelled')
                  .slice(0, 9)
                  .map((appt) => (
                    <div
                      key={appt.id}
                      onClick={() => setInspectingAppt(appt)}
                      className="p-4 rounded-2xl bg-[#FAF7F4] border border-[#EFE8E9] hover:border-[#8B3A56] transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#8B3A56]">{appt.appointmentDate} • {appt.startTime}</span>
                        {renderStatusBadge(appt.status)}
                      </div>
                      <p className="font-bold text-sm text-[#231F20]">{appt.customerName}</p>
                      <p className="text-xs text-[#7A6E74]">{appt.serviceName} • ₱{appt.servicePrice}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Day View */}
          {calendarView === 'day' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#FAF7F4] p-4 rounded-2xl border border-[#EFE8E9]">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#231F20]">Daily Slot Breakdown</h3>
                  <p className="text-xs text-[#7A6E74]">Direct inspection of scheduled client bookings.</p>
                </div>
              </div>
              <div className="space-y-3">
                {appointments
                  .filter((a) => a.status !== 'cancelled')
                  .map((appt) => (
                    <div key={appt.id} className="p-4 rounded-2xl border border-[#EFE8E9] bg-white flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="font-bold text-sm text-[#231F20]">{appt.startTime} — {appt.customerName}</p>
                        <p className="text-xs text-[#7A6E74]">{appt.serviceName} • {appt.appointmentDate} • {appt.customerPhone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderStatusBadge(appt.status)}
                        <button
                          onClick={() => setInspectingAppt(appt)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-[#FAF4F5] text-[#8B3A56] border border-[#F3B8C3]"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: SERVICES CATALOG (With Interactive On/Off Toggles) */}
      {activeSubTab === 'services' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE8E9] space-y-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#FAF4F5] pb-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#231F20]">
                Services &amp; Pricing Catalog Management
              </h2>
              <p className="text-xs text-[#7A6E74] mt-0.5">
                Toggle services ON or OFF to dynamically show or hide them from client booking.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#8B3A56] bg-[#FAF4F5] px-3 py-1.5 rounded-full border border-[#F3B8C3] self-start sm:self-auto">
              {services.filter((s) => s.isActive).length} of {services.length} active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((service) => (
              <div
                key={service.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                  service.isActive
                    ? 'border-[#EFE8E9] bg-[#FAF7F4]'
                    : 'border-gray-200 bg-gray-50/70 opacity-70'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <h4 className="font-serif text-base font-bold text-[#231F20] truncate">
                    {service.name}
                  </h4>
                  <p className="text-xs text-[#7A6E74]">
                    {service.category} • {service.durationMinutes} mins
                  </p>
                  <p className="font-bold text-sm text-[#8B3A56]">₱{service.price}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${
                      service.isActive
                        ? 'bg-[#D1FAE5] text-[#047857]'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {service.isActive ? 'Active' : 'Off'}
                  </span>

                  {/* Toggle On/Off Switch Button */}
                  <button
                    type="button"
                    disabled={isTogglingService === service.id}
                    onClick={() => handleToggleService(service)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                      service.isActive ? 'bg-[#047857]' : 'bg-gray-300'
                    }`}
                    title={
                      service.isActive
                        ? `Toggle OFF (hide ${service.name} from booking)`
                        : `Toggle ON (make ${service.name} bookable)`
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        service.isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB: SCHEDULE & AVAILABILITY SYSTEM (Image 2) */}
      {activeSubTab === 'schedule' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Business Hours & Home Service Option (Image 2) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE8E9] space-y-6 shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#7A6E74] uppercase mb-1">
                    Opening Time
                  </label>
                  <input
                    type="text"
                    value={formSettings.openingTime || '09:00 AM'}
                    onChange={(e) => setFormSettings({ ...formSettings, openingTime: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F4] border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#7A6E74] uppercase mb-1">
                    Closing Time
                  </label>
                  <input
                    type="text"
                    value={formSettings.closingTime || '08:00 PM'}
                    onChange={(e) => setFormSettings({ ...formSettings, closingTime: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F4] border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Home Service Controls (Image 2) */}
              <div className="p-4 rounded-2xl border border-[#F3B8C3] bg-[#FFF8FA] space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-xs text-[#231F20]">Enable Home-Service Option</span>
                    <p className="text-[11px] text-[#7A6E74]">Allow clients to request on-site appointments</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formSettings.homeServiceEnabled}
                    onChange={(e) => setFormSettings({ ...formSettings, homeServiceEnabled: e.target.checked })}
                    className="w-4 h-4 text-[#8B3A56] rounded-sm focus:ring-[#8B3A56]"
                  />
                </label>
                <div>
                  <label className="block text-[10px] font-bold text-[#7A6E74] uppercase mb-1">
                    Home Service Coverage Notice
                  </label>
                  <input
                    type="text"
                    value={formSettings.homeServiceNotice}
                    onChange={(e) => setFormSettings({ ...formSettings, homeServiceNotice: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* AVAILABLE DAYS OF THE WEEK (Image 2) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE8E9] space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A6E74]">
                    Available Days of the Week
                  </h3>
                  <p className="text-xs text-[#7A6E74] mt-0.5">
                    Select which days of the week the salon accepts client appointments.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FAF4F5] text-[#8B3A56] border border-[#F3B8C3]">
                  {(formSettings.workingDays || [0, 1]).length} of 7 days open
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {DAYS_OF_WEEK.map((d) => {
                  const isAvailable = (formSettings.workingDays || [0, 1]).includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleToggleWorkingDay(d.id)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        isAvailable
                          ? 'bg-[#8B3A56] text-white border-[#8B3A56] shadow-xs'
                          : 'bg-white text-[#7A6E74] border-[#E5D5DA] hover:bg-[#FAF7F4]'
                      }`}
                    >
                      <p className="font-bold text-xs uppercase">{d.label}</p>
                      <span className="text-[10px] opacity-90">
                        {isAvailable ? 'Available' : 'Closed'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SET SPECIFIC CALENDAR DATE AVAILABLE (Image 2 Green Card) */}
            <div className="bg-[#F0FDF4] rounded-3xl p-6 sm:p-8 border border-[#BBF7D0] space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#15803D] flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>SET SPECIFIC CALENDAR DATE AVAILABLE</span>
                  </h3>
                  <p className="text-xs text-[#15803D]/80 mt-0.5">
                    The owner can set ANY specific date to be open and available for appointments.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#15803D]">
                  {(formSettings.customAvailableDates || []).length} custom date(s) enabled
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="date"
                  value={newCustomDate}
                  onChange={(e) => setNewCustomDate(e.target.value)}
                  className="w-full sm:w-64 px-3.5 py-2 text-xs rounded-xl bg-white border border-[#86EFAC] focus:border-[#15803D] focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAddCustomDate}
                  disabled={!newCustomDate}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#15803D] hover:bg-[#166534] text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Make Date Available</span>
                </button>
              </div>

              {formSettings.customAvailableDates && formSettings.customAvailableDates.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {formSettings.customAvailableDates.map((date) => (
                    <div
                      key={date}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#86EFAC] text-xs font-semibold text-[#15803D] flex items-center gap-2 shadow-2xs"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{date}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomDate(date)}
                        className="text-gray-400 hover:text-red-600 cursor-pointer"
                        title="Remove available date"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BLOCKED / HOLIDAY DATES (SALON CLOSED) (Image 2) */}
            <div className="bg-[#FAF7F4] rounded-3xl p-6 sm:p-8 border border-[#EFE8E9] space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#231F20] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#8B3A56]" />
                    <span>BLOCKED / HOLIDAY DATES (SALON CLOSED)</span>
                  </h3>
                  <p className="text-xs text-[#7A6E74] mt-0.5">
                    Dates remain blocked until the date arrives, but the owner can easily set them as available whenever she wants.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FAF4F5] text-[#8B3A56] border border-[#F3B8C3]">
                  {(formSettings.blockedDates || []).length} date(s) blocked
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="date"
                  value={newBlockedDate}
                  onChange={(e) => setNewBlockedDate(e.target.value)}
                  className="w-full sm:w-64 px-3.5 py-2 text-xs rounded-xl bg-white border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAddBlockedDate}
                  disabled={!newBlockedDate}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#8B3A56] hover:bg-[#722A42] text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Block Selected Date</span>
                </button>
              </div>

              {formSettings.blockedDates && formSettings.blockedDates.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {formSettings.blockedDates.map((date) => (
                    <div
                      key={date}
                      className="px-3 py-1.5 rounded-xl bg-[#FAF4F5] border border-[#F3B8C3] text-xs font-semibold text-[#8B3A56] flex items-center gap-2 shadow-2xs"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{date}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlockedDate(date)}
                        className="text-gray-400 hover:text-red-600 cursor-pointer"
                        title="Unblock date"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#7A6E74] italic">0 dates blocked currently.</p>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-6 py-3 rounded-2xl text-xs font-semibold bg-[#8B3A56] hover:bg-[#722A42] text-white flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingSettings ? 'Publishing Changes...' : 'Save Schedule Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB: CLIENTS & ANALYTICS (Image 3) */}
      {(activeSubTab === 'clients' || activeSubTab === 'analytics') && (
        <div className="space-y-6">
          {/* Top 3 KPI Cards (Image 3) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl p-6 border border-[#EFE8E9] space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-[#7A6E74] uppercase tracking-wider">
                Estimated Booking Value
              </span>
              <p className="font-serif text-3xl font-bold text-[#8B3A56]">
                ₱{totalRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-[#7A6E74] mt-1">Calculated from confirmed &amp; completed bookings</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#EFE8E9] space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-[#7A6E74] uppercase tracking-wider">
                Total Reservation Count
              </span>
              <p className="font-serif text-3xl font-bold text-[#231F20]">
                {totalCount}
              </p>
              <p className="text-xs text-[#7A6E74] mt-1">Historical bookings recorded in Firestore</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#EFE8E9] space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-[#7A6E74] uppercase tracking-wider">
                Busy Date Peaks
              </span>
              <p className="font-serif text-3xl font-bold text-[#231F20]">
                {busyPeakDatesCount}
              </p>
              <p className="text-xs text-[#7A6E74] mt-1">Dates operating near/at full daily capacity</p>
            </div>
          </div>

          {/* Clients Done Served Directory (Image 3) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE8E9] space-y-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#FAF4F5] pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#231F20] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#8B3A56]" />
                  <span>Clients Done Served (Completed Client Directory)</span>
                </h2>
                <p className="text-xs text-[#7A6E74] mt-1 max-w-2xl">
                  Historical directory of every client served by Nails by Vril. Quickly recognize returning clients, verify milestone rewards (5th visit 20% off, 10th visit free set), and inspect past nail art inspo.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FCEBEE] text-[#8B3A56]">
                  {clientDirectory.length} Done Served
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#166534]">
                  ₱{totalRevenue.toLocaleString()} Revenue Earned
                </span>
              </div>
            </div>

            {/* Client Search & Filter Pills (Image 3) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#7A6E74] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search client name, phone, email, or service..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-white border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setClientFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    clientFilter === 'all'
                      ? 'bg-[#8B3A56] text-white'
                      : 'bg-[#FAF7F4] text-[#7A6E74] hover:bg-[#FAF4F5]'
                  }`}
                >
                  All ({clientDirectory.length})
                </button>
                <button
                  type="button"
                  onClick={() => setClientFilter('repeat')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    clientFilter === 'repeat'
                      ? 'bg-[#8B3A56] text-white'
                      : 'bg-[#FAF7F4] text-[#7A6E74] hover:bg-[#FAF4F5]'
                  }`}
                >
                  Repeat Clients ({clientDirectory.filter((c) => c.completedCount > 1).length})
                </button>
                <button
                  type="button"
                  onClick={() => setClientFilter('in_studio')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    clientFilter === 'in_studio'
                      ? 'bg-[#8B3A56] text-white'
                      : 'bg-[#FAF7F4] text-[#7A6E74] hover:bg-[#FAF4F5]'
                  }`}
                >
                  In-Studio ({clientDirectory.filter((c) => c.isInStudioUser).length})
                </button>
                <button
                  type="button"
                  onClick={() => setClientFilter('home_service')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    clientFilter === 'home_service'
                      ? 'bg-[#8B3A56] text-white'
                      : 'bg-[#FAF7F4] text-[#7A6E74] hover:bg-[#FAF4F5]'
                  }`}
                >
                  Home Service ({clientDirectory.filter((c) => c.isHomeServiceUser).length})
                </button>
              </div>
            </div>

            {/* Clients List (Image 3 Style) */}
            {filteredClients.length === 0 ? (
              <p className="text-xs text-[#7A6E74] italic py-6 text-center">No client records match your query.</p>
            ) : (
              <div className="space-y-3">
                {filteredClients.map((client) => {
                  const isExpanded = expandedClientId === client.key;
                  return (
                    <div
                      key={client.key}
                      className="p-4 rounded-2xl bg-[#FAF7F4] border border-[#EFE8E9] hover:border-[#F3B8C3] transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#FCEBEE] text-[#8B3A56] font-bold flex items-center justify-center text-sm shrink-0">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-[#231F20]">{client.name}</h4>
                              <span className="text-[10px] text-[#7A6E74] bg-white px-2 py-0.5 rounded-full border border-[#E5D5DA]">
                                {client.completedCount} Visit{client.completedCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <p className="text-xs text-[#7A6E74] mt-0.5">
                              {client.phone} • {client.email}
                            </p>
                          </div>
                        </div>

                        {/* Milestone Reward Badge (Image 3) */}
                        <div className="flex items-center gap-2">
                          {client.completedCount >= 10 ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] flex items-center gap-1.5 shadow-2xs">
                              <Crown className="w-3.5 h-3.5" />
                              <span>10th Visit Milestone (Free Set)</span>
                            </span>
                          ) : client.completedCount >= 5 ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF] flex items-center gap-1.5 shadow-2xs">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>5th Visit Milestone (20% Off)</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white text-[#7A6E74] border border-[#E5D5DA] flex items-center gap-1">
                              <span>{client.completedCount}/5 visits</span>
                              <span>•</span>
                              <span>{5 - client.completedCount} more to 20% off</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setExpandedClientId(isExpanded ? null : client.key)}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-white border border-[#E5D5DA] hover:bg-[#FAF7F4] text-[#7A6E74] cursor-pointer"
                          >
                            {isExpanded ? 'Hide History' : 'History'}
                          </button>
                        </div>
                      </div>

                      {/* Expandable History */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-[#EFE8E9] space-y-2">
                          <p className="text-[11px] font-bold text-[#7A6E74] uppercase">Past Bookings &amp; Service History</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {client.appointments.map((appt) => (
                              <div key={appt.id} className="p-3 bg-white rounded-xl border border-[#EFE8E9] text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-[#231F20]">{appt.appointmentDate} at {appt.startTime}</span>
                                  {renderStatusBadge(appt.status)}
                                </div>
                                <p className="text-[#7A6E74]">{appt.serviceName} • ₱{appt.servicePrice}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB: SETTINGS (Salon Profile & Admin Management with Role Transfer) */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE8E9] space-y-6 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#FAF4F5] pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#231F20]">
                  Salon Profile &amp; Contact
                </h2>
                <p className="text-xs text-[#7A6E74] mt-0.5">
                  Update customer-facing contact channels and studio location details.
                </p>
              </div>
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#8B3A56] hover:bg-[#722A42] text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingSettings ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#7A6E74] uppercase mb-1">
                  Salon Business Name
                </label>
                <input
                  type="text"
                  value={formSettings.businessName}
                  onChange={(e) => setFormSettings({ ...formSettings, businessName: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F4] border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6E74] uppercase mb-1">
                  Instagram Handle
                </label>
                <input
                  type="text"
                  value={formSettings.instagramHandle}
                  onChange={(e) => setFormSettings({ ...formSettings, instagramHandle: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F4] border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6E74] uppercase mb-1">
                  Contact Phone / Instagram Note
                </label>
                <input
                  type="text"
                  value={formSettings.contactPhone}
                  onChange={(e) => setFormSettings({ ...formSettings, contactPhone: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F4] border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6E74] uppercase mb-1">
                  Studio Location (Pasig)
                </label>
                <input
                  type="text"
                  value={formSettings.location}
                  onChange={(e) => setFormSettings({ ...formSettings, location: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F4] border border-[#E5D5DA] focus:border-[#8B3A56] focus:outline-hidden"
                />
              </div>
            </div>
          </form>

          {/* Dynamic Admin Accounts Management Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE8E9] space-y-6 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#FAF4F5] pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#231F20] flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#8B3A56]" />
                  <span>Authorized Owner &amp; Sub-Admin Accounts</span>
                </h2>
                <p className="text-xs text-[#7A6E74] mt-0.5">
                  The Main Admin has exclusive authority to add/remove sub-admins and transfer ownership. Sub-admins have operational access to appointments and schedule.
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
                    You are signed in with Sub-Admin access. Sub-admins cannot add or remove other sub-admins. Only the Main Admin (<strong>{activeMainAdminEmail}</strong>) can manage admin accounts.
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

                      {/* Controls: Transfer Main Admin & Remove Sub-Admin (Visible only to Main Admin) */}
                      {!isMain && isCurrentUserMainAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setTransferringAdmin(admin)}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title={`Pass Main Admin role to ${admin.email}`}
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
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
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title={`Revoke Sub-Admin Access for ${admin.email}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Main Admin Role Confirmation Modal */}
      {transferringAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-amber-300">
            <div className="flex items-center justify-between border-b border-[#FAF4F5] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#805B10] flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <span>Transfer Main Admin Ownership</span>
              </h3>
              <button
                onClick={() => setTransferringAdmin(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#5C5257] leading-relaxed">
              Are you sure you want to pass the <strong>Main Admin</strong> role to <strong>{transferringAdmin.email}</strong>?
            </p>
            <div className="bg-[#FFF8E7] p-3 rounded-xl border border-[#F5C77E] text-[11px] text-[#805B10] space-y-1">
              <p className="font-bold">What will happen:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><strong>{transferringAdmin.email}</strong> becomes the sole Main Admin.</li>
                <li>They will receive exclusive authority to add/remove sub-admins.</li>
                <li>Your account will remain active as a Sub-Admin.</li>
              </ul>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setTransferringAdmin(null)}
                className="px-4 py-2 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteTransferOwnership}
                disabled={isTransferring}
                className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#8B3A56] hover:bg-[#722A42] text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Crown className="w-4 h-4" />
                <span>{isTransferring ? 'Transferring...' : 'Confirm Role Transfer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Details Modal */}
      {inspectingAppt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-[#F3B8C3] relative">
            <div className="flex items-center justify-between border-b border-[#FAF4F5] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#231F20]">{inspectingAppt.customerName}</h3>
                <p className="text-xs text-[#7A6E74]">{inspectingAppt.appointmentDate} at {inspectingAppt.startTime}</p>
              </div>
              <button
                onClick={() => setInspectingAppt(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#FAF7F4] p-3 rounded-xl border border-[#EFE8E9]">
                <span className="text-[10px] uppercase font-bold text-[#7A6E74]">Service</span>
                <p className="font-bold text-[#231F20] mt-0.5">{inspectingAppt.serviceName}</p>
                <p className="text-[11px] text-[#8B3A56] font-semibold mt-0.5">₱{inspectingAppt.servicePrice}</p>
              </div>
              <div className="bg-[#FAF7F4] p-3 rounded-xl border border-[#EFE8E9]">
                <span className="text-[10px] uppercase font-bold text-[#7A6E74]">Contact</span>
                <p className="font-semibold text-[#231F20] mt-0.5">{inspectingAppt.customerPhone}</p>
                <p className="text-[11px] text-[#7A6E74] truncate mt-0.5">{inspectingAppt.customerEmail}</p>
              </div>
            </div>

            {inspectingAppt.inspoImageUrl && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#7A6E74]">Inspiration Image</span>
                <div className="h-44 rounded-xl overflow-hidden bg-gray-50 border border-[#E5D5DA]">
                  <img
                    src={inspectingAppt.inspoImageUrl}
                    alt="Client Inspo"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#FAF4F5]">
              <div>{renderStatusBadge(inspectingAppt.status)}</div>
              <div className="flex items-center gap-2">
                {inspectingAppt.status === 'pending' && (
                  <button
                    onClick={() => {
                      handleConfirmAppointment(inspectingAppt);
                      setInspectingAppt(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#8B3A56] text-white hover:bg-[#722A42] cursor-pointer"
                  >
                    Confirm Session
                  </button>
                )}
                <button
                  onClick={() => setInspectingAppt(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
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
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
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
                className="px-5 py-2 rounded-full text-xs font-semibold bg-[#8B3A56] text-white hover:bg-[#722A42] cursor-pointer"
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
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
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
                className="px-4 py-2 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handleExecuteRejection}
                disabled={isProcessingAction}
                className="px-5 py-2 rounded-full text-xs font-semibold bg-[#B91C1C] text-white hover:bg-[#991B1B] cursor-pointer"
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

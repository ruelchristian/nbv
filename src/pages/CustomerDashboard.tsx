import React, { useState } from 'react';
import { Appointment, BusinessSettings } from '../types';
import { firestoreService } from '../services/firestoreService';
import { ConfirmedLocationModal } from '../components/ConfirmedLocationQR';
import {
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Home,
  RefreshCw,
  X,
  FileText,
  Phone,
  Mail,
  Eye,
  ZoomIn,
  Paperclip,
  Navigation,
  Lock,
} from 'lucide-react';

interface CustomerDashboardProps {
  appointments: Appointment[];
  currentUser: { uid?: string; email?: string | null; displayName?: string | null } | null;
  settings: BusinessSettings;
  onRefresh: () => void;
  onNavigateToBooking: () => void;
  onSignIn: () => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  appointments,
  currentUser,
  settings,
  onRefresh,
  onNavigateToBooking,
  onSignIn,
}) => {
  // Attached Inspo Preview
  const [previewInspoUrl, setPreviewInspoUrl] = useState<string | null>(null);

  // Reschedule Modal
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState<string>('');
  const [newTime, setNewTime] = useState<string>('');
  const [rescheduleReason, setRescheduleReason] = useState<string>('');
  const [rescheduleSlots, setRescheduleSlots] = useState<{ time: string; isAvailable: boolean }[]>([]);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Cancellation Modal
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);
  const [locationModalAppt, setLocationModalAppt] = useState<Appointment | null>(null);

  // Filter into Upcoming vs Previous
  const todayStr = new Date().toISOString().split('T')[0];

  const upcomingAppointments = appointments.filter((a) => {
    const isFutureOrToday = a.appointmentDate >= todayStr;
    const isNotTerminated = a.status !== 'cancelled' && a.status !== 'completed';
    return isFutureOrToday && isNotTerminated;
  });

  const previousAppointments = appointments.filter((a) => {
    const isPast = a.appointmentDate < todayStr;
    const isTerminated = a.status === 'cancelled' || a.status === 'completed';
    return isPast || isTerminated;
  });

  const openRescheduleModal = async (appt: Appointment) => {
    setReschedulingAppt(appt);
    setNewDate(appt.appointmentDate);
    setNewTime(appt.startTime);
    setRescheduleReason('');
    setActionError(null);
    try {
      const slots = await firestoreService.getAvailableSlots(appt.appointmentDate, settings);
      setRescheduleSlots(slots);
    } catch {
      setActionError('Could not load time slots');
    }
  };

  const handleDateChangeForReschedule = async (dateStr: string) => {
    setNewDate(dateStr);
    setNewTime('');
    try {
      const slots = await firestoreService.getAvailableSlots(dateStr, settings);
      setRescheduleSlots(slots);
    } catch {
      setActionError('Could not load time slots');
    }
  };

  const executeReschedule = async () => {
    if (!reschedulingAppt || !newDate || !newTime) return;

    const [y, m, d] = newDate.split('-').map(Number);
    const day = new Date(y, m - 1, d).getDay();
    if (day !== 0 && day !== 1) {
      setActionError('Appointments can only be scheduled for Sundays and Mondays. Please select an available Sunday or Monday.');
      return;
    }

    setIsSubmittingReschedule(true);
    setActionError(null);
    try {
      await firestoreService.rescheduleAppointment(
        reschedulingAppt.id,
        newDate,
        newTime,
        rescheduleReason || 'Customer requested reschedule'
      );
      setReschedulingAppt(null);
      onRefresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Reschedule failed');
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const executeCancel = async () => {
    if (!cancellingAppt) return;
    setIsSubmittingCancel(true);
    setActionError(null);
    try {
      await firestoreService.updateAppointmentStatus(
        cancellingAppt.id,
        'cancelled',
        cancelReason || 'Cancelled by client'
      );
      setCancellingAppt(null);
      onRefresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Cancellation failed');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#D1FAE5] text-[#047857]">
            Confirmed
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FEE2E2] text-[#B91C1C]">
            Cancelled
          </span>
        );
      case 'rescheduled':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E0E7FF] text-[#3730A3]">
            Rescheduled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#B45309]">
            Pending Confirmation
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 text-left">
      {/* Top Banner Profile */}
      <div className="bg-white rounded-3xl border border-[#EFE8E9] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
        <div className="flex items-center gap-4 text-left">
          <div className="w-14 h-14 rounded-full bg-[#FCEBEE] border border-[#F3B8C3] text-[#8B3A56] flex items-center justify-center font-serif text-2xl font-bold">
            {(currentUser?.displayName || currentUser?.email || 'G')[0].toUpperCase()}
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#231F20]">
              My Bookings &amp; History
            </h1>
            <p className="text-xs text-[#7A6E74] mt-0.5">
              {currentUser?.email ? (
                <span>Signed in as <strong>{currentUser.email}</strong></span>
              ) : (
                <span>Guest session (Sign in with Google to sync across all your devices)</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl border border-[#E5D5DA] text-[#7A6E74] hover:text-[#231F20] hover:bg-[#FAF7F4] transition-colors"
            title="Refresh Bookings"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {!currentUser && (
            <button
              onClick={onSignIn}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8B3A56] border border-[#F3B8C3] hover:bg-[#FCEBEE] transition-colors"
            >
              Sign In to Save
            </button>
          )}
          <button
            onClick={onNavigateToBooking}
            className="px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider text-white bg-[#8B3A56] hover:bg-[#722A42] transition-colors shadow-xs"
          >
            New Booking
          </button>
        </div>
      </div>

      {/* Loyalty Stamp Card (Reference 5) */}
      <div className="bg-linear-to-br from-[#FFF9F6] via-white to-[#FCEBEE] rounded-3xl border border-[#F3B8C3] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <span className="text-[10px] font-bold text-[#8B3A56] uppercase tracking-wider bg-white px-2.5 py-0.5 rounded-full border border-[#F3B8C3]">
              Nails by Vril Official Loyalty Program
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#231F20]">
              Your Loyalty Rewards Card
            </h3>
            <p className="text-xs text-[#5C5257]">
              Get stamped with every completed appointment. 5th visit: <strong>20% OFF</strong>, 10th visit: <strong>FREE NAIL SET</strong>!
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-white p-3 rounded-2xl border border-[#F3B8C3] shadow-xs overflow-x-auto max-w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
              const isStamped = previousAppointments.filter((a) => a.status === 'completed').length >= num;
              return (
                <div
                  key={num}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex flex-col items-center justify-center text-[10px] font-bold border shrink-0 ${
                    isStamped
                      ? 'bg-[#8B3A56] text-white border-[#8B3A56]'
                      : num === 5
                      ? 'bg-[#FEF3C7] text-[#B45309] border-[#F59E0B]'
                      : num === 10
                      ? 'bg-[#FCEBEE] text-[#8B3A56] border-[#8B3A56] ring-1 ring-[#8B3A56]'
                      : 'bg-[#FAF7F4] text-[#7A6E74] border-gray-200'
                  }`}
                  title={num === 5 ? '5th Visit: 20% OFF' : num === 10 ? '10th Visit: Free Nail Set' : `Visit ${num}`}
                >
                  {isStamped ? '✓' : num === 5 ? '20%' : num === 10 ? '★' : num}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 1-Week Free Repair Notice */}
      <div className="p-4 rounded-2xl bg-[#FFF9F6] border border-[#F5C77E] flex items-center gap-3 text-xs text-[#805B10]">
        <span className="text-base shrink-0">💅</span>
        <span>
          <strong>1-Week Free Repair Guarantee:</strong> If your extensions lift or have any issues within 1 week of your session, feel free to message Vril on Instagram (@nailsby.vril) for a free repair!
        </span>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* UPCOMING APPOINTMENTS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-[#231F20]">
            Upcoming Sessions ({upcomingAppointments.length})
          </h2>
        </div>

        {upcomingAppointments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#EFE8E9] p-10 text-center space-y-3">
            <Calendar className="w-10 h-10 text-[#8B3A56]/40 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-[#231F20]">
              No Upcoming Appointments
            </h3>
            <p className="text-xs text-[#7A6E74] max-w-sm mx-auto">
              You do not have any active appointments scheduled. Reserve your time slot to experience our signature nail artistry.
            </p>
            <button
              onClick={onNavigateToBooking}
              className="mt-2 px-5 py-2 rounded-full text-xs font-semibold text-white bg-[#8B3A56] hover:bg-[#722A42] transition-colors"
            >
              Book an Appointment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingAppointments.map((appt) => (
              <div
                key={appt.id}
                className="bg-white rounded-2xl border border-[#EFE8E9] p-6 shadow-xs space-y-4 hover:border-[#F3B8C3] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#8B3A56] uppercase tracking-wider">
                      Appointment ID: {appt.id.slice(0, 10)}...
                    </span>
                    <h3 className="font-serif text-xl font-bold text-[#231F20] mt-0.5">
                      {appt.serviceName}
                    </h3>
                  </div>
                  {getStatusBadge(appt.status)}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-[#FAF7F4] p-3 rounded-xl">
                  <div>
                    <span className="text-[#7A6E74]">Date &amp; Time:</span>
                    <p className="font-semibold text-[#231F20] mt-0.5">
                      {appt.appointmentDate} · {appt.startTime}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#7A6E74]">Total Fee:</span>
                    <p className="font-semibold text-[#8B3A56] mt-0.5">
                      ₱{appt.servicePrice.toLocaleString()}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#7A6E74]">Location:</span>
                    <p className="text-[#231F20] mt-0.5">
                      {appt.isHomeService
                        ? `On-Site Home Service: ${appt.homeServiceAddress}`
                        : appt.status === 'confirmed'
                          ? `Studio: ${settings.location}`
                          : 'Studio: Nails by Vril (Exact address revealed after owner confirms)'}
                    </p>
                  </div>
                </div>

                {appt.status === 'confirmed' && (
                  <div className="p-3 rounded-xl bg-[#D1FAE5]/60 border border-[#A7F3D0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs animate-fade-in">
                    <div className="flex items-center gap-2 text-[#065F46]">
                      <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" />
                      <div>
                        <span className="font-bold">Confirmed by Owner (Vril)</span>
                        <p className="text-[11px] text-[#047857]">
                          {appt.emailNotificationSent
                            ? `Official confirmation email sent to ${appt.emailRecipient || appt.customerEmail}.`
                            : `Confirmation notification sent to ${appt.customerEmail || 'your email'}.`}
                        </p>
                      </div>
                    </div>
                    <a
                      href="https://mail.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#047857] bg-white border border-[#A7F3D0] hover:bg-emerald-50 transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Mail className="w-3 h-3" />
                      <span>Check Gmail Inbox &rarr;</span>
                    </a>
                  </div>
                )}

                {appt.status === 'pending' && (
                  <div className="p-3 rounded-xl bg-[#FEF3C7]/80 border border-[#FDE68A] flex items-center gap-2.5 text-xs text-[#92400E]">
                    <Clock className="w-4 h-4 text-[#D97706] shrink-0" />
                    <div>
                      <span className="font-bold">Pending Review by Vril</span>
                      <p className="text-[11px] text-[#78350F] mt-0.5">
                        Your request is recorded. The studio meeting address and voucher QR code will unlock once Vril confirms your appointment.
                      </p>
                    </div>
                  </div>
                )}

                {appt.inspoImageUrl && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F4] border border-[#F3B8C3]/60 text-xs">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={appt.inspoImageUrl}
                        alt="Attached Nail Art Screenshot"
                        className="w-12 h-12 rounded-lg object-cover border border-[#E5D5DA] cursor-pointer hover:opacity-90"
                        onClick={() => setPreviewInspoUrl(appt.inspoImageUrl!)}
                      />
                      <div>
                        <span className="font-semibold text-[#231F20] block">Attached Screenshot</span>
                        <span className="text-[11px] text-[#7A6E74]">Reference for nail technician</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setPreviewInspoUrl(appt.inspoImageUrl!)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-[#8B3A56] hover:bg-[#FCEBEE] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                  </div>
                )}

                {/* Actions: Studio QR Code & Maps, Reschedule, Cancel */}
                <div className="pt-2 border-t border-[#EFE8E9] flex flex-wrap items-center justify-between gap-2">
                  {!appt.isHomeService ? (
                    appt.status === 'confirmed' ? (
                      <button
                        onClick={() => setLocationModalAppt(appt)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#8B3A56] bg-[#FCEBEE] hover:bg-[#8B3A56] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer border border-[#F3B8C3]"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Studio QR Code &amp; Maps</span>
                      </button>
                    ) : (
                      <span
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#7A6E74] bg-[#FAF7F4] border border-[#E5D5DA] flex items-center gap-1.5"
                        title="Exact studio address & QR code unlock when owner confirms"
                      >
                        <Lock className="w-3.5 h-3.5 text-[#B45309]" />
                        <span>Location &amp; QR locked until confirmed</span>
                      </span>
                    )
                  ) : (
                    <span className="text-[11px] font-semibold text-[#8B3A56] bg-[#FAF4F5] px-2.5 py-1 rounded-md">
                      On-Site Home Service
                    </span>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => openRescheduleModal(appt)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#5C5257] hover:text-[#231F20] hover:bg-[#FAF7F4] border border-[#E5D5DA]"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => setCancellingAppt(appt)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#B91C1C] hover:bg-[#FEE2E2]"
                    >
                      Cancel Slot
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PREVIOUS / COMPLETED APPOINTMENTS */}
      <div className="space-y-4 pt-6">
        <h2 className="font-serif text-2xl font-bold text-[#231F20]">
          Appointment History ({previousAppointments.length})
        </h2>

        {previousAppointments.length === 0 ? (
          <p className="text-xs text-[#7A6E74]">No past or archived sessions recorded.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-[#EFE8E9] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F4] border-b border-[#EFE8E9] text-[#7A6E74]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Service</th>
                    <th className="py-3 px-4 font-semibold">Date &amp; Time</th>
                    <th className="py-3 px-4 font-semibold">Price</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Notes / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE8E9]">
                  {previousAppointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-[#FAF7F4]/50">
                      <td className="py-3 px-4 font-medium text-[#231F20]">
                        {appt.serviceName}
                      </td>
                      <td className="py-3 px-4 text-[#5C5257]">
                        {appt.appointmentDate} · {appt.startTime}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#8B3A56]">
                        ₱{appt.servicePrice.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(appt.status)}</td>
                      <td className="py-3 px-4 text-[#7A6E74]">
                        {appt.cancellationReason || appt.rescheduleReason || 'Completed session'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* RESCHEDULE MODAL */}
      {reschedulingAppt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#F3B8C3] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-xl text-[#231F20]">
                Reschedule Appointment
              </h3>
              <button
                onClick={() => setReschedulingAppt(null)}
                className="p-1 text-[#7A6E74] hover:text-[#231F20]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#7A6E74]">
              Rescheduling <strong>{reschedulingAppt.serviceName}</strong>. Select a new available date and time slot.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#5C5257] mb-1">
                New Date
              </label>
              <input
                type="date"
                min={todayStr}
                value={newDate}
                onChange={(e) => handleDateChangeForReschedule(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5D5DA] text-xs bg-[#FAF7F4]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C5257] mb-1">
                New Time Slot
              </label>
              <div className="grid grid-cols-3 gap-2">
                {rescheduleSlots.map(({ time, isAvailable }) => (
                  <button
                    key={time}
                    disabled={!isAvailable}
                    onClick={() => setNewTime(time)}
                    className={`py-2 px-1 text-xs rounded-lg font-medium border ${
                      newTime === time
                        ? 'bg-[#8B3A56] text-white border-[#8B3A56]'
                        : isAvailable
                        ? 'bg-white border-[#E5D5DA] text-[#231F20] hover:bg-[#FCEBEE]'
                        : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C5257] mb-1">
                Reason for Rescheduling
              </label>
              <input
                type="text"
                placeholder="e.g. Schedule conflict"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5D5DA] text-xs bg-[#FAF7F4]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setReschedulingAppt(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7A6E74]"
              >
                Back
              </button>
              <button
                disabled={!newDate || !newTime || isSubmittingReschedule}
                onClick={executeReschedule}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#8B3A56] hover:bg-[#722A42] disabled:opacity-40"
              >
                {isSubmittingReschedule ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION MODAL */}
      {cancellingAppt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-red-200 shadow-2xl space-y-4">
            <h3 className="font-serif font-bold text-xl text-[#B91C1C]">
              Cancel Appointment Slot
            </h3>
            <p className="text-xs text-[#5C5257]">
              Are you sure you want to cancel your appointment for{' '}
              <strong>{cancellingAppt.serviceName}</strong> on {cancellingAppt.appointmentDate} at {cancellingAppt.startTime}? The time slot will immediately be reopened for other clients.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#5C5257] mb-1">
                Reason for cancellation (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Personal emergency"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5D5DA] text-xs bg-[#FAF7F4]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setCancellingAppt(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7A6E74]"
              >
                Nevermind
              </button>
              <button
                disabled={isSubmittingCancel}
                onClick={executeCancel}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#B91C1C] hover:bg-red-700 disabled:opacity-40"
              >
                {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW ATTACHED SCREENSHOT LIGHTBOX */}
      {previewInspoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewInspoUrl(null)}
        >
          <div
            className="relative max-w-xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-4 text-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#EFE8E9]">
              <span className="text-xs font-bold text-[#231F20] flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-[#8B3A56]" />
                <span>Your Attached Nail Art Screenshot</span>
              </span>
              <button
                onClick={() => setPreviewInspoUrl(null)}
                className="p-1 text-[#7A6E74] hover:text-[#231F20]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewInspoUrl}
              alt="Client Nail Art Screenshot"
              className="w-full max-h-[70vh] object-contain rounded-2xl mx-auto"
            />
            <button
              onClick={() => setPreviewInspoUrl(null)}
              className="px-6 py-2 bg-[#8B3A56] text-white rounded-full text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* Confirmed Studio Location & Google Maps QR Modal */}
      {locationModalAppt && (
        <ConfirmedLocationModal
          isOpen={!!locationModalAppt}
          onClose={() => setLocationModalAppt(null)}
          customerName={locationModalAppt.customerName}
          appointmentDate={locationModalAppt.appointmentDate}
          startTime={locationModalAppt.startTime}
          isConfirmed={locationModalAppt.status === 'confirmed'}
        />
      )}
    </div>
  );
};

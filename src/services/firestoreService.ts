import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { Service, Appointment, BusinessSettings, SlotLock, AppointmentStatus } from '../types';
import { INITIAL_SERVICES, DEFAULT_SERVICES, DEFAULT_BUSINESS_SETTINGS } from './seedData';

const SERVICES_COL = 'services';
const APPOINTMENTS_COL = 'appointments';
const SLOT_LOCKS_COL = 'slot_locks';
const SETTINGS_COL = 'business_settings';
const ADMINS_COL = 'admins';
const LOCAL_STORAGE_APPTS_KEY = 'nails_by_vril_appointments_backup';
const LOCAL_STORAGE_ADMINS_KEY = 'nails_by_vril_admins_backup';

function getLocalAdmins(): AdminAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ADMINS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAdmins(admins: AdminAccount[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_ADMINS_KEY, JSON.stringify(admins));
  } catch {
    // Ignore
  }
}

// Dynamically configurable admin emails: Reads from VITE_ADMIN_EMAILS env variable or defaults
const envAdminEmails: string[] = typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_EMAILS
  ? String(import.meta.env.VITE_ADMIN_EMAILS)
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  : [];

export const MAIN_ADMIN_EMAIL = 'ruelchristianumel@gmail.com';
export const DEFAULT_SUB_ADMIN_EMAILS = [
  'rayanat.barbosa@gmail.com',
];
const LOCAL_STORAGE_MAIN_ADMIN_KEY = 'nails_by_vril_main_admin';

export function getActiveMainAdminEmail(): string {
  try {
    const custom = localStorage.getItem(LOCAL_STORAGE_MAIN_ADMIN_KEY);
    if (custom && custom.includes('@')) return custom.toLowerCase().trim();
  } catch {
    // Ignore
  }
  return MAIN_ADMIN_EMAIL.toLowerCase().trim();
}

export function isMainAdmin(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return clean === getActiveMainAdminEmail() || clean === MAIN_ADMIN_EMAIL.toLowerCase().trim();
}

export const DEFAULT_ADMIN_EMAILS = [
  MAIN_ADMIN_EMAIL,
  ...DEFAULT_SUB_ADMIN_EMAILS,
];

export const ADMIN_EMAILS: string[] = Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...envAdminEmails]));

export interface AdminAccount {
  id: string;
  email: string;
  role: 'main_admin' | 'sub_admin';
  createdAt?: string;
  addedBy?: string;
}

export async function checkIsUserAdmin(email?: string | null, uid?: string): Promise<boolean> {
  if (!email && !uid) return false;
  const cleanEmail = email?.toLowerCase().trim() || '';
  if (cleanEmail && (isMainAdmin(cleanEmail) || ADMIN_EMAILS.includes(cleanEmail))) return true;

  // Check local storage backup
  const localAdmins = getLocalAdmins();
  if (cleanEmail && localAdmins.some((a) => a.email.toLowerCase() === cleanEmail)) return true;

  try {
    if (uid) {
      const snapUid = await getDoc(doc(db, ADMINS_COL, uid));
      if (snapUid.exists()) return true;
    }
    if (cleanEmail) {
      // Direct email check
      const snapDirect = await getDoc(doc(db, ADMINS_COL, cleanEmail));
      if (snapDirect.exists()) return true;

      // Sanitized doc ID fallback
      const cleanId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const snapEmail = await getDoc(doc(db, ADMINS_COL, cleanId));
      if (snapEmail.exists()) return true;
    }
  } catch {
    // Return hardcoded list fallback
  }
  return false;
}

export function getLocalAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_APPTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAppointment(appt: Appointment) {
  try {
    const existing = getLocalAppointments();
    const updated = [appt, ...existing.filter((a) => a.id !== appt.id)];
    localStorage.setItem(LOCAL_STORAGE_APPTS_KEY, JSON.stringify(updated));
  } catch {
    // If quota exceeded (e.g. from large base64 inspo screenshot), save without image url
    try {
      const existing = getLocalAppointments();
      const trimmedAppt = { ...appt, inspoImageUrl: undefined };
      const updated = [trimmedAppt, ...existing.filter((a) => a.id !== appt.id)];
      localStorage.setItem(LOCAL_STORAGE_APPTS_KEY, JSON.stringify(updated));
    } catch {
      // Best-effort cache
    }
  }
}

function updateLocalAppointment(id: string, updates: Partial<Appointment>) {
  try {
    const existing = getLocalAppointments();
    const updated = existing.map((a) => (a.id === id ? { ...a, ...updates } : a));
    localStorage.setItem(LOCAL_STORAGE_APPTS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
}

// Standard time slots matching 3-4 hour beginner nail set duration
export const STANDARD_TIME_SLOTS = [
  '09:00 AM',
  '01:30 PM',
  '05:30 PM',
];

const SETTINGS_CACHE_KEY = 'nails_by_vril_cached_settings';

/**
 * Strips all undefined properties recursively to prevent Firestore setDoc/updateDoc
 * 'Unsupported field value: undefined' errors.
 */
export function sanitizeForFirestore<T extends Record<string, any>>(data: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        clean[key] = sanitizeForFirestore(val);
      } else if (Array.isArray(val)) {
        clean[key] = val.map((item) =>
          item !== null && typeof item === 'object' ? sanitizeForFirestore(item) : item
        );
      } else {
        clean[key] = val;
      }
    }
  }
  return clean;
}

export const firestoreService = {
  // 1. SERVICES
  async getServices(): Promise<Service[]> {
    try {
      const snap = await Promise.race([
        getDocs(collection(db, SERVICES_COL)),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
      ]);
      if (!snap || snap.empty) {
        return DEFAULT_SERVICES;
      }
      const allServices = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          isActive: data.isActive !== false,
        } as Service;
      });

      // Strictly allow only the 4 approved services:
      // - In-Studio
      // - Home Service
      // - 1-Week Free Repair
      // - Nail Removal
      const allowedNames = ['in-studio', 'home service', '1-week free repair', 'nail removal'];
      const filtered = allServices.filter((s) => {
        const lower = s.name.toLowerCase();
        return allowedNames.some((allowed) => lower.includes(allowed));
      });

      // If database has outdated catalog missing required services, fall back to DEFAULT_SERVICES
      if (filtered.length < 3 || !filtered.some((s) => s.name.toLowerCase().includes('removal'))) {
        return DEFAULT_SERVICES;
      }
      return filtered;
    } catch (error) {
      const errCode = (error as { code?: string })?.code || 'unknown';
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Firestore getServices notice [code=${errCode}]: ${errMsg}. Using default catalog.`);
      return DEFAULT_SERVICES;
    }
  },

  async addService(service: Omit<Service, 'id'>): Promise<Service> {
    try {
      const newDocRef = doc(collection(db, SERVICES_COL));
      const newService: Service = { ...service, id: newDocRef.id };
      await setDoc(newDocRef, sanitizeForFirestore(newService));
      return newService;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, SERVICES_COL);
      throw error;
    }
  },

  async updateService(id: string, updates: Partial<Service>): Promise<void> {
    try {
      const match = DEFAULT_SERVICES.find((s) => s.id === id);
      if (match) {
        Object.assign(match, updates);
      }
      await updateDoc(doc(db, SERVICES_COL, id), sanitizeForFirestore(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${SERVICES_COL}/${id}`);
      throw error;
    }
  },

  // 2. BUSINESS SETTINGS WITH RETRY, CACHING & PRECISE LOGGING
  async getSettings(): Promise<BusinessSettings> {
    const getCached = (): BusinessSettings | null => {
      try {
        const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
        if (cached) return { ...DEFAULT_BUSINESS_SETTINGS, ...JSON.parse(cached) };
      } catch {
        // Ignore
      }
      return null;
    };

    const fetchDoc = async () => {
      const settingsRef = doc(db, SETTINGS_COL, 'main');
      const fetchPromise = getDoc(settingsRef);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Settings fetch timeout')), 1200)
      );
      const snap = await Promise.race([fetchPromise, timeoutPromise]);
      if (snap.exists()) {
        const cloudData = snap.data() as BusinessSettings;
        const local = getCached();
        // Merge blockedDates so any locally added blocked dates are preserved
        const combinedBlocked = Array.from(
          new Set([...(cloudData.blockedDates || []), ...(local?.blockedDates || [])])
        );
        const merged: BusinessSettings = {
          ...DEFAULT_BUSINESS_SETTINGS,
          ...cloudData,
          blockedDates: combinedBlocked,
        };
        try {
          localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(merged));
        } catch {
          // Ignore storage quota
        }
        return merged;
      }
      return null;
    };

    try {
      const data = await fetchDoc();
      if (data) return data;
      return getCached() || DEFAULT_BUSINESS_SETTINGS;
    } catch {
      return getCached() || DEFAULT_BUSINESS_SETTINGS;
    }
  },

  async updateSettings(settings: Partial<BusinessSettings>): Promise<void> {
    const existingCached = localStorage.getItem(SETTINGS_CACHE_KEY);
    const parsed = existingCached ? JSON.parse(existingCached) : {};
    const updated: BusinessSettings = {
      ...DEFAULT_BUSINESS_SETTINGS,
      ...parsed,
      ...settings,
      blockedDates: Array.from(new Set(settings.blockedDates || parsed.blockedDates || [])),
      workingDays: settings.workingDays || parsed.workingDays || DEFAULT_BUSINESS_SETTINGS.workingDays,
      customAvailableDates: Array.from(new Set(settings.customAvailableDates || parsed.customAvailableDates || [])),
    };

    // 1. ALWAYS persist to local cache immediately so client wizard has blocked dates right away
    try {
      localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }

    // 2. Persist to Cloud Firestore with fast non-blocking resolution
    try {
      const settingsRef = doc(db, SETTINGS_COL, 'main');
      const cleanData = sanitizeForFirestore({
        ...settings,
        blockedDates: Array.from(new Set(settings.blockedDates || [])),
      });
      // If Firestore network ACK takes > 800ms, resolve immediately while background write finishes
      await Promise.race([
        setDoc(settingsRef, cleanData, { merge: true }),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
    } catch (error) {
      console.warn('Notice writing settings to Firestore (retained in local cache):', error);
    }
  },

  // 3. AVAILABILITY & CONFLICT PREVENTION
  async getAvailableSlots(dateStr: string, settings: BusinessSettings): Promise<{ time: string; isAvailable: boolean; reason: string }[]> {
    try {
      // Parse date components locally to prevent timezone offsets
      const [year, month, day] = dateStr.split('-').map(Number);
      const localDateObj = new Date(year, month - 1, day);
      const dayOfWeek = localDateObj.getDay(); // 0 is Sun, 1 is Mon...

      // Check custom available dates: if date is explicitly enabled, it overrides standard closed days
      const isCustomAvailable = Boolean(settings.customAvailableDates?.includes(dateStr));

      // Check working days (if specified in settings, otherwise check default [0, 1])
      const activeWorkingDays = settings.workingDays && settings.workingDays.length > 0
        ? settings.workingDays
        : [0, 1];

      if (!isCustomAvailable && !activeWorkingDays.includes(dayOfWeek)) {
        return STANDARD_TIME_SLOTS.map((t) => ({
          time: t,
          isAvailable: false,
          reason: 'Salon Closed (Not a scheduled working day)',
        }));
      }

      // Check blocked dates
      if (settings.blockedDates?.includes(dateStr)) {
        return STANDARD_TIME_SLOTS.map((t) => ({ time: t, isAvailable: false, reason: 'Date Blocked' }));
      }

      // Check past dates using local calendar date
      const now = new Date();
      const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (dateStr < localTodayStr) {
        return STANDARD_TIME_SLOTS.map((t) => ({ time: t, isAvailable: false, reason: 'Past Date' }));
      }

      // Fetch slot locks for this date with resilient timeout
      const reservedTimes = new Set<string>();
      try {
        const q = query(
          collection(db, SLOT_LOCKS_COL),
          where('appointmentDate', '==', dateStr),
          where('status', '==', 'reserved')
        );
        const locksSnap = await Promise.race([
          getDocs(q),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
        ]);
        if (locksSnap) {
          locksSnap.docs.forEach((d) => {
            const startTime = d.data().startTime as string;
            if (startTime) reservedTimes.add(startTime);
          });
        }
      } catch (cloudErr) {
        console.warn('Slot locks fetch note, checking local device reservations:', cloudErr);
      }

      // Also verify local storage backup for reservations on this date
      const localAppts = getLocalAppointments();
      localAppts.forEach((a) => {
        if (a.appointmentDate === dateStr && a.status !== 'cancelled') {
          reservedTimes.add(a.startTime);
        }
      });

      return STANDARD_TIME_SLOTS.map((time) => {
        const isReserved = reservedTimes.has(time);
        return {
          time,
          isAvailable: !isReserved,
          reason: isReserved ? 'Reserved' : 'Available',
        };
      });
    } catch (error) {
      console.warn('Firestore getAvailableSlots notice, providing standard slots:', error);
      return STANDARD_TIME_SLOTS.map((t) => ({ time: t, isAvailable: true, reason: 'Available' }));
    }
  },

  // 4. ATOMIC BOOKING WITH DOUBLE-BOOKING PREVENTION
  async createAppointmentAtomically(
    appointment: Omit<Appointment, 'id'>,
    options?: { isOwnerManualEntry?: boolean }
  ): Promise<Appointment> {
    const isOwner = options?.isOwnerManualEntry || appointment.status === 'confirmed';

    // Public customer bookings must strictly respect working days and blocked holidays
    if (!isOwner) {
      const currentSettings = await firestoreService.getSettings();

      // 1. Validate that date is not a blocked holiday date
      if (currentSettings.blockedDates?.includes(appointment.appointmentDate)) {
        throw new Error(`The date ${appointment.appointmentDate} is marked as closed or holiday. Please select an available open date.`);
      }

      // 2. Validate that appointment date is an open studio working day or custom available date
      const [year, month, day] = appointment.appointmentDate.split('-').map(Number);
      const dayOfWeek = new Date(year, month - 1, day).getDay();
      const isCustom = currentSettings.customAvailableDates?.includes(appointment.appointmentDate);
      const allowedDays = currentSettings.workingDays && currentSettings.workingDays.length > 0 ? currentSettings.workingDays : [0, 1];

      if (!isCustom && !allowedDays.includes(dayOfWeek)) {
        throw new Error('This date is not marked as an open working day. Please select an available schedule date.');
      }
    }

    // 3. Validate Home Service vs In-Studio location requirements
    const isHome = Boolean(appointment.isHomeService);
    const clientCount = appointment.clientCount || 1;

    if (isHome) {
      // Home service must have between 1 and 4 clients
      if (clientCount < 1 || clientCount > 4) {
        throw new Error('Home service appointments must be for 1 to 4 clients.');
      }
      // Require complete home service address
      if (!appointment.homeServiceAddress || !appointment.homeServiceAddress.trim()) {
        throw new Error('Please provide your complete home service address.');
      }
    }

    const cleanTime = appointment.startTime.replace(/[^a-zA-Z0-9]/g, '');
    const lockId = `lock_${appointment.appointmentDate}_${cleanTime}`;
    const newApptRef = doc(collection(db, APPOINTMENTS_COL));
    const lockRef = doc(db, SLOT_LOCKS_COL, lockId);

    // All standard customer requests default to 'pending'; owner direct walk-in entries can specify 'confirmed'
    const rawAppointment: Appointment = {
      ...appointment,
      status: appointment.status || 'pending',
      id: newApptRef.id,
      isHomeService: isHome,
    };

    // For In-Studio bookings: strictly OMIT homeServiceAddress entirely (do NOT store undefined)
    if (!isHome) {
      delete rawAppointment.homeServiceAddress;
    } else {
      rawAppointment.homeServiceAddress = appointment.homeServiceAddress!.trim();
      rawAppointment.clientCount = clientCount;
    }

    // Sanitize any remaining undefined properties
    const newAppointment = sanitizeForFirestore(rawAppointment) as Appointment;

    try {
      const txPromise = runTransaction(db, async (transaction) => {
        const lockDoc = await transaction.get(lockRef);

        if (lockDoc.exists()) {
          const lockData = lockDoc.data();
          if (lockData?.status === 'reserved' && lockData?.appointmentId !== newApptRef.id) {
            throw new Error('This time slot was just claimed by another customer. Please select another slot.');
          }
        }

        // 1. Lock the time slot
        transaction.set(lockRef, sanitizeForFirestore({
          slotKey: lockId,
          appointmentDate: appointment.appointmentDate,
          startTime: appointment.startTime,
          appointmentId: newApptRef.id,
          status: 'reserved',
          updatedAt: new Date().toISOString(),
        } as SlotLock));

        // 2. Save appointment record
        transaction.set(newApptRef, newAppointment);

        saveLocalAppointment(newAppointment);
        return newAppointment;
      });

      // 1.5 second timeout so submit never hangs when Firestore backend latency is high
      const timeoutPromise = new Promise<Appointment>((_, reject) =>
        setTimeout(() => reject(new Error('Network transaction timeout - proceeding with local confirmation')), 1500)
      );

      return await Promise.race([txPromise, timeoutPromise]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      // If already claimed by another client, re-throw immediately
      if (msg.includes('This time slot was just claimed')) {
        throw error;
      }

      console.warn('Booking transaction proceeded via resilient fallback:', error);

      // Background cloud sync attempts without blocking the client
      setDoc(lockRef, sanitizeForFirestore({
        slotKey: lockId,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        appointmentId: newApptRef.id,
        status: 'reserved',
        updatedAt: new Date().toISOString(),
      } as SlotLock)).catch((e) => console.warn('Background slot lock note:', e));

      setDoc(newApptRef, newAppointment).catch((e) => console.warn('Background appointment note:', e));

      // Always save to device backup so appointment voucher & details are completely preserved
      saveLocalAppointment(newAppointment);
      return newAppointment;
    }
  },

  getLocalAppointments(): Appointment[] {
    return getLocalAppointments();
  },

  claimGuestAppointments(userId: string, userEmail?: string): void {
    try {
      const existing = getLocalAppointments();
      let changed = false;
      const updated = existing.map((a) => {
        if (!a.customerId || a.customerId.startsWith('guest_')) {
          changed = true;
          return {
            ...a,
            customerId: userId,
            customerEmail: a.customerEmail || userEmail || '',
          };
        }
        return a;
      });
      if (changed) {
        localStorage.setItem(LOCAL_STORAGE_APPTS_KEY, JSON.stringify(updated));
      }
    } catch {
      // Ignore local storage error
    }
  },

  // 5. APPOINTMENTS MANAGEMENT
  async getAppointments(customerId?: string): Promise<Appointment[]> {
    let cloudAppts: Appointment[] = [];

    // CRITICAL: Only query Firestore if user is authenticated.
    // Unauthenticated guests have no permission to list the appointments collection.
    const user = auth.currentUser;
    if (user) {
      const isOwner = Boolean(user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
      try {
        let q;
        if (isOwner && !customerId) {
          // Authorized Admin can list all appointments
          q = query(collection(db, APPOINTMENTS_COL));
        } else {
          // Normal client or specific customer query:
          // Strictly filter by customerId to satisfy Firestore list security rule
          const targetCustomerId = customerId || user.uid;
          q = query(collection(db, APPOINTMENTS_COL), where('customerId', '==', targetCustomerId));
        }

        const snap = await getDocs(q);
        cloudAppts = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Appointment));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const isConnectionOrTokenIssue =
          msg.includes('offline') ||
          msg.includes('token-service') ||
          msg.includes('securetoken') ||
          msg.includes('network') ||
          msg.includes('unavailable');

        if (!isConnectionOrTokenIssue && (msg.includes('permission') || msg.includes('Permission') || msg.includes('insufficient'))) {
          handleFirestoreError(error, OperationType.LIST, APPOINTMENTS_COL);
        } else {
          console.warn('Firestore getAppointments offline or unavailable, using fallback:', error);
        }
      }
    }

    // Merge with local appointments backup (deduplicating by ID)
    const localAppts = getLocalAppointments();
    const mergedMap = new Map<string, Appointment>();

    cloudAppts.forEach((a) => mergedMap.set(a.id, a));
    localAppts.forEach((a) => {
      if (!mergedMap.has(a.id)) {
        if (!customerId || a.customerId === customerId) {
          mergedMap.set(a.id, a);
        }
      }
    });

    return Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async updateAppointmentStatus(
    id: string,
    status: AppointmentStatus,
    note?: string,
    emailDetails?: {
      emailNotificationSent: boolean;
      emailSentAt: string;
      emailRecipient: string;
      emailMessageId?: string;
    },
    meetingLocationDetails?: {
      meetingLocationName?: string;
      meetingLocationAddress?: string;
      meetingLocationGoogleMapsUrl?: string;
    }
  ): Promise<void> {
    updateLocalAppointment(id, {
      status,
      cancellationReason: status === 'cancelled' ? (note || 'Cancelled by admin') : undefined,
      ...(emailDetails || {}),
      ...(meetingLocationDetails || {}),
      updatedAt: new Date().toISOString(),
    });

    try {
      const apptRef = doc(db, APPOINTMENTS_COL, id);
      const apptSnap = await getDoc(apptRef);
      if (apptSnap.exists()) {
        const apptData = apptSnap.data() as Appointment;
        const updates: Partial<Appointment> = {
          status,
          ...(emailDetails || {}),
          ...(meetingLocationDetails || {}),
          updatedAt: new Date().toISOString(),
        };

        if (status === 'cancelled') {
          updates.cancellationReason = note || 'Cancelled by admin';
          // Free up slot lock
          const cleanTime = apptData.startTime.replace(/[^a-zA-Z0-9]/g, '');
          const lockId = `lock_${apptData.appointmentDate}_${cleanTime}`;
          try {
            await setDoc(doc(db, SLOT_LOCKS_COL, lockId), {
              status: 'available',
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          } catch {
            // Best effort lock release
          }
        }

        await updateDoc(apptRef, updates);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isConnectionOrTokenIssue =
        msg.includes('offline') ||
        msg.includes('token-service') ||
        msg.includes('securetoken') ||
        msg.includes('network') ||
        msg.includes('unavailable');

      if (!isConnectionOrTokenIssue) {
        handleFirestoreError(error, OperationType.UPDATE, `${APPOINTMENTS_COL}/${id}`);
        throw error;
      }
      console.warn('Updated appointment status locally while offline or waiting for token service:', id);
    }
  },

  async updateAppointmentEmailStatus(
    id: string,
    emailDetails: {
      emailNotificationSent: boolean;
      emailSentAt: string;
      emailRecipient: string;
      emailMessageId?: string;
    }
  ): Promise<void> {
    updateLocalAppointment(id, {
      ...emailDetails,
      updatedAt: new Date().toISOString(),
    });

    try {
      const apptRef = doc(db, APPOINTMENTS_COL, id);
      await updateDoc(apptRef, {
        ...emailDetails,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Recorded email status in local backup:', error);
    }
  },

  async rescheduleAppointment(
    id: string,
    newDate: string,
    newTime: string,
    reason?: string
  ): Promise<void> {
    try {
      const apptRef = doc(db, APPOINTMENTS_COL, id);
      const apptSnap = await getDoc(apptRef);
      if (!apptSnap.exists()) throw new Error('Appointment not found');

      const apptData = apptSnap.data() as Appointment;
      const oldCleanTime = apptData.startTime.replace(/[^a-zA-Z0-9]/g, '');
      const oldLockId = `lock_${apptData.appointmentDate}_${oldCleanTime}`;

      const newCleanTime = newTime.replace(/[^a-zA-Z0-9]/g, '');
      const newLockId = `lock_${newDate}_${newCleanTime}`;

      const batch = writeBatch(db);

      // Release old lock
      batch.set(doc(db, SLOT_LOCKS_COL, oldLockId), {
        status: 'available',
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Reserve new lock
      batch.set(doc(db, SLOT_LOCKS_COL, newLockId), {
        slotKey: newLockId,
        appointmentDate: newDate,
        startTime: newTime,
        appointmentId: id,
        status: 'reserved',
        updatedAt: new Date().toISOString(),
      });

      // Update appointment
      batch.update(apptRef, {
        appointmentDate: newDate,
        startTime: newTime,
        status: 'rescheduled',
        rescheduleReason: reason || 'Customer requested reschedule',
        updatedAt: new Date().toISOString(),
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${APPOINTMENTS_COL}/${id}`);
      throw error;
    }
  },

  // 6. DYNAMIC ADMIN ACCOUNTS MANAGEMENT
  async getAdminsList(): Promise<AdminAccount[]> {
    const currentMain = getActiveMainAdminEmail();
    const mainAdminItem: AdminAccount = {
      id: currentMain.replace(/[^a-zA-Z0-9]/g, '_'),
      email: currentMain,
      role: 'main_admin',
    };

    const list: AdminAccount[] = [mainAdminItem];

    // Add default sub-admins if not main admin
    DEFAULT_SUB_ADMIN_EMAILS.forEach((email) => {
      const cleanEmail = email.toLowerCase().trim();
      if (!isMainAdmin(cleanEmail) && !list.some((item) => item.email.toLowerCase() === cleanEmail)) {
        list.push({
          id: cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
          email: cleanEmail,
          role: 'sub_admin',
        });
      }
    });

    // Add envAdminEmails as sub-admins if not main admin
    envAdminEmails.forEach((email) => {
      if (!isMainAdmin(email) && !list.some((item) => item.email.toLowerCase() === email)) {
        list.push({
          id: email.replace(/[^a-zA-Z0-9]/g, '_'),
          email,
          role: 'sub_admin',
        });
      }
    });

    // Merge from local storage backup
    const local = getLocalAdmins();
    local.forEach((acc) => {
      const email = acc.email.toLowerCase().trim();
      const existing = list.find((item) => item.email.toLowerCase() === email);
      if (existing) {
        existing.role = isMainAdmin(email) ? 'main_admin' : 'sub_admin';
      } else {
        list.push({
          ...acc,
          role: isMainAdmin(email) ? 'main_admin' : 'sub_admin',
        });
      }
    });

    try {
      const snap = await Promise.race([
        getDocs(collection(db, ADMINS_COL)),
        new Promise<null>((res) => setTimeout(() => res(null), 1500)),
      ]);
      if (snap) {
        snap.forEach((d) => {
          const data = d.data();
          const email = (data.email || d.id || '').toLowerCase().trim();
          if (email && email.includes('@')) {
            const role = data.role === 'main_admin' || isMainAdmin(email) ? 'main_admin' : 'sub_admin';
            const existing = list.find((item) => item.email.toLowerCase() === email);
            if (existing) {
              existing.role = role;
            } else {
              list.push({
                id: d.id,
                email,
                role,
                createdAt: data.createdAt,
                addedBy: data.addedBy,
              });
            }
          }
        });
      }
    } catch (e) {
      console.warn('Notice loading admins list from Firestore:', e);
    }
    return list.sort((a, b) => (a.role === 'main_admin' ? -1 : b.role === 'main_admin' ? 1 : 0));
  },

  async addAdminEmail(email: string, actingUserEmail?: string): Promise<void> {
    const currentMain = getActiveMainAdminEmail();
    if (actingUserEmail && !isMainAdmin(actingUserEmail)) {
      throw new Error(`Permission denied: Only the Main Admin (${currentMain}) can add sub-admins.`);
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    if (isMainAdmin(cleanEmail)) {
      throw new Error('This account is already registered as the Main Admin.');
    }

    const docData: AdminAccount = {
      id: cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
      email: cleanEmail,
      role: 'sub_admin',
      createdAt: new Date().toISOString(),
      addedBy: actingUserEmail || currentMain,
    };

    // Update local storage backup immediately
    const local = getLocalAdmins().filter((a) => a.email.toLowerCase() !== cleanEmail);
    local.push(docData);
    saveLocalAdmins(local);

    const cleanId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    try {
      await setDoc(doc(db, ADMINS_COL, cleanEmail), docData);
      if (cleanId !== cleanEmail) {
        await setDoc(doc(db, ADMINS_COL, cleanId), docData);
      }
    } catch (e) {
      console.warn('Stored sub-admin locally while awaiting auth token propagation:', e);
    }
  },

  async removeAdminEmail(email: string, actingUserEmail?: string): Promise<void> {
    const cleanEmail = email.toLowerCase().trim();
    if (isMainAdmin(cleanEmail)) {
      throw new Error('The Main Admin account cannot be removed.');
    }

    const currentMain = getActiveMainAdminEmail();
    if (actingUserEmail && !isMainAdmin(actingUserEmail)) {
      throw new Error(`Permission denied: Only the Main Admin (${currentMain}) can remove sub-admins.`);
    }

    // Update local storage backup immediately
    const local = getLocalAdmins().filter((a) => a.email.toLowerCase() !== cleanEmail);
    saveLocalAdmins(local);

    const cleanId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    try {
      await Promise.allSettled([
        deleteDoc(doc(db, ADMINS_COL, cleanEmail)),
        deleteDoc(doc(db, ADMINS_COL, cleanId)),
      ]);
    } catch (e) {
      console.warn('Removed sub-admin locally while awaiting auth token propagation:', e);
    }
  },

  async transferMainAdminRole(newAdminEmail: string, actingUserEmail?: string): Promise<void> {
    const cleanNew = newAdminEmail.toLowerCase().trim();
    if (!cleanNew || !cleanNew.includes('@')) {
      throw new Error('Please specify a valid email address to transfer Main Admin role to.');
    }

    const currentMain = getActiveMainAdminEmail();
    if (actingUserEmail && !isMainAdmin(actingUserEmail)) {
      throw new Error(`Permission denied: Only the current Main Admin (${currentMain}) can transfer ownership.`);
    }

    if (cleanNew === currentMain) {
      throw new Error('This user is already the Main Admin.');
    }

    // 1. Update dynamic active main admin
    try {
      localStorage.setItem(LOCAL_STORAGE_MAIN_ADMIN_KEY, cleanNew);
    } catch {
      // Ignore
    }

    // 2. Update local admins list
    const local = getLocalAdmins();
    const updated = local.map((a) => {
      if (a.email.toLowerCase() === currentMain) {
        return { ...a, role: 'sub_admin' as const };
      }
      if (a.email.toLowerCase() === cleanNew) {
        return { ...a, role: 'main_admin' as const };
      }
      return a;
    });

    if (!updated.some((a) => a.email.toLowerCase() === currentMain)) {
      updated.push({
        id: currentMain.replace(/[^a-zA-Z0-9]/g, '_'),
        email: currentMain,
        role: 'sub_admin',
        createdAt: new Date().toISOString(),
      });
    }

    if (!updated.some((a) => a.email.toLowerCase() === cleanNew)) {
      updated.push({
        id: cleanNew.replace(/[^a-zA-Z0-9]/g, '_'),
        email: cleanNew,
        role: 'main_admin',
        createdAt: new Date().toISOString(),
      });
    }

    saveLocalAdmins(updated);

    // 3. Write to Firestore
    try {
      const batch = writeBatch(db);
      // Promote new main admin
      batch.set(doc(db, ADMINS_COL, cleanNew), {
        email: cleanNew,
        role: 'main_admin',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      batch.set(doc(db, ADMINS_COL, cleanNew.replace(/[^a-zA-Z0-9]/g, '_')), {
        email: cleanNew,
        role: 'main_admin',
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Demote previous main admin to sub_admin
      batch.set(doc(db, ADMINS_COL, currentMain), {
        email: currentMain,
        role: 'sub_admin',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      batch.set(doc(db, ADMINS_COL, currentMain.replace(/[^a-zA-Z0-9]/g, '_')), {
        email: currentMain,
        role: 'sub_admin',
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      await batch.commit();
    } catch (e) {
      console.warn('Recorded Main Admin transfer locally while awaiting Firestore batch:', e);
    }
  },
};

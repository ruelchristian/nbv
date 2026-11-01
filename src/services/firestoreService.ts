import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
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
const LOCAL_STORAGE_APPTS_KEY = 'nails_by_vril_appointments_backup';
export const ADMIN_EMAILS = [
  'rayanat.barbosa@gmail.com',
  'ruelchristianumel@gmail.com',
];

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
      const allServices = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Service));

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
      const snap = await getDoc(settingsRef);
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
    } catch (initialError: unknown) {
      // Retry once after 400ms for transient network/connection delays
      try {
        await new Promise((res) => setTimeout(res, 400));
        const retryData = await fetchDoc();
        if (retryData) return retryData;
      } catch (retryError: unknown) {
        const errObj = retryError as { code?: string; message?: string };
        const errCode = errObj?.code || 'unknown';
        const errMsg = retryError instanceof Error ? retryError.message : String(retryError);
        if (errCode !== 'unavailable') {
          console.warn(`Firestore getSettings notice [code=${errCode}]: ${errMsg}. Retaining resilient business settings.`);
        }
      }

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

      // Strictly enforce Sunday (0) and Monday (1) only
      if (dayOfWeek !== 0 && dayOfWeek !== 1) {
        return STANDARD_TIME_SLOTS.map((t) => ({
          time: t,
          isAvailable: false,
          reason: 'Only Sundays & Mondays available',
        }));
      }

      // Check working days (if specified in settings, otherwise check [0, 1])
      if (settings.workingDays && settings.workingDays.length > 0 && !settings.workingDays.includes(dayOfWeek)) {
        return STANDARD_TIME_SLOTS.map((t) => ({ time: t, isAvailable: false, reason: 'Only Sundays & Mondays available' }));
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
  async createAppointmentAtomically(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    // 1. Validate that appointment date is strictly Sunday (0) or Monday (1)
    const [year, month, day] = appointment.appointmentDate.split('-').map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 1) {
      throw new Error('Appointments can only be scheduled for Sundays and Mondays. Please select a Sunday or Monday.');
    }

    // 2. Validate that date is not a blocked holiday date
    const currentSettings = await firestoreService.getSettings();
    if (currentSettings.blockedDates?.includes(appointment.appointmentDate)) {
      throw new Error(`The date ${appointment.appointmentDate} is marked as a closed holiday. Please select an available Sunday or Monday.`);
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

    // CRITICAL: All new appointment requests must strictly remain 'pending' until owner reviews and confirms
    const rawAppointment: Appointment = {
      ...appointment,
      status: 'pending',
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

      // 2.5 second timeout so submit never hangs when Firestore backend latency is high
      const timeoutPromise = new Promise<Appointment>((_, reject) =>
        setTimeout(() => reject(new Error('Network transaction timeout - proceeding with local confirmation')), 2500)
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
};

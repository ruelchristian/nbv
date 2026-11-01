export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  category: string;
  imageUrl: string;
  isActive: boolean;
  isFeatured: boolean;
}

export interface SlotLock {
  slotKey: string;
  appointmentDate: string;
  startTime: string;
  appointmentId: string;
  status: 'reserved' | 'available';
  updatedAt: string;
}

export interface NailStyleOption {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  finalPriceRange: string;
  durationMinutes: number;
  imageUrl: string;
  description: string;
}

export interface HomeServiceClient {
  clientIndex?: number;
  clientName?: string;
  personNumber?: number;
  personName?: string;
  selectedStyleId?: string;
  selectedStyleName?: string;
  price?: number;
  stylePrice?: number;
  homeServiceFee?: number;
}

export interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes?: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDurationMinutes: number;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string;       // e.g. "10:30 AM"
  endTime: string;         // e.g. "12:00 PM"
  status: AppointmentStatus;
  isHomeService: boolean;
  homeServiceAddress?: string; // Strictly omitted for In-Studio bookings!
  clientCount?: number;        // 1 to 4 clients for Home Service
  clientsDetails?: HomeServiceClient[];
  selectedNailStyles?: string[];
  meetingLocationName?: string;
  meetingLocationGoogleMapsUrl?: string;
  meetingLocationAddress?: string;
  hasInspo: boolean;
  inspoImageUrl?: string;
  cancellationReason?: string;
  rescheduleReason?: string;
  emailNotificationSent?: boolean;
  emailSentAt?: string;
  emailRecipient?: string;
  emailMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSettings {
  businessName: string;
  tagline: string;
  instagramHandle: string;
  instagramUrl: string;
  contactPhone: string;
  contactEmail: string;
  location: string;
  googleMapsUrl?: string;
  openingTime: string;
  closingTime: string;
  slotIntervalMinutes: number;
  homeServiceEnabled: boolean;
  homeServiceNotice: string;
  blockedDates: string[];
  workingDays: number[]; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  customAvailableDates?: string[]; // Specific dates explicitly marked as open by owner
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  phone?: string;
  role: 'customer' | 'admin';
}

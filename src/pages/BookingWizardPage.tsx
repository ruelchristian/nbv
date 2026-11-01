import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Service, BusinessSettings, Appointment, NailStyleOption, HomeServiceClient } from '../types';
import { firestoreService } from '../services/firestoreService';
import { SAMPLE_INSPIRATIONS, NAIL_ART_GALLERY_STYLES } from '../services/seedData';
import { ConfirmedLocationQRCard } from '../components/ConfirmedLocationQR';
import {
  Calendar,
  Clock,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  Home,
  Upload,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MapPin,
  FileCheck,
  Paperclip,
  ImagePlus,
  Trash2,
  ZoomIn,
  Eye,
  X,
  FileImage,
  Lock,
} from 'lucide-react';

interface BookingWizardPageProps {
  services: Service[];
  settings: BusinessSettings;
  initialService?: Service | null;
  currentUser: { uid?: string; email?: string | null; displayName?: string | null } | null;
  onBookingComplete: (appt: Appointment) => void;
  onNavigate: (tab: string) => void;
}

export function isDateAvailableForBooking(dateStr: string, settings?: BusinessSettings): boolean {
  if (!dateStr) return false;
  const blocked = settings?.blockedDates || [];
  if (blocked.includes(dateStr)) return false;

  const custom = settings?.customAvailableDates || [];
  if (custom.includes(dateStr)) return true;

  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const dayOfWeek = d.getDay();
  const allowedDays = settings?.workingDays && settings.workingDays.length > 0 ? settings.workingDays : [0, 1];
  return allowedDays.includes(dayOfWeek);
}

// Kept for backward compatibility
export function isSundayOrMonday(dateStr: string): boolean {
  if (!dateStr) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const dayOfWeek = d.getDay();
  return dayOfWeek === 0 || dayOfWeek === 1;
}

export function getUpcomingAvailableDates(
  count = 10,
  settings?: BusinessSettings
): { dateStr: string; label: string; dayName: string; isBlocked: boolean }[] {
  const dates: { dateStr: string; label: string; dayName: string; isBlocked: boolean }[] = [];
  const blockedDates = settings?.blockedDates || [];
  const customDates = settings?.customAvailableDates || [];
  const allowedDays = settings?.workingDays && settings.workingDays.length > 0 ? settings.workingDays : [0, 1];

  const d = new Date();
  d.setDate(d.getDate() + 1);
  let checked = 0;
  while (dates.length < count && checked < 90) {
    checked++;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayOfWeek = d.getDay();
    const isWorkingDay = allowedDays.includes(dayOfWeek);
    const isCustom = customDates.includes(dateStr);

    if (isWorkingDay || isCustom) {
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const isBlocked = blockedDates.includes(dateStr);
      dates.push({ dateStr, label, dayName, isBlocked });
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export const BookingWizardPage: React.FC<BookingWizardPageProps> = ({
  services,
  settings,
  initialService,
  currentUser,
  onBookingComplete,
  onNavigate,
}) => {
  // Wizard Step: 1 to 7
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [selectedService, setSelectedService] = useState<Service | null>(initialService || null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to nearest upcoming available date
    return getUpcomingAvailableDates(1, settings)[0]?.dateStr || '';
  });
  const [availableSlots, setAvailableSlots] = useState<{ time: string; isAvailable: boolean; reason: string }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);

  // Customer Information
  const [customerName, setCustomerName] = useState<string>(currentUser?.displayName || '');
  const [customerEmail, setCustomerEmail] = useState<string>(currentUser?.email || '');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');

  // Home Service details
  const [isHomeService, setIsHomeService] = useState<boolean>(false);
  const [homeAddress, setHomeAddress] = useState<string>('');

  // Selected Nail Style for In-Studio (and default preset)
  const [selectedNailStyle, setSelectedNailStyle] = useState<NailStyleOption | null>(() => NAIL_ART_GALLERY_STYLES[0]);

  // Home Service Multiple Clients State (Strictly 1 to 4 clients)
  const [homeClientCount, setHomeClientCount] = useState<number>(2);
  const [homeClients, setHomeClients] = useState<HomeServiceClient[]>([
    {
      personNumber: 1,
      personName: 'Person 1',
      selectedStyleId: NAIL_ART_GALLERY_STYLES[0].id,
      selectedStyleName: NAIL_ART_GALLERY_STYLES[0].name,
      stylePrice: NAIL_ART_GALLERY_STYLES[0].basePrice,
      homeServiceFee: 250,
    },
    {
      personNumber: 2,
      personName: 'Person 2',
      selectedStyleId: NAIL_ART_GALLERY_STYLES[1].id,
      selectedStyleName: NAIL_ART_GALLERY_STYLES[1].name,
      stylePrice: NAIL_ART_GALLERY_STYLES[1].basePrice,
      homeServiceFee: 250,
    },
    {
      personNumber: 3,
      personName: 'Person 3',
      selectedStyleId: NAIL_ART_GALLERY_STYLES[0].id,
      selectedStyleName: NAIL_ART_GALLERY_STYLES[0].name,
      stylePrice: NAIL_ART_GALLERY_STYLES[0].basePrice,
      homeServiceFee: 250,
    },
    {
      personNumber: 4,
      personName: 'Person 4',
      selectedStyleId: NAIL_ART_GALLERY_STYLES[2].id,
      selectedStyleName: NAIL_ART_GALLERY_STYLES[2].name,
      stylePrice: NAIL_ART_GALLERY_STYLES[2].basePrice,
      homeServiceFee: 250,
    },
  ]);

  const handleClientCountChange = (count: number) => {
    const clamped = Math.max(1, Math.min(4, count));
    setHomeClientCount(clamped);
  };

  const handleUpdateHomeClientStyle = (personIndex: number, style: NailStyleOption) => {
    setHomeClients((prev) => {
      const next = [...prev];
      if (next[personIndex]) {
        next[personIndex] = {
          ...next[personIndex],
          selectedStyleId: style.id,
          selectedStyleName: style.name,
          stylePrice: style.basePrice,
        };
      }
      return next;
    });
  };

  const calculateBookingTotal = (): number => {
    if (!selectedService) return 0;
    const sName = selectedService.name.toLowerCase();

    if (sName.includes('home service') || isHomeService) {
      // ₱250 home service fee per person + each person's selected style price
      return homeClients.slice(0, homeClientCount).reduce((sum, client) => {
        return sum + (client.stylePrice || 499) + 250;
      }, 0);
    }

    if (sName.includes('in-studio')) {
      return selectedNailStyle ? selectedNailStyle.basePrice : selectedService.price;
    }

    if (sName.includes('removal')) {
      return 100; // starting price for 10 nails
    }

    if (sName.includes('repair')) {
      return 0; // free repair
    }

    return selectedService.price;
  };

  const getSelectedStylesList = (): string[] => {
    if (!selectedService) return [];
    const sName = selectedService.name.toLowerCase();

    if (sName.includes('home service') || isHomeService) {
      return homeClients.slice(0, homeClientCount).map((c, i) => {
        return `Person ${i + 1}: ${c.selectedStyleName || 'Hardgel & BIAB'}`;
      });
    }

    if (sName.includes('in-studio')) {
      return [selectedNailStyle?.name || 'Hardgel & BIAB Overlay'];
    }

    if (sName.includes('removal')) {
      return ['Nail Removal (10 nails)'];
    }

    if (sName.includes('repair')) {
      return ['1-Week Free Repair Guarantee'];
    }

    return [selectedService.name];
  };

  // Inspo State
  const [selectedInspoUrl, setSelectedInspoUrl] = useState<string>('');
  const [customInspoUrl, setCustomInspoUrl] = useState<string>('');
  const [attachedImageDataUrl, setAttachedImageDataUrl] = useState<string>('');
  const [attachedFileName, setAttachedFileName] = useState<string>('');
  const [attachedFileSize, setAttachedFileSize] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [zoomModalUrl, setZoomModalUrl] = useState<string | null>(null);
  const [inspoSourceTab, setInspoSourceTab] = useState<'upload' | 'presets' | 'url'>('upload');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  // Client-side image compression to guarantee quality and stay within Firestore limits
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setImageError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    setIsProcessingImage(true);
    setImageError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        // Downscale to max 500x500 for optimal compact size and Firestore reliability
        const maxDimension = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
          setAttachedImageDataUrl(compressedDataUrl);
          setAttachedFileName(file.name);
          const sizeKb = Math.round((compressedDataUrl.length * 0.75) / 1024);
          setAttachedFileSize(`${sizeKb} KB`);
          setSelectedInspoUrl('');
          setCustomInspoUrl('');
        }
        setIsProcessingImage(false);
      };
      img.onerror = () => {
        setImageError('Failed to read image. Please try another file.');
        setIsProcessingImage(false);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setImageError('Failed to read file.');
      setIsProcessingImage(false);
    };
    reader.readAsDataURL(file);
  };

  // Fetch slots whenever selectedDate or settings change
  useEffect(() => {
    if (selectedDate) {
      loadSlots(selectedDate);
    }
  }, [selectedDate, settings]);

  const loadSlots = async (dateStr: string) => {
    setIsLoadingSlots(true);
    setSelectedSlot('');
    try {
      const slots = await firestoreService.getAvailableSlots(dateStr, settings);
      setAvailableSlots(slots);
    } catch {
      setSubmitError('Unable to load schedule availability. Please try again.');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Step 6: Submit Appointment Request
  const handleSubmitBooking = async () => {
    if (!selectedService || !selectedDate || !selectedSlot) {
      setSubmitError('Incomplete booking information. Please check all steps.');
      return;
    }

    if (!isSundayOrMonday(selectedDate)) {
      setSubmitError('Appointments can only be scheduled for Sundays and Mondays. Please choose an available Sunday or Monday.');
      return;
    }

    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setSubmitError('Please provide your name, email, and mobile phone number.');
      return;
    }

    if (isHomeService) {
      if (homeClientCount < 1 || homeClientCount > 4) {
        setSubmitError('Home service requires between 1 and 4 clients per appointment.');
        return;
      }
      if (!homeAddress.trim()) {
        setSubmitError('Please enter your full street address in Pasig, Metro Manila for home service.');
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const inspoFinal = attachedImageDataUrl || customInspoUrl || selectedInspoUrl || '';
      const calculatedTotal = calculateBookingTotal();
      const selectedStyles = getSelectedStylesList();

      const newAppt = await firestoreService.createAppointmentAtomically({
        customerId: currentUser?.uid || `guest_${Date.now()}`,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        customerNotes: customerNotes.trim() || undefined,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        servicePrice: calculatedTotal,
        serviceDurationMinutes: selectedService.durationMinutes,
        appointmentDate: selectedDate,
        startTime: selectedSlot,
        endTime: calculateEndTime(selectedSlot, selectedService.durationMinutes),
        status: 'pending',
        isHomeService,
        homeServiceAddress: isHomeService ? homeAddress.trim() : undefined,
        clientCount: isHomeService ? homeClientCount : 1,
        clientsDetails: isHomeService ? homeClients.slice(0, homeClientCount) : undefined,
        selectedNailStyles: selectedStyles,
        hasInspo: Boolean(inspoFinal),
        inspoImageUrl: inspoFinal || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setConfirmedAppointment(newAppt);
      setCurrentStep(6); // Show Confirmation Voucher
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Trigger Celebration Confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#8B3A56', '#F3B8C3', '#FAF7F4'],
      });

      onBookingComplete(newAppt);
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : 'Booking failed';
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) msg = parsed.error;
      } catch {
        // Not JSON formatted
      }
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateEndTime = (start: string, durationMin: number): string => {
    try {
      const [timePart, modifier] = start.split(' ');
      const [hoursStr, minutesStr] = timePart.split(':');
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      const totalMinutes = hours * 60 + minutes + durationMin;
      let endHours = Math.floor(totalMinutes / 60) % 24;
      const endMinutes = totalMinutes % 60;
      const endModifier = endHours >= 12 ? 'PM' : 'AM';
      if (endHours > 12) endHours -= 12;
      if (endHours === 0) endHours = 12;

      return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')} ${endModifier}`;
    } catch {
      return start;
    }
  };

  const isServiceStepValid = (): boolean => {
    if (!selectedService) return false;
    const n = selectedService.name.toLowerCase();
    if (!isHomeService && !n.includes('repair') && !n.includes('removal')) {
      return Boolean(selectedNailStyle);
    }
    return true;
  };

  const renderAttachmentSection = (
    title = 'Attach Nail Art Inspiration / Screenshot (Optional)',
    subtitle = 'Attach a saved screenshot or reference photo of your desired nail design so Vril can prepare charms and polishes in advance.',
    inputId = 'step1-inspo-file'
  ) => {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#F3B8C3] shadow-xs space-y-3.5 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFE8E9] pb-3">
          <div>
            <label className="text-xs font-bold text-[#231F20] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#8B3A56]" />
              <span>{title}</span>
            </label>
            <p className="text-[11px] text-[#7A6E74] mt-0.5">
              {subtitle}
            </p>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-1 bg-[#FAF7F4] p-1 rounded-xl border border-[#E5D5DA] self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setInspoSourceTab('upload')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                inspoSourceTab === 'upload'
                  ? 'bg-[#8B3A56] text-white shadow-2xs'
                  : 'text-[#5C5257] hover:text-[#231F20]'
              }`}
            >
              <Paperclip className="w-3 h-3" />
              <span>Attach Photo</span>
            </button>
            <button
              type="button"
              onClick={() => setInspoSourceTab('presets')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                inspoSourceTab === 'presets'
                  ? 'bg-[#8B3A56] text-white shadow-2xs'
                  : 'text-[#5C5257] hover:text-[#231F20]'
              }`}
            >
              Studio Styles
            </button>
            <button
              type="button"
              onClick={() => setInspoSourceTab('url')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                inspoSourceTab === 'url'
                  ? 'bg-[#8B3A56] text-white shadow-2xs'
                  : 'text-[#5C5257] hover:text-[#231F20]'
              }`}
            >
              Paste Link
            </button>
          </div>
        </div>

        {imageError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{imageError}</span>
          </div>
        )}

        {/* TAB 1: File / Screenshot Attachment */}
        {inspoSourceTab === 'upload' && (
          <div className="space-y-3">
            {attachedImageDataUrl ? (
              /* Attached Screenshot Card */
              <div className="p-4 rounded-2xl bg-white border-2 border-[#8B3A56] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className="relative group cursor-pointer shrink-0"
                    onClick={() => setZoomModalUrl(attachedImageDataUrl)}
                  >
                    <img
                      src={attachedImageDataUrl}
                      alt="Attached Nail Inspiration Screenshot"
                      className="w-16 h-16 rounded-xl object-cover border border-[#F3B8C3] shadow-xs group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <ZoomIn className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D1FAE5] text-[#047857] uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Screenshot Attached</span>
                      </span>
                      {attachedFileSize && (
                        <span className="text-[10px] text-[#7A6E74]">{attachedFileSize}</span>
                      )}
                    </div>
                    <p className="font-semibold text-xs text-[#231F20] mt-1 truncate max-w-xs sm:max-w-md">
                      {attachedFileName || 'screenshot_reference.jpg'}
                    </p>
                    <p className="text-[11px] text-[#7A6E74]">
                      Saved for your technician review.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setZoomModalUrl(attachedImageDataUrl)}
                    className="px-3 py-1.5 rounded-lg border border-[#E5D5DA] text-xs font-semibold text-[#5C5257] hover:text-[#231F20] hover:bg-[#FAF7F4] flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedImageDataUrl('');
                      setAttachedFileName('');
                      setAttachedFileSize('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#B91C1C] hover:bg-[#FEE2E2] flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Dropzone / Upload Trigger */
              <div className="border-2 border-dashed border-[#F3B8C3] hover:border-[#8B3A56] bg-[#FAF7F4] hover:bg-[#FCEBEE]/30 rounded-2xl p-5 text-center transition-all">
                <input
                  type="file"
                  id={inputId}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <label
                  htmlFor={inputId}
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-11 h-11 rounded-full bg-white border border-[#F3B8C3] flex items-center justify-center text-[#8B3A56] shadow-2xs">
                    {isProcessingImage ? (
                      <div className="w-5 h-5 border-2 border-[#8B3A56] border-t-transparent animate-spin rounded-full" />
                    ) : (
                      <ImagePlus className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#231F20]">
                      Attach Screenshot or Saved Photo
                    </p>
                    <p className="text-[11px] text-[#7A6E74] mt-0.5">
                      Upload from photos, gallery, or screenshots (PNG, JPG, WEBP)
                    </p>
                  </div>
                  <span className="px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-[#8B3A56] hover:bg-[#722A42] transition-colors shadow-2xs flex items-center gap-1.5 mt-1">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Choose Photo / Screenshot</span>
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Studio Preset Styles */}
        {inspoSourceTab === 'presets' && (
          <div className="space-y-2">
            <p className="text-[11px] text-[#7A6E74]">
              Or pick one of Vril's signature studio styles as your design peg:
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {SAMPLE_INSPIRATIONS.map((inspo) => (
                <div
                  key={inspo.id}
                  onClick={() => {
                    setSelectedInspoUrl(inspo.imageUrl);
                    setCustomInspoUrl('');
                    setAttachedImageDataUrl('');
                    setAttachedFileName(inspo.title);
                  }}
                  className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all aspect-square ${
                    selectedInspoUrl === inspo.imageUrl
                      ? 'border-[#8B3A56] ring-2 ring-[#8B3A56]/30'
                      : 'border-[#EFE8E9] opacity-85 hover:opacity-100'
                  }`}
                >
                  <img
                    src={inspo.imageUrl}
                    alt={inspo.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/45 flex items-end p-2">
                    <span className="text-[10px] text-white font-medium truncate">
                      {inspo.title}
                    </span>
                  </div>
                  {selectedInspoUrl === inspo.imageUrl && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#8B3A56] text-white flex items-center justify-center text-[10px]">
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Paste Link */}
        {inspoSourceTab === 'url' && (
          <div>
            <input
              type="url"
              placeholder="Paste an image URL from Instagram or Pinterest"
              value={customInspoUrl}
              onChange={(e) => {
                setCustomInspoUrl(e.target.value);
                setSelectedInspoUrl('');
                setAttachedImageDataUrl('');
                setAttachedFileName('Web Image Link');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5D5DA] text-xs bg-[#FAF7F4] focus:outline-none focus:border-[#8B3A56]"
            />
          </div>
        )}
      </div>
    );
  };

  const stepsList = [
    'Service',
    'Date',
    'Time Slot',
    'Contact Info',
    'Review & Confirm',
    'Voucher',
  ];

  const goToStep = (stepNum: number) => {
    setCurrentStep(stepNum);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const cardEl = document.getElementById('booking-wizard-card');
    if (cardEl) {
      cardEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full">
      {/* Wizard Step Progress Tracker */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {stepsList.map((stepName, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;

            return (
              <div key={stepName} className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isCompleted
                      ? 'bg-[#8B3A56] text-white'
                      : isCurrent
                      ? 'border-2 border-[#8B3A56] text-[#8B3A56] bg-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : stepNum}
                </div>
                <span className="hidden sm:block text-[11px] font-medium text-[#7A6E74] mt-1.5">
                  {stepName}
                </span>
              </div>
            );
          })}
        </div>
        <div className="relative mt-2">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#EFE8E9] -translate-y-1/2 -z-10" />
          <div
            className="h-0.5 bg-[#8B3A56] transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (stepsList.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Error alert if any */}
      {submitError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Wizard Card Body */}
      <div
        id="booking-wizard-card"
        className="bg-white rounded-3xl border border-[#EFE8E9] p-6 sm:p-10 shadow-sm text-left w-full max-h-[75vh] md:max-h-[80vh] overflow-y-auto overscroll-contain scroll-smooth focus:outline-none"
      >
        {/* STEP 1: Select Service */}
        {currentStep === 1 && (
          <div className="space-y-6 w-full">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#231F20]">
                Step 1: Select Your Service
              </h2>
              <p className="text-xs text-[#7A6E74] mt-1">
                Choose between In-Studio, Home Service, 1-Week Free Repair, or Nail Removal.
              </p>
            </div>

            {/* 4 Allowed Services Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services
                .filter((s) => s.isActive)
                .filter((s) => {
                  const n = s.name.toLowerCase();
                  return (
                    n.includes('in-studio') ||
                    n.includes('home service') ||
                    n.includes('repair') ||
                    n.includes('removal')
                  );
                })
                .map((srv) => {
                  const isHome = srv.name.toLowerCase().includes('home service');
                  const isRemoval = srv.name.toLowerCase().includes('removal');
                  const isRepair = srv.name.toLowerCase().includes('repair');
                  const isSelected = selectedService?.id === srv.id;

                  return (
                    <div
                      key={srv.id}
                      onClick={() => {
                        setSelectedService(srv);
                        setIsHomeService(isHome);
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex gap-4 ${
                        isSelected
                          ? 'border-[#8B3A56] bg-[#FCEBEE]'
                          : 'border-[#EFE8E9] hover:border-[#F3B8C3] bg-white'
                      }`}
                    >
                      <img
                        src={srv.imageUrl}
                        alt={srv.name}
                        className="w-20 h-20 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <h4 className="font-serif font-bold text-base text-[#231F20]">
                            {srv.name}
                          </h4>
                          <span className="font-bold text-sm text-[#8B3A56]">
                            {isRemoval ? (
                              <span>Starting ₱100</span>
                            ) : isRepair ? (
                              <span>FREE</span>
                            ) : isHome ? (
                              <span>₱250<span className="text-[10px] font-normal text-[#7A6E74]">/person</span></span>
                            ) : (
                              <span>₱{srv.price.toLocaleString()}</span>
                            )}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7A6E74] mt-0.5">
                          {srv.durationMinutes} mins · {srv.category}
                        </p>
                        <p className="text-xs text-[#5C5257] line-clamp-2 mt-1.5">
                          {srv.description}
                        </p>
                        {isRemoval && (
                          <div className="mt-2 text-[10px] text-[#8B3A56] font-medium bg-[#FFF9F6] p-1.5 rounded-lg border border-[#F3B8C3]/50">
                            Starting at ₱100 for 10 nails. Final price depends on nail length, product type, and removal difficulty.
                          </div>
                        )}
                        {isHome && (
                          <div className="mt-2 text-[10px] text-[#8B3A56] font-medium bg-[#FFF9F6] p-1.5 rounded-lg border border-[#F3B8C3]/50">
                            Accommodates 1–4 clients per appointment. ₱250 fee/person + Move It fare.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* In-Studio: Nail Art Inspiration Gallery Selection */}
            {selectedService && !isHomeService && !selectedService.name.toLowerCase().includes('repair') && !selectedService.name.toLowerCase().includes('removal') && (
              <div className="pt-4 border-t border-[#EFE8E9] space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#231F20] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#8B3A56]" />
                      <span>Nail Art Inspiration Gallery (Select Your Style)</span>
                    </h3>
                    <p className="text-xs text-[#7A6E74]">
                      Select your preferred nail artistry set before proceeding to date &amp; time.
                    </p>
                  </div>
                  {selectedNailStyle && (
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('selected-style-attachment-section');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className="text-xs font-semibold text-[#8B3A56] hover:text-[#722A42] bg-[#FCEBEE] px-3 py-1.5 rounded-full border border-[#F3B8C3] inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto shadow-2xs"
                    >
                      <span>Scroll to Inspo &amp; Continue ↓</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {NAIL_ART_GALLERY_STYLES.map((style) => {
                    const isSelected = selectedNailStyle?.id === style.id;
                    return (
                      <div
                        key={style.id}
                        onClick={() => {
                          setSelectedNailStyle(style);
                          setTimeout(() => {
                            const el = document.getElementById('selected-style-attachment-section');
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }
                          }, 100);
                        }}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#8B3A56] bg-[#FCEBEE]/80 shadow-xs ring-1 ring-[#8B3A56]'
                            : 'border-[#EFE8E9] bg-white hover:border-[#F3B8C3]'
                        }`}
                      >
                        <div className="aspect-square w-full rounded-xl overflow-hidden mb-2 bg-gray-100">
                          <img
                            src={style.imageUrl}
                            alt={style.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-1">
                            <h5 className="font-serif font-bold text-xs text-[#231F20]">
                              {style.name}
                            </h5>
                            <span className="font-bold text-xs text-[#8B3A56]">
                              ₱{style.basePrice}
                            </span>
                          </div>
                          <p className="text-[10px] font-semibold text-[#8B3A56]">
                            Final price: {style.finalPriceRange}
                          </p>
                          <p className="text-[10px] text-[#7A6E74] line-clamp-2">
                            {style.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="mt-2 text-center py-1 bg-[#8B3A56] text-white rounded-lg text-[10px] font-bold">
                            Selected ✓
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Appears immediately after selecting the style */}
                {selectedNailStyle && (
                  <div id="selected-style-attachment-section" className="mt-4 pt-4 border-t border-[#EFE8E9] scroll-mt-6">
                    {renderAttachmentSection(
                      `Attach Nail Art Inspiration for "${selectedNailStyle.name}" (Optional)`,
                      `Have a specific design, peg, or screenshot in mind for your ${selectedNailStyle.name} set? Attach your image here so Vril can prepare charms, colors, and 3D shapes in advance.`,
                      'step1-instudio-inspo-file'
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Home Service: Multiple Clients (1 to 4 People) & Style Selection */}
            {selectedService && isHomeService && (
              <div className="pt-4 border-t border-[#EFE8E9] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#231F20] flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#8B3A56]" />
                      <span>Home Service: Number of Clients (1 to 4 People)</span>
                    </h3>
                    <p className="text-xs text-[#7A6E74]">
                      Select how many people are getting serviced (1 to 4 clients allowed).
                    </p>
                  </div>
                  {/* Client Count Buttons */}
                  <div className="flex items-center gap-1 bg-[#FAF7F4] p-1 rounded-xl border border-[#E5D5DA]">
                    {[1, 2, 3, 4].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => handleClientCountChange(count)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          homeClientCount === count
                            ? 'bg-[#8B3A56] text-white shadow-2xs'
                            : 'text-[#5C5257] hover:text-[#231F20]'
                        }`}
                      >
                        {count} {count === 1 ? 'Person' : 'People'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Per-Client Nail Art Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {Array.from({ length: homeClientCount }).map((_, idx) => {
                    const client = homeClients[idx];
                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-[#FAF7F4] border border-[#EFE8E9] space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#231F20]">Client #{idx + 1}</span>
                          <span className="text-[10px] font-semibold text-[#8B3A56] bg-[#FCEBEE] px-2 py-0.5 rounded-full">
                            +₱250 Home Fee Included
                          </span>
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#7A6E74] mb-1">
                            Choose Nail Art Style:
                          </label>
                          <select
                            value={client?.selectedStyleId || NAIL_ART_GALLERY_STYLES[0].id}
                            onChange={(e) => {
                              const found = NAIL_ART_GALLERY_STYLES.find((st) => st.id === e.target.value);
                              if (found) handleUpdateHomeClientStyle(idx, found);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-[#E5D5DA] bg-white text-xs font-medium text-[#231F20]"
                          >
                            {NAIL_ART_GALLERY_STYLES.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name} (Base ₱{st.basePrice} · Final {st.finalPriceRange})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-[#5C5257] pt-1 border-t border-[#EFE8E9]">
                          <span>Style Base: ₱{client?.stylePrice || 499}</span>
                          <span className="font-bold text-[#8B3A56]">
                            Person Total: ₱{((client?.stylePrice || 499) + 250).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Dynamic Price Summary Box */}
                <div className="p-4 rounded-2xl bg-[#FFF9F6] border border-[#F3B8C3] space-y-1.5 text-xs text-[#5C5257]">
                  <div className="flex justify-between items-center text-sm font-bold text-[#231F20]">
                    <span>Calculated Total for {homeClientCount} {homeClientCount === 1 ? 'Client' : 'Clients'}:</span>
                    <span className="font-serif text-lg text-[#8B3A56]">
                      ₱{calculateBookingTotal().toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7A6E74]">
                    Includes {homeClientCount} x ₱250 home service fee + each client's chosen nail set.
                  </p>
                  <p className="text-[10px] text-[#8B3A56] font-semibold pt-1">
                    • Transportation Fee: Based on current Move It fare to your address in Pasig, Metro Manila (payable on arrival). Clean, stable table workspace required.
                  </p>
                </div>

                {/* Appears after selecting styles for Home Service */}
                <div className="mt-4 pt-4 border-t border-[#EFE8E9]">
                  {renderAttachmentSection(
                    'Attach Nail Art Inspiration for Home Service (Optional)',
                    'Attach screenshot(s) or saved inspiration photos for your group’s nail sets so Vril can bring the right charms, colors, and designs.',
                    'step1-homeservice-inspo-file'
                  )}
                </div>
              </div>
            )}

            {/* 1-Week Free Repair or Nail Removal Photo Option */}
            {selectedService && (selectedService.name.toLowerCase().includes('repair') || selectedService.name.toLowerCase().includes('removal')) && (
              <div className="pt-4 border-t border-[#EFE8E9]">
                {renderAttachmentSection(
                  selectedService.name.toLowerCase().includes('repair')
                    ? 'Attach Photo of Nail Needing Repair (Optional)'
                    : 'Attach Photo of Current Nails for Removal Assessment (Optional)',
                  'A photo helps Vril assess the nail condition, product thickness, or repair requirements prior to your visit.',
                  'step1-repair-removal-inspo-file'
                )}
              </div>
            )}

            <div id="step1-continue-button-container" className="pt-4 flex justify-end">
              <button
                disabled={!isServiceStepValid()}
                onClick={() => {
                  setCurrentStep(2);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider text-white bg-[#8B3A56] hover:bg-[#722A42] disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Continue to Date</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Select Date */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] mb-2">
                <span className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse"></span>
                <span>24/7 Online Booking Portal Active</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#231F20]">
                Step 2: Select Appointment Date
              </h2>
              <p className="text-xs text-[#7A6E74] mt-1">
                You can submit your appointment request 24 hours a day, 7 days a week. Appointments are scheduled exclusively for <strong>Sundays and Mondays</strong>.
              </p>
            </div>

            {/* Availability distinction notice */}
            <div className="p-4 rounded-2xl bg-[#FFF9F6] border border-[#F3B8C3] text-xs text-[#5C5257] space-y-1">
              <p className="font-bold text-[#8B3A56] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#8B3A56]" />
                <span>Appointment Schedule Policy</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                • <strong>Portal Availability:</strong> Open 24/7/365 — browse nail art, calculate prices, and submit requests anytime.<br />
                • <strong>Service Appointments:</strong> Scheduled on the owner's active working days and open calendar dates. Requests start as <em>Pending</em> until confirmed by Vril.
              </p>
            </div>

            {/* Quick Pick Upcoming Available Dates */}
            <div>
              <label className="block text-xs font-semibold text-[#5C5257] uppercase tracking-wider mb-2.5">
                Quick Select Available Appointment Date
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {getUpcomingAvailableDates(8, settings).map(({ dateStr, label, dayName, isBlocked }) => {
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={isBlocked}
                      onClick={() => !isBlocked && setSelectedDate(dateStr)}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        isBlocked
                          ? 'border-red-200 bg-red-50/70 text-gray-400 cursor-not-allowed opacity-75'
                          : isSelected
                          ? 'border-[#8B3A56] bg-[#8B3A56] text-white shadow-xs cursor-pointer'
                          : 'border-[#E5D5DA] bg-[#FAF7F4] hover:border-[#8B3A56]/60 text-[#231F20] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`block text-[10px] font-bold uppercase tracking-wider ${
                            isBlocked ? 'text-red-700' : isSelected ? 'text-[#FAD2E1]' : 'text-[#8B3A56]'
                          }`}
                        >
                          {dayName}
                        </span>
                        {isBlocked && (
                          <span className="text-[9px] font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded-md">
                            Closed
                          </span>
                        )}
                      </div>
                      <span className={`block text-xs font-semibold mt-0.5 ${isBlocked ? 'line-through text-gray-500' : ''}`}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="max-w-md mx-auto pt-2">
              <label className="block text-xs font-semibold text-[#5C5257] uppercase tracking-wider mb-2">
                Or Pick from Custom Calendar Date
              </label>
              {(() => {
                const now = new Date();
                const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                return (
                  <input
                    type="date"
                    min={localToday}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E5D5DA] focus:outline-none focus:border-[#8B3A56] text-sm bg-[#FAF7F4]"
                  />
                );
              })()}
              <p className="text-[11px] text-[#7A6E74] mt-2">
                Selected date:{' '}
                <strong>
                  {selectedDate
                    ? (() => {
                        const [y, m, d] = selectedDate.split('-').map(Number);
                        return new Date(y, m - 1, d).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        });
                      })()
                    : 'None selected'}
                </strong>
              </p>

              {(() => {
                if (!selectedDate) return null;
                const isAvailable = isDateAvailableForBooking(selectedDate, settings);
                const isBlocked = Boolean(settings.blockedDates?.includes(selectedDate));
                const [y, m, d] = selectedDate.split('-').map(Number);
                const localDateObj = new Date(y, m - 1, d);
                const dayName = localDateObj.toLocaleDateString('en-US', { weekday: 'long' });

                if (isBlocked) {
                  return (
                    <div className="mt-3 p-3.5 rounded-xl text-xs flex items-start gap-2.5 bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                      <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626] mt-0.5" />
                      <div>
                        <p className="font-bold">✕ Salon Closed / Blocked Holiday ({selectedDate})</p>
                        <p className="text-[11px] mt-0.5 opacity-90">
                          This date is marked as a closed holiday in Nails by Vril schedule settings. Please pick another available appointment day.
                        </p>
                      </div>
                    </div>
                  );
                }

                if (!isAvailable) {
                  return (
                    <div className="mt-3 p-3.5 rounded-xl text-xs flex items-start gap-2.5 bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                      <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626] mt-0.5" />
                      <div>
                        <p className="font-bold">✕ Not an Available Appointment Day</p>
                        <p className="text-[11px] mt-0.5 opacity-90">
                          {dayName} ({selectedDate}) is outside the salon's current booking schedule. Please select an available date using the quick buttons or choose another date.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="mt-3 p-3.5 rounded-xl text-xs flex items-start gap-2.5 bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#059669] mt-0.5" />
                    <div>
                      <p className="font-bold">✓ Valid Appointment Day ({dayName})</p>
                      <p className="text-[11px] mt-0.5 opacity-90">
                        Nails by Vril slots are open for {dayName}. Proceed to select your preferred time slot.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#7A6E74] hover:text-[#231F20] flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                disabled={!selectedDate || !isDateAvailableForBooking(selectedDate, settings)}
                onClick={() => {
                  if (isDateAvailableForBooking(selectedDate, settings)) {
                    setCurrentStep(3);
                  }
                }}
                className="px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider text-white bg-[#8B3A56] hover:bg-[#722A42] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Check Time Slots</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Select Available Time Slot */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#231F20]">
                Step 3: Select Time Slot
              </h2>
              <p className="text-xs text-[#7A6E74] mt-1">
                Slots for {selectedDate} verified against real-time database locks.
              </p>
            </div>

            {settings.blockedDates?.includes(selectedDate) ? (
              <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-200 space-y-2">
                <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
                <p className="text-sm font-bold text-red-900">Date Blocked in Schedule Settings</p>
                <p className="text-xs text-red-700 max-w-md mx-auto">
                  {selectedDate} is a blocked holiday. No appointment slots are available.
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="mt-3 px-5 py-2 rounded-full text-xs font-semibold text-white bg-[#8B3A56] hover:bg-[#722A42] cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Choose Another Date</span>
                </button>
              </div>
            ) : isLoadingSlots ? (
              <div className="py-12 text-center text-xs text-[#7A6E74]">
                Checking available slots in Cloud Firestore...
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="p-8 text-center bg-[#FAF7F4] rounded-2xl border border-[#EFE8E9]">
                <p className="text-sm font-semibold text-[#231F20]">No slots available for this date</p>
                <p className="text-xs text-[#7A6E74] mt-1">
                  The studio is closed or fully booked on this day. Please pick another date.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {availableSlots.map(({ time, isAvailable, reason }) => (
                  <button
                    key={time}
                    disabled={!isAvailable}
                    onClick={() => setSelectedSlot(time)}
                    className={`py-3 px-4 rounded-xl text-xs font-semibold border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                      selectedSlot === time
                        ? 'border-[#8B3A56] bg-[#8B3A56] text-white shadow-xs'
                        : isAvailable
                        ? 'border-[#E5D5DA] bg-white text-[#231F20] hover:border-[#8B3A56] hover:bg-[#FCEBEE]'
                        : 'border-dashed border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{time}</span>
                    <span className="text-[10px] font-normal opacity-80">
                      {reason}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#7A6E74] hover:text-[#231F20] flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                disabled={!selectedSlot}
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider text-white bg-[#8B3A56] hover:bg-[#722A42] disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Enter Contact Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Customer Details & Inspo Reference */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#231F20]">
                Step 4: Contact &amp; Reference Details
              </h2>
              <p className="text-xs text-[#7A6E74] mt-1">
                Please provide your contact information to receive your appointment voucher.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#5C5257] uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Santos"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5D5DA] focus:outline-none focus:border-[#8B3A56] text-xs bg-[#FAF7F4]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5257] uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. maria@gmail.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5D5DA] focus:outline-none focus:border-[#8B3A56] text-xs bg-[#FAF7F4]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5257] uppercase tracking-wider mb-1">
                  Mobile Contact Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 0917 123 4567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5D5DA] focus:outline-none focus:border-[#8B3A56] text-xs bg-[#FAF7F4]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5257] uppercase tracking-wider mb-1">
                  Special Notes / Nail Health
                </label>
                <input
                  type="text"
                  placeholder="e.g. sensitive cuticles, natural length"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5D5DA] focus:outline-none focus:border-[#8B3A56] text-xs bg-[#FAF7F4]"
                />
              </div>
            </div>

            {/* Service Location: Determined strictly by Step 1 selection (No duplicate selector) */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#231F20] uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#8B3A56]" />
                <span>Service Location &amp; Area</span>
              </label>

              {!isHomeService ? (
                /* IN-STUDIO APPOINTMENT: No address field, displays Pasig, Metro Manila general area */
                <div className="p-4 rounded-2xl bg-[#FFF9F6] border border-[#F3B8C3] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#8B3A56] text-white flex items-center justify-center">
                        <Home className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-sm text-[#231F20]">
                          Nails by Vril Studio Visit
                        </h4>
                        <span className="text-[10px] font-semibold text-[#8B3A56] uppercase tracking-wider">
                          General Service Area: Pasig, Metro Manila
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D1FAE5] text-[#047857]">
                      Studio Selected
                    </span>
                  </div>
                  <div className="text-[11px] text-[#5C5257] space-y-1 border-t border-[#F3B8C3]/50 pt-2">
                    <p className="flex items-center gap-1.5 text-[#8B3A56] font-medium">
                      <span>✓</span> Complimentary iced drink and loyalty rewards card included with your set.
                    </p>
                    <p className="text-[10px] text-[#7A6E74] italic">
                      Private studio located in Pasig, Metro Manila. The exact studio address, directions, and Google Maps QR code will be generated on your digital voucher upon owner confirmation.
                    </p>
                  </div>
                </div>
              ) : (
                /* HOME SERVICE: Requires complete street address in Pasig, Metro Manila */
                <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF9F6] border border-[#F3B8C3] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#8B3A56] text-white flex items-center justify-center">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-sm text-[#231F20]">
                          On-Site Home Service
                        </h4>
                        <span className="text-[10px] font-semibold text-[#8B3A56] uppercase tracking-wider">
                          General Service Area: Pasig, Metro Manila
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#B45309]">
                      {homeClientCount} {homeClientCount === 1 ? 'Client' : 'Clients'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-[#F3B8C3] text-[11px] text-[#5C5257] space-y-1">
                    <p className="font-bold text-[#8B3A56]">Home Service Policy &amp; Terms:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li><strong>Clients:</strong> {homeClientCount} client(s) booked (1 to 4 people allowed).</li>
                      <li><strong>Service Fee:</strong> ₱250 fee per person + Move It transportation fare.</li>
                      <li><strong>Workspace:</strong> Please provide a clean, stable table workspace.</li>
                      <li><strong>Group Readiness:</strong> Everyone must be ready at the scheduled time.</li>
                    </ul>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#5C5257] mb-1">
                      Complete Street Address (Pasig, Metro Manila) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Unit / House No., Street, Barangay, Pasig, Metro Manila"
                      value={homeAddress}
                      onChange={(e) => setHomeAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5D5DA] text-xs bg-white focus:outline-none focus:border-[#8B3A56]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 4: Nail Art Inspiration Reference Review */}
            <div className="space-y-3 pt-3 border-t border-[#EFE8E9]">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-[#231F20] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#8B3A56]" />
                    <span>Nail Art Inspiration Reference</span>
                  </label>
                  <p className="text-[11px] text-[#7A6E74] mt-0.5">
                    Design photo attached in Step 1 for Vril's preparation.
                  </p>
                </div>
                {(attachedImageDataUrl || selectedInspoUrl || customInspoUrl) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D1FAE5] text-[#047857] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Attached</span>
                  </span>
                )}
              </div>

              {(attachedImageDataUrl || selectedInspoUrl || customInspoUrl) ? (
                <div className="p-3.5 rounded-2xl bg-white border border-[#F3B8C3] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="relative group cursor-pointer shrink-0"
                      onClick={() => setZoomModalUrl(attachedImageDataUrl || selectedInspoUrl || customInspoUrl)}
                    >
                      <img
                        src={attachedImageDataUrl || selectedInspoUrl || customInspoUrl}
                        alt="Attached Nail Inspiration Screenshot"
                        className="w-14 h-14 rounded-xl object-cover border border-[#F3B8C3] shadow-xs group-hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-[#231F20] truncate max-w-xs sm:max-w-md">
                        {attachedFileName || 'screenshot_reference.jpg'}
                      </p>
                      <p className="text-[11px] text-[#7A6E74]">
                        {attachedFileSize ? `${attachedFileSize} · ` : ''}Ready for technician review
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setZoomModalUrl(attachedImageDataUrl || selectedInspoUrl || customInspoUrl)}
                      className="px-3 py-1.5 rounded-lg border border-[#E5D5DA] text-xs font-semibold text-[#5C5257] hover:text-[#231F20] hover:bg-[#FAF7F4] flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedImageDataUrl('');
                        setAttachedFileName('');
                        setAttachedFileSize('');
                        setSelectedInspoUrl('');
                        setCustomInspoUrl('');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#B91C1C] hover:bg-[#FEE2E2] flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#FAF7F4] border border-[#E5D5DA] flex items-center justify-between text-xs text-[#7A6E74]">
                  <span>No inspiration image attached (optional).</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs font-semibold text-[#8B3A56] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attach in Step 1</span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#7A6E74] hover:text-[#231F20] flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                disabled={!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()}
                onClick={() => setCurrentStep(5)}
                className="px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider text-white bg-[#8B3A56] hover:bg-[#722A42] disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Review Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Review Booking Details */}
        {currentStep === 5 && selectedService && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#231F20]">
                Step 5: Review Booking Details
              </h2>
              <p className="text-xs text-[#7A6E74] mt-1">
                Please verify your appointment summary before submitting.
              </p>
            </div>

            <div className="bg-[#FAF7F4] rounded-2xl p-6 border border-[#EFE8E9] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5D5DA] pb-4">
                <div>
                  <span className="text-[10px] font-bold text-[#8B3A56] uppercase tracking-wider">
                    Treatment
                  </span>
                  <h3 className="font-serif text-xl font-bold text-[#231F20]">
                    {selectedService.name}
                  </h3>
                  <p className="text-xs text-[#7A6E74]">
                    Estimated duration: {selectedService.durationMinutes} mins
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-[#7A6E74] block">Calculated Total</span>
                  <span className="font-serif text-2xl font-bold text-[#8B3A56]">
                    ₱{calculateBookingTotal().toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-semibold text-[#7A6E74]">Date &amp; Time Slot:</p>
                  <p className="text-sm font-bold text-[#231F20] mt-0.5">
                    {selectedDate} at {selectedSlot}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[#7A6E74]">Client Name:</p>
                  <p className="text-sm font-bold text-[#231F20] mt-0.5">{customerName}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#7A6E74]">Contact Email:</p>
                  <p className="text-[#231F20] mt-0.5">{customerEmail}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#7A6E74]">Mobile Number:</p>
                  <p className="text-[#231F20] mt-0.5">{customerPhone}</p>
                </div>

                <div className="sm:col-span-2">
                  <p className="font-semibold text-[#7A6E74]">Selected Style(s):</p>
                  <p className="text-sm font-medium text-[#8B3A56] mt-0.5">
                    {getSelectedStylesList().join(' · ')}
                  </p>
                </div>

                {isHomeService && (
                  <div>
                    <p className="font-semibold text-[#7A6E74]">Number of Clients:</p>
                    <p className="text-sm font-bold text-[#231F20] mt-0.5">
                      {homeClientCount} {homeClientCount === 1 ? 'person' : 'people'}
                    </p>
                  </div>
                )}

                <div className={isHomeService ? '' : 'sm:col-span-2'}>
                  <p className="font-semibold text-[#7A6E74]">Location Mode:</p>
                  <p className="text-[#231F20] mt-0.5">
                    {isHomeService ? (
                      <span className="text-[#8B3A56] font-bold">
                        On-Site Home Service: {homeAddress}
                      </span>
                    ) : (
                      <span>Nails by Vril Studio · Pasig, Metro Manila</span>
                    )}
                  </p>
                </div>

                {/* Attached Screenshot / Inspo Preview in Review Step */}
                {(attachedImageDataUrl || customInspoUrl || selectedInspoUrl) && (
                  <div className="sm:col-span-2 pt-3 border-t border-[#E5D5DA]">
                    <p className="font-semibold text-[#7A6E74] mb-2 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-[#8B3A56]" />
                      <span>Attached Nail Art Screenshot / Reference:</span>
                    </p>
                    <div className="flex items-center gap-3.5 bg-white p-3 rounded-xl border border-[#F3B8C3] shadow-xs">
                      <img
                        src={attachedImageDataUrl || customInspoUrl || selectedInspoUrl}
                        alt="Attached Screenshot Reference"
                        className="w-16 h-16 rounded-xl object-cover border border-[#E5D5DA] cursor-pointer hover:opacity-90 shrink-0"
                        onClick={() => setZoomModalUrl(attachedImageDataUrl || customInspoUrl || selectedInspoUrl)}
                      />
                      <div className="text-xs">
                        <span className="font-bold text-[#231F20] block">
                          {attachedFileName || 'Nail Design Reference'}
                        </span>
                        {attachedFileSize && (
                          <span className="text-[10px] text-[#7A6E74]">{attachedFileSize}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setZoomModalUrl(attachedImageDataUrl || customInspoUrl || selectedInspoUrl)}
                          className="text-[11px] font-semibold text-[#8B3A56] hover:underline mt-1 flex items-center gap-1 cursor-pointer"
                        >
                          <ZoomIn className="w-3 h-3" />
                          <span>Click to zoom screenshot</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Inline validation/error feedback */}
            {submitError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span className="font-medium">{submitError}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#7A6E74] hover:text-[#231F20] flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleSubmitBooking}
                className="px-8 py-3 rounded-full text-xs font-semibold uppercase tracking-wider text-white bg-[#8B3A56] hover:bg-[#722A42] disabled:opacity-40 transition-colors flex items-center gap-2 cursor-pointer shadow-md"
              >
                {isSubmitting ? (
                  <span>Securing Time Slot...</span>
                ) : (
                  <>
                    <span>Confirm &amp; Submit Request</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Confirmation & Digital Voucher */}
        {currentStep === 6 && confirmedAppointment && (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-[#D1FAE5] text-[#047857] flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                confirmedAppointment.status === 'confirmed'
                  ? 'bg-[#D1FAE5] text-[#047857]'
                  : 'bg-[#FEF3C7] text-[#B45309]'
              }`}>
                Appointment Status: {confirmedAppointment.status}
              </span>
              <h2 className="font-serif text-3xl font-bold text-[#231F20] mt-3">
                Appointment Reserved Successfully!
              </h2>
              <p className="text-xs text-[#7A6E74] max-w-md mx-auto mt-1">
                Your time slot lock is registered as <strong>Pending</strong>. When Vril approves your booking, an official confirmation notification will be dispatched directly to your Gmail inbox (<strong>{confirmedAppointment.customerEmail || 'rayanat.barbosa@gmail.com'}</strong>).
              </p>
            </div>

            {/* Official Appointment Voucher Card */}
            <div className="max-w-md mx-auto bg-[#FAF7F4] rounded-2xl border-2 border-dashed border-[#F3B8C3] p-6 text-left space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#EFE8E9] pb-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/assets/logo.png"
                    alt="Nails by Vril Logo"
                    className="w-10 h-10 rounded-full object-cover border border-[#F3B8C3]"
                  />
                  <div>
                    <h4 className="font-serif font-bold text-sm text-[#231F20] leading-none">Nails by Vril</h4>
                    <p className="text-[10px] text-[#8B3A56] font-semibold uppercase tracking-wider mt-0.5">Official Booking Voucher</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#8B3A56]">
                    Reference ID
                  </span>
                  <p className="font-mono text-xs font-semibold text-[#231F20]">
                    {confirmedAppointment.id}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-[#EFE8E9]/60">
                  <span className="text-[#7A6E74]">Total Price Due:</span>
                  <span className="font-serif text-base font-bold text-[#8B3A56]">₱{confirmedAppointment.servicePrice.toLocaleString()}</span>
                </div>
                <p><strong>Client:</strong> {confirmedAppointment.customerName} ({confirmedAppointment.customerPhone})</p>
                <p><strong>Service:</strong> {confirmedAppointment.serviceName}</p>
                {confirmedAppointment.selectedNailStyles && confirmedAppointment.selectedNailStyles.length > 0 && (
                  <p><strong>Selected Nail Styles:</strong> {confirmedAppointment.selectedNailStyles.join(' · ')}</p>
                )}
                <p><strong>Appointment Schedule:</strong> {confirmedAppointment.appointmentDate} at {confirmedAppointment.startTime}</p>
                <p><strong>Number of Clients:</strong> {confirmedAppointment.clientCount || 1} {confirmedAppointment.clientCount === 1 ? 'person' : 'people'}</p>
                <p>
                  <strong>Location:</strong>{' '}
                  {confirmedAppointment.isHomeService
                    ? 'On-Site Home Service · Pasig, Metro Manila (Private Client Residence)'
                    : confirmedAppointment.status === 'confirmed'
                      ? (confirmedAppointment.meetingLocationName || 'Nails by Vril Pasig Studio')
                      : 'Nails by Vril Studio · Pasig, Metro Manila (Exact directions unlocked on confirmation)'}
                </p>

                <div className="py-2 border-y border-[#EFE8E9] space-y-1 text-[11px] text-[#5C5257]">
                  <p><strong>Payment Mode:</strong> Cash / G-cash accepted</p>
                  <p><strong>Complimentary:</strong> Free iced drink &amp; loyalty card included</p>
                  <p><strong>1-Week Guarantee:</strong> Free repairs for lifting or easy touch-up within 1 week!</p>
                </div>

                {/* Attached Screenshot in Confirmation Voucher */}
                {confirmedAppointment.inspoImageUrl && (
                  <div className="pt-2 border-t border-[#EFE8E9] flex items-center gap-3">
                    <img
                      src={confirmedAppointment.inspoImageUrl}
                      alt="Attached Screenshot"
                      className="w-14 h-14 rounded-xl object-cover border border-[#F3B8C3] shadow-2xs shrink-0 cursor-pointer"
                      onClick={() => setZoomModalUrl(confirmedAppointment.inspoImageUrl!)}
                    />
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#D1FAE5] text-[#047857] uppercase tracking-wider">
                        Screenshot Attached
                      </span>
                      <p className="text-[11px] text-[#5C5257] mt-0.5">
                        Your artist will review this design reference for charms and gel sculpting.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Confirmed Studio Location & Google Maps QR Code */}
            {!confirmedAppointment.isHomeService ? (
              <div className="max-w-md mx-auto">
                <ConfirmedLocationQRCard
                  customerName={confirmedAppointment.customerName}
                  appointmentDate={confirmedAppointment.appointmentDate}
                  startTime={confirmedAppointment.startTime}
                  isConfirmed={confirmedAppointment.status === 'confirmed'}
                />
              </div>
            ) : (
              <div className="max-w-md mx-auto p-5 rounded-2xl bg-[#FFF9F6] border border-[#F3B8C3] text-left text-xs space-y-1.5">
                <p className="font-serif font-bold text-sm text-[#8B3A56] flex items-center gap-1.5">
                  <Home className="w-4 h-4" />
                  <span>On-Site Home Service Confirmed</span>
                </p>
                <p className="text-[#5C5257]">
                  Vril will travel directly to your location at <strong>{confirmedAppointment.homeServiceAddress}</strong> via Move It. Please ensure your table workspace is ready and clean!
                </p>
              </div>
            )}

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => onNavigate('customer')}
                className="px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider text-white bg-[#8B3A56] hover:bg-[#722A42] transition-colors cursor-pointer shadow-xs"
              >
                View in My Bookings
              </button>
              <button
                onClick={() => {
                  setCurrentStep(1);
                  setSelectedService(null);
                  setSelectedSlot('');
                  setAttachedImageDataUrl('');
                  setAttachedFileName('');
                }}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#5C5257] hover:text-[#231F20] bg-white border border-[#E5D5DA] cursor-pointer"
              >
                Book Another Appointment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Zoom Modal for Screenshot Inspection */}
      {zoomModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setZoomModalUrl(null)}
        >
          <div
            className="relative max-w-xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-4 text-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#EFE8E9]">
              <span className="text-xs font-bold text-[#231F20] flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-[#8B3A56]" />
                <span>Nail Art Reference Screenshot</span>
              </span>
              <button
                onClick={() => setZoomModalUrl(null)}
                className="p-1 text-[#7A6E74] hover:text-[#231F20]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={zoomModalUrl}
              alt="Zoomed Reference Screenshot"
              className="w-full max-h-[70vh] object-contain rounded-2xl mx-auto"
            />
            <button
              onClick={() => setZoomModalUrl(null)}
              className="px-6 py-2 bg-[#8B3A56] text-white rounded-full text-xs font-semibold cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

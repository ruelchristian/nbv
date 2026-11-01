import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Navigation,
  ShieldCheck,
  X,
  Sparkles,
  Phone,
  Info,
  Lock,
  Clock,
} from 'lucide-react';

// Initial verified Google Maps link reference for Nails by Vril studio
export const STUDIO_GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/P39FX7dVpXAs32MCA';

export const STUDIO_EXACT_LOCATION = {
  city: 'Pasig, Metro Manila',
  province: 'Metro Manila, Philippines',
  area: 'Pasig, Metro Manila',
  googleMapsUrl: STUDIO_GOOGLE_MAPS_URL,
  directionsNotice:
    'Exact private studio address is unlocked exclusively for confirmed appointments to ensure client safety and privacy.',
  transitTips: [
    'Accessible via Move It, Grab, or Angkas to Pasig, Metro Manila',
    'Drop-off pin matches the Google Maps QR code',
    'Arrive 5–10 minutes early to start on time',
  ],
};

interface ConfirmedLocationQRCardProps {
  customerName?: string;
  appointmentDate?: string;
  startTime?: string;
  isConfirmed?: boolean;
  meetingLocationGoogleMapsUrl?: string;
  meetingLocationName?: string;
  onOpenModal?: () => void;
}

export const ConfirmedLocationQRCard: React.FC<ConfirmedLocationQRCardProps> = ({
  customerName,
  appointmentDate,
  startTime,
  isConfirmed = true,
  meetingLocationGoogleMapsUrl,
  meetingLocationName,
}) => {
  const [copied, setCopied] = useState(false);
  const targetMapsUrl = meetingLocationGoogleMapsUrl || STUDIO_GOOGLE_MAPS_URL;
  const targetLocationName = meetingLocationName || 'Pasig, Metro Manila';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetMapsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // If appointment is not confirmed by owner, DO NOT render QR code or final address
  if (!isConfirmed) {
    return (
      <div className="bg-[#FAF7F4] p-6 sm:p-7 rounded-3xl border border-[#F3B8C3] shadow-sm space-y-4 text-left">
        <div className="flex items-center justify-between border-b border-[#E5D5DA] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-[#B45309]" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#B45309] uppercase tracking-wider">
                Meeting Location Protected
              </span>
              <p className="text-xs text-[#7A6E74] font-medium mt-0.5">
                Pending Owner Review &amp; Confirmation
              </p>
            </div>
          </div>
          {customerName && (
            <span className="text-xs font-semibold text-[#8B3A56] bg-white px-3 py-1 rounded-full border border-[#F3B8C3]">
              {customerName}
            </span>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EFE8E9] space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FCEBEE] text-[#8B3A56] flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-serif text-base font-bold text-[#231F20]">
                Location &amp; QR Code Unlocked After Confirmation
              </h4>
              <p className="text-xs text-[#5C5257] leading-relaxed">
                To maintain studio safety and guarantee seamless scheduling, the final meeting location address, verified Google Maps pin, and digital navigation QR code are established only once Vril reviews and confirms your appointment request.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#FFF9F6] border border-[#F5C77E]/60 text-[11px] text-[#805B10] space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>24/7 Booking Portal Active</span>
            </p>
            <p>
              Your request has been securely recorded. You will be notified via Gmail as soon as your booking is confirmed, at which point the full location directions and QR code will instantly appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-linear-to-br from-white via-[#FFF9F6] to-[#FAF4F5] p-6 sm:p-7 rounded-3xl border border-[#F3B8C3] shadow-md space-y-5 text-left">
      {/* Badge Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE8E9] pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#D1FAE5] text-[#047857] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#047857]" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#047857] text-white uppercase tracking-wider">
              Confirmed Appointment Pass
            </span>
            <p className="text-xs text-[#7A6E74] font-medium mt-0.5">
              Verified Google Maps Navigation Pin
            </p>
          </div>
        </div>

        {customerName && (
          <span className="text-xs font-semibold text-[#8B3A56] bg-white px-3 py-1 rounded-full border border-[#F3B8C3]">
            Client: {customerName}
          </span>
        )}
      </div>

      {/* Main QR Code & Location Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
        {/* QR Code Container */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center bg-white p-4 rounded-2xl border border-[#E5D5DA] shadow-xs">
          <div className="p-2 bg-white rounded-xl">
            <QRCodeSVG
              value={targetMapsUrl}
              size={135}
              bgColor="#ffffff"
              fgColor="#231F20"
              level="H"
              includeMargin={false}
            />
          </div>
          <p className="text-[10px] font-bold text-[#8B3A56] uppercase tracking-wider mt-2.5 text-center flex items-center gap-1">
            <Navigation className="w-3 h-3 text-[#8B3A56]" />
            <span>Scan for Google Maps</span>
          </p>
        </div>

        {/* Location Info */}
        <div className="sm:col-span-7 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#8B3A56] uppercase tracking-wide">
              <MapPin className="w-3.5 h-3.5" />
              <span>Confirmed Meeting Location</span>
            </div>
            <h4 className="font-serif text-xl font-bold text-[#231F20]">
              {targetLocationName}
            </h4>
            <p className="text-xs text-[#5C5257] leading-relaxed">
              Scan the QR code with your phone camera or click below to launch Google Maps with live turn-by-turn navigation directly to our verified location.
            </p>
          </div>

          {(appointmentDate || startTime) && (
            <div className="p-2.5 rounded-xl bg-white border border-[#EFE8E9] text-xs space-y-0.5">
              <p className="font-semibold text-[#231F20]">
                Scheduled Slot: {appointmentDate} {startTime ? `at ${startTime}` : ''}
              </p>
              <p className="text-[11px] text-[#7A6E74]">
                Please be on time to avoid delays. If running late, please message Vril on Instagram!
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href={targetMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-[#8B3A56] hover:bg-[#722A42] text-white text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Open in Google Maps</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>

            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#E5D5DA] hover:border-[#8B3A56] text-[#5C5257] hover:text-[#8B3A56] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
              <span>{copied ? 'Maps Link Copied!' : 'Copy Maps Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transit tips footer */}
      <div className="pt-3 border-t border-[#EFE8E9] text-[11px] text-[#7A6E74] flex items-start gap-2">
        <Info className="w-4 h-4 text-[#8B3A56] shrink-0 mt-0.5" />
        <span>
          <strong>Move It / Grab Rider Tip:</strong> Destination reference: Pasig, Metro Manila. Turn-by-turn navigation is established by the Google Maps link above.
        </span>
      </div>
    </div>
  );
};

interface ConfirmedLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName?: string;
  appointmentDate?: string;
  startTime?: string;
  isConfirmed?: boolean;
  meetingLocationGoogleMapsUrl?: string;
  meetingLocationName?: string;
}

export const ConfirmedLocationModal: React.FC<ConfirmedLocationModalProps> = ({
  isOpen,
  onClose,
  customerName,
  appointmentDate,
  startTime,
  isConfirmed = true,
  meetingLocationGoogleMapsUrl,
  meetingLocationName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-[#F3B8C3] shadow-2xl relative space-y-4 my-8 animate-in fade-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-[#FAF4F5] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <ConfirmedLocationQRCard
          customerName={customerName}
          appointmentDate={appointmentDate}
          startTime={startTime}
          isConfirmed={isConfirmed}
          meetingLocationGoogleMapsUrl={meetingLocationGoogleMapsUrl}
          meetingLocationName={meetingLocationName}
        />
      </div>
    </div>
  );
};

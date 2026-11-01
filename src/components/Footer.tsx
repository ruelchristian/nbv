import React from 'react';
import { BrandLogo } from './BrandLogo';
import { Instagram, MapPin, Phone, Mail, Clock, Heart, Award, Navigation, Download, QrCode } from 'lucide-react';
import { BusinessSettings } from '../types';

interface FooterProps {
  settings: BusinessSettings;
  onSelectTab: (tab: string) => void;
  currentUser?: { email?: string | null; displayName?: string | null } | null;
  isAdmin?: boolean;
  onOpenCompanionModal?: () => void;
  onOpenDownloadModal?: () => void;
  onOpenLocationQRModal?: () => void;
  onSignIn?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  onSelectTab,
  currentUser,
  isAdmin = false,
  onOpenCompanionModal,
  onOpenDownloadModal,
  onOpenLocationQRModal,
  onSignIn,
}) => {
  return (
    <footer className="bg-[#FAF4F5] border-t border-[#EFE8E9] text-[#5C5257] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand Col */}
          <div className="space-y-4">
            <BrandLogo size="lg" />
            <p className="text-sm text-[#7A6E74] leading-relaxed pt-2">
              {settings.tagline}. Dedicated to precision cuticle grooming, structured builder gel overlays, and bespoke hand-tied bow art.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white border border-[#F3B8C3] text-[#8B3A56] hover:bg-[#8B3A56] hover:text-white flex items-center justify-center transition-colors shadow-xs"
                title="Follow on Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <span className="text-xs font-semibold text-[#8B3A56]">
                {settings.instagramHandle}
              </span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="font-serif font-bold text-lg text-[#231F20] mb-4">
              Quick Navigation
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => onSelectTab('home')}
                  className="hover:text-[#8B3A56] transition-colors cursor-pointer"
                >
                  Home Studio
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('services')}
                  className="hover:text-[#8B3A56] transition-colors cursor-pointer"
                >
                  Services &amp; Pricing Catalog
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('book')}
                  className="hover:text-[#8B3A56] transition-colors cursor-pointer"
                >
                  Reserve Appointment Slot
                </button>
              </li>
              {currentUser ? (
                <li>
                  <button
                    onClick={() => onSelectTab('customer')}
                    className="hover:text-[#8B3A56] transition-colors cursor-pointer"
                  >
                    My Appointments &amp; History
                  </button>
                </li>
              ) : (
                <li>
                  <button
                    onClick={() => {
                      if (onSignIn) {
                        onSignIn();
                      } else {
                        onSelectTab('customer');
                      }
                    }}
                    className="hover:text-[#8B3A56] transition-colors cursor-pointer text-left"
                  >
                    Client Sign In / My Bookings
                  </button>
                </li>
              )}
              {isAdmin && (
                <li>
                  <button
                    onClick={() => onSelectTab('admin')}
                    className="hover:text-[#8B3A56] transition-colors cursor-pointer font-semibold text-[#8B3A56]"
                  >
                    Owner &amp; Artist Dashboard
                  </button>
                </li>
              )}
              {onOpenDownloadModal && (
                <li>
                  <button
                    onClick={onOpenDownloadModal}
                    className="hover:text-[#8B3A56] transition-colors cursor-pointer flex items-center gap-1.5 font-semibold text-[#8B3A56]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Mobile App (PWA)</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Studio Hours & Location */}
          <div>
            <h4 className="font-serif font-bold text-lg text-[#231F20] mb-4">
              Availability &amp; Location
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#8B3A56] shrink-0 mt-0.5" />
                <span className="flex flex-col gap-1.5 text-left">
                  <span className="font-semibold text-[#231F20]">
                    Pasig City, Metro Manila
                  </span>
                  <span className="text-xs text-[#7A6E74] leading-relaxed">
                    Exact Google Maps navigation link &amp; scanable QR code are unlocked upon confirmed appointment.
                  </span>
                  {onOpenLocationQRModal && (
                    <button
                      onClick={onOpenLocationQRModal}
                      className="self-start mt-0.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FCEBEE] text-[#8B3A56] hover:bg-[#8B3A56] hover:text-white transition-colors cursor-pointer border border-[#F3B8C3]"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>View Confirmed Location &amp; QR Code</span>
                    </button>
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#8B3A56] shrink-0 mt-0.5" />
                <span>
                  <strong>Availability:</strong> Sunday &amp; Monday ({settings.openingTime} – {settings.closingTime})
                  <br />
                  <span className="text-xs text-[#7A6E74]">Estimated 3–4 hours per meticulous set</span>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Instagram className="w-4 h-4 text-[#8B3A56] shrink-0" />
                <span>Payment: Cash / G-cash accepted</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#8B3A56] shrink-0" />
                <span>{settings.contactEmail}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Sub-bar */}
        <div className="pt-12 mt-12 border-t border-[#EFE8E9] flex flex-col sm:flex-row items-center justify-between text-xs text-[#7A6E74] gap-4">
          <p>
            &copy; {new Date().getFullYear()} Nails by Vril. All rights reserved. Handcrafted nail artistry.
          </p>
          <p className="flex items-center gap-1">
            Built with <span>Firebase Cloud Firestore &amp; Web Platform</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { usePWAInstall } from './usePWAInstall';
import {
  X,
  Download,
  Smartphone,
  Check,
  Share2,
  PlusSquare,
  Sparkles,
  ExternalLink,
  Laptop,
  CheckCircle2,
  QrCode,
} from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFlutterCode?: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  isOpen,
  onClose,
  onOpenFlutterCode,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://nailsbyvril.com';

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-[#F3B8C3] shadow-2xl space-y-6 relative text-left my-8 animate-in fade-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-[#FAF4F5] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-[#FCEBEE] border border-[#F3B8C3] flex items-center justify-center text-[#8B3A56] shrink-0 shadow-xs">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FAF4F5] border border-[#F3B8C3] text-[10px] font-semibold text-[#8B3A56] uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Mobile &amp; Desktop App</span>
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#231F20]">
              Download Nails by Vril App
            </h3>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#5C5257] leading-relaxed">
          Install the Nails by Vril app directly onto your phone’s home screen for fast booking, appointment reminders, loyalty card tracking, and offline access without needing app store downloads!
        </p>

        {/* 1. Direct Install Button (If supported by Chromium/Android) */}
        {isInstallable && (
          <div className="p-4 rounded-2xl bg-[#FCEBEE] border border-[#F3B8C3] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-left">
              <p className="text-xs font-bold text-[#8B3A56]">One-Tap Direct Install</p>
              <p className="text-[11px] text-[#5C5257]">Ready to install immediately on this device.</p>
            </div>
            <button
              onClick={handleInstallClick}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#8B3A56] hover:bg-[#722A42] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Install Now</span>
            </button>
          </div>
        )}

        {isInstalled && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Nails by Vril is already installed and running on this device!</span>
          </div>
        )}

        {installSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>App successfully installed! You can now launch it from your home screen.</span>
          </div>
        )}

        {/* 2. QR Code to Open on Mobile Device */}
        <div className="bg-[#FAF7F4] p-5 rounded-2xl border border-[#E5D5DA] flex flex-col sm:flex-row items-center gap-5">
          <div className="p-3 bg-white rounded-xl shadow-xs border border-[#EFE8E9] shrink-0">
            <QRCodeSVG
              value={currentUrl}
              size={110}
              bgColor="#ffffff"
              fgColor="#231F20"
              level="M"
              includeMargin={false}
            />
          </div>
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#231F20]">
              <QrCode className="w-4 h-4 text-[#8B3A56]" />
              <span>Scan QR Code on Phone</span>
            </div>
            <p className="text-xs text-[#5C5257] leading-relaxed">
              Scan this with your iPhone or Android camera to instantly open and download the app on your mobile phone.
            </p>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 text-xs text-[#8B3A56] hover:underline font-semibold cursor-pointer pt-1"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ExternalLink className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'App Link Copied!' : 'Copy Direct App Link'}</span>
            </button>
          </div>
        </div>

        {/* 3. Platform Specific Install Guides */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#7A6E74]">
            How to Install on Your Phone:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* iOS Guide */}
            <div className="p-4 rounded-2xl bg-white border border-[#EFE8E9] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#231F20]">
                <Smartphone className="w-4 h-4 text-[#8B3A56]" />
                <span>iPhone / iPad (Safari)</span>
              </div>
              <ol className="text-xs text-[#5C5257] space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>
                  Tap the <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-[#8B3A56]" /> <strong>Share</strong> button in Safari.
                </li>
                <li>
                  Scroll down &amp; tap <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-[#8B3A56]" /> <strong>Add to Home Screen</strong>.
                </li>
                <li>Tap <strong>Add</strong> to finish!</li>
              </ol>
            </div>

            {/* Android Guide */}
            <div className="p-4 rounded-2xl bg-white border border-[#EFE8E9] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#231F20]">
                <Smartphone className="w-4 h-4 text-[#8B3A56]" />
                <span>Android (Chrome)</span>
              </div>
              <ol className="text-xs text-[#5C5257] space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>Tap the <strong>⋮ (3 dots)</strong> menu in Chrome.</li>
                <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                <li>Confirm to download icon!</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer / Mobile Developer Companion Option */}
        {onOpenFlutterCode && (
          <div className="pt-3 border-t border-[#EFE8E9] flex items-center justify-between text-xs text-[#7A6E74]">
            <span>Need native Flutter APK/source code?</span>
            <button
              onClick={() => {
                onClose();
                onOpenFlutterCode();
              }}
              className="text-[#8B3A56] hover:underline font-semibold cursor-pointer"
            >
              View Flutter Companion Project
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

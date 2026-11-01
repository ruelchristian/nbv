import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle2, X } from 'lucide-react';

interface NotificationBannerProps {
  onEnableSuccess?: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ onEnableSuccess }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nbv_notification_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        setPermission(Notification.permission);
      } catch {
        // Notification permission inspection unsupported in current context
      }
    }
  }, []);

  const handleDismissForever = () => {
    setDismissed(true);
    try {
      localStorage.setItem('nbv_notification_banner_dismissed', 'true');
    } catch {
      // Ignore localStorage failure
    }
    setToastMessage('In-app alerts active. You will receive updates directly on this screen.');
  };

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      handleDismissForever();
      return;
    }

    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        new Notification('Nails By Vril Notifications Enabled', {
          body: 'You will receive instant appointment confirmations and schedule updates.',
          icon: '/favicon.ico',
        });
        setToastMessage('Web notifications successfully enabled!');
        onEnableSuccess?.();
      } else {
        handleDismissForever();
      }
    } catch {
      handleDismissForever();
    }
  };

  if (dismissed || permission === 'granted' || permission === 'denied') {
    return (
      <>
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#8B3A56] text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-[#FCEBEE]" />
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 hover:opacity-75 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="bg-[#FCEBEE] border-b border-[#F3B8C3] px-4 py-2 text-xs text-[#8B3A56] transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <Bell className="w-4 h-4 shrink-0 text-[#8B3A56]" />
          <span>
            <strong>Appointment Alerts:</strong> Get instant status updates when your appointment is reviewed. In-app alerts are active by default.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={requestPushPermission}
            className="px-3 py-1 bg-[#8B3A56] hover:bg-[#722A42] text-white rounded-md font-semibold transition-colors shadow-2xs cursor-pointer text-xs"
          >
            Allow Push
          </button>
          <button
            onClick={handleDismissForever}
            className="px-2.5 py-1 text-xs text-[#5C5257] hover:text-[#231F20] hover:bg-[#F3B8C3]/40 rounded-md transition-colors cursor-pointer"
          >
            Use In-App Only
          </button>
          <button
            onClick={handleDismissForever}
            className="p-1 hover:bg-[#F3B8C3]/50 rounded-md transition-colors text-[#8B3A56] cursor-pointer"
            title="Dismiss notification prompt"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

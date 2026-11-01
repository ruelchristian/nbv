import React, { useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { Sparkles, Calendar, User, Shield, Menu, X, LogIn, LogOut, Download } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: { email?: string | null; displayName?: string | null } | null;
  isAdmin: boolean;
  isSigningIn?: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenDownloadModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  isAdmin,
  isSigningIn = false,
  onSignIn,
  onSignOut,
  onOpenDownloadModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'services', label: 'Services & Pricing' },
    { id: 'book', label: 'Book Appointment', highlight: true },
    ...(currentUser ? [{ id: 'customer', label: 'My Bookings', icon: User }] : []),
    ...(currentUser && isAdmin ? [{ id: 'admin', label: 'Owner Portal', icon: Shield, badge: 'Admin' }] : []),
  ];

  return (
    <nav className="sticky top-0 z-40 bg-[#FAF7F4]/90 backdrop-blur-md border-b border-[#EFE8E9] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <button
            onClick={() => onSelectTab('home')}
            className="flex items-center text-left focus:outline-none group cursor-pointer shrink-0"
          >
            <BrandLogo size="md" />
          </button>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1 xl:space-x-2.5">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              if (item.highlight) {
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className="relative ml-2 px-4 xl:px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase text-white bg-[#8B3A56] hover:bg-[#722A42] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3 xl:px-3.5 py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'text-[#8B3A56] font-semibold bg-[#FCEBEE]'
                      : 'text-[#5C5257] hover:text-[#231F20] hover:bg-[#F5EFF1]'
                  }`}
                >
                  {item.icon && <item.icon className="w-4 h-4 text-[#8B3A56]" />}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#8B3A56] text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Download App Button */}
            {onOpenDownloadModal && (
              <button
                onClick={onOpenDownloadModal}
                className="ml-1 px-3 py-2 rounded-lg text-xs font-semibold text-[#8B3A56] bg-white border border-[#F3B8C3] hover:bg-[#FCEBEE] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                title="Download or install Nails by Vril on your phone/PC"
              >
                <Download className="w-3.5 h-3.5 text-[#8B3A56]" />
                <span>Download App</span>
              </button>
            )}

            {/* Auth Button */}
            <div className="pl-2 xl:pl-3 border-l border-[#E5D5DA] flex items-center">
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#8B3A56] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                  <button
                    onClick={onSignOut}
                    title="Sign Out"
                    className="p-2 text-[#7A6E74] hover:text-[#B91C1C] rounded-lg hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onSignIn}
                  disabled={isSigningIn}
                  className="px-3 xl:px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider text-[#8B3A56] border border-[#F3B8C3] hover:bg-[#FCEBEE] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isSigningIn ? 'Connecting...' : 'Sign In'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile & Tablet Menu Button */}
          <div className="flex lg:hidden items-center gap-2 sm:gap-3">
            <button
              onClick={() => onSelectTab('book')}
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold uppercase tracking-wider text-white bg-[#8B3A56] hover:bg-[#722A42] transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Book</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="p-2 rounded-lg text-[#5C5257] hover:text-[#231F20] hover:bg-[#F5EFF1] focus:outline-none cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[#EFE8E9] bg-[#FAF7F4] px-4 sm:px-6 pt-3 pb-5 space-y-1.5 shadow-md">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between ${
                currentTab === item.id
                  ? 'bg-[#FCEBEE] text-[#8B3A56] font-semibold'
                  : 'text-[#5C5257] hover:bg-[#F5EFF1]'
              }`}
            >
              <div className="flex items-center gap-2">
                {item.icon && <item.icon className="w-4 h-4 text-[#8B3A56]" />}
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#8B3A56] text-white">
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {onOpenDownloadModal && (
            <button
              onClick={() => {
                onOpenDownloadModal();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-between text-[#8B3A56] bg-[#FAF4F5] hover:bg-[#FCEBEE] border border-[#F3B8C3]"
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#8B3A56]" />
                <span>Download Mobile App (PWA)</span>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#8B3A56] text-white">
                Install
              </span>
            </button>
          )}

          <div className="pt-3 border-t border-[#EFE8E9] flex items-center justify-between">
            {currentUser ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-[#5C5257] truncate">{currentUser.email}</span>
                <button
                  onClick={onSignOut}
                  className="px-3 py-1 text-xs font-semibold text-[#B91C1C] bg-[#FEE2E2] rounded-md"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                disabled={isSigningIn}
                onClick={() => {
                  onSignIn();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2 text-center text-xs font-semibold text-[#8B3A56] border border-[#F3B8C3] rounded-lg bg-[#FCEBEE] disabled:opacity-50"
              >
                {isSigningIn ? 'Connecting to Google...' : 'Sign In with Google'}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

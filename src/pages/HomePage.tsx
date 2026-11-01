import React from 'react';
import { Service, BusinessSettings } from '../types';
import {
  NAIL_ART_GALLERY_STYLES,
  AFTER_CARE_TIPS,
  FREE_PERKS_INFO,
  BOOKING_POLICY,
} from '../services/seedData';
import {
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  Shield,
  Coffee,
  Gift,
  Heart,
  Droplets,
  Hand,
  Ban,
  CheckCircle2,
  MapPin,
  ExternalLink,
  Star,
  Users,
} from 'lucide-react';

export interface HomePageProps {
  services: Service[];
  settings: BusinessSettings;
  onNavigate: (tab: string, service?: Service) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  services,
  settings,
  onNavigate,
}) => {
  const iconMap: Record<string, React.ReactNode> = {
    droplets: <Droplets className="w-5 h-5 text-[#8B3A56]" />,
    shield: <Shield className="w-5 h-5 text-[#8B3A56]" />,
    sparkles: <Sparkles className="w-5 h-5 text-[#8B3A56]" />,
    hand: <Hand className="w-5 h-5 text-[#8B3A56]" />,
    ban: <Ban className="w-5 h-5 text-[#8B3A56]" />,
    heart: <Heart className="w-5 h-5 text-[#8B3A56]" />,
  };

  return (
    <div className="space-y-20 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-14 lg:py-20 bg-linear-to-b from-[#FFF9F6] via-[#FAF7F4] to-[#FAF7F4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headlines & CTA */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FCEBEE] border border-[#F3B8C3] text-[#8B3A56] text-xs font-semibold tracking-wide shadow-2xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pasig City • Handcrafted Nail Studio</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-[#231F20] tracking-tight leading-[1.12]">
                Elevated Nail Artistry &amp; Gentle Builder Gel
              </h1>

              <p className="text-base sm:text-lg text-[#5C5257] max-w-xl font-normal leading-relaxed">
                Handcrafted nail enhancements, structured BIAB overlays, and bespoke aesthetic designs in Pasig. Enjoy complimentary drinks, a relaxed 1-on-1 private studio environment, and our 1-week free repair guarantee.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => onNavigate('book')}
                  className="px-7 py-3.5 rounded-full text-sm font-semibold tracking-wide uppercase text-white bg-[#8B3A56] hover:bg-[#722A42] transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Appointment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onNavigate('services')}
                  className="px-6 py-3.5 rounded-full text-sm font-semibold tracking-wide text-[#8B3A56] bg-white border border-[#F3B8C3] hover:bg-[#FCEBEE] transition-all shadow-2xs cursor-pointer"
                >
                  View Price List
                </button>

                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7A6E74] hover:text-[#8B3A56] transition-colors px-2 py-1"
                >
                  <span>{settings.instagramHandle}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Quick Trust Badges */}
              <div className="pt-6 border-t border-[#EFE8E9] grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-[#5C5257]">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#8B3A56] shrink-0" />
                  <span>1-Week Free Repair</span>
                </div>
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-[#8B3A56] shrink-0" />
                  <span>Free Iced Drink</span>
                </div>
                <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                  <CheckCircle2 className="w-4 h-4 text-[#8B3A56] shrink-0" />
                  <span>Cash &amp; G-cash Accepted</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Cards */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-md">
                {/* Decorative glow */}
                <div className="absolute -inset-4 bg-linear-to-r from-[#FCEBEE] to-[#FFF1F2] rounded-3xl blur-xl opacity-70 -z-10" />

                {/* Primary Card */}
                <div className="bg-white rounded-3xl p-4 shadow-xl border border-[#F3B8C3] overflow-hidden">
                  <div className="aspect-4/3 rounded-2xl overflow-hidden relative group">
                    <img
                      src="/assets/aistudio/c2bc59fd-5a9d-43d1-a095-9f860a58046d_8491a260.jpeg"
                      alt="Nails by Vril Handcrafted Nails"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                      <div className="text-white">
                        <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#8B3A56] px-2 py-0.5 rounded-full">
                          Featured Set
                        </span>
                        <p className="font-serif text-lg font-semibold mt-1">Hardgel &amp; BIAB Overlay</p>
                        <p className="text-xs text-gray-200">Starting at ₱499 (Final ₱550–₱650)</p>
                      </div>
                    </div>
                  </div>

                  {/* Floating badge bottom */}
                  <div className="mt-4 p-3 rounded-xl bg-[#FAF7F4] border border-[#EFE8E9] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#8B3A56] text-white flex items-center justify-center font-serif text-xs font-bold">
                        V
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#231F20]">Private Sessions</p>
                        <p className="text-[11px] text-[#7A6E74]">Sundays &amp; Mondays Only</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('book')}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-[#8B3A56] hover:bg-[#722A42] transition-colors"
                    >
                      Book Slot
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. VALUE PROPOSITION / PERKS BAR */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: 1-Week Free Repair */}
          <div className="bg-white rounded-3xl p-6 border border-[#EFE8E9] hover:border-[#F3B8C3] transition-all shadow-2xs space-y-3 text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#FCEBEE] text-[#8B3A56] flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#231F20]">
              1-Week Free Repair
            </h3>
            <p className="text-xs text-[#5C5257] leading-relaxed">
              If your set lifts or chips within 7 days, we repair it completely free of charge. Your nail health and satisfaction are always guaranteed.
            </p>
          </div>

          {/* Card 2: Free Complimentary Drink */}
          <div className="bg-white rounded-3xl p-6 border border-[#EFE8E9] hover:border-[#F3B8C3] transition-all shadow-2xs space-y-3 text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#FCEBEE] text-[#8B3A56] flex items-center justify-center">
              <Coffee className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#231F20]">
              Complimentary Drink
            </h3>
            <p className="text-xs text-[#5C5257] leading-relaxed">
              Every in-studio appointment includes a free refreshing iced beverage to sip on while your nails are carefully groomed and pampered.
            </p>
          </div>

          {/* Card 3: Loyalty Program */}
          <div className="bg-white rounded-3xl p-6 border border-[#EFE8E9] hover:border-[#F3B8C3] transition-all shadow-2xs space-y-3 text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#FCEBEE] text-[#8B3A56] flex items-center justify-center">
              <Gift className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#231F20]">
              Loyalty Rewards
            </h3>
            <p className="text-xs text-[#5C5257] leading-relaxed">
              Collect digital stamps on every visit! Enjoy <strong>20% OFF</strong> on your 5th session and a <strong>FREE NAIL SET</strong> on your 10th visit.
            </p>
          </div>
        </div>
      </section>

      {/* 3. CORE SERVICES CATALOG */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-left">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#8B3A56]">
              Transparent Salon Pricing
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#231F20] mt-1">
              Popular Services
            </h2>
          </div>
          <button
            onClick={() => onNavigate('services')}
            className="text-xs font-semibold text-[#8B3A56] hover:text-[#722A42] flex items-center gap-1.5 group cursor-pointer self-start sm:self-auto"
          >
            <span>Browse Full Price List</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-3xl border border-[#EFE8E9] hover:border-[#F3B8C3] transition-all shadow-2xs hover:shadow-md flex flex-col justify-between p-5 text-left group"
            >
              <div className="space-y-4">
                <div className="aspect-4/3 rounded-2xl overflow-hidden bg-gray-100 relative">
                  <img
                    src={service.imageUrl || '/assets/aistudio/c2bc59fd-5a9d-43d1-a095-9f860a58046d_8491a260.jpeg'}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{service.durationMinutes} min</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-serif text-lg font-bold text-[#231F20] group-hover:text-[#8B3A56] transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-xs text-[#7A6E74] mt-1 line-clamp-3 leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#FAF4F5] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A6E74]">From</span>
                  <p className="font-serif text-xl font-bold text-[#8B3A56]">
                    ₱{service.price}
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('book', service)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-white bg-[#8B3A56] hover:bg-[#722A42] transition-colors shadow-2xs cursor-pointer"
                >
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. NAIL ART STYLES SHOWCASE */}
      <section className="bg-linear-to-b from-[#FFF9F6] to-[#FAF7F4] py-16 border-y border-[#EFE8E9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#8B3A56]">
              Overlay &amp; Extension Options
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#231F20]">
              Nail Art Gallery &amp; Length Guide
            </h2>
            <p className="text-xs sm:text-sm text-[#5C5257]">
              Choose your preferred extension length and builder overlay. Final price varies depending on chosen 3D charms, gems, and hand-painted art.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {NAIL_ART_GALLERY_STYLES.map((style) => (
              <div
                key={style.id}
                className="bg-white rounded-3xl p-5 border border-[#F3B8C3] shadow-xs flex flex-col justify-between text-left"
              >
                <div className="space-y-3">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100">
                    <img
                      src={style.imageUrl}
                      alt={style.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-[#8B3A56] uppercase tracking-wider">
                      {style.category}
                    </span>
                    <h3 className="font-serif text-base font-bold text-[#231F20] mt-0.5">
                      {style.name}
                    </h3>
                    <p className="text-xs text-[#5C5257] mt-1 leading-relaxed">
                      {style.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#FAF4F5] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#7A6E74] block">Price Range</span>
                    <span className="text-sm font-bold text-[#8B3A56]">
                      {style.finalPriceRange}
                    </span>
                  </div>
                  <button
                    onClick={() => onNavigate('book')}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#8B3A56] border border-[#F3B8C3] hover:bg-[#FCEBEE] transition-colors cursor-pointer"
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. AFTERCARE & STUDIO POLICIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Aftercare Tips */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#8B3A56]">
                Longevity &amp; Care
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#231F20] mt-1">
                Nail Aftercare Tips
              </h2>
              <p className="text-xs text-[#5C5257] mt-1">
                Keep your overlays and extensions healthy and lasting 4+ weeks with proper daily care.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {AFTER_CARE_TIPS.map((tip, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-4 border border-[#EFE8E9] flex items-start gap-3.5 shadow-2xs"
                >
                  <div className="p-2 rounded-xl bg-[#FAF4F5] shrink-0 mt-0.5">
                    {iconMap[tip.icon] || <Sparkles className="w-5 h-5 text-[#8B3A56]" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#231F20]">{tip.title}</h4>
                    <p className="text-[11px] text-[#7A6E74] mt-0.5 leading-relaxed">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Studio Policies & Location Box */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="bg-linear-to-br from-[#FFF9F6] via-white to-[#FCEBEE] rounded-3xl p-6 sm:p-7 border border-[#F3B8C3] shadow-xs space-y-5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#8B3A56] uppercase tracking-wider bg-white px-2.5 py-0.5 rounded-full border border-[#F3B8C3]">
                  Important Booking Policies
                </span>
                <h3 className="font-serif text-xl font-bold text-[#231F20] pt-1">
                  Studio Guidelines &amp; Hours
                </h3>
              </div>

              <div className="space-y-3 text-xs text-[#5C5257]">
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-[#8B3A56] shrink-0 mt-0.5" />
                  <div>
                    <strong>Working Days:</strong> Sundays &amp; Mondays (9:00 AM – 8:00 PM)
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#8B3A56] shrink-0 mt-0.5" />
                  <div>
                    <strong>Location:</strong> Pasig, Metro Manila (exact drop-off address unlocked upon booking confirmation)
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#8B3A56] shrink-0 mt-0.5" />
                  <div>
                    <strong>Artist Note:</strong> Beginner nail artist. Estimated time per set: 3–4 hours.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Users className="w-4 h-4 text-[#8B3A56] shrink-0 mt-0.5" />
                  <div>
                    <strong>Home Service:</strong> 1 to 4 persons in Pasig. ₱250/person fee + Move It fare.
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onNavigate('book')}
                  className="w-full py-3 rounded-full text-xs font-semibold uppercase tracking-wider text-white bg-[#8B3A56] hover:bg-[#722A42] transition-colors shadow-xs text-center cursor-pointer"
                >
                  Book Your Preferred Slot
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BOTTOM CTA CALLOUT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#231F20] text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3">
            <span className="text-xs uppercase font-semibold tracking-widest text-[#F3B8C3]">
              Private Appointments Available
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
              Ready for Your Dream Nail Set?
            </h2>
            <p className="text-sm text-gray-300">
              Slots fill quickly on Sundays and Mondays. Choose your preferred time and submit your inspiration photo today.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('book')}
              className="px-8 py-3.5 rounded-full text-sm font-semibold uppercase tracking-wider text-[#231F20] bg-white hover:bg-gray-100 transition-colors shadow-md cursor-pointer"
            >
              Reserve an Appointment
            </button>
            <button
              onClick={() => onNavigate('services')}
              className="px-6 py-3.5 rounded-full text-sm font-semibold tracking-wide text-white border border-gray-600 hover:border-gray-400 transition-colors cursor-pointer"
            >
              View All Services
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

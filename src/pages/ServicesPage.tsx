import React, { useState } from 'react';
import { Service } from '../types';
import { AFTER_CARE_TIPS, FREE_PERKS_INFO, HOME_SERVICE_POLICY } from '../services/seedData';
import {
  Search,
  Clock,
  ArrowRight,
  Sparkles,
  Gift,
  Coffee,
  Home,
  CheckCircle2,
  Shield,
  Droplets,
  Heart,
  Ban,
  Hand,
} from 'lucide-react';

interface ServicesPageProps {
  services: Service[];
  onBookService: (service: Service) => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({
  services,
  onBookService,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    'All',
    'In-Studio',
    'Home Service',
    'Repair & Removal',
  ];

  const filteredServices = services.filter((service) => {
    const matchesCategory =
      selectedCategory === 'All' ||
      (selectedCategory === 'In-Studio' && (service.name.toLowerCase().includes('in-studio') || service.category === 'In-Studio')) ||
      (selectedCategory === 'Home Service' && (service.name.toLowerCase().includes('home service') || service.category === 'Home Service')) ||
      (selectedCategory === 'Repair & Removal' && (service.name.toLowerCase().includes('repair') || service.name.toLowerCase().includes('removal')));
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* 1. Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#8B3A56]">
          Pasig City • Sunday &amp; Monday Availability
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#231F20]">
          Services &amp; Price List
        </h1>
        <p className="text-sm text-[#5C5257]">
          Explore our handcrafted nail treatments, extension lengths, overlays, and home service. Transparent pricing with Cash and G-cash accepted.
        </p>
      </div>

      {/* 2. Official Visual Price List Banners (Both Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Price List 1: Hardgel, BIAB & Short Extensions */}
        <div className="bg-linear-to-br from-[#FAF4F5] via-[#FFF9F6] to-[#FAF4F5] p-6 rounded-3xl border border-[#F3B8C3] flex flex-col sm:flex-row items-center gap-6 shadow-xs text-left">
          <div className="w-full sm:w-44 h-56 rounded-2xl overflow-hidden shrink-0 shadow-md border-2 border-white bg-gray-100">
            <img
              src="/assets/aistudio/c2bc59fd-5a9d-43d1-a095-9f860a58046d_8491a260.jpeg"
              alt="Hardgel, BIAB and Short Extensions Price List"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#8B3A56] text-white uppercase tracking-wider">
              Price List 1
            </span>
            <h3 className="font-serif text-xl font-bold text-[#231F20]">
              Hardgel, BIAB &amp; Short Extensions
            </h3>
            <div className="text-xs text-[#5C5257] space-y-1 leading-relaxed">
              <p><strong>Hardgel &amp; BIAB:</strong> ₱499 base (Final: ₱550–₱650)</p>
              <p><strong>Short Extensions:</strong> ₱499 base (Final: ₱550–₱650)</p>
              <p className="text-[11px] text-[#7A6E74] italic pt-1">
                A durable overlay or natural-looking extension for a clean and polished finish.
              </p>
            </div>
          </div>
        </div>

        {/* Price List 2: Medium & Extra Long Extensions */}
        <div className="bg-linear-to-br from-[#FAF4F5] via-[#FFF9F6] to-[#FAF4F5] p-6 rounded-3xl border border-[#F3B8C3] flex flex-col sm:flex-row items-center gap-6 shadow-xs text-left">
          <div className="w-full sm:w-44 h-56 rounded-2xl overflow-hidden shrink-0 shadow-md border-2 border-white bg-gray-100">
            <img
              src="/assets/aistudio/e6ce31b6-db23-4301-a29a-f6f767cf4641_b5dc29b2.jpeg"
              alt="Medium and Extra Long Extensions Price List"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#8B3A56] text-white uppercase tracking-wider">
              Price List 2
            </span>
            <h3 className="font-serif text-xl font-bold text-[#231F20]">
              Medium &amp; Extra Long Extensions
            </h3>
            <div className="text-xs text-[#5C5257] space-y-1 leading-relaxed">
              <p><strong>Medium Extensions:</strong> ₱599 base (Final: ₱650–₱750)</p>
              <p><strong>Extra Long Extensions:</strong> ₱699 base (Final: ₱750–₱850)</p>
              <p className="text-[11px] text-[#7A6E74] italic pt-1">
                Sculpted length and custom glamour designed to your art inspiration.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter and Search Controls */}
      <div className="flex flex-col gap-3 bg-white p-4 rounded-2xl border border-[#EFE8E9] shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Category Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-[#8B3A56] text-white shadow-2xs'
                    : 'bg-[#FAF7F4] text-[#5C5257] hover:bg-[#FCEBEE] hover:text-[#8B3A56]'
                }`}
              >
                {cat === "Nails by Vril's Studio" && <span>🏠</span>}
                <span>{cat}</span>
                {cat === "Nails by Vril's Studio" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#8B3A56]/15 text-[#8B3A56] font-bold uppercase tracking-wider group-data-[active=true]:bg-white/20">
                    Studio Visit
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#7A6E74] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search treatments..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#E5D5DA] focus:outline-none focus:border-[#8B3A56] bg-[#FAF7F4]"
            />
          </div>
        </div>

        {selectedCategory === "Nails by Vril's Studio" && (
          <div className="pt-2 border-t border-[#EFE8E9] flex items-center justify-between gap-2 text-xs text-[#8B3A56] bg-[#FFF9F6] p-2.5 rounded-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8B3A56] shrink-0" />
              <span>
                <strong>Studio Visit Choice:</strong> Client visits Nails by Vril's private studio in Pasig City. Complimentary iced drink included with every set, full professional equipment &amp; zero travel fee!
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#EFE8E9] p-8">
          <p className="font-serif text-xl font-medium text-[#231F20]">No services found</p>
          <p className="text-xs text-[#7A6E74] mt-1">Try modifying your search query or selected category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col text-left ${
                service.isActive
                  ? 'border-[#EFE8E9] hover:border-[#F3B8C3] hover:shadow-xl'
                  : 'border-dashed border-gray-300 opacity-60'
              }`}
            >
              {/* Image Frame */}
              <div className="relative h-60 bg-gray-100 overflow-hidden">
                <img
                  src={service.imageUrl}
                  alt={service.name}
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/95 text-[#8B3A56] shadow-xs">
                  {service.category}
                </span>
                <span className="absolute bottom-3 right-3 px-3 py-1 rounded-lg text-sm font-bold bg-[#8B3A56] text-white shadow-xs">
                  {service.price > 0 ? `₱${service.price.toLocaleString()} Base` : 'FREE'}
                </span>
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#231F20]">
                    {service.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#7A6E74] mt-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#8B3A56]" />
                    <span>Duration: ~{service.durationMinutes / 60} hours</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#5C5257] mt-3 leading-relaxed">
                    {service.description}
                  </p>
                </div>

                {service.isActive ? (
                  <button
                    onClick={() => onBookService(service)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-[#8B3A56] hover:bg-[#722A42] transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer mt-4"
                  >
                    <span>Reserve Time Slot</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="w-full py-2 px-4 rounded-xl text-center text-xs font-medium text-gray-500 bg-gray-100">
                    Currently Unavailable
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Free Perks Showcase */}
      <div className="bg-[#FFF9F6] p-8 rounded-3xl border border-[#F3B8C3] grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-left">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B3A56] text-white text-xs font-semibold uppercase">
            <Gift className="w-3.5 h-3.5" />
            <span>Complimentary With Every Set</span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-[#231F20]">
            Complimentary Free Drink &amp; Loyalty Card
          </h3>
          <p className="text-sm text-[#5C5257]">
            Every appointment comes with a cold refreshing complimentary drink and your personal stamp card:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-[#231F20]">
            <li className="flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#8B3A56]" />
              <strong>Free Drink:</strong> Served chilled during your session.
            </li>
            <li className="flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#8B3A56]" />
              <strong>5th Visit:</strong> 20% OFF your nail set!
            </li>
            <li className="flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#8B3A56]" />
              <strong>10th Visit:</strong> 100% FREE Nail Set!
            </li>
          </ul>
        </div>
        <div className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-md border-2 border-white aspect-4/5">
          <img
            src="/assets/aistudio/eefb0564-d7a9-4425-a706-16a47e801838_d4d614c3.jpeg"
            alt="Nails by Vril Free Drink and Loyalty Card"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* 6. After Care Nail Tips Quick Reference */}
      <div className="border-t border-[#EFE8E9] pt-12 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h3 className="font-serif text-2xl font-bold text-[#231F20]">
            After Care Nail Tips
          </h3>
          <p className="text-xs sm:text-sm text-[#5C5257]">
            Keep your nails looking fresh and protected with our client aftercare guidelines:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
          {AFTER_CARE_TIPS.map((tip, idx) => (
            <div key={idx} className="bg-white p-5 rounded-xl border border-[#EFE8E9] space-y-1.5 shadow-2xs">
              <p className="font-serif font-bold text-sm text-[#8B3A56]">{tip.title}</p>
              <p className="text-xs text-[#5C5257] leading-relaxed">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

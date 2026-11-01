import { Service, BusinessSettings, NailStyleOption } from '../types';

export const NAIL_ART_GALLERY_STYLES: NailStyleOption[] = [
  {
    id: 'style-hardgel-biab',
    name: 'Hardgel & BIAB Overlay',
    category: 'Overlays',
    basePrice: 499,
    finalPriceRange: '₱550–₱650',
    durationMinutes: 150,
    imageUrl: '/assets/aistudio/c2bc59fd-5a9d-43d1-a095-9f860a58046d_8491a260.jpeg',
    description: 'A durable overlay for natural nails for a clean and polished finish. Ideal for nail strength and mindful growth.',
  },
  {
    id: 'style-short-ext',
    name: 'Short Nail Extensions',
    category: 'Extensions',
    basePrice: 499,
    finalPriceRange: '₱550–₱650',
    durationMinutes: 180,
    imageUrl: '/assets/aistudio/c2bc59fd-5a9d-43d1-a095-9f860a58046d_8491a260.jpeg',
    description: 'Natural-looking extensions for a clean, chic, and polished look. Perfect for everyday wear.',
  },
  {
    id: 'style-medium-ext',
    name: 'Medium Nail Extensions',
    category: 'Extensions',
    basePrice: 599,
    finalPriceRange: '₱650–₱750',
    durationMinutes: 180,
    imageUrl: '/assets/aistudio/e6ce31b6-db23-4301-a29a-f6f767cf4641_b5dc29b2.jpeg',
    description: 'Elegant medium-length extensions with a polished finish and balanced proportions.',
  },
  {
    id: 'style-xl-ext',
    name: 'Extra Long Nail Extensions',
    category: 'Extensions',
    basePrice: 699,
    finalPriceRange: '₱750–₱850',
    durationMinutes: 210,
    imageUrl: '/assets/aistudio/e6ce31b6-db23-4301-a29a-f6f767cf4641_b5dc29b2.jpeg',
    description: 'Bold extra-long extensions sculpted for glamorous, statement-making nail art with charms and sculpting.',
  },
];

export const INITIAL_SERVICES: Omit<Service, 'id'>[] = [
  {
    name: 'In-Studio',
    description: "Visit Nails by Vril's studio in Pasig, Metro Manila for a personalized 1-on-1 nail session. Choose your preferred nail styles from our gallery. Includes complimentary iced drink, full charm collection, and 1-week free repair guarantee.",
    price: 499,
    durationMinutes: 180, // 3 hours
    category: 'In-Studio',
    imageUrl: '/assets/aistudio/c2bc59fd-5a9d-43d1-a095-9f860a58046d_8491a260.jpeg',
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Home Service',
    description: 'On-site mobile nail session in Pasig, Metro Manila for 1 to 4 people per appointment. Home service fee is ₱250 per person + current Move It transportation fare. Clean, stable table workspace required.',
    price: 250,
    durationMinutes: 240, // 4 hours
    category: 'Home Service',
    imageUrl: '/assets/aistudio/76079cbd-5af2-472a-b7a1-fb490fdb5cae__1__90e9413d.jpeg',
    isActive: true,
    isFeatured: true,
  },
  {
    name: '1-Week Free Repair',
    description: 'Complimentary free touch-up and repairs for lifting or easy removal within 1 week of your session. We ensure your nails stay flawless, healthy, and protected!',
    price: 0,
    durationMinutes: 30,
    category: 'Repair & Care',
    imageUrl: '/assets/aistudio/eefb0564-d7a9-4425-a706-16a47e801838_d4d614c3.jpeg',
    isActive: true,
    isFeatured: false,
  },
  {
    name: 'Nail Removal',
    description: 'Professional, gentle removal of gel overlays or extensions. Starting price is ₱100 for 10 nails. Final price depends on nail length, product type (hard gel, BIAB, acrylic), and removal difficulty.',
    price: 100,
    durationMinutes: 45,
    category: 'Removal',
    imageUrl: '/assets/aistudio/eefb0564-d7a9-4425-a706-16a47e801838_d4d614c3.jpeg',
    isActive: true,
    isFeatured: false,
  },
];

export const DEFAULT_SERVICES: Service[] = INITIAL_SERVICES.map((s, idx) => ({
  ...s,
  id: `srv-${idx + 1}`,
}));

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessName: 'Nails by Vril',
  tagline: 'Handcrafted Nail Artistry & Extensions • Pasig, Metro Manila',
  instagramHandle: '@nailsby.vril',
  instagramUrl: 'https://www.instagram.com/nailsby.vril',
  contactPhone: 'DM on Instagram @nailsby.vril',
  contactEmail: 'contact.nailsbyvril@gmail.com',
  location: 'Pasig, Metro Manila',
  googleMapsUrl: 'https://maps.app.goo.gl/P39FX7dVpXAs32MCA',
  openingTime: '09:00 AM',
  closingTime: '08:00 PM',
  slotIntervalMinutes: 210, // 3.5 hours per appointment
  homeServiceEnabled: true,
  homeServiceNotice: 'Home service available for 1 to 4 clients in Pasig, Metro Manila. ₱250/person fee + Move It fare. Clean, stable workspace required.',
  blockedDates: [],
  workingDays: [0, 1], // Appointments scheduled exclusively on Sundays (0) & Mondays (1) by default; owner can customize
  customAvailableDates: [], // Specific dates explicitly enabled as available by owner
};

export const SAMPLE_INSPIRATIONS = [
  {
    id: 'inspo-1',
    title: 'Hardgel & BIAB Overlay with Clean Polish',
    imageUrl: '/assets/aistudio/c2bc59fd-5a9d-43d1-a095-9f860a58046d_8491a260.jpeg',
    tags: ['Hardgel & BIAB', '₱499-₱650', 'Durable Overlay'],
  },
  {
    id: 'inspo-2',
    title: 'Short Nail Extensions Natural Look',
    imageUrl: '/assets/aistudio/c2bc59fd-5a9d-43d1-a095-9f860a58046d_8491a260.jpeg',
    tags: ['Short Extensions', '₱499-₱650', 'Clean & Polished'],
  },
  {
    id: 'inspo-3',
    title: 'Medium Extensions with Polished Finish',
    imageUrl: '/assets/aistudio/e6ce31b6-db23-4301-a29a-f6f767cf4641_b5dc29b2.jpeg',
    tags: ['Medium Extensions', '₱599-₱750', 'Polished Finish'],
  },
  {
    id: 'inspo-4',
    title: 'Extra Long Extensions Glamour Art',
    imageUrl: '/assets/aistudio/e6ce31b6-db23-4301-a29a-f6f767cf4641_b5dc29b2.jpeg',
    tags: ['Extra Long', '₱699-₱850', 'Glamorous'],
  },
];

export const AFTER_CARE_TIPS = [
  {
    title: 'Avoid Water & Heat for 24 Hours',
    desc: 'No hot showers, saunas, or dishwashing immediately after your set to let adhesives fully cure.',
    icon: 'droplets',
  },
  {
    title: 'Be Gentle — Don’t Use Nails as Tools',
    desc: 'Never use your extensions to open cans, peel stickers, or pry objects.',
    icon: 'shield',
  },
  {
    title: 'Apply Cuticle Oil Daily',
    desc: 'Keep your cuticles and nail plates hydrated and supple for lasting retention.',
    icon: 'sparkles',
  },
  {
    title: 'Wear Gloves for Chores',
    desc: 'Protect your extensions from abrasive household cleaning chemicals and detergents.',
    icon: 'hand',
  },
  {
    title: 'No Picking or Peeling',
    desc: 'Never peel off lifted tips. Book a gentle removal or request our 1-week free repair.',
    icon: 'ban',
  },
  {
    title: '1-Week Free Repair Guarantee',
    desc: 'If your nails lift or have any issues within 1 week, message Vril for a free repair!',
    icon: 'heart',
  },
];

export const FREE_PERKS_INFO = {
  freeDrink: {
    title: 'Free Complimentary Drink',
    description: 'Enjoy a refreshing iced drink with every in-studio appointment.',
    imageUrl: '/assets/aistudio/eefb0564-d7a9-4425-a706-16a47e801838_d4d614c3.jpeg',
  },
  loyaltyRewards: {
    title: 'Nails by Vril Loyalty Card',
    description: 'Get stamped on every visit! 5th visit earns 20% OFF, and your 10th visit earns a FREE nail set.',
    fifthVisit: '20% OFF your nail set',
    tenthVisit: 'FREE Nail Set',
    imageUrl: '/assets/aistudio/eefb0564-d7a9-4425-a706-16a47e801838_d4d614c3.jpeg',
  },
};

export const HOME_SERVICE_POLICY = {
  minimumBooking: '2–4 clients required for home service bookings.',
  homeServiceFee: '₱250 per person',
  transportationFee: 'Based on current Move It fare to your location',
  workspaceRequirement: 'Please provide a clean, stable table or suitable workspace.',
  groupReadiness: 'Group booking requirement: Everyone must be ready at the scheduled time.',
};

export const BOOKING_POLICY = {
  availabilityDays: 'Sunday and Monday',
  location: 'Pasig City (exact address sent via DM after confirmation)',
  paymentMethods: 'Cash / G-cash',
  disclaimer: 'Beginner nail artist. Estimated time per set: 3–4 hours (depending on design).',
  reminders: [
    'Be on time to avoid delays.',
    'If you’re running late, please inform Vril ASAP.',
    'Free repairs for lifting or easy removal within 1 week!',
  ],
};


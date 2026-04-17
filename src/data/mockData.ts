import { DemoListing, DemoNotification, DemoPlan, UserProfile } from '../types';

export const restaurantProfile: UserProfile = {
  name: 'Kim Wilson',
  organization: 'Saveful Bakery Collective',
  address: '12 Chapel Street, Fitzroy VIC',
  verificationStatus: 'Verified',
  phone: '+61 410 222 111',
};

export const charityProfile: UserProfile = {
  name: 'Rutherford Walter',
  organization: 'Northside Food Relief',
  address: '44 Carlton Avenue, Carlton VIC',
  verificationStatus: 'Verified',
  phone: '+61 410 333 222',
};

export const restaurantListings: DemoListing[] = [
  {
    id: 'bakery-items',
    title: 'Bakery Items',
    businessName: 'Saveful Bakery Collective',
    type: 'Bakery',
    suburb: 'Fitzroy',
    quantityKg: 10,
    distance: 'Claimed',
    pickupWindow: '4:15pm - 8:15pm',
    pickupDate: '10/04/2026',
    pickupTime: '4:15pm - 8:15pm',
    status: 'Claimed',
    receiver: 'Food Rescue Org',
    items: [
      { name: 'Sandwiches', quantityKg: 6 },
      { name: 'Muffins', quantityKg: 4 },
    ],
    storage: 'Ready to collect',
  },
  {
    id: 'mixed-produce',
    title: 'Mixed Produce',
    businessName: 'Saveful Bakery Collective',
    type: 'Fresh Produce',
    suburb: 'Fitzroy',
    quantityKg: 8,
    distance: '2.1km away',
    pickupWindow: '5:30pm - 6:00pm',
    pickupDate: '10/04/2026',
    pickupTime: '5:30pm - 6:00pm',
    status: 'Waiting for pickup',
    items: [
      { name: 'Fresh fruit & vegetables', quantityKg: 5 },
      { name: 'Other', quantityKg: 3 },
    ],
    storage: 'Needs refrigeration',
  },
];

export const charityListings: DemoListing[] = [
  {
    id: 'claim-bakery',
    title: 'Bakery Items',
    businessName: 'Saveful Bakery Collective',
    type: 'Cafe',
    suburb: 'Fitzroy',
    quantityKg: 10,
    distance: '1.2km away',
    pickupWindow: '3 - 5pm',
    pickupDate: '10/04/2026',
    pickupTime: '3 - 5pm',
    status: 'Available',
    items: [
      { name: 'Prepared meals', quantityKg: 0 },
      { name: 'Baked goods', quantityKg: 4 },
      { name: 'Fruit & vegetables', quantityKg: 0 },
      { name: 'Meat & dairy', quantityKg: 0 },
    ],
    storage: 'Refrigerated required',
  },
  {
    id: 'claim-produce',
    title: 'Fresh Produce',
    businessName: 'Harvest Cafe',
    type: 'Bakery',
    suburb: 'Richmond',
    quantityKg: 15,
    distance: '2.5km away',
    pickupWindow: '4 - 6pm',
    pickupDate: '10/04/2026',
    pickupTime: '4 - 6pm',
    status: 'Available',
    items: [
      { name: 'Prepared meals', quantityKg: 6 },
      { name: 'Baked goods', quantityKg: 4 },
      { name: 'Fruit & vegetables', quantityKg: 3 },
      { name: 'Meat & dairy', quantityKg: 2 },
    ],
    storage: 'Refrigerated required',
  },
  {
    id: 'prepared-meals',
    title: 'Prepared Meals',
    businessName: 'Market Kitchen',
    type: 'Restaurant',
    suburb: 'Carlton',
    quantityKg: 8,
    distance: '3km away',
    pickupWindow: '5 - 7pm',
    pickupDate: '10/04/2026',
    pickupTime: '5 - 7pm',
    status: 'Partial claimed',
    items: [
      { name: 'Prepared meals', quantityKg: 8 },
    ],
    storage: 'Ready to eat',
  },
];

export const restaurantNotifications: DemoNotification[] = [
  {
    id: 'rest-1',
    title: 'Surplus claimed',
    body: 'Local charity is on the way to collect your bakery listing at 5:15pm.',
    tone: 'restaurant_single',
  },
  {
    id: 'rest-2',
    title: 'Part of your surplus has been claimed',
    body: 'We are still sharing the remaining surplus with nearby charities.',
    tone: 'restaurant_single',
  },
  {
    id: 'rest-3',
    title: 'Pickup confirmed',
    body: 'Collection complete. You have helped good food go further today.',
    tone: 'restaurant_multi',
  },
];

export const charityNotifications: DemoNotification[] = [
  {
    id: 'char-1',
    title: 'Food available near you',
    body: 'Prepared meals ready for collection now. Tap through to claim.',
    tone: 'charity',
  },
  {
    id: 'char-2',
    title: 'Pickup confirmed',
    body: 'You are collecting prepared meals and baked goods from Saveful Bakery Collective.',
    tone: 'charity',
  },
  {
    id: 'char-3',
    title: 'Collection complete',
    body: 'You have helped good food go further today.',
    tone: 'charity',
  },
];

export const plans: DemoPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    monthlyPrice: '$49 / month',
    annualPrice: '$490 / year',
    annualLabel: '2 months free',
    features: ['1 site', 'Up to 2 users', 'List & manage surplus', 'Basic venue-level reporting', 'Monthly summaries', 'Email support'],
  },
  {
    id: 'single-site-plus',
    name: 'Single Site+',
    monthlyPrice: '$69 / month',
    annualPrice: '$690 / year',
    annualLabel: '2 months free',
    features: ['Everything in Basic', '1 site', 'Up to 6 users', 'Advanced reporting dashboard', 'Food type + impact insights', 'Priority support'],
    featured: true,
  },
  {
    id: 'multi-site',
    name: 'Multi-Site',
    monthlyPrice: '$89 / site / month',
    annualPrice: '$890 / year',
    annualLabel: '2 months free',
    features: ['Up to 10 sites', 'Up to 10 users per site', 'Central admin dashboard', 'Cross-site insights + CSV exports', 'Reuse listings', 'Onboarding support'],
  },
  {
    id: 'multi-site-plus',
    name: 'Multi-Site +',
    monthlyPrice: '$79 / site / month',
    annualPrice: '$790 / year',
    annualLabel: '2 months free',
    features: ['More than 10 sites', 'Up to 10 users per site', 'Central admin dashboard', 'Cross-site insights + CSV exports', 'Site comparison & benchmarking', 'Network-wide impact dashboard', 'Dedicated onboarding', 'Account manager support'],
  },
];

export const restaurantImpact = {
  siteAddress: '12 Chapel Street, Fitzroy VIC ',
  todayStatus: 'No active listings',
  snapshot: [
    { label: 'kg saved', value: '200' },
    { label: 'charities supported', value: '50' },
    { label: 'CO2 emissions reduced', value: '90' },
    { label: 'meals created', value: '150' },
    { label: 'total collections', value: '40' },
    { label: 'rated by charities', value: '3/5' },
  ],
};

export const charityImpact = {
  kgCollected: '120kg',
  businessesSupported: '4',
  co2Avoided: '300kg',
  mealsCreated: '500',
  collections: '0',
  rating: '4.9',
};

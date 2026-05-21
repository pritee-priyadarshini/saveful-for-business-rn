import {
  DemoListing,
  DemoNotification,
  UserProfile,
  OrganizationSite,
  UserAccount,
  SubscriptionRecord,
  UserRole,
} from '../types';

export const restaurantProfile: UserProfile = {
  email: 'arjun.mehta@annapurnafoods.in',
  name: 'Arjun Mehta',
  organization: 'Annapurna Foods Pvt Ltd',
  address: 'Bapuji Nagar, Bhubaneswar, Odisha',
  verificationStatus: 'Verified',
  phone: '+91 94370 11223',
};

export const charityProfile: UserProfile = {
  email: 'ritika.das@sevabhojantrust.in',
  name: 'Ritika Das',
  organization: 'Seva Bhojan Trust',
  address: 'Saheed Nagar, Bhubaneswar, Odisha',
  verificationStatus: 'Verified',
  phone: '+91 97761 33445',
};

export const organizationSites: OrganizationSite[] = [
  // RESTAURANT SINGLE 
  {
    id: 'rest_single_1',
    role: 'restaurant_single',
    organizationType: 'restaurant',
    siteType: 'head_office',
    name: 'Taste of Odisha',
    address: 'KIIT Road, Patia, Bhubaneswar, Odisha',
    phone: '+91 91245 12345',
    email: 'contact@tasteofodisha.in',
    managerName: 'Sourav Mishra',
    lat: 20.355,
    lng: 85.819,
    verificationStatus: 'Verified',
    isActive: true,
    createdAt: '2026-04-01',
  },

  // RESTAURANT MULTI HEAD 
  {
    id: 'rest_multi_1',
    role: 'restaurant_multi',
    organizationType: 'restaurant',
    siteType: 'head_office',
    name: 'Annapurna Foods Pvt Ltd',
    address: 'Janpath, Unit 3, Bhubaneswar, Odisha',
    phone: '+91 94370 11223',
    email: 'admin@annapurnafoods.in',
    managerName: 'Arjun Mehta',
    lat: 20.296,
    lng: 85.824,
    verificationStatus: 'Verified',
    isActive: true,
    createdAt: '2026-04-01',
  },

  // RESTAURANT MULTI BRANCHES 
  {
    id: 'rest_branch_1',
    parentId: 'rest_multi_1',
    role: 'restaurant_single',
    organizationType: 'restaurant',
    siteType: 'branch',
    name: 'Annapurna Foods - Patia',
    address: 'Patia Square, Bhubaneswar, Odisha',
    phone: '+91 94370 11224',
    managerName: 'Rahul Nayak',
    verificationStatus: 'Verified',
    isActive: true,
    createdAt: '2026-04-02',
  },
  {
    id: 'rest_branch_2',
    parentId: 'rest_multi_1',
    role: 'restaurant_single',
    organizationType: 'restaurant',
    siteType: 'branch',
    name: 'Annapurna Foods - Cuttack',
    address: 'College Square, Cuttack, Odisha',
    phone: '+91 94370 11225',
    managerName: 'Abhishek Rout',
    verificationStatus: 'Verified',
    isActive: true,
    createdAt: '2026-04-03',
  },

  // CHARITY SINGLE 
  {
    id: 'char_single_1',
    role: 'charity_single',
    organizationType: 'charity',
    siteType: 'head_office',
    name: 'Helping Hands Foundation',
    address: 'Chandrasekharpur, Bhubaneswar, Odisha',
    phone: '+91 98610 33445',
    managerName: 'Pooja Sahu',
    verificationStatus: 'Verified',
    isActive: true,
    createdAt: '2026-04-01',
  },

  // CHARITY MULTI HEAD 
  {
    id: 'char_multi_1',
    role: 'charity_multi',
    organizationType: 'charity',
    siteType: 'head_office',
    name: 'Seva Bhojan Trust',
    address: 'Saheed Nagar, Bhubaneswar, Odisha',
    phone: '+91 97761 33445',
    managerName: 'Ritika Das',
    verificationStatus: 'Verified',
    isActive: true,
    createdAt: '2026-04-01',
  },

  // CHARITY MULTI BRANCHES 
  {
    id: 'char_branch_1',
    parentId: 'char_multi_1',
    role: 'charity_single',
    organizationType: 'charity',
    siteType: 'branch',
    name: 'Seva Bhojan - Puri',
    address: 'Grand Road, Puri, Odisha',
    phone: '+91 97761 33446',
    managerName: 'Sanjay Behera',
    verificationStatus: 'Verified',
    isActive: true,
    createdAt: '2026-04-02',
  },
  {
    id: 'char_branch_2',
    parentId: 'char_multi_1',
    role: 'charity_single',
    organizationType: 'charity',
    siteType: 'branch',
    name: 'Seva Bhojan - Cuttack',
    address: 'Badambadi, Cuttack, Odisha',
    phone: '+91 97761 33447',
    managerName: 'Madhusmita Panda',
    verificationStatus: 'Verified',
    isActive: true,
    createdAt: '2026-04-03',
  },
];

export const users: UserAccount[] = [
  {
    id: 'u1',
    role: 'restaurant_single',
    organizationId: 'rest_single_1',
    name: 'Sourav Mishra',
    email: 'sourav@gmail.com',
    phone: '+91 91245 12345',
    isHeadAdmin: true,
    isActive: true,
    createdAt: '2026-04-01',
  },
  {
    id: 'u2',
    role: 'restaurant_multi',
    organizationId: 'rest_multi_1',
    name: 'Arjun Mehta',
    email: 'arjun@gmail.com',
    phone: '+91 94370 11223',
    isHeadAdmin: true,
    isActive: true,
    createdAt: '2026-04-01',
  },
  {
    id: 'u3',
    role: 'restaurant_single',
    organizationId: 'rest_branch_1',
    name: 'Rahul Nayak',
    email: 'rahul@gmail.com',
    phone: '+91 94370 11224',
    isHeadAdmin: false,
    isActive: true,
    createdAt: '2026-04-02',
  },
  {
    id: 'u4',
    role: 'charity_single',
    organizationId: 'char_single_1',
    name: 'Pooja Sahu',
    email: 'pooja@gmail.com',
    phone: '+91 98610 33445',
    isHeadAdmin: true,
    isActive: true,
    createdAt: '2026-04-01',
  },
  {
    id: 'u5',
    role: 'charity_multi',
    organizationId: 'char_multi_1',
    name: 'Ritika Das',
    email: 'ritika@gmail.com',
    phone: '+91 97761 33445',
    isHeadAdmin: true,
    isActive: true,
    createdAt: '2026-04-01',
  },
];

export const subscriptions: SubscriptionRecord[] = [
  {
    id: 'sub_1',
    organizationId: 'rest_single_1',
    planId: 'single_plus',
    billingCycle: 'monthly',
    isActive: true,
    isFreeTier: false,
    startedAt: '2026-01-10',
    expiresAt: '2026-05-10',
  },

  {
    id: 'sub_2',
    organizationId: 'rest_multi_1',
    planId: 'enterprise',
    billingCycle: 'annual',
    isActive: true,
    isFreeTier: false,
    startedAt: '2026-01-01',
    expiresAt: '2027-01-01',
  },

  {
    id: 'sub_3',
    organizationId: 'char_single_1',
    planId: null,
    billingCycle: null,
    isActive: true,
    isFreeTier: true,
    startedAt: '2026-01-01',
    expiresAt: null,
  },

  {
    id: 'sub_4',
    organizationId: 'char_multi_1',
    planId: null,
    billingCycle: null,
    isActive: true,
    isFreeTier: true,
    startedAt: '2026-01-01',
    expiresAt: null,
  },
];

export const restaurantListings: DemoListing[] = [
  {
    id: '1',
    title: 'Cooked Rice & Dal',
    businessName: 'Taste of Odisha',
    type: 'Restaurant',
    suburb: 'Patia',
    quantityKg: 18,
    distance: 'Claimed',
    pickupWindow: '7pm - 9pm',
    pickupDate: '27/04/2026',
    pickupTime: '7pm - 9pm',
    status: 'Claimed',
    receiver: 'Helping Hands Foundation',
    items: [
      { name: 'Rice', quantityKg: 10 },
      { name: 'Dal', quantityKg: 8 },
    ],
    storage: 'Serve warm',
  },
  {
    id: '2',
    title: 'Bakery & Snacks',
    businessName: 'Annapurna Foods - Patia',
    type: 'Bakery',
    suburb: 'Patia',
    quantityKg: 12,
    distance: '2.4km away',
    pickupWindow: '6pm - 8pm',
    pickupDate: '27/04/2026',
    pickupTime: '6pm - 8pm',
    status: 'Available',
    items: [
      { name: 'Bread', quantityKg: 5 },
      { name: 'Puffs', quantityKg: 4 },
      { name: 'Cake slices', quantityKg: 3 },
    ],
    storage: 'Dry storage',
  },
];

export const charityListings: DemoListing[] = [
  {
    id: '3',
    title: 'Veg Meals',
    businessName: 'Annapurna Foods - Cuttack',
    type: 'Restaurant',
    suburb: 'Cuttack',
    quantityKg: 22,
    distance: '3.1km away',
    pickupWindow: '5pm - 7pm',
    pickupDate: '27/04/2026',
    pickupTime: '5pm - 7pm',
    status: 'Available',
    items: [
      { name: 'Rice', quantityKg: 10 },
      { name: 'Curry', quantityKg: 8 },
      { name: 'Chapati', quantityKg: 4 },
    ],
    storage: 'Hot holding',
  },
  {
    id: '4',
    title: 'Fresh Produce',
    businessName: 'Taste of Odisha',
    type: 'Fresh Produce',
    suburb: 'Bhubaneswar',
    quantityKg: 14,
    distance: '1.7km away',
    pickupWindow: '4pm - 6pm',
    pickupDate: '27/04/2026',
    pickupTime: '4pm - 6pm',
    status: 'Partial claimed',
    items: [
      { name: 'Banana', quantityKg: 5 },
      { name: 'Tomato', quantityKg: 4 },
      { name: 'Potato', quantityKg: 5 },
    ],
    storage: 'Cool & dry',
  },
];

export const restaurantNotifications: DemoNotification[] = [
  {
    id: 'rest1',
    title: 'Food claimed',
    body: 'Seva Bhojan - Puri branch has accepted your listing.',
    tone: 'restaurant_single',
  },
  {
    id: 'rest2',
    title: 'Branch performance',
    body: 'Patia branch donated 48kg food this week.',
    tone: 'restaurant_multi',
  },
];

export const charityNotifications: DemoNotification[] = [
  {
    id: 'char1',
    title: 'Nearby listing available',
    body: 'Fresh cooked meals available 1.7km away.',
    tone: 'charity_single',
  },
  {
    id: 'char2',
    title: 'Branch collected food',
    body: 'Cuttack branch completed pickup successfully.',
    tone: 'charity_multi',
  },
];

export const restaurantImpact = {
  siteAddress: 'Janpath, Bhubaneswar, Odisha',
  todayStatus: '2 active listings',
  snapshot: [
    { label: 'kg saved', value: '1,280' },
    { label: 'charities supported', value: '38' },
    { label: 'CO2 reduced', value: '540' },
    { label: 'meals created', value: '4,900' },
    { label: 'collections', value: '212' },
    { label: 'rating', value: '4.8/5' },
    { label: 'money', value:'$ 8600'}
  ],
};

export const charityImpact = {
  kgCollected: '940kg',
  businessesSupported: '26',
  co2Avoided: '410kg',
  mealsCreated: '3,700',
  collections: '182',
  rating: '4.9',
};

export const demoRoleUsers: Record<UserRole, string> = {
  restaurant_single: 'u1',
  restaurant_multi: 'u2',
  charity_single: 'u4',
  charity_multi: 'u5',
};
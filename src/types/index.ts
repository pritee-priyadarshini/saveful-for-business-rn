export type UserRole = 'restaurant_single'| 'restaurant_multi' | 'charity';
export type ListingStatus = 'Pending' | 'Accepted' | 'Collected' | 'Available' | 'Claimed' | 'Waiting for pickup' | 'Partial claimed';

export type Listing = {
  id: string;
  foodName: string;
  quantity: string;
  pickupWindow: string;
  notes: string;
  status: ListingStatus;
  restaurantName: string;
  charityName?: string;
  address: string;
  distance: string;
  category: string;
};

export type MetricCard = {
  id: string;
  label: string;
  value: string;
  delta: string;
  tone: 'primary' | 'secondary' | 'success';
};

export type DemoListing = {
  id: string;
  title: string;
  businessName: string;
  type: string;
  suburb: string;
  quantityKg: number;
  distance: string;
  pickupWindow: string;
  pickupDate: string;
  pickupTime: string;
  status: ListingStatus | string;
  receiver?: string;
  items: Array<{ name: string; quantityKg: number }>;
  storage: string;
};

export type DemoNotification = {
  id: string;
  title: string;
  body: string;
  tone: UserRole;
};

export type DemoPlan = {
  id: string;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  annualLabel: string;
  features: string[];
  featured?: boolean;
};

export type UserProfile = {
  name: string;
  organization: string;
  address: string;
  verificationStatus: 'Pending' | 'Verified';
  phone: string;
  logo?: string;
};

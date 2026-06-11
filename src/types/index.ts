export type UserRole =
  | 'restaurant_single'
  | 'restaurant_multi'
  | 'charity_single'
  | 'charity_multi'
  | 'farmer';
  

export type OrganizationType = 'restaurant' | 'charity';
export type SiteType = 'head_office' | 'branch';
export type VerificationStatus = 'Pending' | 'Verified';


export type BackendOrgType =
  | 'BUSINESS_SINGLE'
  | 'BUSINESS_MULTI'
  | 'CHARITY_SINGLE'
  | 'CHARITY_MULTI'
  | 'FARMER';

export type BackendVenueType =
  | 'CAFE_RESTAURANT'
  | 'BAKERY'
  | 'GROCERY_STORE'
  | 'FOOD_TRUCK'
  | 'CATERING_SERVICE'
  | 'HOTEL'
  | 'WEDDING_VENUE'
  | 'CLOUD_KITCHEN'
  | 'OTHER';

export type Region = 'IN' | 'US' | 'AU';

export type ListingStatus =
  | 'ACTIVE'
  | 'PARTIAL'
  | 'CLAIMED'
  | 'EXPIRED'
  | 'CANCELLED';

export type OrderStatus =
  | 'awaiting_driver'
  | 'driver_assigned'
  | 'enroute'
  | 'collected'
  | 'verified'
  | 'completed';

export type DriverDeliveryStatus =
  | 'assigned'
  | 'enroute'
  | 'collected'
  | 'arrived'
  | 'verified';

export type DriverDelivery = {
  id: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone: string;
  charityName: string;
  items: {
    name: string;
    quantity: string;
  }[];
  pickupDate: string;
  pickupTime: string;
  notes?: string;
  status: DriverDeliveryStatus;
  lat: number;
  lng: number;
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
  items: {
    name: string;
    quantityKg: number;
  }[];
  storage: string;
};

export type DemoNotification = {
  id: string;
  title: string;
  body: string;
  tone: UserRole;
};

export type SubscriptionRecord = {
  id: string;
  organizationId: string;
  planId: string | null;
  billingCycle: 'monthly' | 'annual' | null;
  isActive: boolean;
  isFreeTier: boolean;
  startedAt: string;
  expiresAt: string | null;
};

export type DemoPlan = {
  id: string;
  name: string;
  tagline?: string;
  badge?: string;
  monthlyPrice: string;
  annualPrice: string;
  annualLabel: string;
  description?: string;
  features: string[];
  cta?: string;
  type?: string;
  featured?: boolean;
};

export type UserProfile = {
  name: string;
  organization: string;
  address: string;
  verificationStatus: VerificationStatus;
  phone: string;
  logo?: string;
  memberSince?: string;
  email: string;
};

/**
 * MAIN BUSINESS / CHARITY ENTITY
 * standalone single:
 *  - head_office
 *  - no parentId
 * multi account:
 *  - head_office
 *  - parent account
 * created site:
 *  - branch
 *  - parentId references multi account
 * Example:
 * charity_multi creates 3 sites
 * -> each site role = charity_single
 * -> each site siteType = branch
 * -> each site manages itself
 */
export type OrganizationSite = {
  id: string;
  /**
   * undefined for standalone / main office
   * populated for child branches
   */
  parentId?: string;
  role: UserRole;
  organizationType: OrganizationType;
  siteType: SiteType;
  name: string;
  address: string;
  phone: string;
  email?: string;
  managerName?: string;
  lat?: number;
  lng?: number;
  verificationStatus: VerificationStatus;
  logo?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
};

/**
 * LOGIN USER
 * multi head admin:
 * isHeadAdmin = true
 * created branch manager:
 * isHeadAdmin = false
 */
export type UserAccount = {
  id: string;
  role: UserRole;
  organizationId: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  isHeadAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type SiteStats = {
  siteId: string;
  totalListings: number;
  completedListings: number;
  pendingListings: number;
  totalKgSaved: number;
  totalMealsServed: number;
  lastActiveAt?: string;
};

export type SiteListing = DemoListing & {
  siteId: string;
  parentOrganizationId?: string;
};

export type SiteDelivery = DriverDelivery & {
  restaurantSiteId: string;
  charitySiteId: string;
};
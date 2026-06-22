import {
  DemoPlan,
  UserProfile,
  UserRole,
} from '../types';

export type RestaurantForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  mobile: string;
  businessName: string;
  businessAddress: string;
  registrationNumber: string;
  venueType: string;
  branding: string;
  logo: string;
  region: string;
  latitude: string;
  longitude: string;
};

export type CharityForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  mobile: string;
  charityName: string;
  charityAddress: string;
  registrationNumber: string;
  branding: string;
  logo: string;
  postcodes: string;
  pickupRadius: string;
  region: string;
  latitude: string;
  longitude: string;
  pickupPostCode: string;
};

export interface FarmerForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  mobile: string;
  businessName: string;
  businessAddress: string;
  venueType: string;
  branding: string;
  logo: string;
  region: string;
  latitude: string;
  longitude: string;
}

export type Subscription = {
  planId: string | null;
  isActive: boolean;
  billingCycle: 'monthly' | 'annual' | null;
  isFreeTier: boolean;
};

export type AuthUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  platformRole: string;
  accessToken: string;
  orgType?: string;
  profile?: any;
  orgRole?: string;
  siteRole?: string;
};

export type RoleFlow = 'producer' | 'consumer';

export type AppContextValue = {
  isAuthenticated: boolean;
  selectedRole: UserRole;
  roleFlow: RoleFlow;
  selectedPlanId: string;
  currentProfile: UserProfile;
  subscription: Subscription;
  currentPlan: DemoPlan | null;
  restaurantForm: RestaurantForm;
  charityForm: CharityForm;
  farmerForm: FarmerForm;
  authUser: AuthUser | null;
  setRole: (role: UserRole) => void;
  setRoleFlow: (flow: RoleFlow) => void;
  selectPlan: (planId: string) => void;
  upgradePlan: (planId: string) => void;
  updateRestaurantField: (
    field: keyof RestaurantForm,
    value: string
  ) => void;
  updateCharityField: (
    field: keyof CharityForm,
    value: string
  ) => void;
  updateFarmerField: (
    field: keyof FarmerForm,
    value: string
  ) => void;
  setAuthUser: (user: AuthUser | null) => void;
  setAuthenticated: (auth: boolean) => void;
  logout: () => void;
  resetForms: () => void;
};
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  organizationSites,
  users,
  subscriptions,
} from '../data/mockData';

import { plansData } from '../data/plansData';

import {
  DemoPlan,
  OrganizationSite,
  UserAccount,
  UserProfile,
  UserRole,
} from '../types';

type RestaurantForm = {
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
};

type CharityForm = {
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
};

type Subscription = {
  planId: string | null;
  isActive: boolean;
  billingCycle: 'monthly' | 'annual' | null;
  isFreeTier: boolean;
};

type AppContextValue = {
  isAuthenticated: boolean;
  selectedRole: UserRole;
  selectedPlanId: string;
  currentUser: UserAccount | null;
  currentSite: OrganizationSite | null;
  childSites: OrganizationSite[];
  currentProfile: UserProfile;
  subscription: Subscription;
  currentPlan: DemoPlan | null;
  restaurantForm: RestaurantForm;
  charityForm: CharityForm;
  setRole: (role: UserRole) => void;
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

  loginDemo: (userId?: string) => void;
  logout: () => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setAuthenticated] = useState(false);

  const [selectedRole, setSelectedRole] = useState<UserRole>('restaurant_single');

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [selectedPlanId, setSelectedPlanId] = useState('single_plus');

  const [manualSubscription, setManualSubscription] =
    useState<Subscription>({
      planId: 'single_plus',
      billingCycle: 'monthly',
      isActive: true,
      isFreeTier: false,
    });

  const [restaurantForm, setRestaurantForm] = useState<RestaurantForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobile: '',
    businessName: '',
    businessAddress: '',
    registrationNumber: '',
    venueType: '',
    branding: '',
    logo: '',
  });

  const [charityForm, setCharityForm] = useState<CharityForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobile: '',
    charityName: '',
    charityAddress: '',
    registrationNumber: '',
    branding: '',
    logo: '',
    postcodes: '',
    pickupRadius: '',
  });

  const value = useMemo<AppContextValue>(() => {
    const currentUser = currentUserId
      ? users.find((u) => u.id === currentUserId) ||
      null
      : null;

    const currentSite = currentUser
      ? organizationSites.find(
        (site) =>
          site.id === currentUser.organizationId
      ) || null
      : null;

    const childSites = currentSite
      ? organizationSites.filter(
        (site) =>
          site.parentId === currentSite.id
      )
      : [];

    const currentProfile: UserProfile = {
      name: currentUser?.name || '',
      organization: currentSite?.name || '',
      address: currentSite?.address || '',
      verificationStatus: currentSite?.verificationStatus || 'Pending',
      phone: currentSite?.phone || '',
      logo: currentUser?.avatar,
    };

    const isCharity = selectedRole.includes('charity');

    let subscription: Subscription;
    if (isCharity) {
      subscription = {
        planId: null,
        billingCycle: null,
        isActive: true,
        isFreeTier: true,
      };
    } else {
      const subscriptionOrgId = currentSite?.parentId || currentSite?.id;

      const existingSubscription = subscriptions.find((sub) =>
        sub.organizationId === subscriptionOrgId
      );

      subscription = existingSubscription
        ? {
          planId: existingSubscription.planId,
          billingCycle: existingSubscription.billingCycle,
          isActive: existingSubscription.isActive,
          isFreeTier: existingSubscription.isFreeTier,
        }
        : manualSubscription;
    }

    const currentPlan =
      plansData.find(
        (plan) => plan.id === subscription.planId 
      ) || null;

    return {
      isAuthenticated,
      selectedRole,
      selectedPlanId,
      currentUser,
      currentSite,
      childSites,
      currentProfile,
      subscription,
      currentPlan,
      restaurantForm,
      charityForm,
      setRole: setSelectedRole,
      selectPlan: setSelectedPlanId,
      upgradePlan: (planId: string) => {
        setManualSubscription((current) => ({
          ...current,
          planId,
        }));
      },

      updateRestaurantField: (field, value) => {
        setRestaurantForm((current) => ({
          ...current,
          [field]: value,
        }));
      },

      updateCharityField: (field, value) => {
        setCharityForm((current) => ({
          ...current,
          [field]: value,
        }));
      },

      loginDemo: (userId?: string) => {
        if (userId) {
          const user =
            users.find(
              (u) => u.id === userId
            ) || null;

          if (user) {
            setCurrentUserId(user.id);
            setSelectedRole(user.role);
          }
        }

        setAuthenticated(true);
      },

      logout: () => {
        setAuthenticated(false);
        setCurrentUserId(null);
        setSelectedRole( 'restaurant_single' );
      },
    };
  }, [
    charityForm,
    currentUserId,
    isAuthenticated,
    manualSubscription,
    restaurantForm,
    selectedPlanId,
    selectedRole,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }

  return context;
}
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';

import { plansData } from '../data/plansData';

import { UserProfile } from '../types';
import {
  AppContextValue,
  AuthUser,
  CharityForm,
  FarmerForm,
  RestaurantForm,
  Subscription,
} from './types';
import { authService } from '../services/auth.service';

const defaultRestaurantForm: RestaurantForm = {
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
  region: '',
  latitude: '',
  longitude: '',
};

const defaultCharityForm: CharityForm = {
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
  region: '',
  latitude: '',
  longitude: '',
  pickupPostCode: '',
};

const defaultFarmerForm: FarmerForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  mobile: '',
  businessName: '',
  businessAddress: '',
  venueType: '',
  branding: '',
  logo: '',
  region: '',
  latitude: '',
  longitude: '',
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'restaurant_single' | 'restaurant_multi' | 'charity_single' | 'charity_multi' | 'farmer' | 'farm_business'>('restaurant_single');
  const [selectedPlanId, setSelectedPlanId] = useState('single_plus');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [restaurantForm, setRestaurantForm] = useState<RestaurantForm>(defaultRestaurantForm);
  const [charityForm, setCharityForm] = useState<CharityForm>(defaultCharityForm);
  const [farmerForm, setFarmerForm] = useState<FarmerForm>(defaultFarmerForm);

  useEffect(() => {
    async function restoreSession() {
      try {
        const token = await SecureStore.getItemAsync('accessToken');
        if (token) {
          const profileRes = await authService.profile();
          const profile = profileRes.data as any;

          setAuthUser({
            ...profile.user,
            accessToken: token,
            orgType: profile.organisation?.type,
            orgRole: profile.role?.orgRole,
            siteRole: profile.role?.siteRole,
            profile: profile,
          });
          setAuthenticated(true);
        }
      } catch (error) {
        console.log('SESSION RESTORE ERROR', error);
        await SecureStore.deleteItemAsync('accessToken');
      } finally {
        setIsInitialLoading(false);
      }
    }

    restoreSession();
  }, []);

  const resetForms = () => {
    setRestaurantForm(defaultRestaurantForm);
    setCharityForm(defaultCharityForm);
    setFarmerForm(defaultFarmerForm);
  };

  const resolvedRole = (() => {
    if (!authUser) return selectedRole;

    const orgType = authUser?.orgType?.toUpperCase();
    const orgRole = authUser?.orgRole?.toUpperCase();
    const siteRole = authUser?.siteRole?.toUpperCase();

    if (orgType === 'BUSINESS_MULTI') {
      if (orgRole === 'SUPER_ADMIN') {
        return 'restaurant_multi';
      }
      if (siteRole === 'SITE_ADMIN' || siteRole === 'STAFF') {
        return 'restaurant_single';
      }
      return 'restaurant_multi';
    }

    if (orgType === 'BUSINESS_SINGLE') return 'restaurant_single';


    if (orgType === 'CHARITY_MULTI') {
      if (orgRole === 'SUPER_ADMIN' || orgRole === 'HEAD_OFFICE_ADMIN' || orgRole === 'HEAD_OFFICE') {
        return 'charity_multi';
      }

      if (siteRole === 'SITE_ADMIN' || siteRole === 'LOCATION_ADMIN' || siteRole === 'TEAM_MEMBER' || siteRole === 'STAFF') {
        return 'charity_single';
      }
      return 'charity_multi';
    }

    if (orgType === 'CHARITY_SINGLE') {
      return 'charity_single';
    }

    if (orgType === 'FARMER_PRODUCER') return 'farm_business';
    if (orgType === 'FARMER_CONSUMER') return 'farmer';
    if (orgType === 'FARMER') return 'farmer';

    return selectedRole;
  })();

  const value = useMemo<AppContextValue>(() => {

    const isBusinessLocationUser = authUser?.orgType === 'BUSINESS_MULTI' &&
      (authUser?.siteRole === 'SITE_ADMIN' || authUser?.siteRole === 'STAFF');

    const isCharityLocationUser = authUser?.orgType === 'CHARITY_MULTI' &&
      (authUser?.siteRole === 'LOCATION_ADMIN' || authUser?.siteRole === 'TEAM_MEMBER');

    const isLocationUser = isBusinessLocationUser || isCharityLocationUser;

    const assignedSite = isLocationUser && authUser?.profile?.sites?.length ? authUser.profile.sites[0] : null;

    const currentProfile: UserProfile = authUser?.profile
      ? {
        name: `${authUser.profile.user.firstName} ${authUser.profile.user.lastName}`,
        organization: assignedSite?.locationName || assignedSite?.name || authUser.profile.organisation?.name || '',
        address: assignedSite?.address || authUser.profile.organisation?.address || '',
        verificationStatus: 'Verified',
        phone: authUser.profile.user.phoneNumber || '',
        logo: authUser.profile.organisation?.logoUrl || '',
        memberSince: authUser.profile.user.createdAt,
        email: authUser.profile.user.email || '',
      }
      : {
        name: '',
        organization: '',
        address: '',
        verificationStatus: 'Pending',
        phone: '',
        logo: '',
        email: '',
      };

    const subscription: Subscription = {
      planId: null,
      billingCycle: null,
      isActive: true,
      isFreeTier: resolvedRole.includes('charity'),
    };

    const currentPlan =
      plansData.find(
        (plan) => plan.id === subscription.planId
      ) || null;

    return {
      isAuthenticated,
      selectedRole: resolvedRole,
      selectedPlanId,
      currentProfile,
      subscription,
      currentPlan,
      restaurantForm,
      charityForm,
      farmerForm,
      authUser,

      setRole: setSelectedRole,
      selectPlan: setSelectedPlanId,

      upgradePlan: () => {
        console.log('Upgrade handled via backend later/ API to be integrated');
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

      updateFarmerField: (field, value) => {
        setFarmerForm((current) => ({
          ...current,
          [field]: value,
        }));
      },

      setAuthUser: (user) => {
        setAuthUser(user);
        setAuthenticated(!!user);
      },

      logout: async () => {
        await SecureStore.deleteItemAsync('accessToken');
        setAuthenticated(false);
        setAuthUser(null);
        setSelectedRole('restaurant_single');
        resetForms();
      },

      setAuthenticated,

      resetForms,
    };
  }, [
    authUser,
    charityForm,
    farmerForm,
    isAuthenticated,
    restaurantForm,
    selectedPlanId,
    selectedRole,
  ]);

  if (isInitialLoading) {
    return null; 
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error(
      'useAppContext must be used within AppProvider'
    );
  }

  return context;
}
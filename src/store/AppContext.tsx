import React, { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

import { charityProfile, plans, restaurantProfile } from '../data/mockData';
import { UserProfile, UserRole } from '../types';

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

type AppContextValue = {
  isAuthenticated: boolean;
  selectedRole: UserRole;
  selectedPlanId: string;
  restaurantForm: RestaurantForm;
  charityForm: CharityForm;
  setRole: (role: UserRole) => void;
  updateRestaurantField: (field: keyof RestaurantForm, value: string) => void;
  updateCharityField: (field: keyof CharityForm, value: string) => void;
  selectPlan: (planId: string) => void;
  loginDemo: () => void;
  logout: () => void;
  currentProfile: UserProfile;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setAuthenticated] = useState(false);

  const [selectedRole, setSelectedRole] = useState<UserRole>('restaurant_single');

  const [selectedPlanId, setSelectedPlanId] = useState(plans[1].id);

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

  const value = useMemo<AppContextValue>(
    () => ({
      isAuthenticated,
      selectedRole,
      selectedPlanId,
      restaurantForm,
      charityForm,

      setRole: setSelectedRole,

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

      selectPlan: setSelectedPlanId,

      loginDemo: () => setAuthenticated(true),
      logout: () => setAuthenticated(false),

      currentProfile:
        selectedRole === 'restaurant_single' ||
        selectedRole === 'restaurant_multi'
          ? restaurantProfile
          : charityProfile,
    }),
    [charityForm, isAuthenticated, restaurantForm, selectedPlanId, selectedRole],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }

  return context;
}
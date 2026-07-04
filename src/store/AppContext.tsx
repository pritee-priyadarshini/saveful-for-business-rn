import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { plansData } from '../data/plansData';
import { UserProfile } from '../types';
import { AppContextValue } from './types';
import { setUnauthorizedHandler } from '../services/api';
import { useNotificationsStore } from './notificationsStore';

import { useAuthStore } from './authStore';
import { useRegistrationStore } from './registrationStore';
import {
  resolveUserRole,
  resolveProfileDisplayAddress,
} from '@/utils/authSession';
import { resetAllDataStores } from './index';

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
  const {
    isAuthenticated,
    authUser,
    selectedRole,
    roleFlow,
    selectedPlanId,
    setAuthUser,
    setAuthenticated,
    setRole,
    setRoleFlow,
    selectPlan,
    logout: authStoreLogout,
  } = useAuthStore();

  const {
    restaurantForm,
    charityForm,
    farmerForm,
    updateRestaurantField,
    updateCharityField,
    updateFarmerField,
    resetForms,
  } = useRegistrationStore();

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      const notificationsStore = useNotificationsStore.getState();
      notificationsStore.teardownPushHandlers();
      await notificationsStore.unregisterDeviceToken().catch(() => undefined);
      await authStoreLogout();
      resetForms();
      resetAllDataStores();
    });
    return () => setUnauthorizedHandler(null);
  }, [authStoreLogout, resetForms]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const notificationsStore = useNotificationsStore.getState();
    void notificationsStore.registerDeviceToken({ prompt: true });
    notificationsStore.setupPushHandlers();

    return () => {
      useNotificationsStore.getState().teardownPushHandlers();
    };
  }, [isAuthenticated]);

  const resolvedRole = useMemo(
    () => resolveUserRole(authUser, selectedRole),
    [authUser, selectedRole],
  );

  const value = useMemo<AppContextValue>(() => {
    const isBusinessLocationUser =
      authUser?.orgType === 'BUSINESS_MULTI' &&
      (authUser?.siteRole === 'SITE_ADMIN' || authUser?.siteRole === 'STAFF');

    const isCharityLocationUser =
      authUser?.orgType === 'CHARITY_MULTI' &&
      (authUser?.siteRole === 'LOCATION_ADMIN' ||
        authUser?.siteRole === 'TEAM_MEMBER');

    const isLocationUser = isBusinessLocationUser || isCharityLocationUser;
    const assignedSite =
      isLocationUser && authUser?.profile?.sites?.length
        ? authUser.profile.sites[0]
        : null;

    const profileUser = authUser?.profile?.user;
    const firstName = profileUser?.firstName?.trim() || '';
    const lastName = profileUser?.lastName?.trim() || '';
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || profileUser?.email || '';

    const currentProfile: UserProfile = authUser?.profile
      ? {
          name: displayName,
          organization:
            assignedSite?.locationName ||
            assignedSite?.name ||
            authUser.profile.organisation?.name ||
            '',
          address:
            assignedSite?.address ||
            resolveProfileDisplayAddress(authUser.profile),
          verificationStatus: 'Verified',
          phone: profileUser?.phoneNumber || '',
          logo: authUser.profile.organisation?.logoUrl || '',
          memberSince: profileUser?.createdAt,
          email: profileUser?.email || '',
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

    const subscription = {
      planId: null,
      billingCycle: null,
      isActive: true,
      isFreeTier: resolvedRole.includes('charity'),
    };

    const currentPlan =
      plansData.find((plan) => plan.id === subscription.planId) || null;

    return {
      isAuthenticated,
      selectedRole: resolvedRole,
      roleFlow,
      selectedPlanId,
      currentProfile,
      subscription,
      currentPlan,
      restaurantForm,
      charityForm,
      farmerForm,
      authUser,

      setRole,
      setRoleFlow,
      selectPlan,
      upgradePlan: () => {
        console.log('Upgrade handled via backend later / API to be integrated');
      },
      updateRestaurantField,
      updateCharityField,
      updateFarmerField,
      setAuthUser,
      setAuthenticated,
      resetForms,

      logout: async () => {
        const notificationsStore = useNotificationsStore.getState();
        notificationsStore.teardownPushHandlers();
        await notificationsStore.unregisterDeviceToken();
        await authStoreLogout();
        resetForms();
        resetAllDataStores();
      },
    };
  }, [
    isAuthenticated,
    authUser,
    selectedRole,
    resolvedRole,
    roleFlow,
    selectedPlanId,
    restaurantForm,
    charityForm,
    farmerForm,
    setRole,
    setRoleFlow,
    selectPlan,
    updateRestaurantField,
    updateCharityField,
    updateFarmerField,
    setAuthUser,
    setAuthenticated,
    resetForms,
    authStoreLogout,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }

  return context;
}

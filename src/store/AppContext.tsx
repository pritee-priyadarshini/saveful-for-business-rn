import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import * as SecureStore from 'expo-secure-store';

import { plansData } from '../data/plansData';
import { UserProfile } from '../types';
import { AppContextValue } from './types';
import { authService } from '../services/auth.service';
import { setUnauthorizedHandler } from '../services/api';
import {
  setupForegroundNotificationHandler,
  teardownForegroundNotificationHandler,
  registerDeviceToken,
  unregisterDeviceToken,
} from '../services/pushNotifications';

import { useAuthStore } from './authStore';
import { useRegistrationStore } from './registrationStore';
import {
  buildAuthUserFromProfile,
  resolveUserRole,
} from '@/utils/authSession';
import { resetAllDataStores } from './index';

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
  const {
    isAuthenticated,
    isInitialLoading,
    authUser,
    selectedRole,
    roleFlow,
    selectedPlanId,
    setAuthUser,
    setAuthenticated,
    setRole,
    setRoleFlow,
    selectPlan,
    setInitialLoading,
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
    async function restoreSession() {
      try {
        const token = await SecureStore.getItemAsync('accessToken');
        if (token) {
          const profileRes = await authService.profile();
          const authUser = buildAuthUserFromProfile(
            profileRes.data,
            token,
          );
          setRole(resolveUserRole(authUser));
          setAuthUser(authUser);
        }
      } catch (error) {
        console.log('SESSION RESTORE ERROR', error);
        await SecureStore.deleteItemAsync('accessToken');
      } finally {
        setInitialLoading(false);
      }
    }

    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await authStoreLogout();
      resetAllDataStores();
    });
    return () => setUnauthorizedHandler(null);
  }, [authStoreLogout]);

  useEffect(() => {
    if (!isAuthenticated) return;
    registerDeviceToken();
    setupForegroundNotificationHandler();
    return () => {
      teardownForegroundNotificationHandler();
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

    const currentProfile: UserProfile = authUser?.profile
      ? {
          name: `${authUser.profile.user.firstName} ${authUser.profile.user.lastName}`,
          organization:
            assignedSite?.locationName ||
            assignedSite?.name ||
            authUser.profile.organisation?.name ||
            '',
          address:
            assignedSite?.address ||
            authUser.profile.organisation?.address ||
            '',
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
        teardownForegroundNotificationHandler();
        await unregisterDeviceToken();
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
    throw new Error('useAppContext must be used within AppProvider');
  }

  return context;
}

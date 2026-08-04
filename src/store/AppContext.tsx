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
import { useSubscriptionStore } from './subscriptionStore';
import { fromApiBillingCycle } from '@/utils/billingHelpers';

import { useAuthStore } from './authStore';
import { useRegistrationStore } from './registrationStore';
import {
  resolveUserRole,
  resolveProfileDisplayAddress,
  resolveOrganisationAddress,
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

  const entitlements = useSubscriptionStore((s) => s.entitlements);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      const notificationsStore = useNotificationsStore.getState();
      notificationsStore.teardownPushHandlers();
      await notificationsStore.unregisterDeviceToken().catch(() => undefined);
      useSubscriptionStore.getState().teardownBillingRefreshOnFocus();
      await authStoreLogout();
      resetForms();
      resetAllDataStores();
    });
    return () => setUnauthorizedHandler(null);
  }, [authStoreLogout, resetForms]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const notificationsStore = useNotificationsStore.getState();
    const subscriptionStore = useSubscriptionStore.getState();
    // Prompt at most once after login; handlers stay active for the session.
    void notificationsStore.registerDeviceToken({ prompt: true });
    notificationsStore.setupPushHandlers();
    subscriptionStore.resetPlanGatePrompted();
    void subscriptionStore.fetchEntitlements(true);
    subscriptionStore.setupBillingRefreshOnFocus();

    return () => {
      useNotificationsStore.getState().teardownPushHandlers();
      useSubscriptionStore.getState().teardownBillingRefreshOnFocus();
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
          address: isLocationUser
            ? assignedSite?.address ||
              resolveProfileDisplayAddress(authUser.profile)
            : resolvedRole === 'restaurant_multi' || resolvedRole === 'charity_multi'
              ? resolveOrganisationAddress(authUser.profile.organisation) ||
                resolveProfileDisplayAddress(authUser.profile, {
                  preferOrganisation: true,
                })
              : resolveProfileDisplayAddress(authUser.profile),
          verificationStatus: 'Verified',
          phone: profileUser?.phoneNumber || '',
          logo:
            authUser.profile.organisation?.logoUrl ||
            (authUser.profile.organisation as { logo?: string } | undefined)?.logo ||
            '',
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

    const isFreeTier =
      resolvedRole.includes('charity') || resolvedRole === 'farmer';

    const billingCycleRaw: 'monthly' | 'annual' | null = entitlements?.billingCycle
      ? fromApiBillingCycle(entitlements.billingCycle)
      : null;
    const subscription = {
      planId:
        entitlements?.planId != null
          ? String(entitlements.planId)
          : entitlements?.planName ?? null,
      billingCycle: billingCycleRaw,
      isActive: entitlements ? entitlements.entitled || isFreeTier : true,
      isFreeTier,
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
        void useSubscriptionStore.getState().fetchAvailablePlans(true);
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
        useSubscriptionStore.getState().teardownBillingRefreshOnFocus();
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
    entitlements,
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

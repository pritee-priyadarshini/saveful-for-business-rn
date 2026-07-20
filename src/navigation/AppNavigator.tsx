import React, { useEffect, useRef } from 'react';
import { NavigationContainer, DefaultTheme, NavigationContainerRef, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAppContext } from '../store/AppContext';
import { AuthStack } from './AuthStack';
import { RoleTabs } from './RoleTabs';

import { CharityHistoryScreen } from '../screens/charity/CharityHistoryScreen';
import { FarmerHistoryScreen } from '../screens/farmer/FarmerHistoryScreen';

import { palette } from '../theme/colors';
import { SingleSitePlansScreen } from '@/screens/subscription/SingleSitePlansScreen';
import { SingleSiteCompareScreen } from '@/screens/subscription/SingleSiteCompareScreen';
import { SingleSiteConfirmScreen } from '@/screens/subscription/SingleSiteConfirmScreen';
import { MultiSitePlansScreen } from '@/screens/subscription/MultiSitePlansScreen';
import { MultiSiteConfirmScreen } from '@/screens/subscription/MultiSiteConfirmScreen';
import { EnterpriseConsultScreen } from '@/screens/subscription/EnterpriseConsultScreen';
import { EnterpriseThanksScreen } from '@/screens/subscription/EnterpriseThanksScreen';
import { RestaurantPlanRouter } from '@/screens/subscription/RestaurantPlanRouter';
import ManageAccessScreen from '@/screens/restaurant/ManageAccessScreen';
import ManageSitesScreen from '@/screens/restaurant/ManageSitesScreen';
import CreateSiteScreen from '@/screens/restaurant/CreateSiteScreen';
import SiteAnalyticsScreen from '@/screens/restaurant/SiteAnalyticsScreen';
import { ProfileScreen } from '@/screens/shared/ProfileScreen';
import { CalculationScreen } from '@/screens/shared/CalculationScreen';
import MultiCharityManageSitesScreen from '@/screens/charity/MultiCharityManageSitesScreen';
import CreateCharitySiteScreen from '@/screens/charity/CreateCharitySiteScreen';
import CharitySiteAnalyticsScreen from '@/screens/charity/CharitySiteAnalyticsScreen';
import DriverTrackingScreen from '@/screens/shared/DriverTrackingScreen';
import CharityManageAccessScreen from '@/screens/charity/CharityManageAccessScreen';
import FarmerManageAccessScreen from '@/screens/farmer/FarmerManageAccessScreen';
import ForgotPasswordScreen from '@/screens/shared/ForgotPasswordScreen';
import {
  setupNotificationOpenedHandler,
  teardownNotificationOpenedHandler,
  emitNotificationReceived,
  resolveNotificationTarget,
  type NotificationPayload,
} from '../services/pushNotifications';
import type { UserRole } from '../types';

export type RootStackParamList = {
  Tabs: { screen?: string; params?: Record<string, unknown> } | undefined;
  CharityHistory: undefined;
  FarmerHistory: undefined;
  CharityPostCollectSurvey: undefined;
  RestaurantPlan: undefined;
  SingleSitePlans: undefined;
  SingleSiteCompare: { selectedPlanId?: 'single' | 'single_plus' } | undefined;
  SingleSiteConfirm: { selectedPlanId?: 'single' | 'single_plus' } | undefined;
  MultiSitePlans: undefined;
  MultiSiteConfirm: undefined;
  EnterpriseConsult: undefined;
  EnterpriseThanks: undefined;
  //ManageAccess: undefined;
  ManageSites: undefined;
  //CreateSite: undefined;
  CreateSite: { mode?: 'site' | 'manager'; siteId?: number };
  SiteAnalytics: undefined;
  Account: undefined;
  Calculation: undefined;
  ForgotPassword: undefined;
  //CharityManageAccess: undefined;

   ManageAccess: {
    locationId: number;
    orgType: 'restaurant' | 'charity' | 'farmer';
  };

  CharityManageAccess: {
    locationId: number;
    orgType: 'restaurant' | 'charity' | 'farmer';
  };

  FarmerManageAccess: {
    locationId: number;
    orgType: 'restaurant' | 'charity' | 'farmer';
  };
  

  //MultiCharity
  MultiCharityManageSites: undefined;
  CreateCharitySite: | undefined | {
    mode?: 'assign-manager';
    siteId?: number;
    locationId?: number;
  };
  CharitySiteAnalytics: undefined;
  //Tracking
  DriverTracking: {
    trackingId: string;
    source: 'restaurant' | 'charity' | 'farmer';
  };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.creme,
    card: palette.surface,
    text: palette.text,
    border: palette.strokecream,
    primary: palette.primary,
  },
};

export function AppNavigator() {
  const { isAuthenticated, selectedRole } = useAppContext();
  const effectiveRole = selectedRole;
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Always-current auth state readable inside stable callbacks without re-subscribing.
  const isAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => { isAuthenticatedRef.current = isAuthenticated; }, [isAuthenticated]);

  // Holds a notification tapped before session restore completed (kill-state race condition).
  const pendingNotificationRef = useRef<NotificationPayload | null>(null);

  // Always-current role for notification routing without stale closures.
  const effectiveRoleRef = useRef<UserRole>(effectiveRole);
  useEffect(() => { effectiveRoleRef.current = effectiveRole; }, [effectiveRole]);

  function tryNavigateFromNotification(payload: NotificationPayload): boolean {
    if (!navigationRef.current?.isReady()) return false;

    emitNotificationReceived(payload);

    const target = resolveNotificationTarget(payload, effectiveRoleRef.current);

    if (target.name === 'Tabs' && target.params) {
      navigationRef.current.dispatch(
        CommonActions.navigate({
          name: 'Tabs',
          params: target.params,
        }),
      );
      return true;
    }

    navigationRef.current.navigate(target.name as keyof RootStackParamList, target.params as never);
    return true;
  }

  function flushPendingNotification() {
    if (!pendingNotificationRef.current) return;
    const payload = pendingNotificationRef.current;
    if (tryNavigateFromNotification(payload)) {
      pendingNotificationRef.current = null;
    }
  }

  const initialRouteName: keyof RootStackParamList =
    effectiveRole === 'restaurant_multi'
      ? 'ManageSites'
      : effectiveRole === 'charity_multi'
        ? 'MultiCharityManageSites'
        : 'Tabs';

  // Register notification-tap handlers once on mount.
  useEffect(() => {
    setupNotificationOpenedHandler((payload) => {
      if (!navigationRef.current?.isReady() || !isAuthenticatedRef.current) {
        // Session restore hasn't finished yet (kill-state launch) — queue it.
        pendingNotificationRef.current = payload;
        return;
      }
      tryNavigateFromNotification(payload);
    });
    return () => teardownNotificationOpenedHandler();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flush pending notification when session is ready; clear it when user logs out.
  useEffect(() => {
    if (!isAuthenticated) {
      // Prevent a notification queued before logout from navigating after a different user logs in.
      pendingNotificationRef.current = null;
      return;
    }
    if (!pendingNotificationRef.current) return;
    flushPendingNotification();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onReady={flushPendingNotification}
    >
      {isAuthenticated ? (
        <RootStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
          <RootStack.Screen name="Tabs" component={RoleTabs} />

          {effectiveRole === 'restaurant_multi' ? (
            <RootStack.Screen name="ManageSites" component={ManageSitesScreen} />
          ) : null}

          {effectiveRole === 'charity_multi' ? (
            <RootStack.Screen
              name="MultiCharityManageSites"
              component={MultiCharityManageSitesScreen}
            />
          ) : null}

          {/* GLOBAL */}
          <RootStack.Screen name="CharityHistory" component={CharityHistoryScreen} />
          <RootStack.Screen name="FarmerHistory" component={FarmerHistoryScreen} />
          <RootStack.Screen name="SingleSitePlans" component={SingleSitePlansScreen} />
          <RootStack.Screen name="SingleSiteCompare" component={SingleSiteCompareScreen} />
          <RootStack.Screen name="SingleSiteConfirm" component={SingleSiteConfirmScreen} />
          <RootStack.Screen name="MultiSitePlans" component={MultiSitePlansScreen} />
          <RootStack.Screen name="MultiSiteConfirm" component={MultiSiteConfirmScreen} />
          <RootStack.Screen name="EnterpriseConsult" component={EnterpriseConsultScreen} />
          <RootStack.Screen name="EnterpriseThanks" component={EnterpriseThanksScreen} />
          <RootStack.Screen name="RestaurantPlan" component={RestaurantPlanRouter} />
          <RootStack.Screen name="ManageAccess" component={ManageAccessScreen} />
          <RootStack.Screen name="CreateSite" component={CreateSiteScreen} />
          <RootStack.Screen name="SiteAnalytics" component={SiteAnalyticsScreen} />
          <RootStack.Screen name="Account" component={ProfileScreen} />
          <RootStack.Screen name="Calculation" component={CalculationScreen} />
          <RootStack.Screen name="CreateCharitySite" component={CreateCharitySiteScreen} />
          <RootStack.Screen name="CharitySiteAnalytics" component={CharitySiteAnalyticsScreen} />
          <RootStack.Screen name="DriverTracking" component={DriverTrackingScreen} />
          <RootStack.Screen name="CharityManageAccess" component={CharityManageAccessScreen} />
          <RootStack.Screen name="FarmerManageAccess" component={FarmerManageAccessScreen} />
          <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

        </RootStack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
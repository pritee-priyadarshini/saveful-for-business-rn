import React, { useEffect, useRef } from 'react';
import { NavigationContainer, DefaultTheme, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAppContext } from '../store/AppContext';
import { AuthStack } from './AuthStack';
import { RoleTabs } from './RoleTabs';

import { ClaimConfirmationScreen } from '../screens/charity/ClaimConfirmationScreen';
import { CharityHistoryScreen } from '../screens/charity/CharityHistoryScreen';
import { FarmerHistoryScreen } from '../screens/farmer/FarmerHistoryScreen';

import { palette } from '../theme/colors';
import { RestaurantPlansScreen } from '@/screens/restaurant/RestaurantPlansScreen';
import ManageAccessScreen from '@/screens/restaurant/ManageAccessScreen';
import ManageSitesScreen from '@/screens/restaurant/ManageSitesScreen';
import CreateSiteScreen from '@/screens/restaurant/CreateSiteScreen';
import SiteAnalyticsScreen from '@/screens/restaurant/SiteAnalyticsScreen';
import AdminProfileScreen from '@/screens/restaurant/AdminProfileScreen';
import { CalculationScreen } from '@/screens/shared/CalculationScreen';
import MultiCharityManageSitesScreen from '@/screens/charity/MultiCharityManageSitesScreen';
import CreateCharitySiteScreen from '@/screens/charity/CreateCharitySiteScreen';
import CharitySiteAnalyticsScreen from '@/screens/charity/CharitySiteAnalyticsScreen';
import CharityAdminProfileScreen from '@/screens/charity/CharityAdminProfileScreen';
import DriverTrackingScreen from '@/screens/shared/DriverTrackingScreen';
import CharityManageAccessScreen from '@/screens/charity/CharityManageAccessScreen';
import FarmerManageAccessScreen from '@/screens/farmer/FarmerManageAccessScreen';
import ForgotPasswordScreen from '@/screens/shared/ForgotPasswordScreen';
import { setupNotificationOpenedHandler, teardownNotificationOpenedHandler, type NotificationPayload } from '../services/pushNotifications';

export type RootStackParamList = {
  Tabs: undefined;
  CharityHistory: undefined;
  FarmerHistory: undefined;
  ClaimConfirm: undefined;
  CharityPostCollectSurvey: undefined;
  RestaurantPlan: undefined;
  //ManageAccess: undefined;
  ManageSites: undefined;
  //CreateSite: undefined;
  CreateSite: { mode?: 'site' | 'manager'; siteId?: number };
  SiteAnalytics: undefined;
  AdminProfile: undefined;
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
    mode?: 'manager';
    siteId?: number;
  };
  CharitySiteAnalytics: undefined;
  CharityAdminProfile: undefined;

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

  function navigateFromNotification(payload: NotificationPayload) {
    if (!navigationRef.current?.isReady()) return;
    const data = payload.data ?? {};
    if (data.trackingId && data.source) {
      navigationRef.current.navigate('DriverTracking', {
        trackingId: String(data.trackingId),
        source: data.source as 'restaurant' | 'charity' | 'farmer',
      });
      return;
    }
    if (effectiveRole === 'restaurant_multi') {
      navigationRef.current.navigate('ManageSites', undefined);
    } else if (effectiveRole === 'charity_multi') {
      navigationRef.current.navigate('MultiCharityManageSites', undefined);
    } else {
      navigationRef.current.navigate('Tabs', undefined);
    }
  }

  // Register notification-tap handlers once on mount.
  useEffect(() => {
    setupNotificationOpenedHandler((payload) => {
      if (!navigationRef.current?.isReady() || !isAuthenticatedRef.current) {
        // Session restore hasn't finished yet (kill-state launch) — queue it.
        pendingNotificationRef.current = payload;
        return;
      }
      navigateFromNotification(payload);
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
    const payload = pendingNotificationRef.current;
    pendingNotificationRef.current = null;
    navigateFromNotification(payload);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      {isAuthenticated ? (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          
          {effectiveRole === 'restaurant_multi' ? (
            <RootStack.Screen name="ManageSites" component={ManageSitesScreen} />
          ) : effectiveRole === 'charity_multi' ? (
            <RootStack.Screen
              name="MultiCharityManageSites" component={MultiCharityManageSitesScreen} />
          ) : (
            <RootStack.Screen name="Tabs" component={RoleTabs} />
          )}

          {/* GLOBAL */}
          <RootStack.Screen name="CharityHistory" component={CharityHistoryScreen} />
          <RootStack.Screen name="FarmerHistory" component={FarmerHistoryScreen} />
          <RootStack.Screen name="ClaimConfirm" component={ClaimConfirmationScreen} />
          <RootStack.Screen name="RestaurantPlan" component={RestaurantPlansScreen} />
          <RootStack.Screen name="ManageAccess" component={ManageAccessScreen} />
          <RootStack.Screen name="CreateSite" component={CreateSiteScreen} />
          <RootStack.Screen name="SiteAnalytics" component={SiteAnalyticsScreen} />
          <RootStack.Screen name="AdminProfile" component={AdminProfileScreen} />
          <RootStack.Screen name="Calculation" component={CalculationScreen} />
          <RootStack.Screen name="CreateCharitySite" component={CreateCharitySiteScreen} />
          <RootStack.Screen name="CharitySiteAnalytics" component={CharitySiteAnalyticsScreen} />
          <RootStack.Screen name="CharityAdminProfile" component={CharityAdminProfileScreen} />
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
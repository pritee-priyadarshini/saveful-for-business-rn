import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAppContext } from '../store/AppContext';
import { AuthStack } from './AuthStack';
import { RoleTabs } from './RoleTabs';

import { ClaimConfirmationScreen } from '../screens/charity/ClaimConfirmationScreen';
import { CharityHistoryScreen } from '../screens/charity/CharityHistoryScreen';

import { palette } from '../theme/colors';
import { RestaurantPlansScreen } from '@/screens/restaurant/RestaurantPlansScreen';
import ManageAccessScreen from '@/screens/restaurant/ManageAccessScreen';
import ManageSitesScreen from '@/screens/restaurant/ManageSitesScreen';
import CreateSiteScreen from '@/screens/restaurant/CreateSiteScreen';
import SiteAnalyticsScreen from '@/screens/restaurant/SiteAnalyticsScreen';
import AdminProfileScreen from '@/screens/restaurant/AdminProfileScreen';
import { CalculationScreen } from '@/screens/shared/CalculationScreen';
import { DriverTabs } from './DriverTabs';
import MultiCharityManageSitesScreen from '@/screens/charity/MultiCharityManageSitesScreen';
import CreateCharitySiteScreen from '@/screens/charity/CreateCharitySiteScreen';
import CharitySiteAnalyticsScreen from '@/screens/charity/CharitySiteAnalyticsScreen';
import CharityAdminProfileScreen from '@/screens/charity/CharityAdminProfileScreen';
import DriverTrackingScreen from '@/screens/shared/DriverTrackingScreen';
import CharityManageAccessScreen from '@/screens/charity/CharityManageAccessScreen';
import ForgotPasswordScreen from '@/screens/shared/ForgotPasswordScreen';

export type RootStackParamList = {
  Tabs: undefined;
  CharityHistory: undefined;
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
    orgType: 'restaurant' | 'charity';
  };

  CharityManageAccess: {
    locationId: number;
    orgType: 'restaurant' | 'charity';
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
    source: 'restaurant' | 'charity';
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
  const { isAuthenticated, selectedRole, authUser } = useAppContext();
  const effectiveRole = selectedRole;

  return (
    <NavigationContainer theme={navTheme}>
      {isAuthenticated ? (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>

          {/* {selectedRole === 'driver' ? (
            <RootStack.Screen name="Tabs" component={DriverTabs} />
          ) : selectedRole === 'restaurant_multi' ? (
            <RootStack.Screen name="ManageSites" component={ManageSitesScreen} />
          ) : selectedRole === 'charity_multi' ? (
            <RootStack.Screen
              name="MultiCharityManageSites"
              component={MultiCharityManageSitesScreen}
            />
          ) : (
            <RootStack.Screen name="Tabs" component={RoleTabs} />
          )} */}


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
          <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

        </RootStack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
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

export type RootStackParamList = {
  Tabs: undefined;
  CharityHistory: undefined;
  ClaimConfirm: undefined;
  CharityPostCollectSurvey: undefined;
  RestaurantPlan: undefined;
  ManageAccess: undefined;
  ManageSites: undefined;
  CreateSite: undefined;
  SiteAnalytics : undefined;
  AdminProfile: undefined;
  Calculation: undefined;
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

  return (
    <NavigationContainer theme={navTheme}>
      {isAuthenticated ? (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>

          {selectedRole === 'restaurant_multi' ? (
            <RootStack.Screen name="ManageSites" component={ManageSitesScreen} />
          ) : (
            <RootStack.Screen name="Tabs" component={RoleTabs} />
          )}

          {/* GLOBAL */}
          <RootStack.Screen name="CharityHistory" component={CharityHistoryScreen} />
          <RootStack.Screen name="ClaimConfirm" component={ClaimConfirmationScreen} />
          <RootStack.Screen name="RestaurantPlan" component={RestaurantPlansScreen} />
          <RootStack.Screen name="ManageAccess" component={ManageAccessScreen} />
          <RootStack.Screen name="CreateSite" component={CreateSiteScreen} />
          <RootStack.Screen name ="SiteAnalytics" component={SiteAnalyticsScreen} />
          <RootStack.Screen name ="AdminProfile" component={AdminProfileScreen} />
          <RootStack.Screen name ="Calculation" component={CalculationScreen} />

        </RootStack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
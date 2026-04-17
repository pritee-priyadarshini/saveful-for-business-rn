import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';


import { BottomTabNavigationOptions} from '@react-navigation/bottom-tabs';


import { CharityAnalyticsScreen } from '../screens/charity/CharityAnalyticsScreen';
import { CharityDiscoverScreen } from '../screens/charity/CharityDiscoverScreen';
import { RestaurantAnalyticsScreen } from '../screens/restaurant/RestaurantAnalyticsScreen';
import { RestaurantHomeScreen } from '../screens/restaurant/RestaurantHomeScreen';
import { CharityUpdatesScreen } from '../screens/charity/CharityUpdatesScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { useAppContext } from '../store/AppContext';
import { CharityTabsParamList, RestaurantTabsParamList } from './types';
import { palette } from '../theme/colors';
import { RestaurantStack } from './RestaurantStack';
import { CharityStack } from './CharityStack';
import { RestaurantUpdatesScreen } from '@/screens/restaurant/RestaurantUpdatesScreen';

const RestaurantTab = createBottomTabNavigator<RestaurantTabsParamList>();
const CharityTab = createBottomTabNavigator<CharityTabsParamList>();

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Listings: 'basket-outline',
  Insights: 'bar-chart-outline',
  Plans: 'card-outline',
  Account: 'person-outline',
  Available: 'search-outline',
  Impact: 'pulse-outline',
  Updates: 'notifications-outline',
};

const screenOptions = ({ route }: any): BottomTabNavigationOptions => ({
  headerShown: false,
  tabBarActiveTintColor: palette.primary,
  tabBarInactiveTintColor: palette.textMuted,
  tabBarStyle: {
    height: 76,
    paddingBottom: 12,
    paddingTop: 10,
    backgroundColor: palette.surface,
    borderTopColor: palette.strokecream,
  },
  tabBarLabelStyle: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: 11,
    textTransform: 'uppercase' as const,
  },
  tabBarIcon: ({ color, size }: { color: string; size: number }) => (
    <Ionicons color={color} name={iconMap[route.name as keyof typeof iconMap]} size={size} />
  ),
});

export function RoleTabs() {
  const { selectedRole } = useAppContext();

  if (selectedRole === 'charity') {
    return (
      <CharityTab.Navigator screenOptions={screenOptions}>
        <CharityTab.Screen component={CharityDiscoverScreen} name="Home" />
        <CharityTab.Screen component={CharityStack} name="Available" />
        <CharityTab.Screen component={CharityAnalyticsScreen} name="Impact" />
        <CharityTab.Screen component={CharityUpdatesScreen} name="Updates" />
        <CharityTab.Screen component={ProfileScreen} name="Account" />
      </CharityTab.Navigator>
    );
  }

  return (
    <RestaurantTab.Navigator screenOptions={screenOptions}>
      <RestaurantTab.Screen component={RestaurantHomeScreen} name="Home" />
      <RestaurantTab.Screen component={RestaurantStack} name="Listings" options={{ unmountOnBlur: true }} />
      <RestaurantTab.Screen component={RestaurantAnalyticsScreen} name="Insights" />
      {/* <RestaurantTab.Screen component={RestaurantPlansScreen} name="Plans" /> */}
      <RestaurantTab.Screen component={RestaurantUpdatesScreen} name="Updates" />
      <RestaurantTab.Screen component={ProfileScreen} name="Account" />
    </RestaurantTab.Navigator>
  );
}

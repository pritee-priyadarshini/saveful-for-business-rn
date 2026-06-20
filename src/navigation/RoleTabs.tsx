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
import { CharityTabsParamList, FarmerTabsParamList, RestaurantTabsParamList } from './types';
import { palette } from '../theme/colors';
import { RestaurantStack } from './RestaurantStack';
import { CharityStack } from './CharityStack';
import { RestaurantUpdatesScreen } from '@/screens/restaurant/RestaurantUpdatesScreen';
import { Dimensions } from 'react-native';
import { FarmerStack } from './FarmerStack';
import { FarmerAnalyticsScreen } from '@/screens/farmer/FarmerAnalyticsScreen';
import { FarmerUpdatesScreen } from '@/screens/farmer/FarmerUpdatesScreen';
import { FarmerHomeScreen } from '@/screens/farmer/FarmerHomeScreen';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

const RestaurantTab = createBottomTabNavigator<RestaurantTabsParamList>();
const CharityTab = createBottomTabNavigator<CharityTabsParamList>();
const FarmerTab = createBottomTabNavigator<FarmerTabsParamList>();

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
    height: hp(10),
    paddingBottom: hp(2),
    backgroundColor: palette.surface,
    borderTopColor: palette.strokecream,
  },
  tabBarLabelStyle: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(11),
    textTransform: 'uppercase' as const,
    paddingBottom: hp(1),
  },
  tabBarIcon: ({ color, size }: { color: string; size: number }) => (
    <Ionicons color={color} name={iconMap[route.name as keyof typeof iconMap]} size={size} />
  ),
});

export function RoleTabs() {
  const { selectedRole } = useAppContext();

  if (
    selectedRole === 'charity_single' ||
    selectedRole === 'charity_multi'
  ) {
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

  if (selectedRole === 'farmer') {
    return (
      <FarmerTab.Navigator screenOptions={screenOptions}>
        <FarmerTab.Screen component={FarmerHomeScreen} name="Home" />
        <FarmerTab.Screen component={FarmerStack} name="Available" />
        <FarmerTab.Screen component={FarmerAnalyticsScreen} name="Impact" />
        <FarmerTab.Screen component={FarmerUpdatesScreen} name="Updates" />
        <FarmerTab.Screen component={ProfileScreen} name="Account" />
      </FarmerTab.Navigator>
    );
  }

  if (selectedRole === 'farm_business') {
    return (
      <RestaurantTab.Navigator screenOptions={screenOptions}>
        <RestaurantTab.Screen component={RestaurantHomeScreen} name="Home" />
        <RestaurantTab.Screen component={RestaurantStack} name="Listings" options={{ unmountOnBlur: true }} />
        <RestaurantTab.Screen component={RestaurantAnalyticsScreen} name="Insights" />
        <RestaurantTab.Screen component={RestaurantUpdatesScreen} name="Updates" />
        <RestaurantTab.Screen component={ProfileScreen} name="Account" />
      </RestaurantTab.Navigator>
    );
  }

  return (
    <RestaurantTab.Navigator screenOptions={screenOptions}>
      <RestaurantTab.Screen component={RestaurantHomeScreen} name="Home" />
      <RestaurantTab.Screen component={RestaurantStack} name="Listings" options={{ unmountOnBlur: true }} />
      <RestaurantTab.Screen component={RestaurantAnalyticsScreen} name="Insights" />
      <RestaurantTab.Screen component={RestaurantUpdatesScreen} name="Updates" />
      <RestaurantTab.Screen component={ProfileScreen} name="Account" />
    </RestaurantTab.Navigator>
  );
}

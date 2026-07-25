import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { FarmerStack } from './FarmerStack';
import { FarmerAnalyticsScreen } from '@/screens/farmer/FarmerAnalyticsScreen';
import { FarmerUpdatesScreen } from '@/screens/farmer/FarmerUpdatesScreen';
import { FarmerHomeScreen } from '@/screens/farmer/FarmerHomeScreen';

const RestaurantTab = createBottomTabNavigator<RestaurantTabsParamList>();
const CharityTab = createBottomTabNavigator<CharityTabsParamList>();
const FarmerTab = createBottomTabNavigator<FarmerTabsParamList>();

/** Fixed sizes — avoid normalize() so icons don't clip on tablets. */
const TAB_ICON_SIZE = 24;
const TAB_BAR_CONTENT_HEIGHT = 56;

const iconMap: Record<string, { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }> = {
  Home: { outline: 'home-outline', filled: 'home' },
  Listings: { outline: 'basket-outline', filled: 'basket' },
  Insights: { outline: 'bar-chart-outline', filled: 'bar-chart' },
  Plans: { outline: 'card-outline', filled: 'card' },
  Account: { outline: 'person-outline', filled: 'person' },
  Available: { outline: 'search-outline', filled: 'search' },
  Impact: { outline: 'pulse-outline', filled: 'pulse' },
  Updates: { outline: 'notifications-outline', filled: 'notifications' },
};

function TabBarIcon({
  name,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={styles.iconWrap}>
      <Ionicons name={name} size={TAB_ICON_SIZE} color={color} />
    </View>
  );
}

function useTabScreenOptions(): ({ route }: { route: { name: string } }) => BottomTabNavigationOptions {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 0);

  return ({ route }) => {
    const icons = iconMap[route.name];

    return {
      headerShown: false,
      tabBarActiveTintColor: palette.primary,
      tabBarInactiveTintColor: palette.textMuted,
      // Keep icon above label on all widths — beside-icon clips icons with 5 tabs.
      tabBarLabelPosition: 'below-icon',
      tabBarStyle: {
        height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
        paddingTop: 6,
        paddingBottom: bottomInset,
        backgroundColor: palette.creme,
        borderTopColor: palette.strokecream,
        borderTopWidth: StyleSheet.hairlineWidth,
        ...Platform.select({
          ios: {
            shadowColor: palette.black,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
          },
          android: {
            elevation: 8,
          },
        }),
      },
      tabBarItemStyle: {
        paddingVertical: 0,
        marginTop: 0,
      },
      tabBarIconStyle: {
        marginTop: 0,
        marginBottom: 0,
      },
      tabBarLabelStyle: {
        fontFamily: 'Saveful-SemiBold',
        fontSize: 11,
        lineHeight: 14,
        marginTop: 2,
        marginBottom: 0,
        letterSpacing: 0.2,
      },
      tabBarIcon: ({ color, focused }) => (
        <TabBarIcon
          color={color}
          name={focused && icons ? icons.filled : icons?.outline ?? 'ellipse-outline'}
        />
      ),
      sceneContainerStyle: {
        backgroundColor: palette.background,
      },
    };
  };
}

export function RoleTabs() {
  const { selectedRole } = useAppContext();
  const screenOptions = useTabScreenOptions();

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

const styles = StyleSheet.create({
  iconWrap: {
    width: TAB_ICON_SIZE + 4,
    height: TAB_ICON_SIZE + 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});

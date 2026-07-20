import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { palette } from '@/theme/colors';
import { useAppContext } from '@/store/AppContext';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { getSubscriptionRoute } from '@/utils/subscriptionAccess';

type Nav = NativeStackNavigationProp<RootStackParamList, 'RestaurantPlan'>;

/**
 * Routes plan entry by role:
 * - restaurant multi → multi-site
 * - restaurant single / farmer producer → single-site
 * - charity / farmer consumer → no subscription (go back)
 */
export function RestaurantPlanRouter() {
  const navigation = useNavigation<Nav>();
  const { selectedRole } = useAppContext();

  useEffect(() => {
    const route = getSubscriptionRoute(selectedRole);
    if (route) {
      navigation.replace(route);
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, selectedRole]);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={palette.kale} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.creme,
  },
});

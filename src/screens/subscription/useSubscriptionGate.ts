import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAppContext } from '@/store/AppContext';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import {
  canAccessSubscription,
  getSubscriptionRoute,
} from '@/utils/subscriptionAccess';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Blocks charity / farmer-consumer from subscription screens.
 * Sends restaurant multi to multi-site flow and others with access to single-site.
 */
export function useSubscriptionGate(expected: 'single' | 'multi') {
  const navigation = useNavigation<Nav>();
  const { selectedRole } = useAppContext();

  useEffect(() => {
    if (!canAccessSubscription(selectedRole)) {
      if (navigation.canGoBack()) navigation.goBack();
      return;
    }

    const route = getSubscriptionRoute(selectedRole);
    if (expected === 'single' && route === 'MultiSitePlans') {
      navigation.replace('MultiSitePlans');
      return;
    }
    if (expected === 'multi' && route === 'SingleSitePlans') {
      navigation.replace('SingleSitePlans');
    }
  }, [expected, navigation, selectedRole]);
}

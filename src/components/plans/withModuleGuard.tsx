import React, { useEffect } from 'react';
import { View } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';

import type { ProductModule } from '@/services/subscriptions.service';
import { useModuleGate } from '@/hooks/useModuleGate';
import { palette } from '@/theme/colors';

/**
 * Wraps a root route so an organisation without `module` gets its bottom
 * sheet instead: the route is replaced by ModuleUpsell, so closing the sheet
 * returns to where the person came from. For routes reachable from prompts,
 * links and notifications.
 */
export function withModuleGuard<P extends object>(
  Screen: React.ComponentType<P>,
  module: ProductModule,
): React.ComponentType<P> {
  function Guarded(props: P) {
    const { locked } = useModuleGate(module);
    const navigation = useNavigation();
    useEffect(() => {
      if (locked) navigation.dispatch(StackActions.replace('ModuleUpsell', { module }));
    }, [locked, navigation]);
    if (!locked) return <Screen {...props} />;
    return <View style={{ flex: 1, backgroundColor: palette.creme }} />;
  }
  Guarded.displayName = `withModuleGuard(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return Guarded;
}

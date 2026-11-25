import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import type { ProductModule } from '@/services/subscriptions.service';
import { useModuleGate } from '@/hooks/useModuleGate';
import { useUpsellSheetStore } from '@/store/upsellSheetStore';
import { palette } from '@/theme/colors';

/**
 * Wraps a root route so an organisation without `module` is sent back to where
 * it came from with the module's bottom sheet on top. For routes reachable from
 * prompts, links and notifications.
 */
export function withModuleGuard<P extends object>(
  Screen: React.ComponentType<P>,
  module: ProductModule,
): React.ComponentType<P> {
  function Guarded(props: P) {
    const { locked } = useModuleGate(module);
    const navigation = useNavigation();
    useEffect(() => {
      if (!locked) return;
      if (navigation.canGoBack()) navigation.goBack();
      useUpsellSheetStore.getState().show(module);
    }, [locked, navigation]);
    if (!locked) return <Screen {...props} />;
    return <View style={{ flex: 1, backgroundColor: palette.creme }} />;
  }
  Guarded.displayName = `withModuleGuard(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return Guarded;
}

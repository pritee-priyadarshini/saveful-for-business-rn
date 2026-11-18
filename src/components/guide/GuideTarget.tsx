import React, { useContext, useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { ScreenScrollContext } from '@/components/Screen';

import { useGuideContext } from './GuideProvider';

/**
 * Marks something a walkthrough step can point at. Renders a plain View, so
 * pass `style` when the child relied on its parent's layout (e.g. `flex: 1`).
 * Set `disabled` on every copy but the first when it wraps list items.
 */
export function GuideTarget({
  id,
  children,
  style,
  disabled,
}: {
  id: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  const guide = useGuideContext();
  const scroll = useContext(ScreenScrollContext);
  const ref = useRef<View>(null);

  useEffect(() => {
    if (!guide || disabled) return undefined;
    return guide.register(id, { ref, scroll });
  }, [disabled, guide?.register, id, scroll]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}

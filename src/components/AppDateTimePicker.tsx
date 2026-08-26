import React from 'react';
import { Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { ComponentProps } from 'react';

import { palette } from '@/theme/colors';

type Props = ComponentProps<typeof DateTimePicker>;

/**
 * iOS spinner wheels inherit a dark text color unless we force a light theme.
 * Without this, month/year/time labels render white on a white sheet.
 */
export function AppDateTimePicker(props: Props) {
  return (
    <DateTimePicker
      {...props}
      themeVariant="light"
      {...(Platform.OS === 'ios'
        ? {
            textColor: palette.black,
            accentColor: palette.kale,
          }
        : null)}
    />
  );
}

export type { DateTimePickerEvent } from '@react-native-community/datetimepicker';

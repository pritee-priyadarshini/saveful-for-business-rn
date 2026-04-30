import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DriverDeliveriesScreen } from '../screens/driver/DriverDeliveriesScreen';
import { DriverPickupConfirmScreen } from '../screens/driver/DriverPickupConfirmScreen';
import { DriverStackParamList } from './types';

const Stack = createNativeStackNavigator<DriverStackParamList>();

export function DriverStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverDeliveries" component={DriverDeliveriesScreen} />
      <Stack.Screen name="DriverPickupConfirm" component={DriverPickupConfirmScreen}  />
    </Stack.Navigator>
  );
}
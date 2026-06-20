import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { FarmerMapScreen } from '@/screens/farmer/FarmerMapScreen';
import FarmerPickupScreen from '@/screens/farmer/FarmerPickupScreen';
import { FarmerClaimConfirmationScreen } from '@/screens/farmer/FarmerClaimConfirmationScreen';

export type FarmerStackParamList = {
  FarmerMap: undefined;
  FarmerClaimConfirm: {
    listing?: any;
    payload?: any;
  };
  FarmerPickup: undefined;
};

const Stack = createNativeStackNavigator<FarmerStackParamList>();

export function FarmerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FarmerMap" component={FarmerMapScreen} />
      <Stack.Screen name="FarmerClaimConfirm" component={FarmerClaimConfirmationScreen} />
      <Stack.Screen name="FarmerPickup" component={FarmerPickupScreen} />
    </Stack.Navigator>
  );
}

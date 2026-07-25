import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { FarmerMapScreen } from '@/screens/farmer/FarmerMapScreen';
import FarmerPickupScreen from '@/screens/farmer/FarmerPickupScreen';
import { FarmerClaimConfirmationScreen } from '@/screens/farmer/FarmerClaimConfirmationScreen';
import { LivestockListingDetailsScreen } from '@/screens/farmer/LivestockListingDetailsScreen';

export type FarmerStackParamList = {
  FarmerMap: undefined;
  FarmerClaimConfirm: {
    listing?: any;
    payload?: any;
  };
  LivestockListingDetails: {
    listing?: any;
  };
  FarmerPickup: undefined;
};

const Stack = createNativeStackNavigator<FarmerStackParamList>();

export function FarmerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, orientation: 'portrait' }}>
      <Stack.Screen name="FarmerMap" component={FarmerMapScreen} />
      <Stack.Screen name="FarmerClaimConfirm" component={FarmerClaimConfirmationScreen} />
      <Stack.Screen name="LivestockListingDetails" component={LivestockListingDetailsScreen} />
      <Stack.Screen name="FarmerPickup" component={FarmerPickupScreen} />
    </Stack.Navigator>
  );
}

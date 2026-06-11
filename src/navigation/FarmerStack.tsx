import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LivestockListingDetailsScreen } from '@/screens/farmer/LivestockListingDetailsScreen';

export type FarmerStackParamList = {
  LivestockListingDetails: {
    listingId: string;
  };
};

const Stack = createNativeStackNavigator<FarmerStackParamList>();

export function FarmerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false,}}>
      <Stack.Screen name="LivestockListingDetails" component={LivestockListingDetailsScreen}/>
    </Stack.Navigator>
  );
}
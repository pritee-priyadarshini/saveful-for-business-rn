import React from 'react';
import { View } from 'react-native';
import { AppText } from '../../components/AppText';

export function FarmerHomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <AppText>Farmer Available Listings</AppText>
    </View>
  );
}
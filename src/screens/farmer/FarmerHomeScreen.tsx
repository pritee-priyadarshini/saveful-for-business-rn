import React from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { LocationRequiredBanner } from '../../components/LocationRequiredBanner';
import { LocationSetupModal } from '../../components/LocationSetupModal';
import { useAppContext } from '../../store/AppContext';
import { useOrganizationLocation } from '../../hooks/useOrganizationLocation';
import { palette } from '../../theme/colors';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => Math.round(size * (width / 375));

export function FarmerHomeScreen() {
  const { currentProfile } = useAppContext();
  const {
    showBanner,
    setBannerClosed,
    modalVisible,
    setModalVisible,
    saving,
    capturedAddress,
    saveLocation,
  } = useOrganizationLocation();

  const firstName = currentProfile.name?.split(' ')[0] || 'User';

  return (
    <Screen backgroundColor={palette.creme}>
      <LocationSetupModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={async ({ latitude, longitude, address }) => {
          await saveLocation(latitude, longitude, address);
        }}
        confirming={saving}
        searchPlaceholder="Search farm address..."
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <AppText variant="h5">Welcome back, {firstName}</AppText>
          <AppText variant="bodyLarge" style={styles.subtitle}>
            {currentProfile.organization || 'Your farm'}
          </AppText>
        </View>

        {showBanner && (
          <LocationRequiredBanner
            description="Set your farm location so buyers and charities can find your listings and arrange pickups."
            onUseGps={() => setModalVisible(true)}
            onSearchAddress={() => setModalVisible(true)}
            onDismiss={() => setBannerClosed(true)}
          />
        )}

        {!!capturedAddress && !showBanner && (
          <View style={styles.locationCapturedPill}>
            <AppText variant="caption">Location set: {capturedAddress}</AppText>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: hp(3),
    gap: hp(2),
  },
  header: {
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    gap: hp(0.5),
  },
  subtitle: {
    color: palette.midgray,
  },
  locationCapturedPill: {
    marginHorizontal: wp(4),
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderRadius: normalize(10),
    backgroundColor: '#F4F8EF',
  },
});

import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  ImageBackground,
  Dimensions,
} from 'react-native';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { palette } from '@/theme/colors';
import { estimateMealsSaved, resolveFoodIconSource, type FoodIconKey } from '../../utils/foodListing';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

export function ListingConfirmationScreen({ navigation, route }: any) {
  const { listing } = route.params || {};

  if (!listing) {
    return (
      <Screen backgroundColor={palette.creme}>
        <View style={styles.container}>
          <AppText>No listing data found.</AppText>
          <Pressable onPress={() => navigation.navigate('RestaurantHomeScreen')}>
            <AppText color={palette.primary}>Back to Home</AppText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const foodItems = Array.isArray(listing?.foodItems) ? listing.foodItems : [];
  const totalKgFromItems = foodItems.reduce(
    (sum: number, item: any) => sum + Number(item.totalQtyKg ?? item.qty ?? 0),
    0
  );
  const totalKg = Number(listing?.totalQtyKg ?? totalKgFromItems ?? 0);
  const meals = estimateMealsSaved(totalKg);
  const allergens = Array.isArray(listing?.allergens) ? listing.allergens : [];

  const formatDateTime = (date: any) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleString([], {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView contentContainerStyle={styles.container}>
        <ImageBackground
          source={require('../../../assets/placeholder/feed-bg.png')}
          style={styles.headerBg}
          resizeMode="cover"
        >
          <AppText variant="h4" style={styles.headerTitle}>
            Surplus Listed
          </AppText>
        </ImageBackground>

        <View style={styles.subHeader}>
          <AppText variant="bodyLarge" style={styles.center}>
            Your surplus is now live and we have notified nearby charities.
          </AppText>

          <AppText variant="bodyLarge" style={styles.center}>
            We’ll let you know as soon as someone claims it.
          </AppText>
        </View>

        <Card style={styles.card}>
          <View style={styles.section}>
            <AppText variant="bodyBold">Items</AppText>

            {foodItems.map((item: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemLabelRow}>
                  <Image
                    source={resolveFoodIconSource((item.iconKey as FoodIconKey) || 'defaultMeal')}
                    style={styles.itemIcon}
                  />
                  <AppText variant="body">{item.category || item.name}</AppText>
                </View>

                <AppText variant="body" style={styles.qtyText}>
                  {Number(item.totalQtyKg ?? item.qty ?? 0)} kg
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <AppText variant="bodyBold">Pickup Time</AppText>
            <AppText variant="body">
              {listing?.pickupFromTime ? formatDateTime(listing.pickupFromTime) : '--'} -{' '}
              {listing?.pickupByTime ? formatDateTime(listing.pickupByTime) : '--'}
            </AppText>
          </View>

          <View style={styles.section}>
            <AppText variant="bodyBold">Pickup Location</AppText>
            <AppText variant="body">{listing?.pickupAddress || 'N/A'}</AppText>
          </View>

          <View style={styles.section}>
            <AppText variant="bodyBold">Allergens</AppText>
            <AppText variant="body">{allergens.length > 0 ? allergens.join(', ') : 'None selected'}</AppText>
          </View>
        </Card>

        <Card style={styles.impactCard}>
          <View style={styles.impactContainer}>
            <View style={styles.impactLeft}>
              <AppText variant="bodyBold">Your Listing can create up to</AppText>

              <View style={styles.mealPill}>
                <AppText variant="h5" style={styles.mealText}>
                  {meals} meals
                </AppText>
              </View>

              <AppText variant="body">(420g = 1 meal)</AppText>
            </View>

            <Image
              source={require('../../../assets/placeholder/bowl.png')}
              style={styles.bowlImage}
              resizeMode="contain"
            />
          </View>
        </Card>

        <View style={styles.actions}>
          <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('CreateListing')}>
            <AppText variant="caption" style={styles.primaryText}>
              + List More Surplus
            </AppText>
          </Pressable>

          <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('RestaurantListings')}>
            <AppText variant="caption" style={styles.primaryText}>
              Go to Listing
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: hp(2),
    paddingBottom: hp(4),
  },
  headerBg: {
    width: '100%',
    height: hp(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: palette.white,
    textAlign: 'center',
    fontSize: normalize(24),
  },
  subHeader: {
    alignItems: 'center',
    paddingHorizontal: wp(5),
    gap: hp(1),
    marginVertical: hp(2),
  },
  center: {
    textAlign: 'center',
    fontSize: normalize(14),
  },
  card: {
    padding: wp(4),
    marginHorizontal: wp(4),
    borderRadius: normalize(16),
    gap: hp(2),
  },
  section: {
    gap: hp(0.5),
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: wp(3),
  },
  itemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    flex: 1,
  },
  itemIcon: {
    width: normalize(18),
    height: normalize(18),
  },
  qtyText: {
    textAlign: 'right',
  },
  impactCard: {
    padding: wp(5),
    marginHorizontal: wp(4),
    borderRadius: normalize(20),
    alignItems: 'center',
    backgroundColor: '#EEE7FF',
  },
  impactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  impactLeft: {
    flex: 1,
    gap: hp(1),
  },
  mealPill: {
    backgroundColor: palette.middlegreen,
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3.5),
    borderRadius: normalize(20),
    alignSelf: 'flex-start',
  },
  mealText: {
    color: palette.white,
    fontSize: normalize(18),
  },
  bowlImage: {
    width: wp(20),
    height: wp(20),
  },
  actions: {
    gap: hp(1.5),
    paddingHorizontal: wp(4),
    marginTop: hp(1),
  },
  primaryBtn: {
    backgroundColor: palette.primary,
    paddingVertical: hp(1.5),
    borderRadius: normalize(12),
    alignItems: 'center',
  },
  primaryText: {
    color: palette.white,
  },
});

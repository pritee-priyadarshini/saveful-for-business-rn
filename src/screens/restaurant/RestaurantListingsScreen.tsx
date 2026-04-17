import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ImageBackground,
} from 'react-native';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';

import { restaurantListings } from '../../data/mockData';
import { spacing } from '../../theme/spacing';
import { palette } from '@/theme/colors';

export function RestaurantListingsScreen({ navigation }: any) {

  const sortedListings = [...restaurantListings].reverse();

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* HEADER */}
        <ImageBackground
          source={require('../../../assets/placeholder/kale-header.png')}
          style={styles.headerBg}
          resizeMode="cover"
        >
          <AppText variant="h4" style={styles.headerTitle}>
            Your Listings
          </AppText>
        </ImageBackground>

        <View style={styles.subHeaderContainer}>
          <AppText variant="h7" style={styles.heroSubText}>
            Track your surplus and impact
          </AppText>
        </View>

        {/* CREATE LISTING CTA */}
        <Pressable
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateListing')}
        >
          <AppText style={styles.createText}>+ Create New Listing</AppText>
        </Pressable>

        <Pressable
          style={styles.createBtn}
          onPress={() => navigation.navigate('CollectionHistory')}
        >
          <AppText style={styles.createText}> See Collection History</AppText>
        </Pressable>

        {/* LISTINGS */}
        <View style={styles.section}>

          <View style={styles.headingContainer}>
            <Image
              source={require('../../../assets/placeholder/Illustration.png')}
              style={styles.headingBg}
            />

            <AppText variant="heading" style={styles.headingText}>
              Your Listing Today
            </AppText>
          </View>

          {sortedListings.length === 0 ? (
            <Card style={styles.emptyCard}>
              <AppText variant="bodyBold">No listings done for today!</AppText>
              <AppText variant="h7"> Start listing. Save Food. Save Money.</AppText>
            </Card>
          ) : (
            sortedListings.map((item) => (
              <Card key={item.id} style={styles.card}>

                {/* TOP */}
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyBold">{item.title}</AppText>
                    <AppText variant="caption">
                      {item.quantityKg}kg • {item.pickupWindow}
                    </AppText>
                  </View>

                  <View style={styles.status}>
                    <AppText variant="caption">{item.status}</AppText>
                  </View>
                </View>

                {/* DETAILS */}
                <View style={styles.detailsRow}>
                  <Image
                    source={require('../../../assets/placeholder/bowl.png')}
                    style={styles.image}
                  />

                  <View style={{ flex: 1 }}>
                    <AppText variant="caption">
                      📍 {item.suburb}
                    </AppText>

                    <AppText variant="caption">
                      {item.receiver
                        ? `Collected by ${item.receiver}`
                        : 'Waiting for charity'}
                    </AppText>
                  </View>
                </View>

              </Card>
            ))
          )}

        </View>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },

  headerBg: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    color: palette.white,
    textAlign: 'center',
  },

  subHeaderContainer: {
    alignItems: 'center',
  },

  heroSubText: {
    color: palette.black,
    lineHeight: 30,
    opacity: 0.9,
  },

  createBtn: {
    backgroundColor: palette.eggplant,
    padding: spacing.md,
    borderRadius: 16,
    marginLeft: spacing.xl,
    marginRight: spacing.xl,
    alignItems: 'center',
  },

  createText: {
    color: 'white',
  },

  section: {
    gap: spacing.md,
  },

  headingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
  },

  headingBg: {
    position: 'absolute',
    width: '100%',
    height: 80,
    resizeMode: 'contain',
    borderRadius: 12,
  },

  headingText: {
    textAlign: 'center',
  },

  emptyCard: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },

  card: {
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: 16,
    gap: spacing.md,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  status: {
    backgroundColor: '#EEE7FF',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 14,
  },

  detailsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },

  image: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
});
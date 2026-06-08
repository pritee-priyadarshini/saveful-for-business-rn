import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ImageBackground,
} from 'react-native';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';

import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type HistoryItem = {
  id: string;
  title: string;
  address: string;
  date: string;
  time: string;
  items: { name: string; qty: number }[];
  rating: number;
};

/* MOCK DATA */
const mockHistory: HistoryItem[] = [
  {
    id: '1',
    title: 'Pizza Hut',
    address: 'MG Road, Bangalore',
    date: '12/04/26',
    time: '2:00 PM',
    items: [
      { name: 'Bread', qty: 5 },
      { name: 'Rice', qty: 10 },
    ],
    rating: 4,
  },
  {
    id: '2',
    title: 'Red Dragon',
    address: 'Marathahalli',
    date: '11/04/26',
    time: '5:00 PM',
    items: [
      { name: 'Cooked Food', qty: 15 },
    ],
    rating: 5,
  },
];

export function DriverHistoryScreen() {
  /* TOTAL COLLECTION COUNT */
  const totalCollections = mockHistory.length;

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const totalQty = item.items.reduce(
      (sum, i) => sum + i.qty,
      0
    );

    return (
      <View style={styles.card}>
        <AppText variant="bodyBold">{item.title}</AppText>
        <AppText variant="bodySmall">📍 {item.address}</AppText>

        <View style={styles.rowBetween}>
          <AppText variant="bodyBold">Date: {item.date}</AppText>
          <AppText variant="bodyBold">Time: {item.time}</AppText>
        </View>

        <View>
          <AppText variant="bodyBold">Items Collected</AppText>

          {item.items.map((i, index) => (
            <View key={index} style={styles.rowBetween}>
              <AppText variant="bodySmall">{i.name}</AppText>
              <AppText variant="bodySmall">{i.qty} kg</AppText>
            </View>
          ))}
        </View>

        <View style={styles.rowBetween}>
          <AppText variant="bodyBold">Total</AppText>
          <AppText variant="bodyBold">{totalQty} kg</AppText>
        </View>

        <View>
          <AppText variant="bodyBold">Your Rating</AppText>

          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((r) => (
              <AppText 
                key={r}
                style={[
                  styles.tomato,
                  { opacity: r <= item.rating ? 1 : 0.3 },
                ]}
              >
                🍅
              </AppText>
            ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Screen scrollable={false} backgroundColor={palette.creme}>
      <FlatList
        data={mockHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <>
            {/* HEADER */}
            <ImageBackground
              source={require('../../../assets/placeholder/feed-bg.png')}
              style={styles.headerBg}
            >
              <AppText variant="h4" style={styles.headerText}> Pickup History </AppText>
            </ImageBackground>

            <View style={styles.summaryCard}>
              <AppText variant="subheading">
                Total Collections
              </AppText>

              <View style={styles.countPill}>
                <AppText variant="subheading" style={{ color: palette.white }}>
                  {totalCollections}
                </AppText>
              </View>
            </View>
          </>
        }
        contentContainerStyle={{ paddingBottom: spacing.lg }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBg: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerText: {
    color: palette.white,
  },

  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: spacing.md,
  },

  countPill: {
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },

  card: {
    backgroundColor: palette.radish,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.sm,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  ratingRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },

  tomato: {
    fontSize: 28,
    lineHeight:30,
    marginRight: 4,
  },
});
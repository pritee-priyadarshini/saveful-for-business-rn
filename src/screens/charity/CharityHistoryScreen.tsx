import React, { useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  Pressable,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';

import { spacing } from '../../theme/spacing';
import { palette } from '../../theme/colors';

// DEMO DATA
const historyData = [
  {
    id: '1',
    business: 'Saveful Bakery',
    date: '2026-04-01T16:30:00',
    status: 'Completed',
    items: [
      { name: 'Rice', qty: 3 },
      { name: 'Bread', qty: 3 },
    ],
  },
  {
    id: '2',
    business: 'Harvest Cafe',
    date: '2026-03-31T18:00:00',
    status: 'Completed',
    items: [
      { name: 'Fruits', qty: 6 },
      { name: 'Vegetables', qty: 4 },
    ],
  },
  {
    id: '3',
    business: 'Market Kitchen',
    date: '2026-03-29T17:00:00',
    status: 'Cancelled',
    items: [
      { name: 'Pasta', qty: 2 },
      { name: 'Salad', qty: 2 },
    ],
  },
  {
    id: '4',
    business: 'My Cloud Kitchen',
    date: '2026-02-29T20:00:00',
    status: 'Completed',
    items: [
      { name: 'Fresh Fruits', qty: 6 },
      { name: 'Meat', qty: 5 },
    ],
  },
  {
    id: '5',
    business: 'Billy Billy Kitchen',
    date: '2026-01-20T13:00:00',
    status: 'Cancelled',
    items: [
      { name: 'Cooked Food', qty: 9 },
      { name: 'Cooked Meat', qty: 4 },
    ],
  },
];

export function CharityHistoryScreen() {
  const navigation = useNavigation();

  const sortedData = useMemo(() => {
    return [...historyData].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  };

  const getTotalQty = (items: any[]) =>
    items.reduce((acc, i) => acc + i.qty, 0);

  const renderItem = ({ item, index }: any) => (
    <View style={styles.row}>
      {/* TIMELINE */}
      <View style={styles.timeline}>
        <View style={styles.dot} />
        {index !== sortedData.length - 1 && <View style={styles.line} />}
      </View>

      {/* CARD */}
      <View style={styles.card}>
        <AppText variant='subheading'>{item.business}</AppText>

        {/* DATE */}
        <AppText variant='bodySmall'>
          {formatDate(item.date)}
        </AppText>

        {/* ITEMS */}
        <View style={styles.itemsContainer}>
          {item.items.map((i: any) => (
            <View key={i.name} style={styles.rowBetween}>
              <AppText variant='bodySmall'>{i.name}</AppText>
              <AppText variant='label'>{i.qty} kg</AppText>
            </View>
          ))}
        </View>

        {/* TOTAL + STATUS */}
        <View style={styles.rowBetween}>
          <AppText variant='label'>
            Total: {getTotalQty(item.items)} kg
          </AppText>

          <View
            style={[
              styles.status,
              item.status === 'Completed'
                ? styles.success
                : styles.cancel,
            ]}
          >
            <AppText variant='bodySmall'
              style={[
                item.status === 'Completed'
                  ? styles.successText
                  : styles.cancelText,
              ]}
            >
              {item.status}
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <Screen backgroundColor={palette.creme} scrollable={false}>
      {/* HEADER */}
      <ImageBackground
        source={require('../../../assets/placeholder/feed-bg.png')}
        style={styles.headerBg}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={palette.white} />
        </Pressable>

        <AppText variant='h5' style={styles.headerTitle}>
          Collection History
        </AppText>
      </ImageBackground>

      <FlatList
        data={sortedData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },

  headerBg: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  headerTitle: {
    color: palette.white,
  },

  backBtn: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.md,
    padding: 6,
  },

  row: {
    flexDirection: 'row',
  },

  timeline: {
    width: 30,
    alignItems: 'center',
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.primary,
    marginTop: 6,
  },

  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#E0E0E0',
    marginTop: 2,
  },

  card: {
    flex: 1,
    backgroundColor: palette.radish,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 16,
    gap: spacing.xs,
  },

  itemsContainer: {
    marginTop: spacing.sm,
    gap: 4,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },

  status: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  success: {
    backgroundColor: '#E6F6EC',
  },

  cancel: {
    backgroundColor: '#FDECEA',
  },

  successText: {
    color: palette.success,
  },

  cancelText: {
    color: palette.danger,
  },
});
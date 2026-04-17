import React, { useState } from 'react';
import { Modal, FlatList, Pressable, StyleSheet, View, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';

import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { PostPickupSurveyModal } from './components/postPickupSurveyModal';

export function RestaurantUpdatesScreen() {

  const [modalVisible, setModalVisible] = React.useState(false);

  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickupStatus, setPickupStatus] = useState<Record<string, 'completed' | 'cancelled'>>({});
  const sections = [
    {
      title: 'Today',
      data: [
        {
          id: '1',
          type: 'full',
          charity: 'Food Rescue Org',
          date: 'Apr 15',
          time: '5:15 PM',
          quantity: 8,
          items: [
            { name: 'Rice', qty: '5kg' },
            { name: 'Dal', qty: '3kg' },
          ]

        },
        {
          id: '2',
          type: 'partial',
          charity: 'Helping Hands',
          quantity: 5,
          date: 'Apr 15',
          time: '5:45 PM',
          items: [
            { name: 'Baked Goods', qty: '5kg' },
            { name: 'Meat', qty: '7kg' },]
        },
      ],
    },
    {
      title: 'Yesterday',
      data: [
        {
          id: '3',
          type: 'completed',
          charity: 'Food Rescue Org',
        },
      ],
    },
  ];

  const renderCard = (item: any) => {
    const bgColor =
      item.type === 'full'
        ? palette.middlegreen
        : item.type === 'partial'
          ? palette.radish
          : palette.mint;

    if (item.type === 'completed') {
      return (
        <View style={[styles.cardBase, { backgroundColor: bgColor }]}>
          <AppText variant="h7"> Surplus Collected 🎉 </AppText>

          <AppText variant="bodySmall" >
            You’ve successfully shared food with a charity
          </AppText>

          <View style={styles.metaRow}>
            <View style={styles.metaCard}>
              <AppText variant='bodySmall'>14/04/2026</AppText>
              <AppText variant='label' style={{ textAlign: 'center' }}>Date</AppText>
            </View>

            <View style={styles.metaCard}>
              <AppText variant='bodySmall'>8 kg</AppText>
               <AppText variant='label'style={{ textAlign: 'center' }}> Food Saved (Kgs)</AppText>
            </View>

            <View style={styles.metaCard}>
              <AppText variant='bodySmall'>20</AppText>
              <AppText variant='label'style={{ textAlign: 'center' }}>Meals Created</AppText>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.cardBase, { backgroundColor: bgColor }]}>
        {/* TITLE */}
        <AppText variant="h7">
          {item.type === 'full' ? 'Surplus Claimed!' : 'Partially Claimed'}
        </AppText>

        {/* DESCRIPTION */}
        <AppText variant="bodySmall">
          <AppText variant="label" >
            {item.charity}
          </AppText>{' '}
          {item.type === 'full'
            ? 'is on the way to collect your surplus'
            : `claimed ${item.quantity} kg`}
        </AppText>

        {/* META ROW */}
        <View style={styles.metaRow}>
          <View style={styles.metaCard}>
            <AppText variant='label'>Qty</AppText>
            <AppText variant='bodySmall'>{item.quantity}kg</AppText>
          </View>

          <View style={styles.metaCard}>
            <AppText variant='label'>Date</AppText>
            <AppText variant='bodySmall'>{item.date}</AppText>
          </View>

          <View style={styles.metaCard}>
            <AppText variant='label'>Time</AppText>
            <AppText variant='bodySmall'>{item.time}</AppText>
          </View>

          <Pressable
            style={styles.metaCard}
            onPress={() => {
              setSelectedItems(item.items || []);
              setDetailsModalVisible(true);
            }}
          >
            <AppText variant='bodySmall'>Click Here For Details</AppText>
          </Pressable>
        </View>

        {/* ACTIONS */}
        <AppText variant='label'>Contact</AppText>
        <View style={styles.actionRow}>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="call-outline" size={16} />
          </Pressable>

          <Pressable style={styles.iconBtn}>
            <Ionicons name="chatbubble-outline" size={16} />
          </Pressable>

          <Pressable style={styles.iconBtn}>
            <Ionicons name="location-outline" size={16} />
          </Pressable>
        </View>

        {/* PARTIAL EXTRA */}
        {item.type === 'partial' && (
          <View style={styles.nextBox}>
            <AppText variant='body'>What’s next</AppText>
            <AppText variant='bodySmall'>
              Remaining surplus is still being shared
            </AppText>
          </View>
        )}

        {/* CTA / STATUS */}
        {pickupStatus[item.id] === 'completed' ? (
          <AppText style={styles.completedText}>
            ✔ Pickup & survey completed
          </AppText>
        ) : pickupStatus[item.id] === 'cancelled' ? (
          <AppText style={styles.cancelledText}>
            ✖ Pickup cancelled & survey completed
          </AppText>
        ) : (
          <Pressable
            style={styles.ctaBtn}
            onPress={() => {
              setSelectedId(item.id);
              setModalVisible(true);
            }}
          >
            <AppText style={styles.ctaText}>
              Complete Pickup
            </AppText>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <Screen backgroundColor={palette.creme} scrollable={false}>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <ImageBackground
            source={require('../../../assets/placeholder/feed-bg.png')}
            style={styles.headerBg}
            resizeMode="cover"
          >
            <AppText variant="h4" style={styles.headerTitle}>
              Updates
            </AppText>
          </ImageBackground>
        }
        renderItem={({ item }) => (
          <View style={styles.section}>
            <AppText variant="label" >{item.title}</AppText>

            <View style={styles.sectionCard}>
              {item.data.map((d: any) => (
                <View key={d.id}>{renderCard(d)}</View>
              ))}
            </View>
          </View>
        )}
      />
      <PostPickupSurveyModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        selectedId={selectedId}
        onComplete={(id, status) => {
          setPickupStatus(prev => ({
            ...prev,
            [id]: status,
          }));
          setModalVisible(false);
        }}
      />

      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText variant='label'>Food Items</AppText>

            {selectedItems.map((food: any, index: number) => (
              <AppText key={index} variant='bodyLarge'>
                • {food.name} ({food.qty})
              </AppText>
            ))}

            <Pressable
              style={styles.closeBtn}
              onPress={() => setDetailsModalVisible(false)}
            >
              <AppText style={styles.closeBtnText}>Close</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },

  headerBg: {
    height: 140,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },

  headerTitle: {
    color: palette.white,
  },

  section: {
    marginHorizontal: spacing.xl,
    gap: spacing.sm,
  },

  sectionCard: {
    backgroundColor: palette.white,
    borderRadius: 22,
    padding: spacing.sm,
    gap: spacing.sm,
    elevation: 3,
  },

  card: {
    padding: spacing.md,
    borderRadius: 18,
    gap: spacing.sm,
  },
  cardBase: {
    padding: spacing.md,
    borderRadius: 18,
    gap: spacing.sm,
  },

  metaRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },

  metaCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: palette.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  viewBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },

  viewBtnText: {
    color: palette.primary,
  },

  itemsBox: {
    marginTop: spacing.sm,
    gap: 4,
  },

  metaColLeft: {
    flex: 1,
  },

  metaColCenter: {
    flex: 1,
    alignItems: 'center',
  },

  metaColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },

  nextBox: {
    marginTop: spacing.sm,
  },

  impactBox: {
    marginTop: spacing.sm,
  },

  metaBox: {
    marginTop: spacing.sm,
    gap: 2,
  },

  full: {
    backgroundColor: palette.middlegreen,
  },

  partial: {
    backgroundColor: palette.radish,
  },

  completed: {
    backgroundColor: palette.mint,
  },

  pickupBox: {
    gap: spacing.sm,
  },

  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  next: {
    marginTop: spacing.sm,
  },

  ctaBtn: {
    marginTop: spacing.sm,
    backgroundColor: palette.primary,
    padding: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
  },

  ctaText: {
    color: palette.white,
  },

  completedText: {
    marginTop: spacing.sm,
    color: '#2E7D32',
  },

  cancelledText: {
    marginTop: spacing.sm,
    color: palette.chilli,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    width: '85%',
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },

  modalTitle: {
    marginBottom: spacing.sm,
  },

  closeBtn: {
    marginTop: spacing.md,
    backgroundColor: palette.primary,
    padding: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
  },

  closeBtnText: {
    color: palette.white,
  },
});
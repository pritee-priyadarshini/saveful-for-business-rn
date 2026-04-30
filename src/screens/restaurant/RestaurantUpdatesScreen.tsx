import React, { useState } from 'react';
import { Modal, FlatList, Pressable, StyleSheet, View, ImageBackground, Alert, Linking } from 'react-native';
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
          ],
          charityPhone: '+91 9876543210',
          driverName: 'Rakesh Sahu',
          driverPhone: '+91 9123456789',
          driverStatus: 'driver_assigned',
          location: 'Patia, Bhubaneswar',
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
            { name: 'Meat', qty: '7kg' },
          ],
          charityPhone: '+91 9988776655',
          driverName: 'Amit Das',
          driverPhone: '+91 9001122334',
          driverStatus: 'enroute',
          location: 'Khandagiri, Bhubaneswar',
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
          driverName: null,
          driverPhone: null,
          driverStatus: null,
          charityPhone: '+91 9876543210',
          location: 'Patia, Bhubaneswar',
        },
      ],
    },
  ];

  const makeCall = async ( phone?: string | null ) => {
    if (!phone) {
      Alert.alert( 'Unavailable', 'Phone number not available' );
      return;
    }

    const cleanPhone = phone.replace( /[^+\d]/g, '' );
    const url = `tel:${cleanPhone}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert( 'Error', 'Unable to open dialer' );
    }
  };

  const sendMessage = async (phone?: string | null) => {
    if (!phone) {
      Alert.alert('Unavailable', 'Phone number not available');
      return;
    }
    const url = `sms:${phone}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  };

  const prettyStatus = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

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

          <AppText variant="bodySmall" > You’ve successfully shared food with a charity </AppText>

          <View style={styles.metaRow}>
            <View style={styles.metaCard}>
              <AppText variant='label' style={{ textAlign: 'center' }}>Date</AppText>
              <AppText variant='bodySmall'>14/04/2026</AppText>
            </View>

            <View style={styles.metaCard}>
              <AppText variant='label' style={{ textAlign: 'center' }}> Food Saved (Kgs)</AppText>
              <AppText variant='bodySmall'>8 kg</AppText>
            </View>

            <View style={styles.metaCard}>
              <AppText variant='label' style={{ textAlign: 'center' }}>Meals Created</AppText>
              <AppText variant='bodySmall'>20</AppText>
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

        {/* DESCRIPTION + DRIVER DETAILS */}
        <View style={styles.topInfoRow}>
          {/* LEFT */}
          <View style={{ flex: 1 }}>
            <AppText variant="bodySmall">
              <AppText variant="label"> {item.charity} </AppText>{' '}
              {item.type === 'full' ? 'is on the way' : `claimed ${item.quantity} kg`}
            </AppText>

            <AppText variant="bodySmall" style={styles.locationText} > 📍 {item.location} </AppText>

            <AppText variant="label" style={styles.driverName} >
              Driver: {item.driverName || 'Driver will be assigned soon'}
            </AppText>
          </View>

          {/* RIGHT */}
          <View style={styles.rightStatus}>
            <View style={styles.driverStatusPill}>
              <AppText variant="bodySmall" style={styles.driverStatusText}>
                Status: {item.driverStatus ? prettyStatus(item.driverStatus) : 'Awaiting Driver'}
              </AppText>
            </View>
          </View>
        </View>

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
        <View style={styles.contactRow}>
          <AppText variant="label"> Contact Charity </AppText>

          <View style={styles.actionRow}>
            <Pressable
              style={styles.iconPill}
              onPress={() => makeCall(item.charityPhone)}
            >
              <Ionicons
                name="call-outline"
                size={16}
                color={palette.black}
              />
              <AppText variant='label' style={styles.iconText}> Call </AppText>
            </Pressable>

            <Pressable
              style={styles.iconPill}
              onPress={() => sendMessage(item.charityPhone)}
            >
              <Ionicons
                name="chatbubble-outline"
                size={16}
                color={palette.black}
              />
              <AppText variant='label' style={styles.iconText}> Message </AppText>
            </Pressable>
          </View>
        </View>


        <View style={styles.contactRow}>
          <AppText variant="label"> Contact Driver </AppText>

          <View style={styles.actionRow}>
            <Pressable
              style={styles.iconPill}
              onPress={() => makeCall(item.driverPhone)}
            >
              <Ionicons
                name="call-outline"
                size={16}
                color={palette.black}
              />
              <AppText variant='label' style={styles.iconText}> Call </AppText>
            </Pressable>

            <Pressable
              style={styles.iconPill}
              onPress={() => sendMessage(item.driverPhone)}
            >
              <Ionicons
                name="chatbubble-outline"
                size={16}
                color={palette.black}
              />
              <AppText variant='label' style={styles.iconText}> Message </AppText>
            </Pressable>
          </View>
        </View>



        {/* PARTIAL EXTRA */}
        {item.type === 'partial' && (
          <View style={styles.nextBox}>
            <AppText variant='body'>What’s next</AppText>
            <AppText variant='bodySmall'> Remaining surplus is still being shared </AppText>
          </View>
        )}

        {/* CTA / STATUS */}
        {pickupStatus[item.id] === 'completed' ? (
          <AppText style={styles.completedText}> ✔ Pickup & survey completed </AppText>
        ) : pickupStatus[item.id] === 'cancelled' ? (
          <AppText style={styles.cancelledText}> ✖ Pickup cancelled & survey completed </AppText>
        ) : (
          <Pressable
            style={styles.ctaBtn}
            onPress={() => {
              setSelectedId(item.id);
              setModalVisible(true);
            }}
          >
            <AppText style={styles.ctaText}> Complete Pickup </AppText>
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
            <AppText variant="h4" style={styles.headerTitle}> Updates </AppText>
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
              <AppText key={index} variant='bodyLarge'> • {food.name} ({food.qty}) </AppText>
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

  nextBox: {
    marginTop: spacing.sm,
  },

  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  driverStatusPill: {
    minWidth: 90,
    minHeight: 28,
    backgroundColor: palette.creme,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },

  driverStatusText: {
    color: palette.stone,
    includeFontPadding: false,
  },

  iconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: palette.creme,
  },

  iconText: {
    color: palette.black,
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

  topInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },

  rightStatus: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },

  locationText: {
    marginTop: 4,
    opacity: 0.8,
  },

  driverName: {
    marginTop: spacing.sm,
    opacity: 0.8,
  },

  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
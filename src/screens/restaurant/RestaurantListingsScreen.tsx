import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ImageBackground,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';

import { restaurantListings } from '../../data/mockData';
import { spacing } from '../../theme/spacing';
import { palette } from '@/theme/colors';
import { ListingStatus, OrderStatus } from '@/types';

const listingDetails: {
  charityName: string | null;
  charityLocation: string | null;
  charityPhone: string | null;
  driverName: string | null;
  driverPhone: string | null;
  listingStatus: ListingStatus;
  orderStatus: OrderStatus | null;
  instructions: string;
  items: any[];
}[] = [
    {
      charityName: 'Feeding Hands Foundation',
      charityLocation: 'Patia, Bhubaneswar',
      charityPhone: '+91 9876511111',
      driverName: 'Rakesh Kumar',
      driverPhone: '+91 9876522222',
      listingStatus: 'Claimed',
      orderStatus: 'driver_assigned',
      instructions: 'Needs refrigeration',
      items: [
        { name: 'Rice', qty: 5 },
        { name: 'Dal', qty: 8 },
        { name: 'Sweets', qty: 4 },
      ],
    },

    {
      charityName: 'Odisha Food Relief',
      charityLocation: 'Khandagiri, Bhubaneswar',
      charityPhone: '+91 9876533333',
      driverName: 'Amit Das',
      driverPhone: '+91 9876544444',
      listingStatus: 'Partial claimed',
      orderStatus: 'enroute',
      instructions: 'Consume within 6 hours',
      items: [
        { name: 'Fruits', claimed: 6, left: 4 },
        { name: 'Vegetables', claimed: 4, left: 2 },
        { name: 'Bread', claimed: 3, left: 1 },
      ],
    },

    {
      charityName: null,
      charityLocation: null,
      charityPhone: null,
      driverName: null,
      driverPhone: null,
      listingStatus: 'Available',
      orderStatus: null,
      instructions: 'Needs reheating before serving',
      items: [
        { name: 'Rice', qty: 10 },
        { name: 'Fruits', qty: 5 },
        { name: 'Bakery Products', qty: 7 },
        { name: 'Cookies', qty: 3 },
      ],
    },
  ];

function prettyStatus(status: string) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function RestaurantListingsScreen({ navigation }: any) {
  const localListings = [
    ...restaurantListings,
    {
      id: 'available-surplus',
      title: 'Surplus Listing',
      businessName: 'Demo',
      type: 'Food',
      suburb: 'Saheed Nagar, Bhubaneswar',
      quantityKg: 26,
      distance: '',
      pickupWindow: '7:00pm - 9:00pm',
      pickupDate: '28/04/2026',
      pickupTime: '7:00pm - 9:00pm',
    },
  ];

  const sortedListings = [...localListings].reverse();

  const [modalVisible, setModalVisible] = React.useState(false);

  const [selectedItems, setSelectedItems] = React.useState<any[]>([]);

  const [selectedListingStatus, setSelectedListingStatus] = React.useState<ListingStatus>('Available');


  const makeCall = async (phone?: string | null) => {
    if (!phone) {
      Alert.alert('Unavailable', 'Phone number not available');
      return;
    }

    const cleanPhone = phone.replace(/[^+\d]/g, '');
    const url = `tel:${cleanPhone}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Unable to open dialer');
    }
  };


  const sendMessage = async (phone?: string | null) => {
    if (!phone) {
      Alert.alert('Unavailable', 'Phone number not available');
      return;
    }

    const url = `sms:${phone}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView contentContainerStyle={styles.container}>
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

        <Pressable
          style={styles.createBtn}
          onPress={() =>
            navigation.navigate('CreateListing')
          }
        >
          <AppText variant='bodyBold' style={styles.createText}>
            + Create New Listing
          </AppText>
        </Pressable>

        <Pressable
          style={styles.createBtn}
          onPress={() =>
            navigation.navigate('CollectionHistory')
          }
        >
          <AppText variant='bodyBold' style={styles.createText}>
            See Collection History
          </AppText>
        </Pressable>

        <View style={styles.section}>
          <View style={styles.headingContainer}>
            <Image
              source={require('../../../assets/placeholder/Illustration.png')}
              style={styles.headingBg}
            />

            <AppText variant="heading" style={styles.headingText} >
              Your Listing Today
            </AppText>
          </View>

          {sortedListings.map((item, index) => {
            const detail = Object.values(listingDetails)[index] || Object.values(listingDetails)[0];

            return (
              <Card
                key={item.id}
                style={styles.card}
              >
                {/* Charity */}
                <View style={styles.topRow}>
                  {/* LEFT */}
                  <View style={styles.charityBlock}>
                    <AppText variant="bodyBold">
                      {detail.charityName || 'Surplus still available'}
                    </AppText>

                    <AppText variant="caption">
                      📍 {detail.charityLocation || 'Nearby charities have been notified'}
                    </AppText>

                    <AppText variant="caption" style={styles.driverText}
                    >
                      {detail.listingStatus === 'Available'
                        ? 'Driver will be assigned once surplus is accepted'
                        : prettyStatus(
                          detail.orderStatus || 'awaiting_driver'
                        )}
                    </AppText>

                    {!!detail.driverName && (
                      <AppText variant="caption">
                        Driver: {detail.driverName}
                      </AppText>
                    )}
                  </View>

                  {/* RIGHT */}
                  <View style={styles.statusWrap}>
                    <View style={styles.statusPill}>
                      <AppText variant="label" style={styles.statusText} >
                        {detail.listingStatus}
                      </AppText>
                    </View>

                    {detail.listingStatus !== 'Available' && (
                      <Pressable
                        style={styles.trackBtn}
                        onPress={() =>
                          navigation.navigate('DriverTracking', {
                            trackingId: item.id,
                            source: 'restaurant',
                          })
                        }
                      >
                        <AppText
                          variant="label"
                          style={styles.trackText}
                        >
                          Track
                        </AppText>
                      </Pressable>
                    )}
                  </View>
                </View>


                {/* Cards */}
                <View
                  style={styles.metaRow}
                >
                  <Pressable
                    style={styles.metaCard}
                    onPress={() => {
                      setSelectedItems(detail.items);
                      setSelectedListingStatus(detail.listingStatus);
                      setModalVisible(true);
                    }}
                  >
                    <AppText variant="label"> Items </AppText>

                    <View style={styles.viewBtn}>
                      <AppText variant='label' style={styles.viewText}> View </AppText>
                    </View>
                  </Pressable>

                  <View style={styles.metaCard} >
                    <AppText variant="label"> Pickup Date </AppText>
                    <AppText variant="bodySmall"> {item.pickupDate} </AppText>
                  </View>

                  <View style={styles.metaCard} >
                    <AppText variant="label"> Pickup Time </AppText>
                    <AppText variant="bodySmall"> {item.pickupTime} </AppText>
                  </View>
                </View>

                {/* Instructions */}
                <View style={styles.infoBlock} >
                  <AppText variant="caption"> Instructions:{' '} {detail.instructions} </AppText>
                </View>

                {/* Contact */}
                {detail.charityName && (
                  <View style={styles.contactLine}>
                    <AppText variant="bodyBold"> Contact Charity </AppText>

                    <View style={styles.iconRow}>
                      <Pressable
                        style={styles.iconPill}
                        onPress={() =>
                          makeCall(detail.charityPhone)
                        }
                      >
                        <Ionicons
                          name="call-outline"
                          size={18}
                          color={palette.white}
                        />
                        <AppText variant="label" style={styles.iconText} > Call </AppText>
                      </Pressable>

                      <Pressable
                        style={styles.iconPill}
                        onPress={() =>
                          sendMessage(detail.charityPhone)
                        }
                      >
                        <Ionicons
                          name="chatbubble-outline"
                          size={18}
                          color={palette.white}
                        />
                        <AppText variant="label" style={styles.iconText} > Message </AppText>
                      </Pressable>
                    </View>

                  </View>
                )}

                {detail.driverName && (
                  <View style={styles.contactLine}>
                    <AppText variant="bodyBold"> Contact Driver </AppText>

                    <View style={styles.iconRow}>
                      <Pressable
                        style={styles.iconPill}
                        onPress={() =>
                          makeCall(detail.driverPhone)
                        }
                      >
                        <Ionicons
                          name="call-outline"
                          size={18}
                          color={palette.white}
                        />
                        <AppText variant="label" style={styles.iconText} > Call </AppText>
                      </Pressable>

                      <Pressable
                        style={styles.iconPill}
                        onPress={() =>
                          sendMessage(detail.driverPhone)
                        }
                      >
                        <Ionicons
                          name="chatbubble-outline"
                          size={18}
                          color={palette.white}
                        />
                        <AppText variant="label" style={styles.iconText} > Message </AppText>
                      </Pressable>
                    </View>
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopBar}>
              <AppText variant="h6"> Listed Food </AppText>

              <Pressable
                style={styles.closeIconBtn}
                onPress={() =>
                  setModalVisible(false)
                }
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={palette.black}
                />
              </Pressable>
            </View>

            {/* HEADER */}
            <View style={styles.modalHeaderRow}>
              <AppText variant="bodyBold" style={{ flex: 2 }} > Item Name </AppText>

              <AppText variant="bodyBold" style={styles.modalCol} > Available </AppText>

              {selectedListingStatus !== 'Available' && (
                <AppText variant="bodyBold" style={styles.modalCol} > Claimed </AppText>
              )}
            </View>

            {/* ROWS */}
            {selectedItems.map((item, idx) => {
              const available = 'claimed' in item ? item.claimed + item.left : item.qty;
              const claimed = 'claimed' in item ? item.claimed : item.qty;

              return (
                <View key={idx} style={styles.modalItemRow} >
                  <AppText variant="label" style={{ flex: 2 }} > {item.name} </AppText>
                  <AppText variant="bodySmall" style={styles.modalCol} > {available}kg </AppText>
                  {selectedListingStatus !== 'Available' && (
                    <AppText variant="bodySmall" style={styles.modalCol} > {claimed}kg </AppText>
                  )}
                </View>
              );
            })}

            <AppText variant="bodyBold">
              Total Quantity:{' '}
              {selectedItems.reduce(
                (sum, item) =>
                  sum +
                  ('claimed' in item
                    ? item.claimed + item.left
                    : item.qty),
                0
              )} kg
            </AppText>

            {selectedListingStatus !== 'Available' && (
              <AppText variant="bodyBold">
                Total Claimed:{' '}
                {selectedItems.reduce(
                  (sum, item) =>
                    sum +
                    ('claimed' in item
                      ? item.claimed
                      : item.qty),
                  0
                )} kg
              </AppText>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },

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
    backgroundColor: palette.primary,
    padding: spacing.md,
    borderRadius: 16,
    marginHorizontal: spacing.xl,
    alignItems: 'center',
  },

  createText: { color: 'white' },

  section: { gap: spacing.md },

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
  },

  headingText: {
    textAlign: 'center',
  },

  card: {
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: 16,
    gap: spacing.md,
    backgroundColor: palette.radish,
  },

  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: palette.middlegreen,
    width: 115,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    alignItems:'center',
  },

  statusText: {
    color: palette.white,
  },

  modalHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: palette.border,
  },

  modalItemRow: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
  },

  modalCol: {
    flex: 1,
    textAlign: 'center',
  },

  driverText: {
    color: palette.stone,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  charityBlock: {
    flex: 1,
    gap: 4,
  },

  contactLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },

  trackBtn: {
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    width: 115,
  },

  trackText: {
    color: 'white',
  },

  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  metaCard: {
    flex: 1,
    backgroundColor: palette.creme,
    padding: spacing.sm,
    borderRadius: 12,
    gap: 8,
    alignItems: 'center',
  },

  infoBlock: {
    backgroundColor: palette.white,
    padding: spacing.sm,
    borderRadius: 10,
  },

  viewBtn: {
    backgroundColor: palette.middlegreen,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },

  viewText: {
    color: palette.white,
  },

  iconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.middlegreen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  iconText: {
    color: palette.white,
  },

  iconRow: {
    flexDirection: 'row',
    gap: 10,
  },

  statusWrap: {
    alignItems: 'flex-end',
    gap: 8,
  },

  modalWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: 'white',
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: spacing.md,
  },

  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  closeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dadbdd',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
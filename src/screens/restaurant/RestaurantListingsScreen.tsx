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
  Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Skeleton } from '../../components/Skeleton';

import { palette } from '@/theme/colors';
import { ListingStatus } from '@/types';
import { foodListingService } from '@/services/foodListing.service';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

function prettyStatus(status: string) {
  if (!status) return '';
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function RestaurantListingsScreen({ navigation }: any) {

  const [modalVisible, setModalVisible] = React.useState(false);

  const [selectedItems, setSelectedItems] = React.useState<any[]>([]);
  const [selectedListingStatus, setSelectedListingStatus] = React.useState<ListingStatus>('ACTIVE');
  const [listings, setListings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchListings = async () => {
    try {
      setLoading(true);

      const res = await foodListingService.getListings();

      const all: any[] = res.data?.listings || [];
      setListings(all.filter((l: any) => l.status !== 'CANCELLED'));
    } catch (err) {
      Alert.alert('Error', 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchListings();
    }, [])
  );

  const handleCancelListing = (id: number) => {
    Alert.alert(
      'Cancel Listing',
      'Are you sure you want to cancel this listing? This cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await foodListingService.cancelListing(id);
              await fetchListings();
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.message || 'Failed to cancel listing');
            }
          },
        },
      ]
    );
  };


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

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(18)} borderRadius={normalize(12)} />
      <View style={styles.skeletonCenter}>
        <Skeleton width={wp(60)} height={normalize(18)} />
      </View>
      <Skeleton width={wp(80)} height={normalize(48)} borderRadius={normalize(16)} />
      <Skeleton width={wp(80)} height={normalize(48)} borderRadius={normalize(16)} />
      <View style={styles.skeletonHeadingWrap}>
        <Skeleton width={wp(50)} height={normalize(20)} />
      </View>
      {[1, 2].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonRowBetween}>
            <View style={styles.skeletonBlock}>
              <Skeleton width={wp(50)} height={normalize(16)} />
              <Skeleton width={wp(65)} height={normalize(12)} />
              <Skeleton width={wp(45)} height={normalize(12)} />
            </View>
            <Skeleton width={wp(22)} height={normalize(28)} borderRadius={normalize(999)} />
          </View>
          <View style={styles.skeletonMetaRow}>
            <Skeleton width={wp(24)} height={normalize(50)} borderRadius={normalize(12)} />
            <Skeleton width={wp(24)} height={normalize(50)} borderRadius={normalize(12)} />
            <Skeleton width={wp(24)} height={normalize(50)} borderRadius={normalize(12)} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          renderSkeleton()
        ) : (
          <>
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
            navigation.navigate('Surplus')
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

          {listings.map((item) => {
            const detail = item;

            return (
              <Card
                key={item.id}
                style={styles.card}
              >
                {/* Charity */}
                <View style={styles.topRow}>
                  {/* LEFT */}
                  <View style={styles.charityBlock}>
                    <AppText variant="bodyLarge" style={{ fontFamily: 'Saveful-Bold' }} >
                      {detail.claimedByOrganisation?.name || 'Surplus still available'}
                    </AppText>

                    <AppText variant="bodyBold" style={{lineHeight: normalize(21)}} >
                      📍 {detail.claimedByOrganisation?.address || 'Nearby charities have been notified'}
                    </AppText>

                    <AppText variant="bodyBold" style={styles.driverText}
                    >
                      {prettyStatus(detail.status) === 'Available'
                        ? 'Driver will be assigned once surplus is accepted'
                        : prettyStatus(detail.claimStatus || 'awaiting_driver')
                      }
                    </AppText>

                    {!!detail.driver?.name && (
                      <AppText variant="caption">
                        Driver: {detail.driver?.name}
                      </AppText>
                    )}
                  </View>

                  {/* RIGHT */}
                  <View style={styles.statusWrap}>
                    <View>
                      <AppText variant="bodyBold" style={styles.statusText} >
                        {prettyStatus(detail.status)}
                      </AppText>
                    </View>

                    {!!detail.claimStatus && (
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
                          variant="bodyBold"
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
                      setSelectedItems(detail.foodItems || []);
                      setSelectedListingStatus(detail.status);
                      setModalVisible(true);
                    }}
                  >
                    <AppText variant="bodyBold"> Items </AppText>

                    <View style={styles.viewBtn}>
                      <AppText variant='label' style={styles.viewText}> View </AppText>
                    </View>
                  </Pressable>

                  <View style={styles.metaCard} >
                    <AppText variant="bodyBold"> Pickup Date </AppText>
                    <AppText variant="bodySmall" style={{textAlign: 'center'}}> {new Date(item.pickupFromTime || item.createdAt).toLocaleDateString()}</AppText>
                  </View>

                  <View style={styles.metaCard} >
                    <AppText variant="bodyBold"> Pickup Time </AppText>
                    <AppText variant="bodySmall" style={{textAlign: 'center'}}> {`${new Date(item.pickupFromTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })} - ${new Date(item.pickupByTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`}
                    </AppText>
                  </View>
                </View>

                {/* Instructions */}
                <View style={styles.infoBlock} >
                  <AppText variant="caption"> Instructions:{' '} {[
                    detail.needsRefrigeration && 'Needs refrigeration',
                    detail.needsReheating && 'Needs reheating',
                    detail.containsAllergens && 'Contains allergens',
                  ]
                    .filter(Boolean)
                    .join(', ') || 'No special instructions'}
                  </AppText>
                </View>

                {/* Contact */}
                {detail.claimedByOrganisation?.name && (
                  <View style={styles.contactLine}>
                    <AppText variant="bodyBold"> Contact Charity </AppText>

                    <View style={styles.iconRow}>
                      <Pressable
                        style={styles.iconPill}
                        onPress={() =>
                          makeCall(detail.claimedByOrganisation?.phoneNumber)
                        }
                      >
                        <Ionicons
                          name="call-outline"
                          size={normalize(18)}
                          color={palette.white}
                        />
                        <AppText variant="bodyBold" style={styles.iconText} > Call </AppText>
                      </Pressable>

                      <Pressable
                        style={styles.iconPill}
                        onPress={() =>
                          sendMessage(detail.claimedByOrganisation?.phoneNumber)
                        }
                      >
                        <Ionicons
                          name="chatbubble-outline"
                          size={normalize(18)}
                          color={palette.white}
                        />
                        <AppText variant="bodyBold" style={styles.iconText} > Message </AppText>
                      </Pressable>
                    </View>

                  </View>
                )}

                {detail.driver?.name && (
                  <View style={styles.contactLine}>
                    <AppText variant="bodyBold"> Contact Driver </AppText>

                    <View style={styles.iconRow}>
                      <Pressable
                        style={styles.iconPill}
                        onPress={() =>
                          makeCall(detail.driver?.phoneNumber)
                        }
                      >
                        <Ionicons
                          name="call-outline"
                          size={normalize(18)}
                          color={palette.white}
                        />
                        <AppText variant="bodyBold" style={styles.iconText} > Call </AppText>
                      </Pressable>

                      <Pressable
                        style={styles.iconPill}
                        onPress={() =>
                          sendMessage(detail.driver?.phoneNumber)
                        }
                      >
                        <Ionicons
                          name="chatbubble-outline"
                          size={normalize(18)}
                          color={palette.white}
                        />
                        <AppText variant="bodyBold" style={styles.iconText} > Message </AppText>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* EDIT / CANCEL ACTIONS */}
                {(['ACTIVE', 'PARTIAL', 'AVAILABLE'].includes(detail.status?.toUpperCase())) && (
                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.editBtn}
                      onPress={() => navigation.navigate('EditListing', { listingId: Number(item.id) })}
                    >
                      <Ionicons name="create-outline" size={normalize(16)} color={palette.white} />
                      <AppText variant="bodyBold" style={styles.actionBtnText}>Edit</AppText>
                    </Pressable>

                    <Pressable
                      style={styles.cancelBtn}
                      onPress={() => handleCancelListing(item.id)}
                    >
                      <Ionicons name="close-circle-outline" size={normalize(16)} color={palette.white} />
                      <AppText variant="bodyBold" style={styles.actionBtnText}>Cancel Listing</AppText>
                    </Pressable>
                  </View>
                )}
              </Card>
            );
          })}
        </View>
          </>
        )}
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
                  size={normalize(20)}
                  color={palette.black}
                />
              </Pressable>
            </View>

            {/* HEADER */}
            <View style={styles.modalHeaderRow}>
              <AppText variant="bodyBold" style={{ flex: 2 }} > Item Name </AppText>
              <AppText variant="bodyBold" style={styles.modalCol} > Available </AppText>

              {selectedListingStatus !== 'ACTIVE' && (
                <AppText  variant="bodyBold" style={styles.modalCol} >
                  Claimed
                </AppText>
              )}
            </View>

            {/* ITEMS */}
            {selectedItems?.length ? (
              selectedItems.map((item, idx) => {
                const totalQty = Number(item.totalQtyKg || 0);
                const remainingQty = Number(item.remainingQtyKg || 0);
                const claimedQty = totalQty - remainingQty;

                return (
                  <View key={`${item.category}-${idx}`} style={styles.modalItemRow}>
                    <AppText variant="bodyBold"  style={{ flex: 2 }}  >
                      {item.category}
                    </AppText>

                    <AppText variant="bodySmall" style={styles.modalCol} >
                      {totalQty} kg
                    </AppText>

                    {selectedListingStatus !== 'ACTIVE' && (
                      <AppText variant="bodySmall" style={styles.modalCol} >
                        {claimedQty} kg
                      </AppText>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={{ paddingVertical: hp(1.6) }}>
                <AppText variant="bodySmall">
                  No items available
                </AppText>
              </View>
            )}

            {/* TOTALS */}
            <View style={{ marginTop: hp(2), gap: hp(1) }} >
              <AppText variant="bodyBold">
                Total Quantity:{' '}
                {selectedItems.reduce(
                  (sum, item) =>
                    sum + Number(item.totalQtyKg || 0),
                  0
                )}{' '} kg
              </AppText>

              {selectedListingStatus !== 'ACTIVE' && (
                <AppText variant="bodyBold">
                  Total Claimed:{' '}
                  {selectedItems.reduce(
                    (sum, item) =>
                      sum + ( Number(item.totalQtyKg || 0) - Number(item.remainingQtyKg || 0) ),
                    0
                  )}{' '} kg
                </AppText>
              )}
            </View>

          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: hp(2) },

  headerBg: {
    width: '100%',
    height: hp(18),
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    color: palette.white,
    textAlign: 'center',
    fontSize: normalize(24),
  },

  subHeaderContainer: {
    alignItems: 'center',
  },

  heroSubText: {
    color: palette.black,
    lineHeight: normalize(22),
    opacity: 0.9,
  },

  createBtn: {
    backgroundColor: palette.primary,
    paddingVertical: hp(1.6),
    borderRadius: normalize(16),
    marginHorizontal: wp(6),
    alignItems: 'center',
  },

  createText: { color: 'white' },

  section: { gap: hp(1.6) },

  headingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(2.5),
    marginBottom: hp(2.5),
  },

  headingBg: {
    position: 'absolute',
    width: '100%',
    height: hp(10),
    resizeMode: 'contain',
  },

  headingText: {
    textAlign: 'center',
    fontSize: normalize(18),
  },

  card: {
    padding: hp(1.6),
    marginHorizontal: wp(4),
    borderRadius: normalize(16),
    gap: hp(1.4),
    backgroundColor: palette.radish,
  },

  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: palette.middlegreen,
    width: wp(28),
    paddingVertical: hp(0.8),
    borderRadius: 999,
    alignItems: 'center',
  },

  statusText: {
    color: palette.kale,
  },

  modalHeaderRow: {
    flexDirection: 'row',
    paddingBottom: hp(1),
    borderBottomWidth: 1,
    borderColor: palette.border,
  },

  modalItemRow: {
    flexDirection: 'row',
    paddingVertical: hp(0.6),
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
    gap: hp(0.4),
  },

  contactLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(0.6),
  },

  trackBtn: {
    minWidth: wp(26),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
    paddingVertical: hp(0.9),
    borderRadius: 999,
    width: wp(28),
  },

  trackText: {
    color: 'white',
  },

  metaRow: {
    flexDirection: 'row',
    gap: wp(2.2),
  },

  metaCard: {
    flex: 1,
    backgroundColor: palette.creme,
    paddingVertical: hp(1),
    borderRadius: normalize(12),
    gap: hp(0.8),
    alignItems: 'center',
  },

  infoBlock: {
    backgroundColor: palette.white,
    padding: hp(1),
    borderRadius: normalize(10),
  },

  viewBtn: {
    backgroundColor: palette.middlegreen,
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(0.7),
    borderRadius: 999,
  },

  viewText: {
    color: palette.white,
  },
  iconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.2),
    backgroundColor: palette.middlegreen,
    paddingHorizontal: wp(2.8),
    paddingVertical: hp(0.9),
    borderRadius: 999,
  },
  iconText: {
    color: palette.white,
  },

  iconRow: {
    flexDirection: 'row',
    gap: wp(2.5),
  },

  statusWrap: {
    alignItems: 'flex-end',
    gap: hp(0.8),
  },

  modalWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: 'white',
    padding: wp(5),
    borderTopLeftRadius: normalize(24),
    borderTopRightRadius: normalize(24),
    gap: hp(1.6),
    marginBottom: hp(2),
  },

  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },

  closeIconBtn: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: '#dadbdd',
    justifyContent: 'center',
    alignItems: 'center',
  },

  skeletonWrap: {
    paddingHorizontal: wp(5),
    gap: hp(1.6),
  },

  skeletonCenter: {
    alignItems: 'center',
    marginTop: hp(0.5),
  },

  skeletonHeadingWrap: {
    alignItems: 'center',
    marginTop: hp(1.5),
  },

  skeletonCard: {
    backgroundColor: palette.white,
    borderRadius: normalize(16),
    padding: hp(1.6),
    gap: hp(1.4),
  },

  skeletonRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  skeletonBlock: {
    gap: hp(0.6),
  },

  skeletonMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  actionRow: {
    flexDirection: 'row',
    gap: wp(2.5),
    marginTop: hp(0.5),
  },

  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    backgroundColor: palette.primary,
    paddingVertical: hp(1),
    borderRadius: normalize(10),
  },

  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    backgroundColor: palette.danger,
    paddingVertical: hp(1),
    borderRadius: normalize(10),
  },

  actionBtnText: {
    color: palette.white,
  },
});
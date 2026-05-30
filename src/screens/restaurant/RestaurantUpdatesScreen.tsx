import React, { useState } from 'react';
import { Modal, FlatList, Pressable, StyleSheet, View, ImageBackground, Alert, Linking, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';

import { palette } from '../../theme/colors';
import { PostPickupSurveyModal } from './components/postPickupSurveyModal';
import { LineChart } from 'react-native-chart-kit';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};


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

    const textColor = item.type === 'full' ? palette.white : palette.black;
    const subTextColor = item.type === 'full' ? palette.creme : palette.black;

    if (item.type === 'completed') {
      return (
        <View style={[styles.cardBase, { backgroundColor: bgColor }]}>
          <AppText variant="h7" numberOfLines={1}> Surplus Collected </AppText>

          <AppText variant="bodySmall" numberOfLines={1}> You’ve successfully shared food with a charity </AppText>

          <View style={styles.metaRow}>
            <View style={styles.metaCard}>
              <AppText variant='label'>Date</AppText>
              <AppText variant='bodySmall' style={{marginTop: hp(1)}}>14/04/2026</AppText>
            </View>

            <View style={styles.metaCard}>
              <AppText variant='label' style={{textAlign: 'center'}}> Food Saved (Kgs)</AppText>
              <AppText variant='bodySmall' style={{marginTop: hp(1)}}>8 kg</AppText>
            </View>

            <View style={styles.metaCard}>
              <AppText variant='label' style={{textAlign: 'center'}}>Meals Created</AppText>
              <AppText variant='bodySmall' style={{marginTop: hp(1)}}>20</AppText>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.cardBase, { backgroundColor: bgColor }]}>
        {/* TITLE */}
        <AppText variant="h7" color={textColor}>
          {item.type === 'full' ? 'Surplus Claimed!' : 'Partially Claimed'}
        </AppText>

        {/* DESCRIPTION + DRIVER DETAILS */}
        <View style={styles.topInfoRow}>
          {/* LEFT */}
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: normalize(15) }} variant="bodySmall" color={textColor}>
              <AppText variant="label" color={textColor}> {item.charity} </AppText>{' '}
              {item.type === 'full' ? 'is on the way' : `claimed ${item.quantity} kg`}
            </AppText>

            <AppText variant="bodySmall" style={[styles.locationText, { color: subTextColor }]} > 📍 {item.location} </AppText>

            <AppText variant="label" style={[styles.driverName, { color: textColor }]} >
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
            <AppText variant='bodySmall' style={{marginTop: hp(1)}}>{item.quantity}kg</AppText>
          </View>

          <View style={styles.metaCard}>
            <AppText variant='label'>Date</AppText>
            <AppText  variant='bodySmall' style={{marginTop: hp(1)}}>{item.date}</AppText>
          </View>

          <View style={styles.metaCard}>
            <AppText variant='label'>Time</AppText>
            <AppText variant='bodySmall' style={{marginTop: hp(1)}}>{item.time}</AppText>
          </View>

          <Pressable
            style={styles.metaCard}
            onPress={() => {
              setSelectedItems(item.items || []);
              setDetailsModalVisible(true);
            }}
          >
            <View style={styles.viewBtn}>
              <AppText variant='label' style={styles.viewText}> View </AppText>
            </View>
          </Pressable>
        </View>

        {/* ACTIONS */}
        <View style={styles.contactRow}>
          <AppText variant="label" color={textColor}> Contact Charity </AppText>

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
          <AppText variant="label" color={textColor}> Contact Driver </AppText>

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
    paddingBottom: hp(3),
    gap: hp(2),
  },

  headerBg: {
    height: hp(15),
    justifyContent: 'center',
    paddingHorizontal: wp(5),
    paddingBottom: hp(2),
    alignItems: 'center',
  },

  headerTitle: {
    color: palette.white,
    fontSize: normalize(24),
  },

  section: {
    marginHorizontal: wp(5),
    gap: hp(1),
    marginBottom: hp(2),
  },

  sectionCard: {
    backgroundColor: palette.white,
    borderRadius: normalize(22),
    padding: wp(2),
    gap: hp(1),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  cardBase: {
    padding: wp(4),
    borderRadius: normalize(18),
    gap: hp(1),
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
  metaRow: {
    flexDirection: 'row',
    marginTop: hp(0.5),
    gap: wp(2),
  },

  metaCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: palette.white,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(1),
    borderRadius: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
  },

  nextBox: {
    marginTop: hp(1),
  },

  actionRow: {
    flexDirection: 'row',
    gap: wp(2),
  },

  driverStatusPill: {
    minWidth: wp(25),
    minHeight: hp(3.5),
    backgroundColor: palette.creme,
    borderRadius: normalize(15),
    paddingHorizontal: wp(3),
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },

  driverStatusText: {
    color: palette.stone,
    includeFontPadding: false,
    fontSize: normalize(10),
  },

  iconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: normalize(20),
    backgroundColor: palette.creme,
  },

  iconText: {
    color: palette.black,
    fontSize: normalize(12),
  },

  ctaBtn: {
    marginTop: hp(1),
    backgroundColor: palette.primary,
    padding: hp(1.5),
    borderRadius: normalize(12),
    alignItems: 'center',
  },

  ctaText: {
    color: palette.white,
    fontSize: normalize(14),
  },

  completedText: {
    marginTop: hp(1),
    color: '#2E7D32',
    fontSize: normalize(14),
    textAlign: 'center',
  },

  cancelledText: {
    marginTop: hp(1),
    color: palette.chilli,
    fontSize: normalize(14),
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    width: wp(85),
    backgroundColor: palette.white,
    borderRadius: normalize(16),
    padding: wp(6),
    gap: hp(1.5),
  },

  closeBtn: {
    marginTop: hp(2),
    backgroundColor: palette.primary,
    padding: hp(1.5),
    borderRadius: normalize(10),
    alignItems: 'center',
  },

  closeBtnText: {
    color: palette.white,
    fontSize: normalize(14),
  },

  topInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: wp(2),
  },

  rightStatus: {
    alignItems: 'flex-end',
    gap: hp(0.5),
  },

  locationText: {
    marginTop: 4,
    opacity: 0.9,
    fontSize: normalize(13),
    lineHeight: 18,
    fontFamily: 'Saveful-Bold',
  },

  contactRow: {
    marginTop: hp(1.5),
    gap: hp(0.5),
  },

  metaTextLabel: {
    fontSize: normalize(12),
    color: palette.stone,
    textAlign: 'center',
    marginBottom: 2,
  },

  metaTextValue: {
    fontSize: normalize(13),
    textAlign: 'center',
    color: palette.black,
  },
  driverName:{
    marginTop: hp(0.5),
    fontSize: normalize(13),
    fontFamily: 'Saveful-Bold',
  }
});

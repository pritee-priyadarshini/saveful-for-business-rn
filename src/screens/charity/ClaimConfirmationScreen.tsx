import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ImageBackground,
  Pressable,
  Modal,
} from 'react-native';
import { Linking } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

export function ClaimConfirmationScreen({ route, navigation }: any) {
  const [note, setNote] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [showPickupModal, setShowPickupModal] = useState(false);
  const listing = route?.params?.listing;
  const payload = route?.params?.payload;

  const totalAvailable =
    listing?.quantityKg || 0;

  const claimedItems = Array.isArray(payload)
    ? payload
    : payload?.items || [];

  const claimedQty =
    claimedItems.length > 0
      ? claimedItems.reduce(
        (sum: number, item: any) =>
          sum +
          Number(
            item.claimedQty ??
            item.quantityKg ??
            item.qty ??
            item.quantity ??
            item.selectedQty ??
            0
          ),
        0
      )
      : totalAvailable;

  const isFullClaim =
    claimedQty >= totalAvailable;

  const drivers = [
    {
      id: '1',
      name: 'Rahul Das',
      online: true,
    },
    {
      id: '2',
      name: 'Sanjay Rout',
      online: false,
    },
    {
      id: '3',
      name: 'Amit Sahu',
      online: true,
    },
  ];

  // Build items (full vs partial)
  const itemsToShow = useMemo(() => {
    if (payload && payload.length > 0) return payload;

    // full claim fallback
    return listing.items.map((i: any) => ({
      name: i.name,
      claimedQty: i.quantityKg,
    }));
  }, [payload, listing]);

  const totalKg = itemsToShow.reduce(
    (sum: number, i: any) => sum + i.claimedQty,
    0,
  );

  return (
    <Screen backgroundColor={palette.creme}>
      <View style={styles.container}>
        {/* TITLE */}
        <ImageBackground
          source={require('../../../assets/placeholder/feed-bg.png')}
          style={styles.headerBg}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={palette.white} />
          </TouchableOpacity>

          <AppText variant='h5' style={styles.headerTitle}>
            Confirm Pick up
          </AppText>
        </ImageBackground>

        {/* WHAT YOU'RE COLLECTING */}
        <View style={styles.card}>
          <AppText variant='bodyBold'>
            📦 What you’re collecting
          </AppText>

          {itemsToShow.map((item: any) => (
            <View key={item.name} style={styles.rowBetween}>
              <AppText variant='bodySmall'>
                {item.name}
              </AppText>
              <AppText variant='bodySmall'>
                {item.claimedQty} kg
              </AppText>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.rowBetween}>
            <AppText variant='label'>Total</AppText>
            <AppText variant='label'>
              {totalKg} kg
            </AppText>
          </View>
        </View>

        {/* LOCATION */}
        <View style={styles.card}>
          <AppText variant='body'>
            📍 Pickup location
          </AppText>

          <AppText variant='label'>
            {listing.businessName}
          </AppText>

          <View style={styles.locationRow}>
            <View style={{ flex: 1 }}>
              <AppText variant='label'>
                {listing.suburb}
              </AppText>
            </View>
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${listing.suburb}`
                )
              }
            >
              <AppText variant='label' style={{ color: palette.white }}>
                View on Map
              </AppText>
            </TouchableOpacity>
          </View>


        </View>

        {/* TIME */}
        <View style={styles.card}>
          <AppText variant='body'>
            🕒 Pickup Window
          </AppText>

          <View style={styles.timeRow}>
            <View style={styles.timeCard}>
              <AppText variant='label'>Date</AppText>
              <AppText variant='bodySmall'>{listing.pickupDate}</AppText>
            </View>

            <View style={styles.timeCard}>
              <AppText variant='label'>Time</AppText>
              <AppText variant='bodySmall'>{listing.pickupTime}</AppText>
            </View>
          </View>
        </View>

        {/* CONTACT */}
        <View style={styles.card}>
          <AppText variant='body'>
            📞 Contact
          </AppText>

          <AppText variant='bodyLarge'>
            {listing.businessName}
          </AppText>

          <AppText variant='label'>
            +61 410 000 000
          </AppText>

          <View style={styles.contactRow}>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Linking.openURL('tel:+61410000000')}
            >
              <AppText variant='label'>📞 Call</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Linking.openURL('sms:+61410000000')}
            >
              <AppText variant='label'>💬 Message</AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* ASSIGN DRIVER */}
        <View style={styles.card}>
          <AppText variant="body"> 🚚 Add Driver </AppText>

          <AppText variant="bodySmall" style={styles.subText} >
            Assign a driver for collecting the surplus
          </AppText>

          <View style={styles.driverDropdown}>
            <Picker
              selectedValue={selectedDriver}
              onValueChange={setSelectedDriver}
            >
              <Picker.Item
                label="Select driver"
                value=""
              />

              {drivers.map(driver => (
                <Picker.Item
                  key={driver.id}
                  label={`${driver.online ? '✓' : '✕'
                    }  ${driver.name}`}
                  value={driver.id}
                />
              ))}
            </Picker>
          </View>

          {selectedDriver ? (
            <View style={styles.driverAssignedRow}>
              <AppText
                variant="bodySmall"
                style={styles.driverAssignedText}
              >
                Driver to be assigned:{' '}
                <AppText
                  variant="label"
                  style={styles.driverAssignedText}
                >
                  {
                    drivers.find(
                      d => d.id === selectedDriver
                    )?.name
                  }
                </AppText>
              </AppText>

              <Ionicons
                name={
                  drivers.find(
                    d => d.id === selectedDriver
                  )?.online
                    ? 'checkmark-circle'
                    : 'close-circle'
                }
                size={22}
                color={
                  drivers.find(
                    d => d.id === selectedDriver
                  )?.online
                    ? palette.middlegreen
                    : palette.chilli
                }
              />
            </View>
          ) : null}
        </View>

        {/* NOTE */}
        <View style={styles.card}>
          <AppText variant='bodyLarge'>
            ✏ Add a note (optional)
          </AppText>

          <TextInput
            placeholder="e.g. arrival time or special instructions"
            value={note}
            onChangeText={setNote}
            style={styles.input}
            multiline
          />
        </View>

        {/* CHECKBOX */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAccepted(!accepted)}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxActive]}>
            {accepted && (
              <Ionicons name="checkmark" size={16} color={palette.white} />
            )}
          </View>

          <AppText variant='bodySmall' style={{ flex: 1 }}>
            We’ll check the food when we collect it and handle it safely.
          </AppText>
        </TouchableOpacity>

        {/* CTA */}
        <Button
          label="Confirm pickup"
          disabled={!accepted}
          style={styles.confirmBtn}
          onPress={() => setShowPickupModal(true)}
        />
      </View>


      <Modal
        visible={showPickupModal}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowPickupModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            <View style={styles.modalIconWrap}>
              <Ionicons
                name="checkmark"
                size={34}
                color={palette.white}
              />
            </View>

            <AppText variant="h6" style={styles.modalTitle} > Pickup Confirmed </AppText>

            <AppText variant="bodyLarge" style={styles.modalText} >
              {isFullClaim
                ? `You have fully claimed ${claimedQty} kg surplus`
                : `You have partially claimed ${claimedQty} kg from ${totalAvailable} kg surplus available`}
            </AppText>

            <Pressable
              style={styles.modalBtn}
              onPress={() => {
                setShowPickupModal(false);

                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Tabs' }],
                });
              }}
            >
              <AppText variant="label" style={styles.modalBtnText} > Go To Home </AppText>
            </Pressable>
          </View>
        </View>
      </Modal>  
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  headerBg: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: -spacing.md,
    paddingTop: spacing.lg,
  },

  backBtn: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.md,
    marginLeft: spacing.md,
  },

  headerTitle: {
    color: palette.white,
    textAlign: 'center',
  },

  card: {
    backgroundColor: palette.white,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: 18,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: spacing.sm,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  mapBtn: {
    backgroundColor: palette.middlegreen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  timeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  timeCard: {
    flex: 1,
    backgroundColor: palette.radish,
    padding: spacing.sm,
    borderRadius: 12,
  },

  contactRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  contactBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: palette.radish,
    alignItems: 'center',
  },

  input: {
    backgroundColor: '#F7F7F9',
    borderRadius: 12,
    padding: spacing.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  subText: {
    opacity: 0.7,
  },

  driverDropdown: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: palette.white,
  },

  driverAssignedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },

  driverAssignedText: {
    lineHeight: 26,
    includeFontPadding: true,
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    marginLeft: spacing.md,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxActive: {
    backgroundColor: palette.middlegreen,
    borderColor: palette.middlegreen,
  },

  confirmBtn: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    backgroundColor: palette.middlegreen,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },

  modalCard: {
    width: '100%',
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },

  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.middlegreen,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalTitle: {
    textAlign: 'center',
  },

  modalText: {
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 24,
  },

  modalBtn: {
    width: '100%',
    backgroundColor: palette.middlegreen,
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },

  modalBtnText: {
    color: palette.white,
  },

});
import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';

export type ClaimPickupDetailsData = {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  windowLabel?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
};

type Props = {
  details: ClaimPickupDetailsData;
};

function coordinateDestination(latitude?: number | null, longitude?: number | null): string | null {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (latitude == null || longitude == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return `${lat},${lng}`;
}

async function openDirections(address: string, latitude?: number | null, longitude?: number | null) {
  const destination = encodeURIComponent(coordinateDestination(latitude, longitude) ?? address);
  const google = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
  const apple = `http://maps.apple.com/?daddr=${destination}&dirflg=d`;
  const androidNavigation = `google.navigation:q=${destination}&mode=d`;
  const url = Platform.OS === 'ios' ? apple : androidNavigation;
  try {
    await Linking.openURL(url);
  } catch {
    await Linking.openURL(google);
  }
}

async function callPhone(phone: string) {
  await Linking.openURL(`tel:${phone}`);
}

async function messagePhone(phone: string) {
  await Linking.openURL(`sms:${phone}`);
}

function DetailLine({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={normalize(16)} color={palette.kale} />
      <View style={styles.copy}>
        <AppText variant="caption" color={palette.stone}>
          {label}
        </AppText>
        <AppText variant="bodySmall" style={styles.value}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

export function ClaimPickupDetails({ details }: Props) {
  const address = String(details.address || '').trim();
  const windowLabel = String(details.windowLabel || '').trim();
  const contactName = String(details.contactName || '').trim();
  const contactPhone = String(details.contactPhone || '').trim();
  const notes = String(details.notes || '').trim();

  if (!address && !windowLabel && !contactName && !contactPhone && !notes) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <AppText variant="bodyBold" style={styles.heading}>
        Pickup details
      </AppText>

      {address ? (
        <View style={styles.row}>
          <Ionicons name="location-outline" size={normalize(16)} color={palette.kale} />
          <View style={styles.copy}>
            <AppText variant="caption" color={palette.stone}>
              Address
            </AppText>
            <Pressable
              onPress={() => void openDirections(address, details.latitude, details.longitude)}
              accessibilityRole="link"
              accessibilityLabel="Get directions"
            >
              <AppText variant="bodySmall" style={[styles.value, styles.link]}>
                {address}
              </AppText>
            </Pressable>
            <Pressable
              style={styles.action}
              onPress={() => void openDirections(address, details.latitude, details.longitude)}
              accessibilityRole="link"
              accessibilityLabel="Get directions"
            >
              <AppText variant="bodyBold" color={palette.kale}>
                Directions
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {windowLabel ? (
        <DetailLine icon="time-outline" label="Pickup window" value={windowLabel} />
      ) : null}

      {contactName || contactPhone ? (
        <View style={styles.row}>
          <Ionicons name="call-outline" size={normalize(16)} color={palette.kale} />
          <View style={styles.copy}>
            <AppText variant="caption" color={palette.stone}>
              Contact
            </AppText>
            {contactName ? (
              <AppText variant="bodySmall" style={styles.value}>
                {contactName}
              </AppText>
            ) : null}
            {contactPhone ? (
              <AppText variant="bodySmall" style={styles.value}>
                {contactPhone}
              </AppText>
            ) : null}
            {contactPhone ? (
              <View style={styles.actions}>
                <Pressable style={styles.action} onPress={() => void callPhone(contactPhone)}>
                  <AppText variant="bodyBold" color={palette.kale}>
                    Call
                  </AppText>
                </Pressable>
                <Pressable style={styles.action} onPress={() => void messagePhone(contactPhone)}>
                  <AppText variant="bodyBold" color={palette.kale}>
                    Message
                  </AppText>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {notes ? <DetailLine icon="document-text-outline" label="Collection notes" value={notes} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: hp(1),
    paddingTop: hp(0.6),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E4E4',
  },
  heading: {
    textTransform: 'none',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  value: {
    textTransform: 'none',
    color: palette.black,
  },
  link: {
    color: palette.kale,
    textDecorationLine: 'underline',
  },
  actions: {
    flexDirection: 'row',
    gap: wp(4),
    marginTop: 4,
  },
  action: {
    paddingVertical: 4,
  },
});

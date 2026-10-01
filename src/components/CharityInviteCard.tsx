import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { connectionsService, type Connection } from '@/services/connections.service';
import { showConfirmAlert } from '@/store/appAlertStore';
import { palette } from '@/theme/colors';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import { connectionCharitySiteLabel, connectionPartyName } from '@/utils/connections';
import { hp, normalize, wp } from '@/utils/responsive';

type Props = {
  connection: Connection;
  submitting?: boolean;
  onAccept: (connection: Connection) => Promise<void> | void;
  onDecline: (connection: Connection) => Promise<void> | void;
  onMoreDetails?: (connection: Connection) => void;
};

export function CharityInviteCard({
  connection,
  submitting,
  onAccept,
  onDecline,
  onMoreDetails,
}: Props) {
  const business = connectionPartyName(
    connection.donorSite,
    connection.donorOrg?.name || 'Business',
  );
  const yourSite = connectionCharitySiteLabel(connection);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <AppText variant="bodyBold" numberOfLines={2}>
            {business}
          </AppText>
          <AppText variant="bodySmall" color={palette.stone} numberOfLines={2}>
            {connection.schedule}
          </AppText>
          {yourSite ? (
            <AppText variant="caption" color={palette.midgray} numberOfLines={2}>
              Your site · {yourSite}
            </AppText>
          ) : null}
        </View>
        <View style={styles.badge}>
          <AppText variant="caption" style={styles.badgeText}>
            Invitation
          </AppText>
        </View>
      </View>

      {connection.typicalSurplus || connection.typicalQuantity ? (
        <View style={styles.facts}>
          {connection.typicalSurplus ? (
            <View style={styles.fact}>
              <AppText variant="caption" color={palette.stone}>
                Typical surplus · guide only
              </AppText>
              <AppText variant="bodySmall">{connection.typicalSurplus}</AppText>
            </View>
          ) : null}
          {connection.typicalQuantity ? (
            <View style={styles.fact}>
              <AppText variant="caption" color={palette.stone}>
                Typical quantity · guide only
              </AppText>
              <AppText variant="bodySmall">{connection.typicalQuantity}</AppText>
            </View>
          ) : null}
        </View>
      ) : null}

      {onMoreDetails ? (
        <Pressable
          onPress={() => onMoreDetails(connection)}
          style={({ pressed }) => [styles.detailsRow, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="More details"
        >
          <Ionicons name="information-circle-outline" size={normalize(16)} color={palette.primary} />
          <AppText variant="bodySmall" color={palette.primary} style={styles.detailsLabel}>
            More details
          </AppText>
          <Ionicons name="chevron-forward" size={normalize(16)} color={palette.primary} />
        </Pressable>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={[styles.declineBtn, submitting && styles.disabled]}
          disabled={submitting}
          onPress={() =>
            showConfirmAlert({
              title: 'Decline this invitation?',
              message: 'The business will be told. They can invite again later.',
              confirmLabel: 'Decline',
              destructive: true,
              onConfirm: () => onDecline(connection),
            })
          }
        >
          <AppText variant="bodyBold" color={palette.primary}>Decline</AppText>
        </Pressable>
        <Pressable
          style={[styles.acceptBtn, submitting && styles.disabled]}
          disabled={submitting}
          onPress={() =>
            showConfirmAlert({
              title: 'Accept this invitation?',
              message: 'You will be offered their surplus first on these days. You can pause or end it later if you need to.',
              confirmLabel: 'Accept',
              onConfirm: () => onAccept(connection),
            })
          }
        >
          <AppText variant="bodyBold" color={palette.white}>Accept</AppText>
        </Pressable>
      </View>
    </View>
  );
}

export async function acceptCharityInvite(connectionId: number) {
  await connectionsService.accept(connectionId);
  showSuccessAlert(
    'If today is a scheduled day and the window is still open, the business can list for you now.',
    'Connection accepted',
  );
}

export async function declineCharityInvite(connectionId: number) {
  await connectionsService.decline(connectionId);
  showSuccessAlert('Invitation declined');
}

export function handleInviteError(error: unknown) {
  showErrorAlert(error, 'Could not update invitation');
}

const styles = StyleSheet.create({
  card: {
    padding: wp(4),
    borderRadius: normalize(20),
    backgroundColor: palette.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: hp(0.8),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: wp(2),
  },
  titleWrap: { flex: 1, gap: hp(0.3) },
  badge: {
    backgroundColor: '#FFF3E4',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: normalize(12),
  },
  badgeText: {
    color: palette.orange,
    fontWeight: '600',
  },
  facts: {
    backgroundColor: '#F7F6EF',
    borderRadius: normalize(14),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
    gap: hp(0.9),
  },
  fact: { gap: 2 },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    marginTop: hp(0.2),
  },
  detailsLabel: {
    flex: 1,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: hp(0.4),
    paddingTop: hp(1.4),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E6E6E6',
  },
  acceptBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.6 },
});

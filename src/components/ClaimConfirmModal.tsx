import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { Button } from './Button';
import { palette } from '../theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import { createClaim, type ClaimMode } from '../services/claims.service';
import { getUserFriendlyErrorMessage } from '@/utils/apiError';
import type { mapDiscoverListing } from '../services/foodListing.service';

type DiscoverListing = ReturnType<typeof mapDiscoverListing>;

export type ClaimLineItem = {
  foodItemId: number;
  name: string;
  qtyKg: number;
};

type Props = {
  visible: boolean;
  listing: DiscoverListing | null;
  claimMode: ClaimMode;
  items: ClaimLineItem[];
  onClose: () => void;
  onSuccess: () => void;
};

function formatKg(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function ClaimConfirmModal({
  visible,
  listing,
  claimMode,
  items,
  onClose,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalKg = useMemo(
    () => items.reduce((sum, item) => sum + item.qtyKg, 0),
    [items],
  );

  useEffect(() => {
    if (visible) {
      setError(null);
      setSubmitting(false);
    }
  }, [visible, claimMode, listing?.listingId, items]);

  const handleConfirm = async () => {
    if (!listing) return;
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await createClaim({
        listingId: listing.listingId,
        claimMode,
        claimItems:
          claimMode === 'PARTIAL'
            ? items.map((item) => ({
                foodItemId: item.foodItemId,
                qtyKg: item.qtyKg,
              }))
            : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getUserFriendlyErrorMessage(err, 'Could not submit claim'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible && !!listing}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {!listing ? null : (
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={submitting ? undefined : onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <AppText variant="h6">Confirm your claim</AppText>
              <AppText variant="bodySmall" style={styles.provider}>
                {listing.businessName}
              </AppText>
            </View>
            <Pressable onPress={onClose} hitSlop={12} disabled={submitting}>
              <Ionicons name="close" size={normalize(24)} color={palette.black} />
            </Pressable>
          </View>

          <View style={styles.modePill}>
            <AppText variant="label" style={styles.modeText}>
              {claimMode === 'FULL' ? 'Full claim' : 'Partial claim'}
            </AppText>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Ionicons name="location-outline" size={normalize(16)} color={palette.middlegreen} />
                <AppText variant="bodySmall" style={styles.summaryText}>
                  {listing.pickupAddress}
                </AppText>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="time-outline" size={normalize(16)} color={palette.middlegreen} />
                <AppText variant="bodySmall" style={styles.summaryText}>
                  {listing.pickupWindow}
                </AppText>
              </View>
            </View>

            <AppText variant="label" style={styles.sectionTitle}>
              You are claiming
            </AppText>

            {items.map((item) => (
              <View key={item.foodItemId} style={styles.itemRow}>
                <AppText variant="bodySmall" style={styles.itemName}>
                  {item.name}
                </AppText>
                <AppText variant="bodyBold">{formatKg(item.qtyKg)} kg</AppText>
              </View>
            ))}

            <View style={styles.totalRow}>
              <AppText variant="bodyBold">Total</AppText>
              <AppText variant="h6" style={styles.totalValue}>
                {formatKg(totalKg)} kg
              </AppText>
            </View>

            {!!error && (
              <AppText variant="caption" style={styles.errorText}>
                {error}
              </AppText>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <Button
              label="Cancel"
              size="compact"
              variant="secondary"
              onPress={onClose}
              disabled={submitting}
              style={styles.cancelBtn}
            />
            <Button
              label={submitting ? 'Submitting…' : 'Confirm claim'}
              size="compact"
              onPress={handleConfirm}
              disabled={submitting || items.length === 0}
              loading={submitting}
              style={styles.confirmBtn}
            />
          </View>

          {submitting && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={palette.middlegreen} />
            </View>
          )}
        </View>
      </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '85%',
    backgroundColor: palette.white,
    borderTopLeftRadius: normalize(24),
    borderTopRightRadius: normalize(24),
    paddingHorizontal: wp(5),
    paddingBottom: hp(3),
  },
  handle: {
    alignSelf: 'center',
    width: wp(12),
    height: normalize(4),
    borderRadius: normalize(2),
    backgroundColor: '#D9D9D9',
    marginTop: hp(1.2),
    marginBottom: hp(1.5),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(3),
    marginBottom: hp(1.2),
  },
  provider: {
    color: '#666',
    marginTop: hp(0.3),
  },
  modePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F3EC',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
    borderRadius: normalize(20),
    marginBottom: hp(1.2),
  },
  modeText: {
    color: palette.middlegreen,
  },
  content: {
    paddingBottom: hp(1),
    gap: hp(1),
  },
  summaryCard: {
    backgroundColor: palette.creme,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
    borderRadius: normalize(14),
    padding: wp(3),
    gap: hp(0.8),
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2),
  },
  summaryText: {
    flex: 1,
    color: '#444',
    lineHeight: normalize(18),
  },
  sectionTitle: {
    marginTop: hp(0.5),
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.creme,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
    borderRadius: normalize(12),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    gap: wp(2),
  },
  itemName: {
    flex: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(0.5),
    paddingTop: hp(1),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E8E8',
  },
  totalValue: {
    color: palette.middlegreen,
  },
  errorText: {
    color: '#C0392B',
    marginTop: hp(0.5),
  },
  actions: {
    flexDirection: 'row',
    gap: wp(2),
    marginTop: hp(1.5),
  },
  cancelBtn: {
    flex: 1,
  },
  confirmBtn: {
    flex: 1.4,
    backgroundColor: palette.middlegreen,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderTopLeftRadius: normalize(24),
    borderTopRightRadius: normalize(24),
  },
});

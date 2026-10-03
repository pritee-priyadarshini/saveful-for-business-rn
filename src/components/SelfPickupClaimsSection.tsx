import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { ClaimPickupDetails } from '@/components/ClaimPickupDetails';
import { PostCollectSurveyModal as CharitySurveyModal } from '@/screens/charity/components/postCollectSurveyModal';
import { PostCollectSurveyModal as FarmerSurveyModal } from '@/screens/farmer/components/postCollectSurveyModal';
import { claimsService } from '@/services/claims.service';
import { showConfirmAlert } from '@/store/appAlertStore';
import { palette } from '@/theme/colors';
import { getUserFriendlyErrorMessage, showErrorAlert } from '@/utils/apiError';
import { hp, normalize, wp } from '@/utils/responsive';
import type { SelfPickupClaim } from '@/utils/receiverFeed';

type Props = {
  claims: SelfPickupClaim[];
  loading?: boolean;
  onChanged?: () => void;
  variant: 'charity' | 'farmer';
};

export function SelfPickupClaimsSection({
  claims,
  loading = false,
  onChanged,
  variant,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [markingClaimId, setMarkingClaimId] = useState<number | null>(null);
  const [detailsClaim, setDetailsClaim] = useState<SelfPickupClaim | null>(null);
  const [surveyVisible, setSurveyVisible] = useState(false);
  const [surveyClaimId, setSurveyClaimId] = useState<number | null>(null);
  const [surveyBusinessName, setSurveyBusinessName] = useState('');
  const [surveyItems, setSurveyItems] = useState<
    { id: string; name: string; quantity: number }[]
  >([]);

  useEffect(() => {
    if (claims.length === 0) setExpanded(false);
  }, [claims.length]);

  if (!loading && claims.length === 0 && !surveyVisible && !detailsClaim) return null;

  const confirmSelfPickup = (claim: SelfPickupClaim) => {
    if (markingClaimId != null) return;
    showConfirmAlert({
      title: 'Pick this up yourself?',
      message: `Mark ${claim.quantityKg} kg from ${claim.businessName} as collected? Only do this after you’ve picked it up.`,
      confirmLabel: 'Yes, I collected it',
      cancelLabel: 'Not yet',
      onConfirm: async () => {
        setMarkingClaimId(claim.claimId);
        try {
          await claimsService.markClaimCollected(claim.claimId);
          setSurveyClaimId(claim.claimId);
          setSurveyBusinessName(claim.businessName);
          setSurveyItems(
            claim.items.map((food, index) => ({
              id: String(index),
              name: food.name,
              quantity: Number(food.claimed || food.available || 0),
            })),
          );
          setSurveyVisible(true);
          onChanged?.();
        } catch (error) {
          showErrorAlert(
            error,
            'Could not mark collected',
            getUserFriendlyErrorMessage(error, 'Could not mark this claim as collected.'),
          );
        } finally {
          setMarkingClaimId(null);
        }
      },
    });
  };

  const markFromDetails = () => {
    const claim = detailsClaim;
    if (!claim) return;
    setDetailsClaim(null);
    // Two RN modals cannot be presented at once on iOS; let the sheet dismiss first.
    setTimeout(() => confirmSelfPickup(claim), 350);
  };

  const SurveyModal = variant === 'farmer' ? FarmerSurveyModal : CharitySurveyModal;
  const countLabel = claims.length === 1 ? '1 claim' : `${claims.length} claims`;

  return (
    <View style={styles.wrap}>
      <Pressable
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
        onPress={() => setExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Self-pickup ready, ${countLabel}`}
      >
        <View style={styles.summaryIcon}>
          <Ionicons name="walk-outline" size={normalize(16)} color={palette.white} />
        </View>
        <View style={styles.summaryTextWrap}>
          <AppText variant="bodyBold" style={styles.summaryTitle} numberOfLines={1}>
            Self-pickup ready
          </AppText>
          <AppText variant="caption" style={styles.summarySub} numberOfLines={1}>
            {loading ? 'Checking your claims…' : `${countLabel} · no driver assigned`}
          </AppText>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={palette.middlegreen} />
        ) : (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={normalize(18)}
            color={palette.stone}
          />
        )}
      </Pressable>

      {expanded ? (
        <View style={styles.list}>
          {claims.map((claim, index) => (
            <View
              key={claim.claimId}
              style={[styles.row, index < claims.length - 1 && styles.rowDivider]}
            >
              <View style={styles.rowMain}>
                <AppText variant="bodyBold" style={styles.business} numberOfLines={1}>
                  {claim.businessName}
                </AppText>
                <AppText variant="caption" style={styles.meta} numberOfLines={1}>
                  {claim.quantityKg} kg
                  {claim.timeLabel ? ` · ${claim.timeLabel}` : ''}
                </AppText>
              </View>
              <Pressable
                style={[
                  styles.cta,
                  markingClaimId === claim.claimId && styles.ctaDisabled,
                ]}
                disabled={markingClaimId != null}
                onPress={() => setDetailsClaim(claim)}
              >
                <AppText variant="bodyBold" style={styles.ctaText} numberOfLines={1}>
                  {markingClaimId === claim.claimId ? '…' : 'Collect'}
                </AppText>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <Modal
        visible={detailsClaim != null}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsClaim(null)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopBar}>
              <AppText variant="h6">Collection details</AppText>
              <Pressable
                style={styles.closeIconBtn}
                onPress={() => setDetailsClaim(null)}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={normalize(20)} color={palette.black} />
              </Pressable>
            </View>

            {detailsClaim ? (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <AppText variant="bodyBold" style={styles.modalSubtitle}>
                  {detailsClaim.businessName}
                </AppText>

                <ClaimPickupDetails
                  details={{
                    address: detailsClaim.address,
                    latitude: detailsClaim.pickupLat,
                    longitude: detailsClaim.pickupLng,
                    windowLabel: detailsClaim.timeLabel,
                    contactName: detailsClaim.contactName,
                    contactPhone: detailsClaim.contactPhone,
                    notes: detailsClaim.collectionNotes,
                  }}
                />

                <View style={styles.modalHeaderRow}>
                  <AppText variant="bodyBold" style={styles.modalColWide}>
                    Item Name
                  </AppText>
                  <AppText variant="bodyBold" style={styles.modalCol}>
                    Available
                  </AppText>
                  <AppText variant="bodyBold" style={styles.modalCol}>
                    Claimed
                  </AppText>
                </View>

                {detailsClaim.items.length > 0 ? (
                  detailsClaim.items.map((food, idx) => (
                    <View key={idx} style={styles.modalItemRow}>
                      <AppText variant="bodyBold" style={styles.modalColWide}>
                        {food.name}
                      </AppText>
                      <AppText variant="bodySmall" style={styles.modalCol}>
                        {food.available} kg
                      </AppText>
                      <AppText variant="bodySmall" style={styles.modalCol}>
                        {food.claimed} kg
                      </AppText>
                    </View>
                  ))
                ) : (
                  <AppText variant="bodySmall" color={palette.stone} style={styles.modalEmpty}>
                    No item breakdown available for this claim.
                  </AppText>
                )}

                <AppText variant="bodyBold" style={styles.modalTotal}>
                  Total claimed: {detailsClaim.quantityKg} kg
                </AppText>
              </ScrollView>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.collectedBtn, pressed && styles.pressed]}
              onPress={markFromDetails}
              disabled={markingClaimId != null}
              accessibilityRole="button"
            >
              <Ionicons name="checkmark-circle-outline" size={normalize(18)} color={palette.white} />
              <AppText variant="bodyBold" style={styles.collectedBtnText}>
                Collected
              </AppText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <SurveyModal
        visible={surveyVisible}
        initialAnswer="yes"
        startAtRating
        claimId={surveyClaimId}
        businessName={surveyBusinessName}
        items={surveyItems}
        onSubmitted={() => {
          onChanged?.();
        }}
        onClose={() => {
          setSurveyVisible(false);
          setSurveyClaimId(null);
          setSurveyBusinessName('');
          setSurveyItems([]);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: wp(4),
    marginTop: hp(1),
    marginBottom: hp(0.5),
    borderRadius: normalize(14),
    borderWidth: 1,
    borderColor: '#C9DFD0',
    backgroundColor: '#F3F9F5',
    overflow: 'hidden',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
    minHeight: normalize(52),
  },
  summaryIcon: {
    width: normalize(30),
    height: normalize(30),
    borderRadius: normalize(9),
    backgroundColor: palette.middlegreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: hp(0.15),
  },
  summaryTitle: {
    color: palette.black,
    textTransform: 'none',
    fontSize: normalize(14),
  },
  summarySub: {
    color: palette.midgray,
    textTransform: 'none',
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C9DFD0',
    backgroundColor: palette.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.05),
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.strokecream,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    gap: hp(0.15),
  },
  business: {
    textTransform: 'none',
    fontSize: normalize(13),
  },
  meta: {
    color: palette.midgray,
    textTransform: 'none',
  },
  cta: {
    backgroundColor: palette.middlegreen,
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(0.75),
    borderRadius: normalize(9),
    minWidth: normalize(72),
    alignItems: 'center',
  },
  ctaDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    color: palette.white,
    fontSize: normalize(12),
    textTransform: 'none',
  },
  pressed: {
    opacity: 0.9,
  },
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: palette.white,
    borderTopLeftRadius: normalize(24),
    borderTopRightRadius: normalize(24),
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    paddingBottom: hp(4),
    gap: hp(1.2),
    maxHeight: '88%',
  },
  modalScroll: {
    maxHeight: hp(58),
  },
  modalScrollContent: {
    gap: hp(1.2),
    paddingBottom: hp(1),
  },
  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeIconBtn: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    textTransform: 'none',
    color: palette.midgray,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    paddingBottom: hp(1),
    borderBottomWidth: 1,
    borderColor: palette.border,
  },
  modalItemRow: {
    flexDirection: 'row',
    paddingVertical: hp(0.5),
  },
  modalColWide: {
    flex: 2,
    textTransform: 'none',
  },
  modalCol: {
    flex: 1,
    textAlign: 'center',
    textTransform: 'none',
  },
  modalEmpty: {
    textTransform: 'none',
    textAlign: 'center',
    paddingVertical: hp(1),
  },
  modalTotal: {
    textTransform: 'none',
  },
  collectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    backgroundColor: palette.middlegreen,
    borderRadius: normalize(14),
    paddingVertical: hp(1.6),
  },
  collectedBtnText: {
    color: palette.white,
    textTransform: 'none',
    fontSize: normalize(15),
  },
});

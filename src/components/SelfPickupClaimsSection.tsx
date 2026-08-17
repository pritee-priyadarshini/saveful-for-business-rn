import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
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
  const [surveyVisible, setSurveyVisible] = useState(false);
  const [surveyClaimId, setSurveyClaimId] = useState<number | null>(null);
  const [surveyBusinessName, setSurveyBusinessName] = useState('');
  const [surveyItems, setSurveyItems] = useState<
    { id: string; name: string; quantity: number }[]
  >([]);

  useEffect(() => {
    if (claims.length === 0) setExpanded(false);
  }, [claims.length]);

  if (!loading && claims.length === 0 && !surveyVisible) return null;

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
                onPress={() => confirmSelfPickup(claim)}
              >
                <AppText variant="bodyBold" style={styles.ctaText} numberOfLines={1}>
                  {markingClaimId === claim.claimId ? '…' : 'Collect'}
                </AppText>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <SurveyModal
        visible={surveyVisible}
        initialAnswer="yes"
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
});

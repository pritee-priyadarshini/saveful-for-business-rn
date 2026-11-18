import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { ActionButton as Button } from '@/components/consolidated/ui';
import { Screen } from '@/components/Screen';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { DeclarationCheckbox } from '@/components/consolidated/DeclarationCheckbox';
import { QuantityInput } from '@/components/consolidated/QuantityInput';
import { PendingChangeBanner } from '@/components/consolidated/PendingChangeBanner';
import { Chip, Divider, InfoRow, Pill, ProgressBar, SectionTitle, Surface, cc } from '@/components/consolidated/ui';
import { GuideHeaderRight, GuideTarget, tours, useScreenGuide } from '@/components/guide';
import { normalize } from '@/utils/responsive';
import { PostCollectSurveyModal } from '@/screens/charity/components/postCollectSurveyModal';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { claimsService } from '@/services/claims.service';
import { consolidatedService } from '@/services/consolidated.service';
import { showConfirmAlert } from '@/store/appAlertStore';
import { palette } from '@/theme/colors';
import { showErrorAlert } from '@/utils/apiError';
import { REJECTION_REASON_OPTIONS, formatKg, formatWindowInZone } from '@/utils/consolidated';
import type { ItemCheckView, RejectionReason } from '@/types/consolidated';

type Line = {
  id: number;
  name: string;
  listed: number;
  accepted: number;
  rejected: number;
  unavailable: number;
  reason?: RejectionReason;
  note: string;
  category?: string | null;
  quantityDescription?: string | null;
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function PickupCheckScreen() {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const claimId = Number(route.params?.claimId);
  const { submitting, withLock } = useSubmitLock();
  const [view, setView] = useState<ItemCheckView | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [acceptedDeclaration, setAcceptedDeclaration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acked, setAcked] = useState(false);
  const [survey, setSurvey] = useState(false);

  useEffect(() => {
    let cancelled = false;
    consolidatedService.getItemCheck(claimId).then((next) => {
      if (cancelled) return;
      setView(next);
      setLines(next.items.map((item) => ({
        id: item.masterFoodItemId,
        name: item.name,
        listed: item.qtyKg,
        accepted: item.qtyKg,
        rejected: 0,
        unavailable: 0,
        note: '',
        category: item.category,
        quantityDescription: item.quantityDescription,
      })));
    }).catch((err) => showErrorAlert(err, 'Could not load items'));
    return () => { cancelled = true; };
  }, [claimId]);

  const update = (id: number, patch: Partial<Line>) => {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const mismatches = useMemo(
    () => lines.filter((line) => Math.abs(round(line.accepted + line.rejected + line.unavailable) - round(line.listed)) > 0.01),
    [lines],
  );

  const submit = () => {
    if (!view) return;
    if (view.pendingChange && !acked) {
      setError('Please confirm the pickup change first.');
      return;
    }
    if (mismatches.length) {
      setError('Accepted, not accepted and not available must add up to the listed weight for every item.');
      return;
    }
    const missingReason = lines.find((line) => line.rejected > 0 && !line.reason);
    if (missingReason) {
      setError(`Choose a reason for ${missingReason.name}.`);
      return;
    }
    const other = lines.find((line) => line.rejected > 0 && line.reason === 'OTHER' && !line.note.trim());
    if (other) {
      setError(`Add a note for ${other.name}.`);
      return;
    }
    if (!acceptedDeclaration) {
      setError('Please confirm before submitting.');
      return;
    }
    setError(null);
    void withLock(async () => {
      try {
        await consolidatedService.submitItemCheck(claimId, {
          items: lines.map((line) => ({
            masterFoodItemId: line.id,
            acceptedQtyKg: line.accepted,
            rejectedQtyKg: line.rejected,
            unavailableQtyKg: line.unavailable,
            rejectionReason: line.rejected > 0 ? line.reason : undefined,
            rejectionNote: line.note.trim() || undefined,
          })),
          declaration: { version: view.declaration.version, accepted: true },
        });
        setSurvey(true);
      } catch (err) {
        showErrorAlert(err, 'Could not submit');
      }
    });
  };

  const totalListed = lines.reduce((sum, line) => sum + line.listed, 0);
  const totalAccepted = lines.reduce((sum, line) => sum + line.accepted, 0);
  const guide = useScreenGuide(tours.pickupCheckTour, { ready: view != null && !survey });

  return (
    <Screen scrollable backgroundColor={palette.creme} transparentTop contentStyle={styles.screen}>
      <StackHeroHeader
        title="Confirm collection"
        subtitle="Inspect the food and record what you accepted"
        right={<GuideHeaderRight onGuide={guide.start} />}
      />
      {!view ? <ActivityIndicator color={palette.kale} style={styles.loader} /> : (
        <View style={styles.body}>
          <Surface style={styles.gap10}>
            <InfoRow icon="location-outline" label="Pickup location" value={view.pointName} sub={view.pointAddress} />
            <Divider />
            <InfoRow icon="time-outline" label="Pickup window" value={formatWindowInZone(view.pickupStartAt, view.pickupEndAt, view.timezone)} />
          </Surface>

          {view.pendingChange && !acked ? (
            <PendingChangeBanner
              claimId={claimId}
              changeId={view.pendingChange.id}
              summary={view.pendingChange.summary}
              onAcknowledged={() => setAcked(true)}
              onCancelPickup={() => {
                showConfirmAlert({
                  title: 'Cancel pickup?',
                  message: 'This pickup will be cancelled.',
                  confirmLabel: 'Cancel pickup',
                  destructive: true,
                  onConfirm: async () => {
                    try {
                      await claimsService.cancelClaim(claimId);
                      navigation.goBack();
                    } catch (err) {
                      showErrorAlert(err, 'Could not cancel pickup');
                    }
                  },
                });
              }}
            />
          ) : null}

          <GuideTarget id="pickup.summary">
            <Surface tone="tint" style={styles.gap10}>
              <View style={styles.rowBetween}>
                <AppText variant="bodyBold">Accepted so far</AppText>
                <AppText variant="bodyBold" color={palette.kale}>{formatKg(totalAccepted)} of {formatKg(totalListed)} kg</AppText>
              </View>
              <ProgressBar value={totalAccepted} total={totalListed} />
              <View style={styles.chips}>
                <Chip
                  label="Accept all"
                  icon="checkmark-done"
                  selected={false}
                  onPress={() => setLines((current) => current.map((line) => ({ ...line, accepted: line.listed, rejected: 0, unavailable: 0 })))}
                />
                <Chip
                  label="None was there"
                  icon="close"
                  selected={false}
                  onPress={() => setLines((current) => current.map((line) => ({ ...line, accepted: 0, rejected: 0, unavailable: line.listed })))}
                />
              </View>
            </Surface>
          </GuideTarget>

          <SectionTitle title="Items" caption="For each item, split the weight between accepted, not accepted and not available." />
          {lines.map((line, lineIndex) => {
            const remaining = round(line.listed - line.accepted - line.rejected - line.unavailable);
            const balanced = Math.abs(remaining) <= 0.01;
            return (
              <GuideTarget key={line.id} id="pickup.items" disabled={lineIndex > 0}>
                <Surface style={[styles.gap12, !balanced && styles.unbalanced]}>
                  <View style={styles.rowBetween}>
                    <View style={styles.flex}>
                      <AppText variant="subheading">{line.name}</AppText>
                      {line.quantityDescription ? (
                        <AppText variant="meta" color={palette.stone}>{line.quantityDescription}</AppText>
                      ) : null}
                    </View>
                    <Pill label={`${formatKg(line.listed)} kg`} color={palette.primary} background={palette.creme3} />
                  </View>
                  <QuantityInput label="Accepted" value={line.accepted} max={line.listed} onChange={(value) => update(line.id, { accepted: value })} />
                  <QuantityInput label="Not accepted" value={line.rejected} max={line.listed} onChange={(value) => update(line.id, { rejected: value })} />
                  <QuantityInput label="Not available" value={line.unavailable} max={line.listed} onChange={(value) => update(line.id, { unavailable: value })} />
                  {balanced ? (
                    <Pill label="All weight accounted for" color={palette.kale} background={cc.tint} icon="checkmark-circle" />
                  ) : (
                    <Pill
                      label={remaining > 0 ? `${formatKg(remaining)} kg still to assign` : `${formatKg(-remaining)} kg too much`}
                      color={palette.danger}
                      background={cc.dangerBg}
                      icon="alert-circle"
                    />
                  )}
                  {line.rejected > 0 ? (
                    <View style={styles.gap8}>
                      <AppText variant="bodyBold">Why wasn't it accepted?</AppText>
                      <View style={styles.chips}>
                        {REJECTION_REASON_OPTIONS.map((option) => (
                          <Chip
                            key={option.value}
                            label={option.label}
                            selected={line.reason === option.value}
                            onPress={() => update(line.id, { reason: option.value })}
                          />
                        ))}
                      </View>
                      {line.reason === 'OTHER' ? (
                        <TextInput
                          value={line.note}
                          onChangeText={(note) => update(line.id, { note })}
                          placeholder="Tell us what was wrong"
                          placeholderTextColor={palette.stone}
                          style={styles.note}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </Surface>
              </GuideTarget>
            );
          })}

          <GuideTarget id="pickup.confirm" style={styles.gap12}>
            <DeclarationCheckbox
              title="Charity declaration"
              declaration={view.declaration}
              checked={acceptedDeclaration}
              onChange={(value) => { setAcceptedDeclaration(value); setError(null); }}
              error={error}
            />
            <Button label="Confirm pickup" icon="checkmark-circle-outline" onPress={submit} loading={submitting} disabled={mismatches.length > 0} />
          </GuideTarget>
          {mismatches.length ? (
            <AppText variant="meta" color={palette.stone} style={styles.center}>
              Assign all the weight for every item to continue.
            </AppText>
          ) : null}
        </View>
      )}
      <PostCollectSurveyModal
        visible={survey}
        claimId={claimId}
        businessName={view?.pointName}
        startAtRating
        items={lines.filter((line) => line.accepted > 0).map((line) => ({
          id: String(line.id),
          name: line.name,
          quantity: line.accepted,
        }))}
        onClose={() => {
          setSurvey(false);
          navigation.goBack();
        }}
        onSubmitted={() => {
          setSurvey(false);
          navigation.goBack();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 48 },
  loader: { marginTop: 24 },
  body: { paddingHorizontal: normalize(16), paddingTop: normalize(4), gap: normalize(12) },
  flex: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  gap8: { gap: 8 },
  gap10: { gap: 10 },
  gap12: { gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unbalanced: { borderColor: cc.dangerBorder, borderWidth: 1 },
  note: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cc.hairline,
    borderRadius: cc.radiusSm,
    padding: 12,
    color: palette.black,
    backgroundColor: palette.white,
  },
});

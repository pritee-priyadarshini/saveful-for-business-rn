import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { ActionButton as Button } from '@/components/consolidated/ui';
import { InputField } from '@/components/InputField';
import { Screen } from '@/components/Screen';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { CollectionStatusBadge } from '@/components/consolidated/CollectionStatusBadge';
import { CollectionTimesCard } from '@/components/consolidated/CollectionTimesCard';
import { HandoverButton } from '@/components/consolidated/HandoverButton';
import { ReceiptSheet } from '@/components/consolidated/ReceiptSheet';
import { Divider, IconBubble, InfoRow, Notice, Pill, SectionTitle, StepTrack, Surface, cc } from '@/components/consolidated/ui';
import { GuideHeaderRight, GuideTarget, tours, useScreenGuide } from '@/components/guide';
import { normalize } from '@/utils/responsive';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { consolidatedService } from '@/services/consolidated.service';
import { showConfirmAlert } from '@/store/appAlertStore';
import { useListingsStore } from '@/store/listingsStore';
import { palette } from '@/theme/colors';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import { canEditContribution, canHandoverContribution, canWithdrawContribution, formatInTimezone, formatKg, handoverInstruction } from '@/utils/consolidated';
import type { ContributionDetail, ContributionItem } from '@/types/consolidated';

type DraftItem = { name: string; category: string; qty: string; quantityDescription: string; foodItemId?: number };

export function ContributionDetailScreen() {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [detail, setDetail] = useState<ContributionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [notes, setNotes] = useState('');
  const [banner, setBanner] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = route.params?.contributionId
        ? await consolidatedService.getContribution(Number(route.params.contributionId))
        : await consolidatedService.getContributionByListing(Number(route.params?.listingId));
      setDetail(next);
      setNotes(next.collectionNotes || '');
      setDraft(next.items.map((item) => ({
        foodItemId: item.foodItemId,
        name: item.name,
        category: item.category || item.name,
        qty: String(item.submittedQtyKg),
        quantityDescription: item.quantityDescription || '',
      })));
      if (next.pendingChangeStatus === 'PENDING_APPROVAL' || next.pendingChangeRequestId) {
        setBanner('Change waiting for manager approval');
      }
    } catch (error) {
      showErrorAlert(error, 'Could not load contribution');
    } finally {
      setLoading(false);
    }
  }, [route.params?.contributionId, route.params?.listingId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const save = async () => {
    if (!detail) return;
    const foodItems = draft
      .filter((item) => item.name.trim() && Number(item.qty) > 0)
      .map((item) => ({
        ...(item.foodItemId ? { foodItemId: item.foodItemId } : {}),
        name: item.name.trim(),
        category: item.category.trim() || item.name.trim(),
        totalQtyKg: Number(item.qty),
        quantityDescription: item.quantityDescription.trim() || undefined,
        unit: 'kg',
      }));
    if (!foodItems.length) {
      showErrorAlert('Add at least one item with a weight.', 'Missing food');
      return;
    }
    try {
      const result = await consolidatedService.updateContribution(detail.id, {
        foodItems,
        collectionNotes: notes.trim() || undefined,
      });
      if (result.status === 'PENDING_APPROVAL' || result.changeRequestId) {
        setBanner('Change waiting for manager approval');
        showSuccessAlert('Sent for manager approval.', 'Submitted');
      } else {
        showSuccessAlert('Contribution updated.', 'Saved');
      }
      setEditing(false);
      useListingsStore.getState().invalidateSite();
      await load();
    } catch (error) {
      showErrorAlert(error, 'Could not update contribution');
    }
  };

  const guide = useScreenGuide(detail ? tours.contributionTour(detail.method) : null, { ready: !loading && Boolean(detail) });

  if (loading || !detail) {
    return (
      <Screen backgroundColor={palette.creme} transparentTop>
        <StackHeroHeader title="Your contribution" />
        <ActivityIndicator color={palette.kale} style={{ marginTop: 24 }} />
      </Screen>
    );
  }

  const published = detail.collectionStatus === 'PUBLISHED' || detail.collectionStatus === 'CLAIMED' || detail.collectionStatus === 'AWAITING_ITEM_CHECK' || detail.collectionStatus === 'COMPLETED';
  const internal = detail.method === 'INTERNAL_COLLECTION';
  const notReceived = detail.receipt?.status === 'NOT_RECEIVED';
  const received = detail.receipt?.status === 'RECEIVED';
  const when = (at?: string | null, by?: string | null) => (at ? `${formatInTimezone(at, detail.timezone)}${by ? ` · ${by}` : ''}` : null);
  const stage = detail.status === 'COMPLETED' ? 4 : received ? 3 : detail.handover?.at ? 2 : 1;
  const listedKg = detail.items.reduce((sum, item) => sum + Number(item.submittedQtyKg || 0), 0);
  const acceptedKg = detail.items.reduce((sum, item) => sum + Number(item.acceptedQtyKg || 0), 0);

  return (
    <Screen scrollable backgroundColor={palette.creme} transparentTop contentStyle={styles.screen}>
      <StackHeroHeader
        title={detail.pointName}
        subtitle={`${detail.groupName || 'Consolidated collection'} · ${formatKg(listedKg)} kg listed`}
        right={<GuideHeaderRight onGuide={guide.start} />}
      />
      <View style={styles.body}>
        {banner ? <Notice tone="warn" icon="hourglass-outline" title={banner} body="Your manager will approve or reject it. Until then the published listing stays as it was." /> : null}

        {/* Progress */}
        <GuideTarget id="contribution.progress">
          <Surface style={styles.gap12}>
            <View style={styles.rowBetween}>
              <AppText variant="bodyBold">Progress</AppText>
              <CollectionStatusBadge status={detail.status} kind="contribution" method={detail.method} />
            </View>
            {notReceived ? (
              <Notice tone="danger" icon="close-circle" title="Marked not received at the collection point" body={detail.receipt?.note || null} />
            ) : (
              <StepTrack
                current={stage}
                steps={[
                  { label: 'Listed', detail: when(detail.submittedAt, detail.submittedBy?.name) },
                  { label: internal ? 'Collected from your outlet' : 'Dropped off at the collection point', detail: when(detail.handover?.at, detail.handover?.by?.name) },
                  { label: `Received at ${detail.pointName}`, detail: received ? when(detail.receipt?.at, detail.receipt?.by?.name) : null },
                  { label: 'Collected by a charity', detail: detail.status === 'COMPLETED' ? `${formatKg(acceptedKg)} kg accepted` : null },
                ]}
              />
            )}
            {received && detail.receipt?.note ? (
              <AppText variant="meta" color={palette.stone}>Receiver's note: {detail.receipt.note}</AppText>
            ) : null}
          </Surface>
        </GuideTarget>

        {/* Handover */}
        {canHandoverContribution(detail.status) ? (
          <GuideTarget id="contribution.handover">
            <Surface tone="tint" style={styles.gap12}>
              <View style={styles.stepHead}>
                <IconBubble name={internal ? 'walk-outline' : 'archive-outline'} color={palette.white} background={palette.kale} />
                <View style={styles.flex}>
                  <AppText variant="subheading">{internal ? 'Have your food ready' : 'Drop off your food'}</AppText>
                </View>
              </View>
              <AppText variant="bodySmall" color={palette.midgray}>
                {handoverInstruction({
                  method: detail.method,
                  point: { name: detail.pointName },
                  handoverStartAt: detail.times.handoverStartAt,
                  handoverEndAt: detail.times.handoverEndAt,
                  timezone: detail.timezone,
                })}
              </AppText>
              <HandoverButton contributionId={detail.id} method={detail.method} timezone={detail.timezone} size="default" onDone={() => { void load(); }} />
            </Surface>
          </GuideTarget>
        ) : null}

        {/* Food */}
        <GuideTarget id="contribution.food" style={styles.gap12}>
          <SectionTitle
            title="Your food"
            action={canEditContribution(detail.status, detail.collectionStatus) && !editing
              ? { label: published ? 'Request a change' : 'Edit', onPress: () => setEditing(true) }
              : null}
          />
          {!editing ? (
            <Surface style={styles.gap10}>
              {detail.items.map((item: ContributionItem, index) => (
                <View key={item.foodItemId}>
                  {index > 0 ? <Divider style={styles.itemDivider} /> : null}
                  <View style={styles.itemRow}>
                    <View style={styles.flex}>
                      <AppText variant="bodyBold">{item.name}</AppText>
                      {item.quantityDescription ? <AppText variant="meta" color={palette.stone}>{item.quantityDescription}</AppText> : null}
                    </View>
                    <AppText variant="bodyBold">{formatKg(item.submittedQtyKg)} kg</AppText>
                  </View>
                  {item.verifiedQtyKg != null || item.acceptedQtyKg != null ? (
                    <View style={styles.itemPills}>
                      {item.verifiedQtyKg != null ? (
                        <Pill label={`Verified ${formatKg(item.verifiedQtyKg)} kg`} color={palette.primary} background={palette.creme3} />
                      ) : null}
                      {item.acceptedQtyKg != null ? (
                        <Pill label={`Accepted ${formatKg(item.acceptedQtyKg)} kg`} color={palette.kale} background={cc.tint} />
                      ) : null}
                      {item.rejectedQtyKg ? (
                        <Pill label={`Not accepted ${formatKg(item.rejectedQtyKg)} kg`} color={cc.warnText} background={cc.warnBg} />
                      ) : null}
                      {item.unavailableQtyKg ? (
                        <Pill label={`Not available ${formatKg(item.unavailableQtyKg)} kg`} color={palette.stone} background={cc.muted} />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ))}
              {detail.collectionNotes ? (
                <>
                  <Divider />
                  <AppText variant="meta" color={palette.stone}>Notes · {detail.collectionNotes}</AppText>
                </>
              ) : null}
            </Surface>
          ) : (
            <Surface style={styles.gap12}>
              {published ? (
                <Notice tone="tint" title="This collection is already published" body="Your change goes to the manager for approval before it reaches the charity." />
              ) : null}
              {draft.map((item, index) => (
                <View key={`${item.foodItemId || 'new'}-${index}`} style={styles.editRow}>
                  <View style={styles.rowBetween}>
                    <AppText variant="bodyBold">Item {index + 1}</AppText>
                    <Pressable onPress={() => setDraft((rows) => rows.filter((_, i) => i !== index))} hitSlop={8}>
                      <Ionicons name="trash-outline" size={normalize(18)} color={palette.danger} />
                    </Pressable>
                  </View>
                  <InputField label="Food" value={item.name} onChangeText={(value) => setDraft((rows) => rows.map((row, i) => i === index ? { ...row, name: value, category: row.category || value } : row))} />
                  <View style={styles.inline}>
                    <View style={styles.flex}>
                      <InputField label="Weight (kg)" value={item.qty} keyboardType="decimal-pad" onChangeText={(value) => setDraft((rows) => rows.map((row, i) => i === index ? { ...row, qty: value } : row))} />
                    </View>
                    <View style={styles.flex}>
                      <InputField label="Quantity" optional value={item.quantityDescription} onChangeText={(value) => setDraft((rows) => rows.map((row, i) => i === index ? { ...row, quantityDescription: value } : row))} placeholder="e.g. 3 trays" />
                    </View>
                  </View>
                </View>
              ))}
              <Button label="Add item" icon="add" variant="secondary" size="compact" onPress={() => setDraft((rows) => [...rows, { name: '', category: '', qty: '', quantityDescription: '' }])} />
              <TextInput value={notes} onChangeText={setNotes} placeholder="Notes for the collection point (optional)" placeholderTextColor={palette.stone} style={styles.notes} multiline />
              <View style={styles.inline}>
                <Button label="Cancel" variant="secondary" style={styles.flex} onPress={() => setEditing(false)} />
                <Button label={published ? 'Send for approval' : 'Save'} style={styles.flex} onPress={() => { void save(); }} />
              </View>
            </Surface>
          )}
        </GuideTarget>

        {/* Logistics */}
        <GuideTarget id="contribution.details" style={styles.gap12}>
          <SectionTitle title="Collection details" />
          <CollectionTimesCard method={detail.method} timezone={detail.timezone} times={detail.times} status={detail.collectionStatus} />
          <Surface style={styles.gap10}>
            <InfoRow icon="location-outline" label="Collection point" value={detail.pointName} sub={[detail.pointAddress, detail.directions].filter(Boolean).join(' · ')} />
            {detail.suitabilityNotes ? (
              <>
                <Divider />
                <InfoRow icon="shield-checkmark-outline" label="Food suitability" value={detail.suitabilityNotes} />
              </>
            ) : null}
            {detail.instructions ? (
              <>
                <Divider />
                <InfoRow icon="document-text-outline" label="Instructions" value={detail.instructions} />
              </>
            ) : null}
          </Surface>
        </GuideTarget>

        {/* Manager tools */}
        {detail.canReceive || detail.canManage ? (
          <>
            <SectionTitle title="Manager tools" />
            <View style={styles.inline}>
              {detail.canReceive ? (
                <Button label="Record receipt" icon="clipboard-outline" size="compact" style={styles.flex} onPress={() => setReceiptOpen(true)} />
              ) : null}
              {detail.canManage ? (
                <Button
                  label="Exclude"
                  variant="secondary"
                  size="compact"
                  style={styles.flex}
                  onPress={() => showConfirmAlert({
                    title: 'Exclude this site?',
                    message: 'The site will not be included when this collection is published.',
                    confirmLabel: 'Exclude',
                    destructive: true,
                    onConfirm: async () => {
                      try {
                        await consolidatedService.excludeContribution(detail.id, 'Excluded by manager');
                        await load();
                      } catch (error) {
                        showErrorAlert(error, 'Could not exclude');
                      }
                    },
                  })}
                />
              ) : null}
            </View>
          </>
        ) : null}

        {canWithdrawContribution(detail.status) && !published && !editing ? (
          <Button
            label="Withdraw from this collection"
            variant="ghost"
            icon="remove-circle-outline"
            onPress={() => showConfirmAlert({
              title: 'Withdraw this food?',
              message: 'It will be removed from this collection. You can list it again while the collection is open.',
              confirmLabel: 'Withdraw',
              destructive: true,
              onConfirm: async () => {
                try {
                  await consolidatedService.withdrawContribution(detail.id);
                  useListingsStore.getState().invalidateSite();
                  showSuccessAlert('Withdrawn.', 'Updated');
                  navigation.goBack();
                } catch (error) {
                  showErrorAlert(error, 'Could not withdraw');
                }
              },
            })}
          />
        ) : null}
      </View>
      <ReceiptSheet
        contribution={receiptOpen ? detail : null}
        onClose={() => setReceiptOpen(false)}
        onSubmit={async (payload) => {
          try {
            await consolidatedService.recordReceipt(detail.id, payload);
            setReceiptOpen(false);
            await load();
          } catch (error) {
            showErrorAlert(error, 'Could not record receipt');
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 40 },
  body: { paddingHorizontal: normalize(16), paddingTop: normalize(4), gap: normalize(12) },
  flex: { flex: 1, minWidth: 0 },
  gap10: { gap: 10 },
  gap12: { gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyebrow: { letterSpacing: 0.8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemDivider: { marginBottom: 10 },
  itemPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  editRow: { gap: 8, backgroundColor: cc.muted, borderRadius: cc.radiusSm, padding: 12 },
  inline: { flexDirection: 'row', gap: 8 },
  notes: {
    minHeight: 70,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cc.hairline,
    borderRadius: cc.radiusSm,
    padding: 12,
    color: palette.black,
    backgroundColor: palette.white,
    textAlignVertical: 'top',
  },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { tabular } from '@/components/consolidated/ui';
import {
  MfcCta,
  MfcEmpty,
  MfcNotice,
  MfcPageTitle,
  MfcSectionLabel,
} from '@/components/makeFoodCount/MfcAppUi';
import { BlockedDraftNotice } from '@/components/makeFoodCount/BlockedDraftNotice';
import { MFC } from '@/constants/makeFoodCount';
import { OutcomeProgress } from '@/components/makeFoodCount/OutcomeProgress';
import { Screen } from '@/components/Screen';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { makeFoodCountService, readMfcError } from '@/services/makeFoodCount.service';
import { useMakeFoodCountStore } from '@/store/makeFoodCountStore';
import { palette } from '@/theme/colors';
import { showSuccessAlert } from '@/utils/apiError';
import { elevation } from '@/theme/elevation';
import type { FoodListingKind, FoodSource, KindOutcome, MfcListingRouteParams } from '@/types/makeFoodCount';
import { buildSummaryTable, formatKg, kindAvailableKg, type SummaryRow } from '@/utils/makeFoodCountSummary';
import { normalize, useResponsiveLayout } from '@/utils/responsive';

const TOUCH = 44;

const SAVED_OFFLINE = "Your latest changes are saved on this phone and will sync. Try again once you're back online.";

type IconName = keyof typeof Ionicons.glyphMap;

export function SummaryScreen() {
  const layout = useResponsiveLayout();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute();
  // One-off notice passed back by the listing screens ("Listed 7 kg for people").
  const routeNotice = (route.params as { notice?: string } | undefined)?.notice;
  /** Opened from Recent records on a finished record: show what happened, don't ask again. */
  const viewOnly = (route.params as { mode?: string } | undefined)?.mode === 'view';
  const writeBlocked = useMakeFoodCountStore((state) => state.writeBlocked);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!routeNotice) return;
    setNotice(routeNotice);
    navigation.setParams({ notice: undefined } as never);
  }, [routeNotice, navigation]);
  const { submitting, withLock } = useSubmitLock();
  const [busyKind, setBusyKind] = useState<FoodListingKind | 'SAVE' | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** True once the outcomes were reloaded after the latest edit; until then local lines are used. */
  const [outcomesFresh, setOutcomesFresh] = useState(false);

  const sources = useMakeFoodCountStore((state) => state.sources);
  const lines = useMakeFoodCountStore((state) => state.lines);
  const recordId = useMakeFoodCountStore((state) => state.recordId);
  const detail = useMakeFoodCountStore((state) => state.detail);
  const lockedLine = useMakeFoodCountStore((state) => state.lockedLine);
  const conflictNotice = useMakeFoodCountStore((state) => state.conflictNotice);
  const syncStatus = useMakeFoodCountStore((state) => state.syncStatus);
  const dismissConflict = useMakeFoodCountStore((state) => state.dismissConflict);

  const table = useMemo(() => buildSummaryTable(sources, Object.values(lines)), [sources, lines]);
  const localTotals = useMemo(
    () => ({ fitKg: table.total.forPeopleKg, notFitKg: table.total.otherKg }),
    [table],
  );

  const availableKg = useMemo(
    () => ({
      EDIBLE: kindAvailableKg({ kind: 'EDIBLE', localTotals, detail, recordId, outcomesFresh }),
      NON_EDIBLE: kindAvailableKg({ kind: 'NON_EDIBLE', localTotals, detail, recordId, outcomesFresh }),
    }),
    [localTotals, detail, recordId, outcomesFresh],
  );

  const outcomes: Record<FoodListingKind, KindOutcome | null> = {
    EDIBLE: detail && recordId != null && detail.record.id === recordId ? detail.outcomes.EDIBLE : null,
    NON_EDIBLE: detail && recordId != null && detail.record.id === recordId ? detail.outcomes.NON_EDIBLE : null,
  };

  // On focus: push any local edits first, then reload the server copy so outcomes are current.
  // (loadRecord replaces local lines, so it only runs once the server has everything.)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setOutcomesFresh(false);
      void (async () => {
        const store = useMakeFoodCountStore.getState();
        const synced = await store.flushNow();
        const id = useMakeFoodCountStore.getState().recordId;
        if (!synced || id == null || cancelled) return;
        const loaded = await useMakeFoodCountStore.getState().loadRecord(id);
        if (!cancelled) setOutcomesFresh(loaded != null);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const openSource = (source?: FoodSource) => {
    navigation.navigate('MfcRecord', source ? { source } : undefined);
  };

  const openListing = (kind: FoodListingKind) =>
    withLock(async () => {
      setError(null);
      setBusyKind(kind);
      try {
        const synced = await useMakeFoodCountStore.getState().flushNow();
        const id = useMakeFoodCountStore.getState().recordId;
        if (!synced || id == null) {
          setError(SAVED_OFFLINE);
          return;
        }
        let items;
        try {
          items = (await makeFoodCountService.getListingPrefill(id, kind)).items.filter((item) => item.availableKg > 0);
        } catch (e) {
          setError(readMfcError(e).message);
          return;
        }
        if (items.length === 0) {
          setError('Nothing is available to list for this group of food.');
          return;
        }
        const mfc: MfcListingRouteParams = { recordId: id, kind, items };
        // CreateListing / CreateFarmListing live in RestaurantStack under Tabs → Listings.
        navigation.navigate('Tabs', {
          screen: 'Listings',
          params: {
            screen: kind === 'EDIBLE' ? 'CreateListing' : 'CreateFarmListing',
            params: { mfc },
            // Keep the listings list underneath, so back (and publish) land on it, not an empty stack.
            initial: false,
          },
        });
      } finally {
        setBusyKind(null);
      }
    });

  const saveWithoutListing = () =>
    withLock(async () => {
      setError(null);
      setBusyKind('SAVE');
      try {
        const totalKg = table.total.totalKg;
        const ok = await useMakeFoodCountStore.getState().saveRecord();
        if (!ok) {
          const state = useMakeFoodCountStore.getState();
          // A 409 already raised its own Notice (conflict or locked line).
          if (state.syncStatus === 'offline') setError(SAVED_OFFLINE);
          else if (state.lastError) setError(state.lastError);
          else if (!state.conflictNotice && !state.lockedLine) setError("We couldn't save this record. Please try again.");
          return;
        }
        // Saved: the next recording must start a fresh record, so the open draft is cleared.
        useMakeFoodCountStore.getState().clearDraft();
        navigation.navigate('Tabs', { screen: 'Home' });
        showSuccessAlert(`${formatKg(totalKg)} of food recorded. It's kept as a record only; nothing was listed.`, 'Record saved');
      } finally {
        setBusyKind(null);
      }
    });

  return (
    <Screen transparentTop backgroundColor={MFC.page}>
      <View
        style={[
          styles.page,
          { paddingHorizontal: layout.pagePadH, maxWidth: layout.contentMaxWidth, paddingTop: layout.space(12, 16), paddingBottom: layout.space(32, 40) },
        ]}
      >
        <MfcPageTitle
          back={viewOnly ? null : { label: 'Back to recording', onPress: () => openSource() }}
          eyebrow={viewOnly ? 'Make Food Count / Saved record' : 'Make Food Count / Food summary'}
          title={viewOnly ? 'Record summary' : 'Food summary'}
          subtitle={
            viewOnly
              ? 'This record is complete. Here is what was recorded and what happened to it.'
              : 'Review the food recorded. Overproduction is shown as potentially available for people, subject to your review and food safety checks during listing. Other recorded sources are shown separately.'
          }
        />

        {notice ? (
          <MfcNotice tone="tint" icon="checkmark-circle" title={notice}>
            <MfcCta label="Dismiss" variant="secondary" compact onPress={() => setNotice(null)} style={styles.dismiss} />
          </MfcNotice>
        ) : null}
        {conflictNotice ? (
          <MfcNotice tone="warn" icon="refresh-circle" title={conflictNotice}>
            <MfcCta label="Dismiss" variant="secondary" compact onPress={dismissConflict} style={styles.dismiss} />
          </MfcNotice>
        ) : null}
        {lockedLine ? <MfcNotice tone="warn" icon="lock-closed" title={lockedLine.message} /> : null}
        {syncStatus === 'offline' ? <MfcNotice tone="muted" icon="cloud-offline" title="Saved on this phone, will sync" /> : null}
        {!viewOnly ? <BlockedDraftNotice onClosed={() => navigation.navigate('MfcRecentRecords')} /> : null}
        {error && !(writeBlocked && !viewOnly) ? <MfcNotice tone="danger" title={error} /> : null}

        {sources.length === 0 ? (
          <MfcEmpty
            icon="nutrition-outline"
            title="Nothing recorded yet"
            body="Choose your food sources and add quantities to see the summary."
            action={<MfcCta label="Back to recording" arrow onPress={() => openSource()} />}
          />
        ) : (
          <>
            <SummaryTable rows={table.rows} total={table.total} onOpen={viewOnly ? undefined : openSource} />

            {viewOnly ? (
              <ResultPanel outcomes={outcomes} />
            ) : (
            <View style={styles.nextPanel}>
              <View style={styles.nextHead}>
                <MfcSectionLabel>What would you like to do next?</MfcSectionLabel>
                <AppText variant="bodySmall" color={MFC.muted}>
                  Create one or both listings, or save the record without listing.
                </AppText>
              </View>
              <View style={[styles.cards, layout.isTablet && styles.cardsTablet]}>
                <ActionCard
                  icon="people-outline"
                  tone="green"
                  title="List surplus for people"
                  detail={`${formatKg(availableKg.EDIBLE)} available`}
                  enabled={availableKg.EDIBLE > 0 && !submitting}
                  loading={busyKind === 'EDIBLE'}
                  onPress={() => void openListing('EDIBLE')}
                  outcome={outcomes.EDIBLE}
                  outcomeLabel="People listing"
                  wide={layout.isTablet}
                />
                <ActionCard
                  icon="leaf-outline"
                  tone="orange"
                  title="List surplus not fit for human consumption"
                  detail={`${formatKg(availableKg.NON_EDIBLE)} available`}
                  enabled={availableKg.NON_EDIBLE > 0 && !submitting}
                  loading={busyKind === 'NON_EDIBLE'}
                  onPress={() => void openListing('NON_EDIBLE')}
                  outcome={outcomes.NON_EDIBLE}
                  outcomeLabel="Not-fit listing"
                  wide={layout.isTablet}
                />
                <ActionCard
                  icon="document-text-outline"
                  tone="plain"
                  title="Save record without listing"
                  detail="Keep a record only"
                  enabled={!submitting}
                  loading={busyKind === 'SAVE'}
                  onPress={() => void saveWithoutListing()}
                  wide={layout.isTablet}
                />
              </View>
            </View>

            )}

            <MfcNotice tone="tint" title="Food is not counted as recovered until collection is verified." />
          </>
        )}
      </View>
    </Screen>
  );
}

// ─── The deck's four-column table ────────────────────────────────────────────

function SummaryTable({
  rows,
  total,
  onOpen,
}: {
  rows: SummaryRow[];
  total: { totalKg: number; forPeopleKg: number; otherKg: number };
  /** Absent on a finished record: rows are not tappable. */
  onOpen?: (source: FoodSource) => void;
}) {
  return (
    <View style={styles.table}>
      <View style={[styles.tr, styles.thRow]}>
        <AppText variant="meta" color={MFC.label} style={[styles.cellSource, styles.th]}>
          Food source
        </AppText>
        <AppText variant="meta" color={MFC.label} style={[styles.cell, styles.th]}>
          Total recorded
        </AppText>
        <AppText variant="meta" color={MFC.label} style={[styles.cellWide, styles.th]}>
          Overproduction for review
        </AppText>
        <AppText variant="meta" color={MFC.label} style={[styles.cell, styles.th]}>
          Other recorded food
        </AppText>
      </View>

      {rows.map((row) => (
        <Pressable
          key={row.source}
          onPress={onOpen ? () => onOpen(row.source) : undefined}
          disabled={!onOpen}
          accessibilityRole="button"
          accessibilityLabel={`${row.label}: ${formatKg(row.totalKg)} recorded${
            row.forPeopleKg != null ? `, ${formatKg(row.forPeopleKg)} for people` : ''
          }, ${formatKg(row.otherKg)} other recorded food. Open ${row.label}`}
          style={({ pressed }) => [styles.tr, styles.bodyRow, pressed && styles.pressed]}
        >
          <AppText variant="meta" color={MFC.ink} style={[styles.cellSource, styles.bold]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {row.label}
          </AppText>
          <AppText variant="meta" color={MFC.ink} style={[styles.cell, tabular]}>
            {formatKg(row.totalKg)}
          </AppText>
          <AppText variant="meta" color={MFC.ink} style={[styles.cellWide, tabular]}>
            {row.forPeopleKg == null ? '—' : formatKg(row.forPeopleKg)}
          </AppText>
          <AppText variant="meta" color={MFC.ink} style={[styles.cell, tabular]}>
            {formatKg(row.otherKg)}
          </AppText>
        </Pressable>
      ))}

      <View
        style={[styles.tr, styles.totalRow]}
        accessible
        accessibilityLabel={`Total: ${formatKg(total.totalKg)} recorded, ${formatKg(total.forPeopleKg)} for people, ${formatKg(total.otherKg)} other recorded food`}
      >
        <AppText variant="meta" color={MFC.ink} style={[styles.cellSource, styles.bold]}>
          Total
        </AppText>
        <AppText variant="meta" color={MFC.ink} style={[styles.cell, styles.bold, tabular]}>
          {formatKg(total.totalKg)}
        </AppText>
        <AppText variant="meta" color={MFC.ink} style={[styles.cellWide, styles.bold, tabular]}>
          {formatKg(total.forPeopleKg)}
        </AppText>
        <AppText variant="meta" color={MFC.ink} style={[styles.cell, styles.bold, tabular]}>
          {formatKg(total.otherKg)}
        </AppText>
      </View>
    </View>
  );
}

// ─── Finished record: what happened ──────────────────────────────────────────

function ResultPanel({ outcomes }: { outcomes: Record<FoodListingKind, KindOutcome | null> }) {
  const listed = (['EDIBLE', 'NON_EDIBLE'] as const).filter((kind) => (outcomes[kind]?.listedKg ?? 0) > 0);
  return (
    <View style={styles.nextPanel}>
      <View style={styles.nextHead}>
        <MfcSectionLabel>What happened</MfcSectionLabel>
      </View>
      {listed.length === 0 ? (
        <View style={[styles.card, { backgroundColor: MFC.white, borderColor: MFC.panelBorder }]}>
          <View style={styles.cardHead}>
            <Ionicons name="document-text-outline" size={normalize(16)} color={MFC.purple} style={styles.cardIcon} />
            <AppText variant="bodySmall" color={MFC.purple} style={[styles.flex, styles.bold]}>
              Saved without listing
            </AppText>
          </View>
          <AppText variant="meta" color={MFC.muted} style={styles.cardDetail}>
            Kept as a record only. Nothing was listed.
          </AppText>
        </View>
      ) : (
        listed.map((kind) => {
          const look = kind === 'EDIBLE' ? ACTION_TONES.green : ACTION_TONES.orange;
          const outcome = outcomes[kind] as KindOutcome;
          return (
            <View key={kind} style={[styles.card, { backgroundColor: look.bg, borderColor: look.border }]}>
              <View style={styles.cardHead}>
                <Ionicons name={kind === 'EDIBLE' ? 'people-outline' : 'leaf-outline'} size={normalize(16)} color={look.title} style={styles.cardIcon} />
                <AppText variant="bodySmall" color={look.title} style={[styles.flex, styles.bold]}>
                  {kind === 'EDIBLE' ? 'Listed for people' : 'Listed as not fit for human consumption'}
                </AppText>
              </View>
              <OutcomeProgress outcome={outcome} label={kind === 'EDIBLE' ? 'People listing' : 'Not-fit listing'} />
            </View>
          );
        })
      )}
    </View>
  );
}

// ─── Action card (green · orange · white, as in the deck) ───────────────────

const ACTION_TONES = {
  green: { bg: MFC.greenBg, border: MFC.greenBorder, title: MFC.greenText },
  orange: { bg: MFC.orangeBg, border: MFC.orangeBorder, title: MFC.orangeText },
  plain: { bg: MFC.white, border: MFC.panelBorder, title: MFC.purple },
};

function ActionCard({
  icon,
  tone,
  title,
  detail,
  enabled,
  loading,
  onPress,
  outcome,
  outcomeLabel,
  wide,
}: {
  icon: IconName;
  tone: keyof typeof ACTION_TONES;
  title: string;
  detail: string;
  enabled: boolean;
  loading: boolean;
  onPress: () => void;
  outcome?: KindOutcome | null;
  outcomeLabel?: string;
  wide: boolean;
}) {
  const look = ACTION_TONES[tone];
  return (
    <Pressable
      onPress={enabled && !loading ? onPress : undefined}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      accessibilityState={{ disabled: !enabled, busy: loading }}
      style={({ pressed }) => [
        styles.card,
        wide && styles.cardWide,
        { backgroundColor: look.bg, borderColor: look.border },
        !enabled && !outcome?.listedKg && styles.cardDisabled,
        pressed && enabled && styles.pressed,
      ]}
    >
      <View style={styles.cardHead}>
        <Ionicons name={icon} size={normalize(16)} color={look.title} style={styles.cardIcon} />
        <AppText variant="bodySmall" color={look.title} style={[styles.flex, styles.bold]}>
          {title}
        </AppText>
        {loading ? <ActivityIndicator color={look.title} size="small" /> : null}
        {enabled && !loading ? <Ionicons name="chevron-forward" size={normalize(16)} color={look.title} /> : null}
      </View>
      <AppText variant="meta" color={MFC.muted} style={[styles.cardDetail, tabular]}>
        {detail}
      </AppText>
      {outcome && outcomeLabel ? <OutcomeProgress outcome={outcome} label={outcomeLabel} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', alignSelf: 'center', gap: normalize(14) },
  flex: { flex: 1, minWidth: 0 },
  bold: { fontFamily: 'Saveful-Bold' },
  pressed: { opacity: 0.85 },
  dismiss: { alignSelf: 'flex-start' },
  table: { marginTop: 4 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: normalize(6), gap: normalize(6) },
  thRow: {
    alignItems: 'flex-end',
    paddingVertical: normalize(10),
    borderBottomWidth: 1,
    borderBottomColor: MFC.divider,
  },
  th: { fontFamily: 'Saveful-Bold', fontSize: normalize(11), lineHeight: normalize(14) },
  bodyRow: {
    minHeight: TOUCH,
    borderBottomWidth: 1,
    borderBottomColor: MFC.divider,
  },
  totalRow: { minHeight: TOUCH, backgroundColor: MFC.lilac, borderBottomWidth: 1, borderBottomColor: MFC.panelBorder },
  cellSource: { flex: 1.45, minWidth: 0 },
  cell: { flex: 1, minWidth: 0 },
  cellWide: { flex: 1.3, minWidth: 0 },
  nextPanel: {
    backgroundColor: MFC.panel,
    borderWidth: 1,
    borderColor: MFC.panelBorder,
    borderRadius: 16,
    padding: normalize(16),
    gap: normalize(14),
    marginTop: 6,
  },
  nextHead: { gap: 6 },
  cards: { gap: normalize(10) },
  cardsTablet: { flexDirection: 'row', flexWrap: 'wrap' },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: normalize(12),
    paddingHorizontal: normalize(14),
    gap: normalize(6),
    minHeight: 64,
  },
  cardWide: { flexBasis: '48%', flexGrow: 1 },
  cardDisabled: { opacity: 0.55 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardIcon: { marginTop: 1 },
  cardDetail: { marginLeft: normalize(22) },
});

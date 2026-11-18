import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { tabular } from '@/components/consolidated/ui';
import {
  MfcBackLink,
  MfcChip,
  MfcCta,
  MfcEmpty,
  MfcNotice,
  MfcPageTitle,
  MfcSkeleton,
} from '@/components/makeFoodCount/MfcAppUi';
import { MfcArt, SOURCE_ART, resolveMfcArt, type MfcArtKey } from '@/components/makeFoodCount/MfcArt';
import {
  MFC,
  MFC_OFFLINE_NOTICE,
  MFC_OVERPRODUCTION_NOTICE,
  MFC_OVERPRODUCTION_SUBTITLE,
  SOURCE_META,
} from '@/constants/makeFoodCount';
import type { MakeFoodCountStackParamList } from '@/navigation/MakeFoodCountStack';
import { useMakeFoodCountStore } from '@/store/makeFoodCountStore';
import { palette } from '@/theme/colors';
import type {
  FoodSource,
  MfcDraftLine,
  MfcLineIdentity,
  TaxonomyEntry,
  TaxonomySubtype,
} from '@/types/makeFoodCount';
import {
  computeGroupKg,
  computeTotals,
  formatKgDisplay,
  isQtyParseError,
  mfcLineKey,
  parseQtyInput,
} from '@/utils/makeFoodCountTotals';
import { normalize, useResponsiveLayout } from '@/utils/responsive';

type Navigation = NativeStackNavigationProp<MakeFoodCountStackParamList, 'MfcRecord'>;

const QTY_WIDTH = normalize(58);
const KG_WIDTH = normalize(22);
const FIT_WIDTH = normalize(52);
const TOUCH = 44;
/** Row pictures: 4:3 like the deck. */
const ART_SIZE = 40;

function lineIdentity(entry: TaxonomyEntry, subtype?: TaxonomySubtype): MfcLineIdentity {
  return {
    clientKey: mfcLineKey(entry.source, entry.key, subtype?.key),
    source: entry.source,
    category: entry.key,
    subtype: subtype?.key ?? null,
  };
}

function pickSource(
  sources: FoodSource[],
  ...candidates: Array<FoodSource | null | undefined>
): FoodSource | null {
  for (const candidate of candidates) {
    if (candidate && sources.includes(candidate)) return candidate;
  }
  return sources[0] ?? null;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function RecordScreen() {
  const layout = useResponsiveLayout();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<MakeFoodCountStackParamList, 'MfcRecord'>>();
  const routeSource = route.params?.source;

  const sources = useMakeFoodCountStore((state) => state.sources);
  const lines = useMakeFoodCountStore((state) => state.lines);
  const taxonomy = useMakeFoodCountStore((state) => state.taxonomy);
  const selectedSource = useMakeFoodCountStore((state) => state.selectedSource);
  const syncStatus = useMakeFoodCountStore((state) => state.syncStatus);
  const conflictNotice = useMakeFoodCountStore((state) => state.conflictNotice);
  const lockedLine = useMakeFoodCountStore((state) => state.lockedLine);
  const lastError = useMakeFoodCountStore((state) => state.lastError);
  const setLineQty = useMakeFoodCountStore((state) => state.setLineQty);
  const setLineFit = useMakeFoodCountStore((state) => state.setLineFit);
  const selectSource = useMakeFoodCountStore((state) => state.selectSource);
  const flushNow = useMakeFoodCountStore((state) => state.flushNow);
  const dismissConflict = useMakeFoodCountStore((state) => state.dismissConflict);
  const loadTaxonomy = useMakeFoodCountStore((state) => state.loadTaxonomy);

  const [active, setActive] = useState<FoodSource | null>(() =>
    pickSource(sources, routeSource, selectedSource),
  );
  const [taxonomyLoading, setTaxonomyLoading] = useState(taxonomy == null);
  const [busy, setBusy] = useState(false);
  /** What the user has typed, by clientKey. Keeps "5." and invalid text on screen while the store holds the last valid number. */
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const current = pickSource(sources, active);
  const meta = current ? SOURCE_META[current] : null;
  const index = current ? sources.indexOf(current) : -1;
  const isLast = index === sources.length - 1;

  // The Summary (and deep links) open a tab through the route param.
  useEffect(() => {
    if (routeSource && sources.includes(routeSource)) setActive(routeSource);
  }, [routeSource, sources]);

  // Keep the store's "current tab" in step with what is on screen (no autosave needed for this).
  useEffect(() => {
    if (current && current !== useMakeFoodCountStore.getState().selectedSource) {
      useMakeFoodCountStore.setState({ selectedSource: current });
    }
  }, [current]);

  useEffect(() => {
    let alive = true;
    setTaxonomyLoading(useMakeFoodCountStore.getState().taxonomy == null);
    void loadTaxonomy().finally(() => {
      if (alive) setTaxonomyLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [loadTaxonomy]);

  // Make sure every row of the selected sources has a line with a stable clientKey.
  // Written straight to the store: nothing changed for the user, so no autosave is queued.
  useEffect(() => {
    if (!taxonomy || sources.length === 0) return;
    const existing = useMakeFoodCountStore.getState().lines;
    const added: Record<string, MfcDraftLine> = {};
    for (const entry of taxonomy.entries) {
      if (!sources.includes(entry.source)) continue;
      const targets = entry.subtypes?.length ? entry.subtypes : [undefined];
      for (const subtype of targets) {
        const identity = lineIdentity(entry, subtype);
        if (existing[identity.clientKey]) continue;
        added[identity.clientKey] = { ...identity, qtyKg: null, fitForHumans: entry.fitAllowed };
      }
    }
    if (Object.keys(added).length > 0) {
      useMakeFoodCountStore.setState({ lines: { ...existing, ...added } });
    }
  }, [taxonomy, sources]);

  // A server reload (409) replaces the lines: drop what was typed so the fields show the server copy.
  useEffect(() => {
    if (!conflictNotice) return;
    setTexts({});
    setErrors({});
  }, [conflictNotice]);

  // Leaving the screen flushes the autosave (blur; the store also flushes on app background).
  useFocusEffect(
    useCallback(() => {
      return () => {
        void useMakeFoodCountStore.getState().flushNow();
      };
    }, []),
  );

  const lineList = useMemo(() => Object.values(lines), [lines]);
  const totals = useMemo(
    () => computeTotals(lineList.filter((line) => sources.includes(line.source))),
    [lineList, sources],
  );
  const finished = useMemo(() => {
    const done = new Set<FoodSource>();
    for (const line of lineList) {
      if ((line.qtyKg ?? 0) > 0) done.add(line.source);
    }
    return done;
  }, [lineList]);

  const entries = useMemo(
    () => (taxonomy && current ? taxonomy.entries.filter((entry) => entry.source === current) : []),
    [taxonomy, current],
  );
  const showFit = current === 'OVERPRODUCTION';
  const sourceKg = current ? totals.bySource[current] : 0;

  // ── Handlers ──

  const changeSource = (next: FoodSource) => {
    if (next === current) return;
    void flushNow();
    selectSource(next);
    setActive(next);
    navigation.setParams({ source: next });
  };

  const onChangeQty = (identity: MfcLineIdentity, text: string) => {
    setTexts((previous) => ({ ...previous, [identity.clientKey]: text }));
    const parsed = parseQtyInput(text);
    if (isQtyParseError(parsed)) {
      setErrors((previous) => ({ ...previous, [identity.clientKey]: parsed.error }));
      return;
    }
    setErrors((previous) => {
      if (!(identity.clientKey in previous)) return previous;
      const { [identity.clientKey]: _removed, ...rest } = previous;
      return rest;
    });
    setLineQty(identity, parsed);
  };

  const onToggleFit = (identity: MfcLineIdentity, next: boolean) => {
    setLineFit(identity, next);
  };

  const currentErrors = () => {
    const prefix = `${current}:`;
    return Object.keys(errors).filter((key) => key.startsWith(prefix));
  };

  const goBack = () => {
    if (index > 0) {
      changeSource(sources[index - 1]);
      return;
    }
    void flushNow();
    navigation.navigate('MfcSources');
  };

  const goNext = async () => {
    if (busy || !current) return;
    if (currentErrors().length > 0) return; // errors are already shown under the fields
    if (!isLast) {
      changeSource(sources[index + 1]);
      return;
    }
    setBusy(true);
    try {
      await flushNow(); // offline or failed: the draft stays on the phone and syncs later
    } finally {
      setBusy(false);
    }
    navigation.navigate('MfcSummary');
  };

  // ── Render ──

  const pageStyle = [
    styles.page,
    { paddingHorizontal: layout.pagePadH, paddingTop: layout.space(12, 16), paddingBottom: layout.space(28, 36) },
    layout.isTablet && { maxWidth: layout.contentMaxWidth },
  ];

  if (sources.length === 0 || !current || !meta) {
    return (
      <Screen transparentTop backgroundColor={MFC.page} keyboardAware>
        <View style={pageStyle}>
          <MfcEmpty
            icon="leaf-outline"
            title="No food sources chosen yet"
            body="Choose where your food waste came from, then record the quantities."
            action={<MfcCta label="Choose sources" arrow onPress={() => navigation.navigate('MfcSources')} />}
          />
        </View>
      </Screen>
    );
  }

  const hasErrors = currentErrors().length > 0;

  return (
    <Screen transparentTop backgroundColor={MFC.page} keyboardAware scrollKey={current}>
      <View style={pageStyle}>
        <MfcBackLink onPress={goBack} />
        <AppText
          variant="meta"
          color={MFC.muted}
          accessibilityLabel={`Make Food Count, add food items and quantities, source ${index + 1} of ${sources.length}`}
        >
          {`Make Food Count / Add food items & quantities / ${index + 1} of ${sources.length}`}
        </AppText>

        <View style={styles.chips}>
          {sources.map((source) => {
            const isCurrent = source === current;
            const done = finished.has(source) && !isCurrent;
            return (
              <MfcChip
                key={source}
                label={SOURCE_META[source].label}
                selected={isCurrent}
                done={done || (isCurrent && finished.has(source))}
                leading={<MfcArt art={SOURCE_ART[source]} size={30} aspect={4 / 3} radius={5} />}
                onPress={() => changeSource(source)}
                accessibilityLabel={`${SOURCE_META[source].label}${finished.has(source) ? ', quantities entered' : ''}${isCurrent ? ', current source' : ''}`}
              />
            );
          })}
        </View>

        <MfcPageTitle
          title={`Record ${meta.label}`}
          subtitle={
            current === 'OVERPRODUCTION'
              ? `Enter the food types and quantities. ${MFC_OVERPRODUCTION_SUBTITLE}`
              : 'Enter the food types and quantities.'
          }
        />

        {conflictNotice ? (
          <MfcNotice tone="warn" icon="refresh-circle" title={conflictNotice}>
            <MfcCta label="OK" compact variant="secondary" onPress={dismissConflict} style={styles.noticeAction} />
          </MfcNotice>
        ) : null}
        {syncStatus === 'offline' ? <MfcNotice tone="muted" icon="cloud-offline-outline" title={MFC_OFFLINE_NOTICE} /> : null}
        {lastError && syncStatus !== 'offline' ? <MfcNotice tone="danger" title={lastError} /> : null}
        {lockedLine && lockedLine.lineId == null ? <MfcNotice tone="danger" title={lockedLine.message} /> : null}

        {/* The source panel and its table, on lilac */}
        <View style={styles.panel}>
          <View style={styles.sourceHead}>
            <MfcArt art={SOURCE_ART[current]} size={64} aspect={4 / 3} radius={8} accessibilityLabel={`${meta.label} illustration`} />
            <View style={styles.flex}>
              <AppText variant="bodyBold" color={MFC.ink} style={styles.bold}>
                {meta.label}
              </AppText>
              <AppText variant="bodySmall" color={MFC.muted}>
                {meta.description}
              </AppText>
            </View>
          </View>

          <View style={styles.tableHead} accessibilityRole="header">
            <AppText variant="meta" color={MFC.purple} style={[styles.flex, styles.headText]}>
              Food item
            </AppText>
            <AppText variant="meta" color={MFC.purple} style={[styles.headText, styles.qtyHead]}>
              Quantity (kg)
            </AppText>
            {showFit ? (
              <AppText variant="meta" color={MFC.purple} style={[styles.headText, styles.fitCol, styles.centerText]}>
                Fit for humans
              </AppText>
            ) : null}
          </View>

          {taxonomyLoading && entries.length === 0 ? (
            <MfcSkeleton lines={5} />
          ) : entries.length === 0 ? (
            <MfcEmpty
              icon="cloud-offline-outline"
              title="Couldn't load the food list"
              body="Check your connection and try again."
              action={
                <MfcCta
                  label="Try again"
                  variant="secondary"
                  onPress={() => {
                    setTaxonomyLoading(true);
                    void loadTaxonomy(true).finally(() => setTaxonomyLoading(false));
                  }}
                />
              }
            />
          ) : (
            entries.map((entry) => {
              const art = resolveMfcArt({ category: entry.key, iconKey: entry.listingIconKey });
              if (entry.subtypes?.length) {
                const groupKg = computeGroupKg(lineList, entry.source, entry.key);
                return (
                  <View key={entry.key}>
                    <View style={styles.groupHead}>
                      <AppText variant="meta" color={MFC.purple} style={[styles.flex, styles.headText]}>
                        {entry.label}
                      </AppText>
                      <AppText variant="meta" color={MFC.muted} style={styles.groupHint}>
                        Enter each type separately
                      </AppText>
                    </View>
                    {entry.subtypes.map((subtype) => {
                      const identity = lineIdentity(entry, subtype);
                      const name = subtype.key === 'other' ? `Other ${entry.label}` : subtype.label;
                      return (
                        <FoodRow
                          key={identity.clientKey}
                          identity={identity}
                          label={subtype.label}
                          accessibleName={name}
                          art={resolveMfcArt({ category: entry.key, subtype: subtype.key, iconKey: subtype.listingIconKey })}
                          indent
                          line={lines[identity.clientKey]}
                          text={texts[identity.clientKey]}
                          error={errors[identity.clientKey] ?? serverMessage(lockedLine, lines[identity.clientKey])}
                          fitAllowed={entry.fitAllowed}
                          showFit={showFit}
                          onChangeQty={onChangeQty}
                          onToggleFit={onToggleFit}
                        />
                      );
                    })}
                    <View
                      style={styles.groupTotal}
                      accessible
                      accessibilityLabel={`${entry.label} total, ${formatKgDisplay(groupKg)} kilograms`}
                    >
                      <AppText variant="bodySmall" color={MFC.ink} style={[styles.flex, styles.bold]} numberOfLines={1}>
                        {`${entry.label} total`}
                      </AppText>
                      <AppText variant="bodySmall" color={MFC.ink} style={[styles.bold, tabular]}>
                        {`${formatKgDisplay(groupKg)} kg`}
                      </AppText>
                      {showFit ? <View style={styles.fitCol} /> : null}
                    </View>
                  </View>
                );
              }

              const identity = lineIdentity(entry);
              return (
                <FoodRow
                  key={entry.key}
                  identity={identity}
                  label={entry.label}
                  accessibleName={entry.label}
                  art={art}
                  line={lines[identity.clientKey]}
                  text={texts[identity.clientKey]}
                  error={errors[identity.clientKey] ?? serverMessage(lockedLine, lines[identity.clientKey])}
                  fitAllowed={entry.fitAllowed}
                  showFit={showFit}
                  onChangeQty={onChangeQty}
                  onToggleFit={onToggleFit}
                />
              );
            })
          )}
        </View>

        {/* "<Source> summary · Total <Source> · X kg" */}
        <View
          style={styles.summary}
          accessible
          accessibilityLabel={`${meta.label} summary. Total ${meta.label}, ${formatKgDisplay(sourceKg)} kilograms`}
        >
          <AppText variant="bodyBold" color={MFC.ink} style={styles.bold}>
            {`${meta.label} summary`}
          </AppText>
          <View style={styles.summaryRow}>
            <AppText variant="bodySmall" color={MFC.ink} style={styles.flex}>
              {`Total ${meta.label}`}
            </AppText>
            <AppText variant="bodyBold" color={MFC.ink} style={[styles.bold, tabular]}>
              {`${formatKgDisplay(sourceKg)} kg`}
            </AppText>
          </View>
        </View>

        {current === 'OVERPRODUCTION' ? <MfcNotice tone="tint" title={MFC_OVERPRODUCTION_NOTICE} /> : null}
        {hasErrors ? <MfcNotice tone="danger" title="Fix the highlighted quantities to continue" /> : null}

        <View style={[styles.buttons, layout.isTablet && styles.buttonsTablet]}>
          <MfcCta label="‹ Back" variant="secondary" onPress={goBack} style={styles.buttonBack} />
          <MfcCta
            label={isLast ? 'Review food summary' : 'Next food source'}
            arrow
            onPress={() => void goNext()}
            loading={busy}
            style={layout.isTablet ? styles.buttonNextTablet : styles.buttonNext}
          />
        </View>
      </View>
    </Screen>
  );
}

function serverMessage(
  locked: { lineId: number | null; message: string } | null,
  line: MfcDraftLine | undefined,
): string | undefined {
  if (!locked || locked.lineId == null || line?.id == null) return undefined;
  return locked.lineId === line.id ? locked.message : undefined;
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

type FoodRowProps = {
  identity: MfcLineIdentity;
  label: string;
  accessibleName: string;
  art: MfcArtKey;
  indent?: boolean;
  line: MfcDraftLine | undefined;
  /** What the user typed, if they have typed in this field. */
  text: string | undefined;
  error: string | undefined;
  fitAllowed: boolean;
  showFit: boolean;
  onChangeQty: (identity: MfcLineIdentity, text: string) => void;
  onToggleFit: (identity: MfcLineIdentity, next: boolean) => void;
};

/** One table row: picture, name, a small kg field, and (Overproduction) the Fit for humans box. */
function FoodRow({
  identity,
  label,
  accessibleName,
  art,
  indent,
  line,
  text,
  error,
  fitAllowed,
  showFit,
  onChangeQty,
  onToggleFit,
}: FoodRowProps) {
  const value = text ?? (line?.qtyKg != null ? String(line.qtyKg) : '');
  const fit = line ? line.fitForHumans : fitAllowed; // ticked by default on Overproduction
  return (
    <View style={styles.rowWrap}>
      <View style={[styles.row, indent && styles.rowIndent]}>
        <MfcArt art={art} size={ART_SIZE} aspect={4 / 3} radius={6} />
        <AppText variant="bodySmall" color={MFC.ink} style={styles.flex} numberOfLines={2}>
          {label}
        </AppText>
        <TextInput
          value={value}
          onChangeText={(next) => onChangeQty(identity, next)}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="#A79FB3"
          selectTextOnFocus
          maxLength={9}
          accessibilityLabel={`${accessibleName}, kilograms`}
          accessibilityHint={error}
          style={[styles.input, tabular, error ? styles.inputError : null]}
        />
        <AppText variant="bodySmall" color={MFC.ink} style={styles.kg}>
          kg
        </AppText>
        {showFit ? (
          <View style={[styles.fitCol, styles.fitCell]}>
            {fitAllowed ? (
              <Pressable
                onPress={() => onToggleFit(identity, !fit)}
                hitSlop={4}
                accessibilityRole="checkbox"
                accessibilityLabel={`${accessibleName}, fit for humans`}
                accessibilityState={{ checked: fit }}
                style={styles.checkHit}
              >
                <View style={[styles.checkBox, fit && styles.checkBoxOn]}>
                  {fit ? <Ionicons name="checkmark" size={normalize(15)} color={palette.white} /> : null}
                </View>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      {error ? (
        <AppText
          variant="meta"
          color={palette.danger}
          style={styles.error}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: { width: '100%', alignSelf: 'center', gap: normalize(12) },
  flex: { flex: 1, minWidth: 0 },
  bold: { fontFamily: 'Saveful-Bold' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  noticeAction: { alignSelf: 'flex-start' },
  panel: {
    backgroundColor: MFC.panel,
    borderWidth: 1,
    borderColor: MFC.panelBorder,
    borderRadius: 14,
    padding: normalize(12),
    gap: 2,
  },
  sourceHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: normalize(10) },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: MFC.tableHead,
    borderRadius: 8,
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(8),
  },
  headText: { fontFamily: 'Saveful-Bold', fontSize: normalize(12) },
  qtyHead: { width: QTY_WIDTH + KG_WIDTH + 6 },
  centerText: { textAlign: 'center' },
  fitCol: { width: FIT_WIDTH },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: MFC.tableHead,
    borderRadius: 8,
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(8),
    marginTop: 6,
  },
  groupHint: { fontSize: normalize(11) },
  rowWrap: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: MFC.divider },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: normalize(6),
    paddingVertical: normalize(8),
    minHeight: TOUCH + 8,
  },
  rowIndent: { paddingLeft: normalize(14) },
  input: {
    width: QTY_WIDTH,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MFC.inputBorder,
    backgroundColor: MFC.white,
    paddingHorizontal: 10,
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(15),
    color: MFC.ink,
  },
  inputError: { borderColor: palette.danger, borderWidth: 1.5 },
  kg: { width: KG_WIDTH },
  fitCell: { alignItems: 'center', justifyContent: 'center' },
  checkHit: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  checkBox: {
    width: normalize(22),
    height: normalize(22),
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: MFC.purple,
    backgroundColor: MFC.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: { backgroundColor: MFC.purple },
  error: { paddingHorizontal: normalize(8), paddingBottom: 6, marginTop: -2 },
  groupTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: normalize(10),
    backgroundColor: MFC.lilac,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 2,
  },
  summary: {
    backgroundColor: MFC.panel,
    borderWidth: 1,
    borderColor: MFC.panelBorder,
    borderRadius: 14,
    padding: normalize(14),
    gap: 6,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: normalize(4) },
  buttonsTablet: { justifyContent: 'space-between' },
  buttonBack: { paddingHorizontal: normalize(22) },
  buttonNext: { flex: 1 },
  buttonNextTablet: { minWidth: normalize(240) },
});

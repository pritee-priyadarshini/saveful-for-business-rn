import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppText } from '@/components/AppText';
import { BlockedDraftNotice } from '@/components/makeFoodCount/BlockedDraftNotice';
import { Screen } from '@/components/Screen';
import { tabular } from '@/components/consolidated/ui';
import {
  MfcChip,
  MfcCta,
  MfcFooter,
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
const ART_SIZE = 48;

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
  const writeBlocked = useMakeFoodCountStore((state) => state.writeBlocked);
  const setLineQty = useMakeFoodCountStore((state) => state.setLineQty);
  const setLineFit = useMakeFoodCountStore((state) => state.setLineFit);
  const selectSource = useMakeFoodCountStore((state) => state.selectSource);
  const flushNow = useMakeFoodCountStore((state) => state.flushNow);
  const dismissConflict = useMakeFoodCountStore((state) => state.dismissConflict);
  const loadTaxonomy = useMakeFoodCountStore((state) => state.loadTaxonomy);

  const [taxonomyLoading, setTaxonomyLoading] = useState(taxonomy == null);
  const [busy, setBusy] = useState(false);
  /** What the user has typed, by clientKey. Keeps "5." and invalid text on screen while the store holds the last valid number. */
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** The source on screen: one source per page. */
  const [active, setActive] = useState<FoodSource | null>(() => pickSource(sources, routeSource, selectedSource));
  /** Open food groups per source. The first group starts open; the rest start closed. */
  const [openGroups, setOpenGroups] = useState<Partial<Record<FoodSource, string[]>>>({});
  const chipsRef = useRef<ScrollView>(null);
  const chipX = useRef<Partial<Record<FoodSource, number>>>({});

  const current = pickSource(sources, active);
  const meta = current ? SOURCE_META[current] : null;
  const index = current ? sources.indexOf(current) : -1;
  const isLast = index === sources.length - 1;

  // The Summary (and deep links) open a source through the route param.
  useEffect(() => {
    if (routeSource && sources.includes(routeSource)) setActive(routeSource);
  }, [routeSource, sources]);

  // Keep the store's "current source" in step with what is on screen, and the chip in view.
  useEffect(() => {
    if (!current) return;
    if (current !== useMakeFoodCountStore.getState().selectedSource) {
      useMakeFoodCountStore.setState({ selectedSource: current });
    }
    const x = chipX.current[current];
    if (x != null) chipsRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
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
    // Drafts from before the Fit-for-humans tick was removed: all Overproduction counts as for people now.
    for (const line of Object.values(existing)) {
      if (line.source === 'OVERPRODUCTION' && !line.fitForHumans) added[line.clientKey] = { ...line, fitForHumans: true };
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

  /**
   * The current source's food, in groups: each category with types (Meat & Poultry,
   * Seafood) is its own group, and the plain rows share one "Other food" group.
   * A source with no typed categories is a single plain list.
   */
  const groups = useMemo(() => {
    const entries = taxonomy && current ? taxonomy.entries.filter((entry) => entry.source === current) : [];
    const typed = entries.filter((entry) => entry.subtypes?.length);
    const plain = entries.filter((entry) => !entry.subtypes?.length);
    if (typed.length === 0) return { collapsible: false, list: [{ key: 'all', label: '', entries: plain }] };
    const list = typed.map((entry) => ({ key: entry.key, label: entry.label, entries: [entry] }));
    if (plain.length) list.push({ key: 'plain', label: 'Other food items', entries: plain });
    return { collapsible: true, list };
  }, [taxonomy, current]);

  const openForCurrent = current ? openGroups[current] ?? [groups.list[0]?.key].filter(Boolean) : [];

  const sourceErrors = (source: FoodSource) => Object.keys(errors).filter((key) => key.startsWith(`${source}:`));

  // ── Handlers ──

  const changeSource = (next: FoodSource) => {
    if (next === current) return;
    void flushNow(); // save what was typed on this page
    selectSource(next);
    setActive(next);
    navigation.setParams({ source: next });
  };

  const toggleGroup = (key: string) => {
    if (!current) return;
    setOpenGroups((previous) => {
      const open = previous[current] ?? [groups.list[0]?.key].filter(Boolean);
      return { ...previous, [current]: open.includes(key) ? open.filter((entry) => entry !== key) : [...open, key] };
    });
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

  /** Previous source, or back to wherever this screen was opened from (never loops). */
  const goBack = () => {
    if (index > 0) {
      changeSource(sources[index - 1]);
      return;
    }
    void flushNow();
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('MfcSources');
  };

  const goNext = async () => {
    if (busy || !current) return;
    if (sourceErrors(current).length > 0) {
      // Open every group so the messages under the fields are visible.
      setOpenGroups((previous) => ({ ...previous, [current]: groups.list.map((group) => group.key) }));
      return;
    }
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
    { paddingHorizontal: layout.pagePadH, paddingTop: layout.space(12, 16), paddingBottom: layout.space(20, 28) },
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

  const sourceKg = totals.bySource[current];
  const hasErrors = sourceErrors(current).length > 0;

  const renderEntry = (entry: TaxonomyEntry) => {
    const art = resolveMfcArt({ category: entry.key, iconKey: entry.listingIconKey });
    if (entry.subtypes?.length) {
      const groupKg = computeGroupKg(lineList, entry.source, entry.key);
      return (
        <View key={entry.key}>
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
                line={lines[identity.clientKey]}
                text={texts[identity.clientKey]}
                error={errors[identity.clientKey] ?? serverMessage(lockedLine, lines[identity.clientKey])}
                fitAllowed={entry.fitAllowed}
                showFit={false}
                onChangeQty={onChangeQty}
                onToggleFit={onToggleFit}
              />
            );
          })}
          <View style={styles.groupTotal} accessible accessibilityLabel={`${entry.label} total, ${formatKgDisplay(groupKg)} kilograms`}>
            <AppText variant="bodySmall" color={MFC.ink} style={[styles.flex, styles.bold]} numberOfLines={1}>
              {`${entry.label} total`}
            </AppText>
            <AppText variant="bodySmall" color={MFC.ink} style={[styles.bold, tabular]}>
              {`${formatKgDisplay(groupKg)} kg`}
            </AppText>
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
        showFit={false}
        onChangeQty={onChangeQty}
        onToggleFit={onToggleFit}
      />
    );
  };

  const groupKgOf = (entries: TaxonomyEntry[]) =>
    entries.reduce((sum, entry) => {
      const keys = new Set(
        (entry.subtypes?.length ? entry.subtypes : [undefined]).map((subtype) => lineIdentity(entry, subtype).clientKey),
      );
      return sum + lineList.filter((line) => keys.has(line.clientKey)).reduce((t, line) => t + (line.qtyKg ?? 0), 0);
    }, 0);

  const footer = (
    <MfcFooter>
      <MfcCta label="Back" icon="chevron-back" variant="secondary" onPress={goBack} style={styles.buttonBack} />
      <MfcCta
        label={isLast ? 'Review food summary' : 'Next food source'}
        arrow
        onPress={() => void goNext()}
        loading={busy}
        style={styles.flex}
      />
    </MfcFooter>
  );

  return (
    <Screen transparentTop backgroundColor={MFC.page} keyboardAware scrollKey={current} footer={footer}>
      <View style={pageStyle}>
        <AppText
          variant="meta"
          color={MFC.muted}
          accessibilityLabel={`Make Food Count, add food items and quantities, source ${index + 1} of ${sources.length}`}
        >
          {`Make Food Count / Add food items & quantities / ${index + 1} of ${sources.length}`}
        </AppText>

        {/* One page per source; the chips scroll sideways and jump between them. */}
        <ScrollView
          ref={chipsRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chips}
        >
          {sources.map((source) => {
            const isCurrent = source === current;
            return (
              <View key={source} onLayout={(event) => (chipX.current[source] = event.nativeEvent.layout.x)}>
                <MfcChip
                  label={SOURCE_META[source].label}
                  selected={isCurrent}
                  done={finished.has(source)}
                  leading={<MfcArt art={SOURCE_ART[source]} size={30} tile={false} />}
                  onPress={() => changeSource(source)}
                  accessibilityLabel={`${SOURCE_META[source].label}${finished.has(source) ? ', quantities entered' : ''}${isCurrent ? ', current source' : ''}`}
                />
              </View>
            );
          })}
        </ScrollView>

        <MfcPageTitle
          title={`Record ${meta.label}`}
          subtitle={current === 'OVERPRODUCTION' ? MFC_OVERPRODUCTION_SUBTITLE : 'Enter the food types and quantities.'}
        />

        {conflictNotice ? (
          <MfcNotice tone="warn" icon="refresh-circle" title={conflictNotice}>
            <MfcCta label="OK" compact variant="secondary" onPress={dismissConflict} style={styles.noticeAction} />
          </MfcNotice>
        ) : null}
        {syncStatus === 'offline' ? <MfcNotice tone="muted" icon="cloud-offline-outline" title={MFC_OFFLINE_NOTICE} /> : null}
        <BlockedDraftNotice onClosed={() => navigation.navigate('MfcRecentRecords')} />
        {lastError && syncStatus !== 'offline' && !writeBlocked ? <MfcNotice tone="danger" title={lastError} /> : null}
        {lockedLine && lockedLine.lineId == null ? <MfcNotice tone="danger" title={lockedLine.message} /> : null}

        <View style={[styles.section, styles.sectionOpen, hasErrors && styles.sectionError]}>
          <View style={styles.sectionHead}>
            <MfcArt art={SOURCE_ART[current]} size={60} tile={false} accessibilityLabel={`${meta.label} illustration`} />
            <View style={[styles.flex, styles.sectionText]}>
              <AppText variant="bodyBold" color={MFC.ink} style={styles.sectionTitle} numberOfLines={1}>
                {meta.label}
              </AppText>
              <AppText variant="meta" color={MFC.muted} numberOfLines={2}>
                {meta.description}
              </AppText>
              <StatusPill
                tone={hasErrors ? 'error' : finished.has(current) ? 'done' : 'idle'}
                label={hasErrors ? 'Check quantities' : finished.has(current) ? `${formatKgDisplay(sourceKg)} kg recorded` : 'Not started'}
              />
            </View>
          </View>

          <View style={styles.sectionBody}>
            {taxonomyLoading && groups.list[0]?.entries.length === 0 ? (
              <MfcSkeleton lines={4} />
            ) : groups.list.every((group) => group.entries.length === 0) ? (
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
              <>
                <View style={styles.tableHead} accessibilityRole="header">
                  <AppText variant="meta" color={MFC.purple} style={[styles.flex, styles.headText]}>
                    Food item
                  </AppText>
                  <AppText variant="meta" color={MFC.purple} style={[styles.headText, styles.qtyHead]}>
                    Quantity (kg)
                  </AppText>
                </View>

                {groups.list.map((group) => {
                  if (!groups.collapsible) return <View key={group.key}>{group.entries.map(renderEntry)}</View>;
                  const isOpen = openForCurrent.includes(group.key);
                  const kg = groupKgOf(group.entries);
                  const groupHasError = group.entries.some((entry) =>
                    Object.keys(errors).some((key) => key.startsWith(`${entry.source}:${entry.key}`)),
                  );
                  return (
                    <View key={group.key} style={styles.group}>
                      <Pressable
                        onPress={() => toggleGroup(group.key)}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: isOpen }}
                        accessibilityLabel={`${group.label}, ${formatKgDisplay(kg)} kilograms`}
                        accessibilityHint={isOpen ? 'Collapses this group' : 'Opens this group'}
                        style={({ pressed }) => [styles.groupHead, isOpen && styles.groupHeadOpen, pressed && styles.pressed]}
                      >
                        <MfcArt
                          art={resolveMfcArt({ category: group.entries[0].key, iconKey: group.entries[0].listingIconKey })}
                          size={36}
                          tile={false}
                        />
                        <View style={styles.flex}>
                          <AppText variant="bodySmall" color={MFC.ink} style={styles.bold} numberOfLines={1}>
                            {group.label}
                          </AppText>
                          {group.entries.length === 1 && group.entries[0].subtypes?.length ? (
                            <AppText variant="meta" color={MFC.muted} numberOfLines={1}>
                              Enter each type separately
                            </AppText>
                          ) : null}
                        </View>
                        {groupHasError ? (
                          <Ionicons name="alert-circle" size={normalize(18)} color={palette.danger} />
                        ) : kg > 0 ? (
                          <View style={styles.kgPill}>
                            <AppText variant="meta" color={MFC.greenText} style={[styles.bold, tabular]}>
                              {`${formatKgDisplay(kg)} kg`}
                            </AppText>
                          </View>
                        ) : null}
                        <View style={[styles.chevron, isOpen && styles.chevronOpen]}>
                          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={normalize(16)} color={isOpen ? palette.white : MFC.purple} />
                        </View>
                      </Pressable>
                      {isOpen ? <View style={styles.groupBody}>{group.entries.map(renderEntry)}</View> : null}
                    </View>
                  );
                })}
              </>
            )}

            <View style={styles.summaryRow}>
              <AppText variant="bodySmall" color={MFC.ink} style={[styles.flex, styles.bold]}>
                {`Total ${meta.label}`}
              </AppText>
              <AppText variant="bodyBold" color={MFC.ink} style={[styles.bold, tabular]}>
                {`${formatKgDisplay(sourceKg)} kg`}
              </AppText>
            </View>
          </View>
        </View>

        {current === 'OVERPRODUCTION' ? <MfcNotice tone="tint" title={MFC_OVERPRODUCTION_NOTICE} /> : null}
        {hasErrors ? <MfcNotice tone="danger" title="Fix the highlighted quantities to continue" /> : null}
      </View>
    </Screen>
  );
}

/** Server message for a listed line (app SPEC §8.4), shown under that line's field. */
function serverMessage(
  locked: { lineId: number | null; message: string } | null,
  line: MfcDraftLine | undefined,
): string | undefined {
  if (!locked || locked.lineId == null || line?.id == null) return undefined;
  return locked.lineId === line.id ? locked.message : undefined;
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

const PILL = {
  done: { bg: MFC.doneBg, dot: '#2E9E5B', text: MFC.greenText },
  idle: { bg: '#F1EEF5', dot: '#B3A5C4', text: MFC.muted },
  error: { bg: '#FDECE8', dot: palette.danger, text: palette.danger },
} as const;

/** Small status pill with a dot: what has been recorded in a section. */
function StatusPill({ tone, label }: { tone: keyof typeof PILL; label: string }) {
  const look = PILL[tone];
  return (
    <View style={[styles.pill, { backgroundColor: look.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: look.dot }]} />
      <AppText variant="meta" color={look.text} style={styles.pillText} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

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
        <MfcArt art={art} size={indent ? 40 : ART_SIZE} tile={false} />
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
  noticeAction: { alignSelf: 'flex-start' },
  section: {
    backgroundColor: MFC.white,
    borderWidth: 1,
    borderColor: MFC.panelBorder,
    borderRadius: 14,
    overflow: 'hidden',
  },
  sectionOpen: { backgroundColor: MFC.panel, borderColor: '#D9CCEA' },
  sectionError: { borderColor: palette.danger },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: normalize(12), minHeight: 84 },
  sectionText: { gap: 3 },
  chipsScroll: { flexGrow: 0, marginHorizontal: -4 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, paddingVertical: 2 },
  group: {
    borderWidth: 1,
    borderColor: MFC.panelBorder,
    borderRadius: 12,
    backgroundColor: MFC.white,
    overflow: 'hidden',
    marginTop: 8,
  },
  groupHeadOpen: { backgroundColor: MFC.tableHead },
  groupBody: { paddingHorizontal: normalize(4), paddingBottom: normalize(6) },
  kgPill: { backgroundColor: MFC.doneBg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  chevron: {
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    backgroundColor: MFC.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronOpen: { backgroundColor: MFC.purple },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 2,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontFamily: 'Saveful-SemiBold', fontSize: normalize(12) },
  sectionTitle: { fontFamily: 'Saveful-Bold', fontSize: normalize(17), flexShrink: 1 },
  sectionBody: { paddingHorizontal: normalize(10), paddingBottom: normalize(12), gap: normalize(10) },
  pressed: { opacity: 0.85 },
  selectAll: { width: FIT_WIDTH, alignItems: 'center', gap: 3 },
  selectAllRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  selectAllText: { fontFamily: 'Saveful-Bold', fontSize: normalize(11) },
  checkBoxSmall: { width: normalize(16), height: normalize(16), borderRadius: 4 },
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
    gap: 10,
    minHeight: 56,
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(8),
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MFC.lilac,
    borderWidth: 1,
    borderColor: MFC.panelBorder,
    borderRadius: 14,
    padding: normalize(14),
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingHorizontal: normalize(10),
    backgroundColor: MFC.lilac,
    borderRadius: 8,
  },
  buttons: { flexDirection: 'row', gap: 10, marginTop: normalize(4) },
  buttonsTablet: { justifyContent: 'space-between' },
  buttonBack: { paddingHorizontal: normalize(22) },
  buttonNext: { flex: 1 },
  buttonNextTablet: { minWidth: normalize(240) },
});

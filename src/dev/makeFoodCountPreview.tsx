/**
 * DEV ONLY: visual preview of the Make Food Count screens.
 *
 * Enabled with EXPO_PUBLIC_MFC_PREVIEW=1 in a __DEV__ build. The app then opens on a gallery
 * of the real screens, fed by fixtures shaped exactly like the backend responses
 * (svforb docs/make-food-count/SPEC.md §3–§5, §7) and served through an axios adapter, so the
 * real service normalisers run. Decimal quantities are sent as strings on purpose.
 * Deep link to a screen with
 *   com.saveful.business.app://preview/MfcRecord?source=SPOILAGE
 * Inert in production: everything is gated on __DEV__ and the env flag.
 */
import React, { useEffect, useRef } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { NavigationContainer, type NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';

import api from '@/services/api';
import { AppText } from '@/components/AppText';
import { MakeFoodCountCard } from '@/components/makeFoodCount/MakeFoodCountCard';
import { RestaurantHomeScreen } from '@/screens/restaurant/RestaurantHomeScreen';
import { RestaurantAnalyticsScreen } from '@/screens/restaurant/RestaurantAnalyticsScreen';
import { MFC_ART_KEYS, MfcArt } from '@/components/makeFoodCount/MfcArt';
import { MFC_STACK_SCREENS, mfcStackScreenOptions } from '@/navigation/MakeFoodCountStack';
import { useMakeFoodCountStore } from '@/store/makeFoodCountStore';
import { useSitesStore } from '@/store/sitesStore';
import { palette } from '@/theme/colors';
import type { FoodSource } from '@/types/makeFoodCount';
import { computeTotals } from '@/utils/makeFoodCountTotals';
import TAXONOMY_JSON from './mfcTaxonomyFixture.json';
import { MFC_PREVIEW_AUTOSTART } from './mfcPreviewAutostart';

export { MFC_PREVIEW } from './previewFlag';

// ─── Taxonomy: exported verbatim from svforb mfc.constants.ts (TAXONOMY_PAYLOAD) ─────

export const MFC_FIXTURE_TAXONOMY = TAXONOMY_JSON;

// ─── Record: UAT-02 / UAT-03 sample ──────────────────────────────────────────

const SITE = { id: 12, name: 'Compass Kitchen' };
const RECORD_ID = 77;
const SAMPLE_CLIENT_REQUEST_ID = '5f0f1b52-6f4e-4c1a-9a53-2f7d8c0e3a11';

type RawLine = {
  id: number;
  clientKey: string;
  source: FoodSource;
  category: string;
  subtype: string | null;
  qtyKg: string;
  unit: 'kg';
  fitForHumans: boolean;
  deletedAt: null;
};

/** Chicken 5 fit, Beef 3 not, Fish 2 fit, Preparation 4, Plate Scraps 2: fit 7 kg, not fit 9 kg. */
const sampleLines: RawLine[] = [
  { id: 101, clientKey: 'OVERPRODUCTION:meat_poultry:chicken', source: 'OVERPRODUCTION', category: 'meat_poultry', subtype: 'chicken', qtyKg: '5.00', unit: 'kg', fitForHumans: true, deletedAt: null },
  { id: 102, clientKey: 'OVERPRODUCTION:meat_poultry:beef', source: 'OVERPRODUCTION', category: 'meat_poultry', subtype: 'beef', qtyKg: '3.00', unit: 'kg', fitForHumans: false, deletedAt: null },
  { id: 103, clientKey: 'OVERPRODUCTION:seafood:fish', source: 'OVERPRODUCTION', category: 'seafood', subtype: 'fish', qtyKg: '2.00', unit: 'kg', fitForHumans: true, deletedAt: null },
  { id: 104, clientKey: 'PREPARATION:peels_trimmings', source: 'PREPARATION', category: 'peels_trimmings', subtype: null, qtyKg: '4.00', unit: 'kg', fitForHumans: false, deletedAt: null },
  { id: 105, clientKey: 'PLATE_SCRAPS:plate_scraps', source: 'PLATE_SCRAPS', category: 'plate_scraps', subtype: null, qtyKg: '2.00', unit: 'kg', fitForHumans: false, deletedAt: null },
];

let fixtureVersion = 3;
let fixtureStatus: 'DRAFT' | 'SAVED' = 'DRAFT';
let fixtureSources: FoodSource[] = ['OVERPRODUCTION', 'PREPARATION', 'PLATE_SCRAPS'];
let fixtureLines: RawLine[] = sampleLines;
let fixtureListed = false;

function totalsOf(lines: RawLine[]) {
  const totals = computeTotals(lines.map((line) => ({ ...line, qtyKg: Number(line.qtyKg) })));
  return { totalKg: totals.totalKg.toFixed(2), fitKg: totals.fitKg.toFixed(2), notFitKg: totals.notFitKg.toFixed(2) };
}

function recordBody(extra: Record<string, unknown> = {}) {
  return {
    id: RECORD_ID,
    organisationId: 4,
    siteId: SITE.id,
    siteName: SITE.name,
    createdById: 31,
    updatedById: 31,
    recordedAt: new Date().toISOString(),
    status: fixtureStatus,
    sources: fixtureSources,
    version: fixtureVersion,
    clientRequestId: SAMPLE_CLIENT_REQUEST_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...extra,
  };
}

/** GET /records/:id exactly as mfc-record.service.ts get() returns it. */
function recordDetail() {
  // fixtureListed: the people listing (Chicken 5 + Fish 2) is live, claimed, and 4 kg of chicken collected.
  const listedOutcome: Record<string, { listed: number; claimed: number; collected: number; status: string }> = fixtureListed
    ? {
        'OVERPRODUCTION:meat_poultry:chicken': { listed: 5, claimed: 5, collected: 4, status: 'PARTIALLY_COLLECTED' },
        'OVERPRODUCTION:seafood:fish': { listed: 2, claimed: 2, collected: 0, status: 'CLAIMED' },
      }
    : {};
  const lines = fixtureLines.map((line) => {
    const o = listedOutcome[line.clientKey];
    return {
      ...line,
      qtyKg: Number(line.qtyKg),
      listedKg: o?.listed ?? 0,
      activeListedKg: o?.listed ?? 0,
      claimedKg: o?.claimed ?? 0,
      collectedKg: o?.collected ?? 0,
      listingStatuses: o ? ['ACTIVE'] : [],
      status: o?.status ?? 'NOT_LISTED',
      availableKg: Math.max(0, Number(line.qtyKg) - (o?.listed ?? 0)),
    };
  });
  const totals = totalsOf(fixtureLines);
  const kind = (fit: boolean, eligibleKg: string) => {
    const of = lines.filter((line) => line.fitForHumans === fit);
    const sum = (key: 'listedKg' | 'claimedKg' | 'collectedKg' | 'availableKg') => of.reduce((t, l) => t + l[key], 0);
    return {
      eligibleKg: Number(eligibleKg),
      listedKg: sum('listedKg'),
      claimedKg: sum('claimedKg'),
      collectedKg: sum('collectedKg'),
      availableKg: sum('availableKg'),
    };
  };
  const { clientRequestId: _omit, organisationId: _o, createdById: _c, updatedById: _u, ...base } = recordBody();
  return {
    ...base,
    totals,
    byKind: { EDIBLE: kind(true, totals.fitKg), NON_EDIBLE: kind(false, totals.notFitKg) },
    lines,
  };
}

// ─── Listing prefill: EDIBLE 7 kg, NON_EDIBLE 9 kg ───────────────────────────

const prefillEdible = {
  items: [
    { lineId: 101, name: 'Chicken', category: 'meat_poultry', iconKey: 'chicken', countedKg: '5.00', availableKg: '5.00' },
    { lineId: 103, name: 'Fish', category: 'seafood', iconKey: 'fish', countedKg: '2.00', availableKg: '2.00' },
  ],
  totalKg: '7.00',
};

const prefillNonEdible = {
  items: [
    { lineId: 102, name: 'Beef', category: 'meat_poultry', iconKey: 'beef', countedKg: '3.00', availableKg: '3.00' },
    { lineId: 104, name: 'Peels & trimmings', category: 'peels_trimmings', iconKey: 'produce', countedKg: '4.00', availableKg: '4.00' },
    { lineId: 105, name: 'Plate scraps', category: 'plate_scraps', iconKey: 'other', countedKg: '2.00', availableKg: '2.00' },
  ],
  totalKg: '9.00',
};

// ─── Home impact and insights ────────────────────────────────────────────────

const homeImpact = { recordedKg: '184.50', divertedKg: '96.25', collections: 14, co2AvoidedKg: '240.60' };

const insightsFilters = {
  groups: [{ id: 1, name: 'Compass Group Australia' }],
  territories: [
    { id: 10, name: 'Victoria', groupId: 1 },
    { id: 11, name: 'New South Wales', groupId: 1 },
  ],
  clusters: [{ id: 20, name: 'Melbourne CBD', groupId: 1, territoryId: 10 }],
  sites: [
    { id: 12, name: 'Compass Kitchen', groupId: 1, territoryId: 10, clusterId: 20 },
    { id: 13, name: 'Eurest Docklands', groupId: 1, territoryId: 10, clusterId: 20 },
    { id: 14, name: 'Chartwells Parramatta', groupId: 1, territoryId: 11, clusterId: null },
  ],
};

const insights = {
  filtersApplied: { from: '2026-10-19', to: '2026-11-18' },
  isDemo: false,
  overview: { recordedKg: '120.50', recoveredKg: '78.00', notRecoveredKg: '42.50', estimatedMeals: 185, estimatedCo2Kg: '195.00' },
  destinations: [
    { pathway: 'FOOD_FOR_PEOPLE', kg: 45, shareOfRecovered: 57.69 },
    { pathway: 'LIVESTOCK_FEED', kg: 20, shareOfRecovered: 25.64 },
    { pathway: 'CIRCULAR_RECOVERY', kg: 10, shareOfRecovered: 12.82 },
    { pathway: 'BIOENERGY', kg: 3, shareOfRecovered: 3.85 },
  ],
  bySource: [
    { source: 'OVERPRODUCTION', recordedKg: '60.00', recoveredKg: '45.00', notRecoveredKg: '15.00' },
    { source: 'SPOILAGE', recordedKg: '20.00', recoveredKg: '8.00', notRecoveredKg: '12.00' },
    { source: 'PREPARATION', recordedKg: '28.50', recoveredKg: '15.00', notRecoveredKg: '13.50' },
    { source: 'PLATE_SCRAPS', recordedKg: '12.00', recoveredKg: '10.00', notRecoveredKg: '2.00' },
  ],
  whatHappened: {
    recordedKg: '120.50',
    listedKg: '95.00',
    claimedKg: '85.00',
    collectedKg: '78.00',
    notRecovered: { notListed: '25.50', listedNotClaimed: '10.00', expired: '3.00', cancelled: '2.00', claimedNotCollected: '2.00' },
  },
  redistributed: {
    byCategory: [
      { category: 'prepared_meals', kg: 30 },
      { category: 'fruit_veg', kg: 20 },
      { category: 'meat_poultry', kg: 14 },
      { category: 'bread_bakery', kg: 14 },
    ],
    bySite: [
      { siteId: 12, siteName: 'Compass Kitchen', recordedKg: '70.00', recoveredKg: '48.00' },
      { siteId: 13, siteName: 'Eurest Docklands', recordedKg: '32.50', recoveredKg: '20.00' },
      { siteId: 14, siteName: 'Chartwells Parramatta', recordedKg: '18.00', recoveredKg: '10.00' },
    ],
    trend: [
      { bucketStart: '2026-10-19', recordedKg: '24.00', recoveredKg: '15.00' },
      { bucketStart: '2026-10-26', recordedKg: '31.50', recoveredKg: '20.00' },
      { bucketStart: '2026-11-02', recordedKg: '28.00', recoveredKg: '19.00' },
      { bucketStart: '2026-11-09', recordedKg: '37.00', recoveredKg: '24.00' },
    ],
  },
};

/** GET /insights/sources/:source: the insights payload narrowed to one source. */
function sourceDrilldown(source: string) {
  const row = insights.bySource.find((entry) => entry.source === source) ?? insights.bySource[0];
  return {
    ...insights,
    filtersApplied: { ...insights.filtersApplied, source },
    overview: { ...insights.overview, recordedKg: row.recordedKg, recoveredKg: row.recoveredKg, notRecoveredKg: row.notRecoveredKg },
    bySource: [row],
    redistributed: {
      ...insights.redistributed,
      byCategory: [
        { category: 'meat_poultry', kg: 19 },
        { category: 'prepared_meals', kg: 16 },
        { category: 'seafood', kg: 10 },
      ],
    },
  };
}

// ─── Axios adapter for /mfc/* ────────────────────────────────────────────────

function parseBody(data: unknown): Record<string, unknown> {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
}

function route(method: string, url: string, params: Record<string, unknown>, body: Record<string, unknown>): unknown {
  const path = url.replace(/^.*\/api\/v1/, '').split('?')[0];
  if (!path.startsWith('/mfc/')) return {};
  const m = (re: RegExp) => path.match(re);

  if (method === 'get' && path === '/mfc/taxonomy') return MFC_FIXTURE_TAXONOMY;
  if (method === 'get' && path === '/mfc/home-impact') return homeImpact;
  if (method === 'get' && path === '/mfc/insights/filters') return insightsFilters;
  if (method === 'get' && path === '/mfc/insights') return insights;
  const drill = m(/^\/mfc\/insights\/sources\/([A-Z_]+)$/);
  if (method === 'get' && drill) return sourceDrilldown(drill[1]);

  if (path === '/mfc/records') {
    if (method === 'post') {
      if (Array.isArray(body.sources)) fixtureSources = body.sources as FoodSource[];
      return recordBody({ clientRequestId: body.clientRequestId ?? SAMPLE_CLIENT_REQUEST_ID, totals: totalsOf(fixtureLines) });
    }
    return { records: [recordBody({ totals: totalsOf(fixtureLines) })], nextCursor: null };
  }

  if (/^\/mfc\/records\/\d+$/.test(path)) {
    if (method === 'patch') {
      if (Array.isArray(body.sources)) fixtureSources = body.sources as FoodSource[];
      fixtureVersion += 1;
      return recordBody();
    }
    return recordDetail();
  }

  if (/^\/mfc\/records\/\d+\/lines$/.test(path) && method === 'put') {
    const incoming = Array.isArray(body.lines) ? (body.lines as Record<string, unknown>[]) : [];
    fixtureLines = incoming.map((line, index) => {
      const existing = fixtureLines.find((entry) => entry.clientKey === line.clientKey);
      return {
        id: existing?.id ?? 200 + index,
        clientKey: String(line.clientKey),
        source: line.source as FoodSource,
        category: String(line.category),
        subtype: line.subtype == null ? null : String(line.subtype),
        qtyKg: Number(line.qtyKg).toFixed(2),
        unit: 'kg',
        fitForHumans: line.source === 'OVERPRODUCTION' && Boolean(line.fitForHumans),
        deletedAt: null,
      };
    });
    fixtureVersion += 1;
    return recordDetail();
  }

  if (/^\/mfc\/records\/\d+\/save$/.test(path) && method === 'post') {
    fixtureStatus = 'SAVED';
    fixtureVersion += 1;
    return recordBody();
  }

  if (/^\/mfc\/records\/\d+\/listing-prefill$/.test(path)) {
    return params.kind === 'NON_EDIBLE' ? prefillNonEdible : prefillEdible;
  }

  return {};
}

const fixtureAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  await new Promise((resolve) => setTimeout(resolve, 120));
  const data = route(
    String(config.method || 'get').toLowerCase(),
    String(config.url || ''),
    (config.params || {}) as Record<string, unknown>,
    parseBody(config.data),
  );
  return { data, status: 200, statusText: 'OK', headers: {}, config, request: {} };
};

export function installMakeFoodCountFixtures() {
  api.defaults.adapter = fixtureAdapter;
  // So the purple header has a site name to show.
  useSitesStore.setState({ sites: [{ id: SITE.id, siteName: SITE.name, locationName: SITE.name }] });
}

// ─── Preview navigator ───────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<any>();

const ENTRIES: { title: string; screen: string; params?: Record<string, unknown>; loadDraft?: boolean }[] = [
  { title: 'Sources', screen: 'MfcSources' },
  { title: 'Record · Overproduction (draft loaded)', screen: 'MfcRecord', params: { source: 'OVERPRODUCTION' }, loadDraft: true },
  { title: 'Record · Spoilage', screen: 'MfcRecord', params: { source: 'SPOILAGE' } },
  { title: 'Summary (draft loaded)', screen: 'MfcSummary', loadDraft: true },
  { title: 'Food Impact', screen: 'MfcFoodImpact' },
  { title: 'Source drill-down · Overproduction', screen: 'MfcSourceDrilldown', params: { source: 'OVERPRODUCTION' } },
  { title: 'Recent records', screen: 'MfcRecentRecords' },
];

function PreviewHome({ navigation }: any) {
  const open = async (item: (typeof ENTRIES)[number]) => {
    const store = useMakeFoodCountStore.getState();
    void store.loadTaxonomy();
    void store.loadHomeImpact(SITE.id);
    if (item.loadDraft) await store.loadRecord(RECORD_ID);
    navigation.navigate(item.screen, item.params);
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.list}>
      <AppText variant="h5" color={palette.eggplant}>Make Food Count preview</AppText>
      {ENTRIES.map((item) => (
        <Pressable key={item.title} style={styles.row} onPress={() => void open(item)} accessibilityRole="button">
          <AppText variant="bodyBold">{item.title}</AppText>
        </Pressable>
      ))}
      <View style={styles.row}>
        <AppText variant="caption" color={palette.textMuted}>Fixture draft: Chicken 5 fit, Beef 3 not, Fish 2 fit, Peels 4, Plate scraps 2.</AppText>
      </View>
    </ScrollView>
  );
}

/** Every food picture, large and small, to review the drawings. */
function PreviewArt() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.artGrid}>
      {MFC_ART_KEYS.map((key) => (
        <View key={key} style={styles.artCell}>
          <MfcArt art={key} size={68} radius={10} />
          <View style={styles.artSmall}>
            <MfcArt art={key} size={36} aspect={4 / 3} />
            <AppText variant="meta">{key}</AppText>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

/** The Home card on its own, on the Home page background. */
function PreviewHomeCard() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.list}>
      <MakeFoodCountCard />
    </ScrollView>
  );
}

export function MakeFoodCountPreviewApp() {
  const ref = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    const open = (url: string | null) => {
      if (!url || !url.includes('://preview/')) return;
      const [path, query = ''] = url.split('://preview/')[1].split('?');
      const params: Record<string, unknown> = {};
      for (const pair of query.split('&').filter(Boolean)) {
        const [key, value] = pair.split('=');
        params[key] = Number.isNaN(Number(value)) ? decodeURIComponent(value) : Number(value);
      }
      (ref.current as unknown as { navigate: (name: string, p: object) => void } | null)?.navigate(path, params);
    };
    void Linking.getInitialURL().then(open);
    if (MFC_PREVIEW_AUTOSTART) {
      const [name, query = ''] = MFC_PREVIEW_AUTOSTART.split('?');
      const item = ENTRIES.find((entry) => entry.screen === name);
      if (name === 'PreviewHomeCard') useMakeFoodCountStore.getState().clearDraft();
      fixtureListed = query.includes('listed=1');
      const params = Object.fromEntries(query.split('&').filter(Boolean).map((pair: string) => pair.split('=')));
      void (async () => {
        const store = useMakeFoodCountStore.getState();
        await store.loadTaxonomy();
        if (item?.loadDraft || query.includes('draft=1')) await store.loadRecord(RECORD_ID);
        setTimeout(() => (ref.current as any)?.navigate(name, params), 300);
        const y = Number(params.scroll);
        if (y > 0) {
          setTimeout(() => {
            (globalThis as { __previewScroll?: { scrollTo: (o: object) => void } | null }).__previewScroll?.scrollTo({ y, animated: false });
          }, 2500);
        }
      })();
    }
    const sub = Linking.addEventListener('url', ({ url }) => open(url));
    return () => sub.remove();
  }, []);

  return (
    <NavigationContainer ref={ref}>
      <Stack.Navigator screenOptions={mfcStackScreenOptions}>
        <Stack.Screen name="PreviewHome" component={PreviewHome} options={{ headerShown: false }} />
        <Stack.Screen name="PreviewHomeCard" component={PreviewHomeCard} options={{ headerShown: false }} />
        <Stack.Screen name="PreviewArt" component={PreviewArt} options={{ headerShown: false }} />
        <Stack.Screen name="PreviewRestaurantHome" component={RestaurantHomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PreviewInsights" component={RestaurantAnalyticsScreen} options={{ headerShown: false }} />
        {MFC_STACK_SCREENS.map(({ name, component }) => (
          <Stack.Screen key={name} name={name} component={component} />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.creme },
  list: { padding: 20, paddingTop: 70, gap: 12 },
  artGrid: { padding: 12, paddingTop: 60, flexDirection: 'row', flexWrap: 'wrap', gap: 10, backgroundColor: '#F5EFFA' },
  artCell: { width: '23%', alignItems: 'center', gap: 4 },
  artSmall: { alignItems: 'center', gap: 2 },
  row: { backgroundColor: palette.white, borderRadius: 14, padding: 14, minHeight: 44, justifyContent: 'center' },
});

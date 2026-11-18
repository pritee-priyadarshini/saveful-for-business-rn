/**
 * DEV ONLY — visual preview of the Consolidated Collections screens.
 *
 * Enabled with EXPO_PUBLIC_CONSOLIDATED_PREVIEW=1 in a __DEV__ build. The app then
 * opens on a gallery of the real screens, fed by fixtures shaped exactly like
 * the backend's responses (served through an axios adapter, so the real service
 * normalisers run). Deep link to a screen with
 *   com.saveful.business.app://preview/<Screen>?collectionId=41
 * Inert in production: everything is gated on __DEV__ and the env flag.
 */
import React, { useEffect, useRef } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { NavigationContainer, type NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';

import api from '@/services/api';
import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { CollectionDashboardScreen } from '@/screens/consolidated/CollectionDashboardScreen';
import { ConsolidatedCollectionsScreen } from '@/screens/consolidated/ConsolidatedCollectionsScreen';
import { ConsolidatedGroupFormScreen } from '@/screens/consolidated/ConsolidatedGroupFormScreen';
import { ConsolidatedGroupsScreen } from '@/screens/consolidated/ConsolidatedGroupsScreen';
import { ConsolidatedGroupDetailScreen } from '@/screens/consolidated/ConsolidatedGroupDetailScreen';
import { ConsolidatedInvitationsScreen } from '@/screens/consolidated/ConsolidatedInvitationsScreen';
import { ConsolidatedReportScreen } from '@/screens/consolidated/ConsolidatedReportScreen';
import { ContributionDetailScreen } from '@/screens/consolidated/ContributionDetailScreen';
import { ReviewPublishScreen } from '@/screens/consolidated/ReviewPublishScreen';
import { ScheduleCollectionScreen } from '@/screens/consolidated/ScheduleCollectionScreen';
import { PickupCheckScreen } from '@/screens/charity/PickupCheckScreen';
import { ConsolidatedHomeCard } from '@/components/consolidated/ConsolidatedHomeCard';
import { ConsolidatedInvitationsCard } from '@/components/consolidated/ConsolidatedInvitationsCard';
import { ConsolidatedLogisticsCard } from '@/components/consolidated/ConsolidatedLogisticsCard';
import { ConsolidatedPermissionSection } from '@/components/consolidated/ConsolidatedPermissionSection';
import { WhatsNewAnnouncement } from '@/components/whatsNew/WhatsNewAnnouncement';
import { useWhatsNewStore } from '@/store/whatsNewStore';

export { CONSOLIDATED_PREVIEW } from './previewFlag';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TZ = 'Australia/Melbourne';
const now = Date.now();
const at = (minutes: number) => new Date(now + minutes * 60000).toISOString();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne' }).format(new Date(now));
const day = (offset: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne' }).format(new Date(now + offset * 86400000));

const group = { id: 3, name: 'Stadium North' };
const point = { id: 5, name: 'Loading Dock B', address: '1 Olympic Blvd, Melbourne VIC 3000', postcode: '3000', lat: -37.82, lng: 144.98, directions: 'Rear gate, next to the cool room' };
const people = { mike: { id: 7, name: 'Mike Chuter' }, priya: { id: 9, name: 'Priya Nair' }, tom: { id: 11, name: 'Tom Reyes' } };

const times = (offset = 0) => ({
  opensAt: at(-300 + offset),
  submissionsCloseAt: at(25 + offset),
  handoverStartAt: at(-10 + offset),
  handoverEndAt: at(60 + offset),
  pickupStartAt: at(75 + offset),
  pickupEndAt: at(240 + offset),
  reopenedUntil: null,
});

function item(id: number, name: string, kg: number, extra: Record<string, unknown> = {}) {
  return {
    itemId: id, foodItemId: 800 + id, name, category: name, quantityDescription: null,
    submittedQtyKg: kg, verifiedQtyKg: null, acceptedQtyKg: null, rejectedQtyKg: null,
    unavailableQtyKg: null, rejectionReason: null, outcome: 'PENDING', bestBefore: at(1440), ...extra,
  };
}

const storage = { refrigeration: true, ambient: false, freezer: false, hot: false, reheating: false };

function contributions(stage: 'open' | 'closed' | 'done') {
  const kiosk = {
    id: 90, site: { id: 12, name: 'Kiosk 1' }, listingId: 501,
    status: stage === 'open' ? 'HANDED_OVER' : stage === 'closed' ? 'RECEIVED' : 'COMPLETED',
    submittedAt: at(-90), submittedBy: people.tom, isLate: false,
    handover: { at: at(-20), by: people.tom },
    receipt: stage === 'open' ? { status: 'PENDING', at: null, by: null, note: null } : { status: 'RECEIVED', at: at(-5), by: people.priya, note: null },
    declaration: { version: 'v1', at: at(-90) },
    items: [
      item(1, 'Sandwiches', 4, { quantityDescription: '3 trays', verifiedQtyKg: stage === 'open' ? null : 3.5, ...(stage === 'done' ? { acceptedQtyKg: 3.5, rejectedQtyKg: 0, unavailableQtyKg: 0 } : {}) }),
      item(2, 'Bread', 1.5, { verifiedQtyKg: stage === 'open' ? null : 1.5, ...(stage === 'done' ? { acceptedQtyKg: 1, rejectedQtyKg: 0.5, unavailableQtyKg: 0, rejectionReason: 'PACKAGING_DAMAGED' } : {}) }),
    ],
    storage, allergens: ['gluten', 'dairy'], photoUrls: [], collectionNotes: null, bestBefore: at(1440),
    pendingChangeRequestId: null, exceptions: [],
  };
  const suite = {
    id: 91, site: { id: 13, name: 'Corporate Suite' }, listingId: 502,
    status: stage === 'done' ? 'COMPLETED' : 'SUBMITTED',
    submittedAt: at(-60), submittedBy: people.mike, isLate: false,
    handover: null,
    receipt: { status: stage === 'done' ? 'RECEIVED' : 'PENDING', at: null, by: null, note: null },
    declaration: { version: 'v1', at: at(-60) },
    items: [item(3, 'Prepared meals', 6, { quantityDescription: '12 portions', ...(stage === 'done' ? { verifiedQtyKg: 6, acceptedQtyKg: 5.5, rejectedQtyKg: 0, unavailableQtyKg: 0.5 } : {}) })],
    storage, allergens: [], photoUrls: [], collectionNotes: 'Hot box in the corridor', bestBefore: at(1440),
    pendingChangeRequestId: null, exceptions: stage === 'closed' ? ['OVERDUE'] : [],
  };
  const late = {
    id: 92, site: { id: 14, name: 'Members Bar' }, listingId: 503, status: 'LATE_PENDING_APPROVAL',
    submittedAt: at(-2), submittedBy: people.mike, isLate: true, handover: null,
    receipt: { status: 'PENDING', at: null, by: null, note: null }, declaration: { version: 'v1', at: at(-2) },
    items: [item(4, 'Fresh fruit & veg', 2.5)], storage, allergens: [], photoUrls: [], collectionNotes: null,
    bestBefore: at(1440), pendingChangeRequestId: null, exceptions: ['LATE'],
  };
  if (stage === 'open') return [kiosk, suite];
  if (stage === 'closed') return [kiosk, suite, late];
  return [kiosk, suite];
}

function dashboard(id: number) {
  const stage = id === 41 ? 'open' : id === 43 ? 'done' : 'closed';
  const status = id === 41 ? 'OPEN' : id === 42 ? 'SUBMISSIONS_CLOSED' : id === 43 ? 'COMPLETED' : 'CLAIMED';
  const rows = contributions(stage);
  return {
    id, status, method: 'SITE_DROP_OFF', timezone: TZ, scheduleId: 7, scheduledDate: today,
    group, point, times: times(), contact: { name: 'Priya Nair', phone: '0400 123 456' },
    instructions: 'Use the rear gate. Sign in with security.', suitabilityNotes: 'Sealed, labelled and chilled below 5°C.',
    participatingSiteIds: [12, 13, 14, 15], cancelReason: null,
    totals: {
      submittedKg: 11.5, verifiedKg: stage === 'open' ? null : 11,
      acceptedKg: stage === 'done' ? 10 : null, rejectedKg: stage === 'done' ? 0.5 : null, unavailableKg: stage === 'done' ? 0.5 : null,
    },
    counts: { participating: 4, submitted: stage === 'closed' ? 3 : 2, handedOver: 1, received: stage === 'open' ? 0 : 1, notReceived: 0, noContribution: 1, late: stage === 'closed' ? 1 : 0 },
    contributions: rows,
    sitesWithoutContribution: [{ id: 15, name: 'Gate 4 Café' }],
    publication: { masterListingId: id === 44 || id === 43 ? 900 : null, publishedAt: null, publishedBy: null, declarationVersion: null },
    claim: id === 44 ? { id: 300, status: 'CONFIRMED', charityName: 'Thankful Kitchen', claimedAt: at(-30), collectedAt: null, driverPickup: { status: 'EN_ROUTE', driverName: 'Sam Lee' } } : null,
    pendingMaterialChange: null,
    permissions: {
      canManage: true, canReceive: true, canPublish: false,
      publishBlockers: id === 42 ? ['Confirm what arrived from Corporate Suite, or exclude it.'] : [],
    },
  };
}

function listItem(id: number, status: string, date: string, submitted: number) {
  return {
    id, status, method: id % 2 ? 'SITE_DROP_OFF' : 'INTERNAL_COLLECTION', timezone: TZ, scheduledDate: date,
    group, point: { id: 5, name: point.name, address: point.address }, times: times(),
    counts: { participating: 4, submitted }, totals: { submittedKg: 11.5, verifiedKg: submitted > 2 ? 11 : null },
  };
}

const groupDetail = {
  id: 3, name: 'Stadium North', description: 'Match-day surplus from the north stand outlets', timezone: TZ, isActive: true,
  hostSite: { id: 12, name: 'Kiosk 1' }, points: [{ ...point, isDefault: true, isActive: true }],
  sites: [
    { siteId: 12, removedAt: null, invitationStatus: 'ACCEPTED', site: { id: 12, name: 'Kiosk 1' } },
    { siteId: 13, removedAt: null, invitationStatus: 'ACCEPTED', site: { id: 13, name: 'Corporate Suite' } },
    { siteId: 14, removedAt: null, invitationStatus: 'PENDING', site: { id: 14, name: 'Members Bar' } },
    { siteId: 15, removedAt: '2026-11-10T00:00:00Z', invitationStatus: 'DECLINED', site: { id: 15, name: 'Gate 4 Café' } },
  ],
  members: [
    { role: 'MANAGER', user: { id: 7, firstName: 'Mike', lastName: 'Chuter' } },
    { role: 'RECEIVER', user: { id: 9, firstName: 'Priya', lastName: 'Nair' } },
  ],
};

let restoredWinter = false;

function route(method: string, url: string, params: Record<string, unknown>): unknown {
  const path = url.replace(/^.*\/api\/v1/, '').split('?')[0];
  const m = (re: RegExp) => path.match(re);
  if (method === 'post' && /\/consolidated\/groups\/5\/restore$/.test(path)) {
    restoredWinter = true;
    return { restored: true };
  }
  if (method !== 'get') return { ok: true };

  if (path === '/consolidated/me') return { canManage: true, managedGroupIds: [3], receiverGroupIds: [], siteIdsWithOpenCollections: [12], pendingInvitationCount: 1 };
  if (path === '/consolidated/declarations') return {};
  if (path === '/consolidated/groups') {
    return [
      { id: 3, name: 'Stadium North', hostSite: { id: 12, name: 'Kiosk 1' }, siteCount: 3, acceptedSiteCount: 2, pendingSiteCount: 1, pointCount: 1, isActive: true, nextCollection: { id: 41, scheduledDate: `${today}T00:00:00.000Z`, status: 'OPEN' }, points: [point], sites: groupDetail.sites.filter((row) => !row.removedAt) },
      { id: 4, name: 'Zoo East Precinct', hostSite: { id: 20, name: 'Elephant Café' }, siteCount: 5, acceptedSiteCount: 5, pendingSiteCount: 0, pointCount: 1, isActive: true, nextCollection: { id: 50, scheduledDate: `${day(2)}T00:00:00.000Z`, status: 'SCHEDULED' }, points: [{ ...point, id: 9, name: 'Service Lane 2' }] },
      { id: 5, name: 'Winter Festival 2025', hostSite: { id: 30, name: 'Pop-up' }, siteCount: 2, isActive: false, nextCollection: null, points: [] },
    ];
  }
  if (path === '/consolidated/groups/eligible-sites') {
    return [12, 13, 14, 15, 16].map((id, i) => ({ id, name: ['Kiosk 1', 'Corporate Suite', 'Members Bar', 'Gate 4 Café', 'Media Lounge'][i] }));
  }
  if (path === '/consolidated/groups/eligible-users') {
    return [
      { id: 7, name: 'Mike Chuter', email: 'mike@example.com', canManage: true },
      { id: 9, name: 'Priya Nair', email: 'priya@example.com', canManage: false },
      { id: 11, name: 'Tom Reyes', email: 'tom@example.com', canManage: true },
    ];
  }
  const groupId = m(/^\/consolidated\/groups\/(\d+)$/);
  if (groupId) {
    return Number(groupId[1]) === 5
      ? { ...groupDetail, id: 5, name: 'Winter Festival 2025', description: 'Pop-up event, finished', isActive: restoredWinter }
      : groupDetail;
  }
  if (path === '/consolidated/permissions') {
    return [
      { userId: 1, name: 'Alex Morgan', email: 'owner@example.com', orgRole: 'SUPER_ADMIN', isSiteAdmin: false, canManageConsolidated: true },
      { userId: 7, name: 'Mike Chuter', email: 'mike@example.com', orgRole: 'ORG_ADMIN', isSiteAdmin: false, canManageConsolidated: true },
      { userId: 11, name: 'Tom Reyes', email: 'tom@example.com', orgRole: 'ORG_MEMBER', isSiteAdmin: true, canManageConsolidated: false },
      { userId: 9, name: 'Priya Nair', email: 'priya@example.com', orgRole: 'ORG_MEMBER', isSiteAdmin: false, canManageConsolidated: false },
    ];
  }
  if (path === '/consolidated/invitations') {
    return [{
      id: 77, status: 'PENDING', invitedAt: at(-120), invitedBy: { id: 7, name: 'Mike Chuter' },
      site: { id: 14, name: 'Members Bar', address: 'Level 2, North Stand' },
      group: { id: 3, name: 'Stadium North', description: 'Match-day surplus from the north stand outlets', hostSiteName: 'Kiosk 1', siteCount: 4, managers: ['Mike Chuter'], point },
    }];
  }
  if (path === '/consolidated/collections') {
    const tab = String(params.tab || 'active');
    const items = tab === 'active'
      ? [listItem(41, 'OPEN', today, 2), listItem(42, 'SUBMISSIONS_CLOSED', today, 3), listItem(44, 'CLAIMED', today, 3)]
      : tab === 'upcoming'
        ? [listItem(50, 'SCHEDULED', day(2), 0), listItem(51, 'SCHEDULED', day(7), 0)]
        : [listItem(43, 'COMPLETED', day(-7), 3), listItem(40, 'CANCELLED', day(-14), 1)];
    return { items, page: 1, limit: 20, total: items.length, totalPages: 1 };
  }
  const coll = m(/^\/consolidated\/collections\/(\d+)$/);
  if (coll) return dashboard(Number(coll[1]));
  const cr = m(/^\/consolidated\/collections\/(\d+)\/change-requests$/);
  if (cr && Number(cr[1]) === 43) return []; // finished collections have no open requests (backend closes them)
  if (cr) {
    return [{ id: 61, contributionId: 90, status: 'PENDING', payload: { foodItems: [{ name: 'Sandwiches', totalQtyKg: 2 }] }, contribution: { site: { name: 'Kiosk 1' } } }];
  }
  if (m(/^\/consolidated\/collections\/\d+\/publish-preview$/)) {
    return {
      items: [
        { id: 1, name: 'Sandwiches', category: 'Sandwiches', qtyKg: 3.5, siteId: 12 },
        { id: 2, name: 'Bread', category: 'Bread', qtyKg: 1.5, siteId: 12 },
        { id: 3, name: 'Prepared meals', category: 'Prepared meals', qtyKg: 6, siteId: 13 },
      ],
      totals: { totalQtyKg: 11, itemCount: 3, siteCount: 2 },
      storage, allergens: ['gluten', 'dairy'], photoUrls: [], bestBefore: at(1440),
      warnings: ['Sandwiches was reduced from 4 kg to 3.5 kg.', 'Gate 4 Café did not contribute.'],
      blockers: [],
    };
  }
  if (m(/^\/consolidated\/schedules\/\d+$/)) {
    return {
      id: 7, groupId: 3, collectionPointId: 5, method: 'SITE_DROP_OFF', recurrence: 'SELECTED_WEEKDAYS', status: 'ACTIVE', timezone: TZ,
      startDate: today, endDate: null, daysOfWeek: [5, 6], customDates: [], opensDaysBefore: 0,
      times: { submissionsClose: '13:30', handoverStart: '13:00', handoverEnd: '14:00', pickupStart: '14:15', pickupEnd: '16:00' },
      contactName: 'Priya Nair', contactPhone: '0400 123 456', instructions: 'Use the rear gate', suitabilityNotes: 'Sealed, labelled and chilled below 5°C.', participatingSiteIds: [12, 13],
    };
  }
  const contrib = m(/^\/consolidated\/contributions\/(?:by-listing\/)?(\d+)$/);
  if (contrib) {
    const row = contributions('open')[1];
    return {
      contribution: row,
      collection: { id: 41, status: 'OPEN', method: 'SITE_DROP_OFF', timezone: TZ, scheduledDate: today, group, point, times: times(), suitabilityNotes: 'Sealed, labelled and chilled below 5°C.', instructions: 'Use the rear gate. Sign in with security.' },
      permissions: { canManage: false, canReceive: false },
      pendingChangeStatus: null,
    };
  }
  if (m(/^\/consolidated\/charity\/claims\/\d+\/item-check$/)) {
    return {
      claimId: 300,
      pickup: { pointName: 'Loading Dock B', address: point.address, start: at(75), end: at(240) },
      items: [
        { masterFoodItemId: 1, name: 'Sandwiches', category: 'Sandwiches', quantityDescription: '3 trays', qtyKg: 3.5 },
        { masterFoodItemId: 2, name: 'Bread', category: 'Bread', quantityDescription: null, qtyKg: 1.5 },
        { masterFoodItemId: 3, name: 'Prepared meals', category: 'Prepared meals', quantityDescription: '12 portions', qtyKg: 6 },
      ],
      storage, allergens: ['gluten', 'dairy'], declaration: null, pendingChange: null, alreadyCompleted: false,
    };
  }
  if (path === '/consolidated/reports/summary') {
    return {
      combined: { listedKg: 48.5, verifiedKg: 45, acceptedKg: 41.5, rejectedKg: 2, unavailableKg: 1.5 },
      sites: [
        { siteId: 13, siteName: 'Corporate Suite', listedKg: 22, verifiedKg: 21, acceptedKg: 20, rejectedKg: 0.5, unavailableKg: 0.5 },
        { siteId: 12, siteName: 'Kiosk 1', listedKg: 18.5, verifiedKg: 16, acceptedKg: 14.5, rejectedKg: 1, unavailableKg: 0.5 },
        { siteId: 14, siteName: 'Members Bar', listedKg: 8, verifiedKg: 8, acceptedKg: 7, rejectedKg: 0.5, unavailableKg: 0.5 },
      ],
      categories: [
        { category: 'Prepared meals', acceptedKg: 19 },
        { category: 'Sandwiches', acceptedKg: 11.5 },
        { category: 'Bread', acceptedKg: 6 },
        { category: 'Fresh fruit & veg', acceptedKg: 5 },
      ],
      rejectionReasons: [{ reason: 'PACKAGING_DAMAGED', count: 3 }, { reason: 'TEMPERATURE', count: 1 }],
    };
  }
  if (path === '/consolidated/reports/collections') {
    return {
      page: 1, pageSize: 30, total: 3, totalPages: 1,
      rows: [
        { id: 43, date: `${day(-7)}T00:00:00.000Z`, groupName: 'Stadium North', pointName: 'Loading Dock B', status: 'COMPLETED', listedKg: 11.5, verifiedKg: 11, acceptedKg: 10 },
        { id: 39, date: `${day(-14)}T00:00:00.000Z`, groupName: 'Stadium North', pointName: 'Loading Dock B', status: 'COMPLETED', listedKg: 20, verifiedKg: 18, acceptedKg: 17 },
        { id: 40, date: `${day(-21)}T00:00:00.000Z`, groupName: 'Stadium North', pointName: 'Loading Dock B', status: 'CANCELLED', listedKg: 0, verifiedKg: 0, acceptedKg: 0 },
      ],
    };
  }
  return {};
}

const fixtureAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  await new Promise((resolve) => setTimeout(resolve, 120));
  const data = route(String(config.method || 'get').toLowerCase(), String(config.url || ''), (config.params || {}) as Record<string, unknown>);
  return { data, status: 200, statusText: 'OK', headers: {}, config, request: {} };
};

export function installConsolidatedFixtures() {
  api.defaults.adapter = fixtureAdapter;
}

// ─── Preview navigator ───────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<any>();

const ENTRIES: { title: string; screen: string; params?: Record<string, unknown> }[] = [
  { title: 'Collection groups', screen: 'ConsolidatedGroups' },
  { title: 'Group form (edit)', screen: 'ConsolidatedGroupForm', params: { groupId: 3 } },
  { title: 'Collections list', screen: 'ConsolidatedCollections' },
  { title: 'Schedule collection', screen: 'ScheduleCollection', params: { mode: 'create', groupId: 3 } },
  { title: 'Dashboard · open', screen: 'CollectionDashboard', params: { collectionId: 41 } },
  { title: 'Dashboard · closed (blocked)', screen: 'CollectionDashboard', params: { collectionId: 42 } },
  { title: 'Dashboard · claimed', screen: 'CollectionDashboard', params: { collectionId: 44 } },
  { title: 'Dashboard · completed', screen: 'CollectionDashboard', params: { collectionId: 43 } },
  { title: 'Review & publish', screen: 'ReviewPublish', params: { collectionId: 42 } },
  { title: 'Site contribution', screen: 'ContributionDetail', params: { contributionId: 91 } },
  { title: 'Invitations', screen: 'ConsolidatedInvitations' },
  { title: 'Report', screen: 'ConsolidatedReport' },
  { title: 'Charity item check', screen: 'PickupCheck', params: { claimId: 300 } },
  { title: 'Components (cards)', screen: 'PreviewComponents' },
];

function PreviewHome({ navigation }: any) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.list}>
      <AppText variant="h5">Consolidated preview</AppText>
      {ENTRIES.map((entry) => (
        <Pressable key={entry.title} style={styles.row} onPress={() => navigation.navigate(entry.screen, entry.params)}>
          <AppText variant="bodyBold">{entry.title}</AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function PreviewComponents() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.list}>
      <ConsolidatedInvitationsCard />
      <ConsolidatedHomeCard />
      <ConsolidatedLogisticsCard
        collection={{
          method: 'SITE_DROP_OFF', pointName: point.name, address: point.address, directions: point.directions,
          ...times(), suitabilityNotes: 'Sealed, labelled and chilled below 5°C.', instructions: 'Use the rear gate.', timezone: TZ,
        }}
      />
      <ConsolidatedPermissionSection />
    </ScrollView>
  );
}

const SCREENS: Record<string, React.ComponentType<any>> = {
  PreviewHome,
  PreviewComponents,
  ConsolidatedGroups: ConsolidatedGroupsScreen,
  ConsolidatedGroupForm: ConsolidatedGroupFormScreen,
  ConsolidatedGroupDetail: ConsolidatedGroupDetailScreen,
  ConsolidatedCollections: ConsolidatedCollectionsScreen,
  ScheduleCollection: ScheduleCollectionScreen,
  CollectionDashboard: CollectionDashboardScreen,
  ReviewPublish: ReviewPublishScreen,
  ContributionDetail: ContributionDetailScreen,
  ConsolidatedInvitations: ConsolidatedInvitationsScreen,
  ConsolidatedReport: ConsolidatedReportScreen,
  PickupCheck: PickupCheckScreen,
};

export function ConsolidatedPreviewApp() {
  const ref = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    const open = (url: string | null) => {
      if (!url || !url.includes('://preview/')) return;
      if (url.includes('://preview/whats-new')) {
        // preview/whats-new opens the sheet; preview/whats-new-page-<makeFoodCount|consolidated|overview> switches page.
        const page = url.split('whats-new-page-')[1];
        if (page) (globalThis as { __whatsNewGo?: (p: string) => void }).__whatsNewGo?.(page.split(/[?-]/)[0]);
        else useWhatsNewStore.getState().open();
        return;
      }
      if (url.includes('://preview/guide-')) {
        // e.g. preview/guide-next-3 (the suffix only makes repeated targets unique)
        (globalThis as { __guideGo?: (delta: 1 | -1) => void }).__guideGo?.(url.includes('guide-back') ? -1 : 1);
        return;
      }
      if (url.includes('://preview/scroll')) {
        const y = Number(url.split('y=')[1]) || 0;
        (globalThis as { __previewScroll?: { scrollTo: (o: object) => void } | null }).__previewScroll?.scrollTo({ y, animated: false });
        return;
      }
      const [path, query = ''] = url.split('://preview/')[1].split('?');
      const params: Record<string, unknown> = {};
      for (const pair of query.split('&').filter(Boolean)) {
        const [key, value] = pair.split('=');
        params[key] = Number.isNaN(Number(value)) ? decodeURIComponent(value) : Number(value);
      }
      (ref.current as unknown as { navigate: (name: string, p: object) => void } | null)?.navigate(path, params);
    };
    void Linking.getInitialURL().then(open);
    const sub = Linking.addEventListener('url', ({ url }) => open(url));
    // Headless simulators cannot tap the iOS "Open in…?" prompt that deep links raise,
    // so the preview also follows a target published by a local file server (port 8099).
    let last = '';
    const timer = setInterval(() => {
      fetch(`http://localhost:8099/target.txt?t=${Date.now()}`)
        .then((res) => (res.ok ? res.text() : ''))
        .then((text) => {
          const target = text.trim();
          if (target && target !== last) {
            last = target;
            open(`x://preview/${target}`);
          }
        })
        .catch(() => undefined);
    }, 800);
    return () => { sub.remove(); clearInterval(timer); };
  }, []);

  return (
    <NavigationContainer ref={ref}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {Object.entries(SCREENS).map(([name, component]) => (
          <Stack.Screen key={name} name={name} component={component} />
        ))}
      </Stack.Navigator>
      <WhatsNewAnnouncement onNavigate={() => undefined} />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.creme },
  list: { padding: 20, paddingTop: 70, gap: 12 },
  row: { backgroundColor: palette.white, borderRadius: 14, padding: 14 },
});

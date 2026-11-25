import React, { useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import * as ScreenOrientation from 'expo-screen-orientation';

import { MfcHeader } from '@/components/makeFoodCount/MfcHeader';
import { useModuleGate } from '@/hooks/useModuleGate';
import { palette } from '@/theme/colors';
import { MfcSitePicker, type MfcSiteOption } from '@/components/makeFoodCount/MfcSitePicker';
import { FoodImpactScreen } from '@/screens/makeFoodCount/FoodImpactScreen';
import { RecentRecordsScreen } from '@/screens/makeFoodCount/RecentRecordsScreen';
import { RecordScreen } from '@/screens/makeFoodCount/RecordScreen';
import { SourceDrilldownScreen } from '@/screens/makeFoodCount/SourceDrilldownScreen';
import { SourcesScreen } from '@/screens/makeFoodCount/SourcesScreen';
import { SummaryScreen } from '@/screens/makeFoodCount/SummaryScreen';
import { useMakeFoodCountStore } from '@/store/makeFoodCountStore';
import { useSitesStore } from '@/store/sitesStore';
import { MFC } from '@/constants/makeFoodCount';
import { getSiteDisplayName } from '@/utils/impactSites';
import type { FoodSource } from '@/types/makeFoodCount';

/** App.tsx locks portrait globally; unlock while MFC is open so iPad landscape works (SPEC §5). */
async function unlockMfcOrientation() {
  try {
    await ScreenOrientation.unlockAsync();
  } catch {
    // Needs a native build with expo-screen-orientation.
  }
}

async function restorePortraitOrientation() {
  try {
    if (Platform.OS === 'android') {
      await ScreenOrientation.lockPlatformAsync({
        screenOrientationConstantAndroid: 1,
      });
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  } catch {
    // Ignore — same as App.tsx.
  }
}

export type MakeFoodCountStackParamList = {
  MfcSources: undefined;
  /** source = the tab to open; defaults to the first selected source. */
  MfcRecord: { source?: FoodSource } | undefined;
  /** notice = one-off message after a listing is published ("Listed 7 kg for people"). */
  /** mode 'view': a finished record opened from Recent records, shown read-only. */
  MfcSummary: { notice?: string; mode?: 'view' } | undefined;
  /** view = the tab to open on (overview · happened · redistributed). */
  MfcFoodImpact: { view?: 'overview' | 'happened' | 'redistributed' } | undefined;
  MfcSourceDrilldown: { source: FoodSource };
  MfcRecentRecords: undefined;
};

/** Real sites the user can record for (the virtual head-office placeholder has an id <= 0). */
function useMfcSiteOptions(): MfcSiteOption[] {
  const sites = useSitesStore((state) => state.sites);
  return useMemo(
    () =>
      (sites ?? [])
        .map((site: any) => ({ id: Number(site?.id), name: getSiteDisplayName(site) }))
        .filter((site) => Number.isFinite(site.id) && site.id > 0),
    [sites],
  );
}

/** Header title per screen; the site switcher only belongs to the recording flow. */
const HEADER_BY_ROUTE: Record<keyof MakeFoodCountStackParamList, { title: string; showSite: boolean }> = {
  MfcSources: { title: 'Make Food Count', showSite: true },
  MfcRecord: { title: 'Make Food Count', showSite: true },
  MfcSummary: { title: 'Make Food Count', showSite: true },
  MfcFoodImpact: { title: 'Food Impact', showSite: true },
  MfcSourceDrilldown: { title: 'Food Impact', showSite: true },
  MfcRecentRecords: { title: 'Recent records', showSite: true },
};

function MfcStackHeader({ routeName }: { routeName: string }) {
  const config = HEADER_BY_ROUTE[routeName as keyof MakeFoodCountStackParamList] ?? HEADER_BY_ROUTE.MfcSources;
  const siteId = useMakeFoodCountStore((state) => state.siteId);
  const recordId = useMakeFoodCountStore((state) => state.recordId);
  const options = useMfcSiteOptions();
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    // Cached by the store; makes sure the switcher has sites even when Home never loaded them.
    useSitesStore.getState().fetchOrganisation().catch(() => undefined);
  }, []);

  const current = (siteId != null ? options.find((site) => site.id === siteId) : null) ?? (options.length === 1 ? options[0] : null);
  // A record belongs to one site, so the switcher only works until the record exists.
  const canSwitch = options.length > 1 && recordId == null;
  const siteName = current?.name ?? (canSwitch ? 'Choose site' : null);

  return (
    <>
      <MfcHeader
        title={config.title}
        siteName={config.showSite ? siteName : null}
        onSitePress={config.showSite && canSwitch ? () => setPickerOpen(true) : undefined}
      />
      <MfcSitePicker
        visible={pickerOpen}
        sites={options}
        selectedId={current?.id ?? null}
        onSelect={(id) => {
          useMakeFoodCountStore.setState({ siteId: id });
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

/** Shared by the stack and the dev preview gallery. */
export const mfcStackScreenOptions: NativeStackNavigationOptions = {
  header: ({ route }) => <MfcStackHeader routeName={route.name} />,
  headerShown: true,
  // RestaurantStack locks portrait; Make Food Count also runs on iPad landscape.
  orientation: 'default',
  contentStyle: { backgroundColor: MFC.page },
};

export const MFC_STACK_SCREENS: { name: keyof MakeFoodCountStackParamList; component: React.ComponentType<any> }[] = [
  { name: 'MfcSources', component: SourcesScreen },
  { name: 'MfcRecord', component: RecordScreen },
  { name: 'MfcSummary', component: SummaryScreen },
  { name: 'MfcFoodImpact', component: FoodImpactScreen },
  { name: 'MfcSourceDrilldown', component: SourceDrilldownScreen },
  { name: 'MfcRecentRecords', component: RecentRecordsScreen },
];

const Stack = createNativeStackNavigator<MakeFoodCountStackParamList>();

export function MakeFoodCountStack() {
  const navigation = useNavigation();
  // Every way in (Home card, insights links, What's new, deep links) lands
  // here, so one check covers them all.
  const { locked } = useModuleGate('MFC');

  useEffect(() => {
    void unlockMfcOrientation();
    return () => {
      void restorePortraitOrientation();
    };
  }, []);

  // Not in the plan: swap this route for the bottom sheet, so closing it lands
  // back where the person was (Home, insights) rather than on an empty stack.
  useEffect(() => {
    if (locked) navigation.dispatch(StackActions.replace('ModuleUpsell', { module: 'MFC' }));
  }, [locked, navigation]);

  if (locked) return <View style={{ flex: 1, backgroundColor: palette.creme }} />;

  return (
    <Stack.Navigator initialRouteName="MfcSources" screenOptions={mfcStackScreenOptions}>
      {MFC_STACK_SCREENS.map(({ name, component }) => (
        <Stack.Screen key={name} name={name} component={component} />
      ))}
    </Stack.Navigator>
  );
}

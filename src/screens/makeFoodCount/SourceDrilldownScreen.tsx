import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type NavigationProp, type ParamListBase, type RouteProp } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { tabular } from '@/components/consolidated/ui';
import { formatDisplayDate } from '@/components/ImpactDateFilter';
import { DestinationList, RecoveredByCategory, RecoverySplit } from '@/components/makeFoodCount/InsightsParts';
import { MfcArt, SOURCE_ART } from '@/components/makeFoodCount/MfcArt';
import { MfcCard, MfcCta, MfcEmpty, MfcNotice, MfcSkeleton } from '@/components/makeFoodCount/MfcAppUi';
import { Screen } from '@/components/Screen';
import { MFC, SOURCE_META } from '@/constants/makeFoodCount';
import type { MakeFoodCountStackParamList } from '@/navigation/MakeFoodCountStack';
import { insightsQueryKey, useMfcInsightsStore } from '@/store/mfcInsightsStore';
import { palette } from '@/theme/colors';
import { formatKg } from '@/utils/makeFoodCountSummary';
import { normalize, useResponsiveLayout } from '@/utils/responsive';

/** One source (Overproduction, Spoilage…): its categories, recovered vs not recovered, and where the recovered food went. */
export function SourceDrilldownScreen() {
  const layout = useResponsiveLayout();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<MakeFoodCountStackParamList, 'MfcSourceDrilldown'>>();
  const source = route.params?.source ?? 'OVERPRODUCTION';
  const meta = SOURCE_META[source];
  const [refreshing, setRefreshing] = useState(false);

  const entry = useMfcInsightsStore((s) => s.drilldowns[source]);
  const from = useMfcInsightsStore((s) => s.from);
  const to = useMfcInsightsStore((s) => s.to);
  const loadSourceDrilldown = useMfcInsightsStore((s) => s.loadSourceDrilldown);
  const queryKey = useMfcInsightsStore(insightsQueryKey);

  useEffect(() => {
    void loadSourceDrilldown(source);
  }, [source, queryKey, loadSourceDrilldown]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSourceDrilldown(source);
    } finally {
      setRefreshing(false);
    }
  }, [loadSourceDrilldown, source]);

  const backToImpact = () => navigation.navigate('MfcFoodImpact');

  const data = entry?.data ?? null;
  const loading = entry?.loading ?? !entry;
  const error = entry?.error ?? null;
  const isEmpty = !!data && data.recordedKg <= 0;

  return (
    <Screen
      transparentTop
      backgroundColor={MFC.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} colors={[palette.primary]} />}
    >
      <View
        style={[
          styles.page,
          {
            paddingHorizontal: layout.pagePadH,
            maxWidth: layout.contentMaxWidth,
            paddingTop: layout.space(8, 12),
            paddingBottom: layout.space(32, 40),
          },
        ]}
      >
        <View style={styles.titleRow}>
          <MfcArt art={SOURCE_ART[source]} size={72} aspect={4 / 3} radius={8} accessibilityLabel={`${meta.label} illustration`} />
          <View style={styles.flex}>
            <AppText variant="subheading" color={MFC.purple} style={styles.title} accessibilityRole="header">
              {meta.label}
            </AppText>
            <AppText variant="bodySmall" color={MFC.muted}>
              {meta.description}
            </AppText>
          </View>
        </View>
        <AppText variant="meta" color={palette.stone}>
          {`${formatDisplayDate(from)} – ${formatDisplayDate(to)}, with your Food Impact filters`}
        </AppText>

        {error && !loading ? (
          <MfcNotice tone="danger" title="We couldn't load this category" body={error}>
            <MfcCta label="Try again" variant="secondary" compact onPress={() => void loadSourceDrilldown(source)} style={styles.noticeAction} />
          </MfcNotice>
        ) : null}

        {loading ? (
          <View style={styles.stack} accessibilityLabel="Loading category" accessibilityLiveRegion="polite">
            <MfcSkeleton lines={2} />
            <MfcSkeleton lines={4} />
          </View>
        ) : null}

        {!loading && isEmpty ? (
          <MfcEmpty
            icon="nutrition-outline"
            title={`No ${meta.label.toLowerCase()} recorded`}
            body="Nothing in this category matches the current filters."
            action={<MfcCta label="Back to Food Impact" variant="secondary" onPress={backToImpact} />}
          />
        ) : null}

        {!loading && data && !isEmpty ? (
          <View style={styles.stack}>
            <MfcCard style={styles.section}>
              <View style={styles.totals}>
                <Total label="Recorded" kg={data.recordedKg} />
                <Total label="Recovered" kg={data.recoveredKg} color={palette.kale} />
                <Total label="Not recovered" kg={data.notRecoveredKg} color={palette.eggplant} />
              </View>
              <RecoverySplit recoveredKg={data.recoveredKg} notRecoveredKg={data.notRecoveredKg} />
            </MfcCard>

            <View style={[styles.stack, layout.isTablet && styles.row, layout.isTablet && styles.top]}>
              <MfcCard style={[styles.section, layout.isTablet && styles.flex]}>
                <AppText variant="bodyBold" color={MFC.purple} style={styles.cardTitle} accessibilityRole="header">
                  Recovered by category
                </AppText>
                <RecoveredByCategory rows={data.categories} />
              </MfcCard>

              <MfcCard style={[styles.section, layout.isTablet && styles.flex]}>
                <AppText variant="bodyBold" color={MFC.purple} style={styles.cardTitle} accessibilityRole="header">
                  Redistribution destinations
                </AppText>
                <DestinationList destinations={data.destinations} recoveredKg={data.recoveredKg} />
              </MfcCard>
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function Total({ label, kg, color = palette.black }: { label: string; kg: number; color?: string }) {
  return (
    <View style={styles.total} accessible accessibilityLabel={`${label}: ${formatKg(kg)}`}>
      <AppText variant="meta" color={palette.stone}>
        {label}
      </AppText>
      <AppText variant="subheading" color={color} style={tabular}>
        {formatKg(kg)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', alignSelf: 'center', gap: 14 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 44 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: normalize(24), lineHeight: normalize(29) },
  stack: { gap: 16 },
  cardTitle: { fontFamily: 'Saveful-Bold', fontSize: normalize(17) },
  row: { flexDirection: 'row' },
  top: { alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 0 },
  noticeAction: { alignSelf: 'flex-start' },
  section: { gap: 14 },
  totals: { flexDirection: 'row', gap: 12 },
  total: { flex: 1, minWidth: 0, gap: 2 },
});

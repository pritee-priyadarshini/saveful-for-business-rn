import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import {
  MfcBadge,
  MfcCta,
  MfcEmpty,
  MfcNavRow,
  MfcNotice,
  MfcPageTitle,
  MfcSkeleton,
  mfcUi,
} from '@/components/makeFoodCount/MfcAppUi';
import { Screen } from '@/components/Screen';
import { MFC } from '@/constants/makeFoodCount';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { makeFoodCountService, readMfcError } from '@/services/makeFoodCount.service';
import { useMakeFoodCountStore } from '@/store/makeFoodCountStore';
import { useSitesStore } from '@/store/sitesStore';
import { palette } from '@/theme/colors';
import type { FoodRecord } from '@/types/makeFoodCount';
import { formatKg, MFC_SOURCE_LABELS } from '@/utils/makeFoodCountSummary';
import { normalize, useResponsiveLayout } from '@/utils/responsive';

const PAGE_SIZE = 20;

function formatRecordedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function recordSubtitle(record: FoodRecord): string {
  const parts = [formatRecordedAt(record.recordedAt)];
  if (record.sources.length) parts.push(record.sources.map((source) => MFC_SOURCE_LABELS[source]).join(', '));
  return parts.filter(Boolean).join(' · ');
}

/** Records for the current site. Tap opens a draft for editing, or a saved record on its Summary. */
export function RecentRecordsScreen() {
  const layout = useResponsiveLayout();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { submitting, withLock } = useSubmitLock();

  const draftSiteId = useMakeFoodCountStore((state) => state.siteId);
  const sites = useSitesStore((state) => state.sites);
  const siteId = draftSiteId ?? (sites.length === 1 && Number(sites[0]?.id) > 0 ? Number(sites[0].id) : undefined);

  const [records, setRecords] = useState<FoodRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await makeFoodCountService.listRecords({ siteId, limit: PAGE_SIZE });
      setRecords(page.items);
      setNextCursor(page.nextCursor);
    } catch (e) {
      setError(readMfcError(e).message);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await makeFoodCountService.listRecords({ siteId, limit: PAGE_SIZE, cursor: nextCursor });
      setRecords((current) => [...current, ...page.items.filter((item) => !current.some((row) => row.id === item.id))]);
      setNextCursor(page.nextCursor);
    } catch (e) {
      setError(readMfcError(e).message);
    } finally {
      setLoadingMore(false);
    }
  };

  const open = (record: FoodRecord) =>
    withLock(async () => {
      setError(null);
      // Opening a record replaces the open draft, so make sure the server has the draft first.
      const synced = await useMakeFoodCountStore.getState().flushNow();
      if (!synced) {
        setError("Your current draft hasn't synced yet. Try again once you're back online.");
        return;
      }
      const detail = await useMakeFoodCountStore.getState().loadRecord(record.id);
      if (!detail) {
        setError(useMakeFoodCountStore.getState().lastError ?? "We couldn't open that record. Please try again.");
        return;
      }
      navigation.navigate(detail.record.status === 'DRAFT' ? 'MfcRecord' : 'MfcSummary');
    });

  return (
    <Screen transparentTop backgroundColor={MFC.page}>
      <View
        style={[
          styles.page,
          { paddingHorizontal: layout.pagePadH, maxWidth: layout.contentMaxWidth, paddingTop: layout.space(8, 12), paddingBottom: layout.space(32, 40) },
        ]}
      >
        <MfcPageTitle
          back={{ onPress: () => navigation.goBack() }}
          title="Recent records"
          subtitle="Open a record to review it or keep editing. Drafts continue on the recording screen."
        />

        {error ? <MfcNotice tone="danger" title={error} /> : null}

        {loading && records.length === 0 ? (
          <>
            <MfcSkeleton lines={2} />
            <MfcSkeleton lines={2} />
          </>
        ) : records.length === 0 && !error ? (
          <MfcEmpty
            icon="document-text-outline"
            title="No records yet"
            body="Records you save or start will show up here."
          />
        ) : (
          <View style={styles.list}>
            {records.map((record) => {
              const draft = record.status === 'DRAFT';
              const totalKg = record.totals?.totalKg ?? 0;
              return (
                <MfcNavRow
                  key={record.id}
                  icon={draft ? 'create-outline' : 'document-text-outline'}
                  title={`${formatKg(totalKg)} recorded`}
                  subtitle={recordSubtitle(record)}
                  right={
                    <MfcBadge
                      label={draft ? 'Draft' : 'Saved'}
                      color={draft ? '#94500A' : palette.kale}
                      background={draft ? '#FFF1E0' : mfcUi.kaleTint}
                    />
                  }
                  onPress={() => {
                    if (!submitting) void open(record);
                  }}
                />
              );
            })}
            {nextCursor ? (
              <MfcCta label="Load more" variant="secondary" loading={loadingMore} onPress={() => void loadMore()} />
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    alignSelf: 'center',
    gap: normalize(12),
  },
  list: { gap: normalize(10) },
});

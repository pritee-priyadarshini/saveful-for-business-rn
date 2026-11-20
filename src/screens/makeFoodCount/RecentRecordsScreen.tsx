import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useFocusEffect, useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import {
  MfcCta,
  MfcEmpty,
  MfcNotice,

  MfcSkeleton,
} from '@/components/makeFoodCount/MfcAppUi';
import { Screen } from '@/components/Screen';
import { MFC } from '@/constants/makeFoodCount';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { showConfirmAlert } from '@/store/appAlertStore';
import { makeFoodCountService, readMfcError } from '@/services/makeFoodCount.service';
import { useMakeFoodCountStore } from '@/store/makeFoodCountStore';
import { useSitesStore } from '@/store/sitesStore';
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
        const draft = useMakeFoodCountStore.getState();
        if (draft.writeBlocked) {
          // The server will never take that draft from this account (not allowed, or it's gone),
          // so it must not block opening anything else. It stays on the server as it was.
          draft.clearDraft();
        } else if (draft.syncStatus === 'offline') {
          setError("Your current draft hasn't synced yet. Try again once you're back online.");
          return;
        } else {
          setError(draft.lastError ?? "Your current draft couldn't be saved. Open it to check it, then try again.");
          return;
        }
      }
      const detail = await useMakeFoodCountStore.getState().loadRecord(record.id);
      if (!detail) {
        setError(useMakeFoodCountStore.getState().lastError ?? "We couldn't open that record. Please try again.");
        return;
      }
      // Drafts continue recording; finished records open read-only (no "what next?" again).
      if (detail.record.status === 'DRAFT') navigation.navigate('MfcRecord');
      else navigation.navigate('MfcSummary', { mode: 'view' });
    });

  const [deletingId, setDeletingId] = useState<number | null>(null);

  /** Ask first; deleting a draft cannot be undone. */
  const confirmDelete = (record: FoodRecord, onCancel?: () => void) => {
    // The app's own confirm modal (same as everywhere else), in its destructive style.
    showConfirmAlert({
      title: 'Delete this draft?',
      message: `${formatKg(record.totals?.totalKg ?? 0)} recorded on ${formatRecordedAt(record.recordedAt)}. This can't be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Keep draft',
      destructive: true,
      onConfirm: () => deleteDraft(record, onCancel),
      onCancel,
    });
  };

  const deleteDraft = async (record: FoodRecord, onFail?: () => void) => {
    setError(null);
    setDeletingId(record.id);
    try {
      await makeFoodCountService.deleteRecord(record.id);
      setRecords((current) => current.filter((row) => row.id !== record.id));
      // The open draft on this phone was the one deleted: start fresh next time.
      if (useMakeFoodCountStore.getState().recordId === record.id) useMakeFoodCountStore.getState().clearDraft();
    } catch (e) {
      const info = readMfcError(e);
      const routeMissing = info.status === 404 && /^Cannot DELETE/i.test(info.message);
      if (info.status === 404 && !routeMissing) {
        // Already gone (deleted on another phone): the list just catches up.
        setRecords((current) => current.filter((row) => row.id !== record.id));
        if (useMakeFoodCountStore.getState().recordId === record.id) useMakeFoodCountStore.getState().clearDraft();
        return;
      }
      setError(
        info.status === 403
          ? `Only people who work at ${record.siteName || 'this site'} can delete its drafts. You can still open it to look at it.`
          : routeMissing
            ? "Deleting drafts needs the latest server update. Please try again after it's deployed."
            : info.message,
      );
      onFail?.();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Screen transparentTop backgroundColor={MFC.page}>
      <View
        style={[
          styles.page,
          { paddingHorizontal: layout.pagePadH, maxWidth: layout.contentMaxWidth, paddingTop: layout.space(16, 20), paddingBottom: layout.space(32, 40) },
        ]}
      >
        <AppText variant="body1" color={MFC.muted}>
          Open a record to review it or keep editing. Swipe a draft left, or press and hold it, to delete it.
        </AppText>

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
            {records.map((record) => (
              <RecordRow
                key={record.id}
                record={record}
                deleting={deletingId === record.id}
                onOpen={() => {
                  if (!submitting) void open(record);
                }}
                onDelete={(reset) => confirmDelete(record, reset)}
              />
            ))}
            {nextCursor ? (
              <MfcCta label="Load more" variant="secondary" loading={loadingMore} onPress={() => void loadMore()} />
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}

// ─── Row: swipe left (drafts) for Delete, or press and hold ─────────────────

const DELETE_WIDTH = 88;

function RecordRow({
  record,
  deleting,
  onOpen,
  onDelete,
}: {
  record: FoodRecord;
  deleting: boolean;
  onOpen: () => void;
  /** `reset` closes the swipe again if the user cancels. */
  onDelete: (reset: () => void) => void;
}) {
  const swipe = useRef<SwipeableMethods | null>(null);
  const draft = record.status === 'DRAFT';
  const totalKg = record.totals?.totalKg ?? 0;
  const reset = () => swipe.current?.close();

  const row = (
    <Pressable
      onPress={onOpen}
      onLongPress={
        draft
          ? () => onDelete(reset)
          : undefined
      }
      delayLongPress={450}
      accessibilityRole="button"
      accessibilityLabel={`${formatKg(totalKg)} recorded, ${recordSubtitle(record)}, ${draft ? 'draft' : 'saved'}`}
      accessibilityHint={draft ? 'Opens the draft. Press and hold to delete it.' : 'Opens the record summary.'}
      accessibilityActions={draft ? [{ name: 'delete', label: 'Delete draft' }] : undefined}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'delete') onDelete(reset);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={draft ? 'create-outline' : 'document-text-outline'} size={normalize(20)} color={MFC.purple} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyBold" color={MFC.purple} numberOfLines={1}>
          {`${formatKg(totalKg)} recorded`}
        </AppText>
        <AppText variant="meta" color={MFC.muted} numberOfLines={2}>
          {recordSubtitle(record)}
        </AppText>
        <View style={[styles.pill, draft ? styles.pillDraft : styles.pillSaved]}>
          <View style={[styles.pillDot, { backgroundColor: draft ? '#E8932B' : '#2E9E5B' }]} />
          <AppText variant="meta" color={draft ? '#94500A' : MFC.greenText} style={styles.pillText}>
            {draft ? 'Draft · tap to continue' : 'Saved'}
          </AppText>
        </View>
      </View>
      {deleting ? (
        <ActivityIndicator color={MFC.purple} />
      ) : (
        <Ionicons name="chevron-forward" size={normalize(16)} color={MFC.purple} />
      )}
    </Pressable>
  );

  if (!draft) return row;

  return (
    <Swipeable
      ref={swipe}
      friction={2}
      rightThreshold={DELETE_WIDTH / 2}
      overshootRight={false}
      containerStyle={styles.swipeContainer}
      renderRightActions={() => (
        <Pressable
          onPress={() => onDelete(reset)}
          accessibilityRole="button"
          accessibilityLabel="Delete draft"
          style={({ pressed }) => [styles.deleteAction, pressed && styles.pressed]}
        >
          <Ionicons name="trash-outline" size={normalize(22)} color="#FFFFFF" />
          <AppText variant="meta" color="#FFFFFF" style={styles.deleteText}>
            Delete
          </AppText>
        </Pressable>
      )}
    >
      {row}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.88 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: normalize(14),
    backgroundColor: MFC.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MFC.panelBorder,
  },
  rowIcon: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: 10,
    backgroundColor: MFC.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeContainer: { borderRadius: 14 },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 6,
  },
  pillDraft: { backgroundColor: '#FFF4E5' },
  pillSaved: { backgroundColor: MFC.doneBg },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontFamily: 'Saveful-SemiBold', fontSize: normalize(13) },
  deleteAction: {
    width: DELETE_WIDTH,
    marginLeft: 8,
    borderRadius: 14,
    backgroundColor: '#D93A2B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  deleteText: { fontFamily: 'Saveful-Bold' },
  page: {
    width: '100%',
    alignSelf: 'center',
    gap: normalize(12),
  },
  list: { gap: normalize(10) },
});

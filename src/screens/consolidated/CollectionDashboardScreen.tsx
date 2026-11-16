import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { ActionButton as Button } from '@/components/consolidated/ui';
import { Screen } from '@/components/Screen';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { SavefulModal } from '@/components/SavefulModal';
import { CollectionStatusBadge } from '@/components/consolidated/CollectionStatusBadge';
import { CollectionTimesCard } from '@/components/consolidated/CollectionTimesCard';
import { ContributionRow } from '@/components/consolidated/ContributionRow';
import { ReceiptSheet } from '@/components/consolidated/ReceiptSheet';
import {
  Divider, IconBubble, InfoRow, Notice, Pill, ProgressBar, SectionTitle, Stat, StatGrid, Surface, cc,
} from '@/components/consolidated/ui';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { consolidatedService } from '@/services/consolidated.service';
import { showConfirmAlert } from '@/store/appAlertStore';
import { palette } from '@/theme/colors';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import {
  exceptionLabel, formatDateInZone, formatInTimezone, formatKg, formatTimeInZone, methodLabel, pickupInLabel,
  zonedDateTimeToUtc, toHHmm,
} from '@/utils/consolidated';
import { normalize } from '@/utils/responsive';
import type { AuditEntry, ChangeRequest, CollectionDashboard, DashboardContribution } from '@/types/consolidated';
import { AppDateTimePicker, type DateTimePickerEvent } from '@/components/AppDateTimePicker';

const POLL_STATUSES = ['OPEN', 'SUBMISSIONS_CLOSED', 'PUBLISHED', 'CLAIMED'];

export function CollectionDashboardScreen() {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const collectionId = Number(route.params?.collectionId);
  const [data, setData] = useState<CollectionDashboard | null>(null);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menu, setMenu] = useState(false);
  const [receipt, setReceipt] = useState<DashboardContribution | null>(null);
  const [reason, setReason] = useState<{ title: string; onSubmit: (text: string) => Promise<void> } | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const [reopen, setReopen] = useState(false);
  const [reopenTime, setReopenTime] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const dashboard = await consolidatedService.getCollection(collectionId);
      setData(dashboard);
      if (dashboard.permissions?.canManage) {
        const pending = await consolidatedService.listChangeRequests(collectionId).catch(() => []);
        setChanges(pending.filter((row) => !row.status || row.status === 'PENDING' || row.status === 'PENDING_APPROVAL'));
      }
    } catch (error) {
      showErrorAlert(error, 'Could not load collection');
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => {
        setData((current) => {
          if (current && POLL_STATUSES.includes(current.status)) void load();
          return current;
        });
      }, 30000);
      return () => clearInterval(timer);
    }, [load]),
  );

  const askReason = (title: string, onSubmit: (text: string) => Promise<void>) => {
    setReasonText('');
    setReason({ title, onSubmit });
  };

  if (loading || !data) {
    return (
      <Screen backgroundColor={palette.creme} transparentTop>
        <StackHeroHeader title="Collection" />
        <ActivityIndicator color={palette.kale} style={{ marginTop: 24 }} />
      </Screen>
    );
  }

  const canManage = Boolean(data.permissions?.canManage);
  const canReceive = Boolean(data.permissions?.canReceive || canManage);
  const blockers = data.permissions?.publishBlockers || [];
  const internal = data.method === 'INTERNAL_COLLECTION';
  // Decisions only while they can still change something: once food has left the
  // collection point (or the collection is over) there is nothing left to approve.
  const closedForChanges = ['AWAITING_ITEM_CHECK', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(data.status);
  const late = closedForChanges ? [] : data.contributions.filter((row) => row.status === 'LATE_PENDING_APPROVAL');
  const openChanges = closedForChanges ? [] : changes;
  const visibleRows = data.contributions.filter((row) => row.status !== 'NO_CONTRIBUTION');
  const exceptionRows = data.contributions.flatMap((row) =>
    (row.exceptions || [])
      .filter((code) => code !== 'LATE' || row.status !== 'LATE_PENDING_APPROVAL')
      .map((code) => ({ id: row.id, site: row.site.name, label: exceptionText(code, data.method) })),
  );
  const participating = data.counts?.participating ?? 0;
  const listed = data.counts?.submitted ?? 0;
  const receiptOpen = !['PUBLISHED', 'CLAIMED', 'AWAITING_ITEM_CHECK', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(data.status);

  const closeSubmissions = () => {
    const missing = data.sitesWithoutContribution?.length || 0;
    showConfirmAlert({
      title: 'Close submissions now?',
      message: missing
        ? `${missing} site${missing === 1 ? ' has' : 's have'} not listed food and will be recorded as no contribution.`
        : 'Sites will not be able to add food after this.',
      confirmLabel: 'Close submissions',
      onConfirm: async () => {
        try {
          await consolidatedService.closeSubmissions(data.id);
          showSuccessAlert('Submissions are closed. Record what arrives, then publish.', 'Closed');
          await load();
        } catch (error) {
          showErrorAlert(error, 'Could not close submissions');
        }
      },
    });
  };

  const menuItems: { icon: keyof typeof Ionicons.glyphMap; label: string; danger?: boolean; onPress: () => void }[] = [
    {
      icon: 'create-outline',
      label: 'Edit this collection',
      onPress: () => navigation.navigate('ScheduleCollection', { mode: 'editOccurrence', collectionId: data.id, groupId: data.group.id }),
    },
    ...(data.scheduleId
      ? [{
          icon: 'repeat-outline' as const,
          label: 'Edit the whole series',
          onPress: () => navigation.navigate('ScheduleCollection', { mode: 'editSeries', scheduleId: data.scheduleId, groupId: data.group.id }),
        }]
      : []),
    ...(data.status === 'SUBMISSIONS_CLOSED'
      ? [{ icon: 'lock-open-outline' as const, label: 'Reopen submissions', onPress: () => setReopen(true) }]
      : []),
    {
      icon: 'list-outline',
      label: 'View audit trail',
      onPress: () => {
        void consolidatedService.getAudit(data.id).then(setAudit).catch((error) => showErrorAlert(error, 'Could not load audit'));
      },
    },
    ...(!['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(data.status)
      ? [{
          icon: 'close-circle-outline' as const,
          label: 'Cancel collection',
          danger: true,
          onPress: () => askReason('Cancel collection', async (text) => {
            await consolidatedService.cancelCollection(data.id, text);
            showSuccessAlert('Sites and any charity have been told. Listed food will not become direct listings.', 'Cancelled');
            await load();
          }),
        }]
      : []),
  ];

  return (
    <Screen
      scrollable
      backgroundColor={palette.creme}
      transparentTop
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={palette.primary} onRefresh={() => { setRefreshing(true); load().finally(() => setRefreshing(false)); }} />}
    >
      <StackHeroHeader
        title={formatDateInZone(data.scheduledDate || data.times.pickupStartAt, data.timezone)}
        subtitle={`${data.group.name} · ${data.point.name}`}
        right={canManage ? (
          <Pressable onPress={() => setMenu(true)} hitSlop={10} style={styles.menuBtn} accessibilityLabel="Collection options">
            <Ionicons name="ellipsis-horizontal" size={normalize(20)} color={palette.white} />
          </Pressable>
        ) : undefined}
      />

      <View style={styles.body}>
        {/* Overview */}
        <Surface style={styles.gap12}>
          <View style={styles.rowBetween}>
            <CollectionStatusBadge status={data.status} />
            <Pill
              label={methodLabel(data.method)}
              color={palette.primary}
              background={palette.creme3}
              icon={internal ? 'walk-outline' : 'archive-outline'}
            />
          </View>
          {data.counts ? (
            <>
              <View style={styles.rowBetween}>
                <AppText variant="bodyBold">Sites listed</AppText>
                <AppText variant="bodyBold" color={palette.kale}>{listed} of {participating}</AppText>
              </View>
              <ProgressBar value={listed} total={participating} />
              <StatGrid>
                <Stat label="Listed" value={formatKg(data.totals?.submittedKg)} unit="kg" icon="basket-outline" />
                <Stat label="Verified at the point" value={formatKg(data.totals?.verifiedKg)} unit="kg" icon="shield-checkmark-outline" />
                <Stat
                  label={internal ? 'Collected from sites' : 'Dropped off'}
                  value={String(data.counts.handedOver)}
                  unit={`of ${listed}`}
                  icon={internal ? 'walk-outline' : 'archive-outline'}
                  background={palette.creme3}
                  accent={palette.primary}
                />
                <Stat
                  label="Received at point"
                  value={String(data.counts.received)}
                  unit={`of ${listed}`}
                  icon="checkmark-done-outline"
                  background={palette.creme3}
                  accent={palette.primary}
                />
              </StatGrid>
            </>
          ) : null}
        </Surface>

        {/* What happens next */}
        <NextStep
          data={data}
          canManage={canManage}
          blockers={blockers}
          onClose={closeSubmissions}
          onReview={() => navigation.navigate('ReviewPublish', { collectionId: data.id })}
          onReport={() => navigation.navigate('ConsolidatedReport', { groupId: data.group.id })}
        />

        {/* Needs a decision */}
        {(late.length || openChanges.length) && canManage ? (
          <>
            <SectionTitle title="Needs your decision" />
            {late.map((row) => (
              <Notice
                key={`late-${row.id}`}
                icon="time-outline"
                title={`${row.site.name} listed after the deadline`}
                body={`${formatKg(row.items.reduce((sum, item) => sum + Number(item.submittedQtyKg || 0), 0))} kg — approve to include it in this collection.`}
              >
                <View style={styles.actions}>
                  <Button label="Approve" size="compact" icon="checkmark" style={styles.flex} onPress={() => {
                    void consolidatedService.approveLate(row.id).then(() => load()).catch((error) => showErrorAlert(error, 'Could not approve'));
                  }} />
                  <Button label="Reject" size="compact" variant="secondary" style={styles.flex} onPress={() => askReason('Reject late listing', async (text) => {
                    await consolidatedService.rejectLate(row.id, text);
                    await load();
                  })} />
                </View>
              </Notice>
            ))}
            {openChanges.map((change) => (
              <Notice key={`chg-${change.id}`} icon="git-compare-outline" title={`${change.siteName || 'A site'} requested a change`} body={change.summary}>
                <View style={styles.actions}>
                  <Button label="Approve" size="compact" icon="checkmark" style={styles.flex} onPress={() => {
                    void consolidatedService.approveChangeRequest(change.id).then(() => load()).catch((error) => showErrorAlert(error, 'Could not approve'));
                  }} />
                  <Button label="Reject" size="compact" variant="secondary" style={styles.flex} onPress={() => askReason('Reject change', async (text) => {
                    await consolidatedService.rejectChangeRequest(change.id, text);
                    await load();
                  })} />
                </View>
              </Notice>
            ))}
          </>
        ) : null}

        {/* Sites */}
        <SectionTitle
          title="Participating sites"
          caption={canReceive && receiptOpen ? 'Tap a site to see its food. Record what physically arrives at the point.' : null}
        />
        {visibleRows.length === 0 ? (
          <Surface tone="muted">
            <AppText variant="bodySmall" color={palette.stone}>No site has listed food yet.</AppText>
          </Surface>
        ) : null}
        {visibleRows.map((row) => (
          <ContributionRow
            key={row.id}
            contribution={row}
            timezone={data.timezone}
            method={data.method}
            canReceive={canReceive && receiptOpen && !['COMPLETED', 'CANCELLED', 'EXCLUDED', 'WITHDRAWN'].includes(row.status)}
            canManage={canManage && ['OPEN', 'SUBMISSIONS_CLOSED'].includes(data.status)}
            onReceipt={() => setReceipt(row)}
            onExclude={() => askReason(`Exclude ${row.site.name}`, async (text) => {
              await consolidatedService.excludeContribution(row.id, text);
              await load();
            })}
          />
        ))}

        {/* Exceptions and reminders */}
        {exceptionRows.length || data.sitesWithoutContribution?.length ? (
          <>
            <SectionTitle title="Exceptions and reminders" />
            <Surface tone="warn" style={styles.gap10}>
              {exceptionRows.map((row) => (
                <View key={`${row.id}-${row.label}`} style={styles.exceptionRow}>
                  <Ionicons name="alert-circle" size={normalize(16)} color={cc.warnText} />
                  <AppText variant="bodySmall" style={styles.flex}>
                    <AppText variant="bodySmall" style={styles.strong}>{row.site}</AppText> · {row.label}
                  </AppText>
                </View>
              ))}
              {data.sitesWithoutContribution?.length ? (
                <View style={styles.exceptionRow}>
                  <Ionicons name="ellipse-outline" size={normalize(16)} color={cc.warnText} />
                  <AppText variant="bodySmall" style={styles.flex}>
                    <AppText variant="bodySmall" style={styles.strong}>
                      {data.status === 'OPEN' || data.status === 'SCHEDULED' ? 'Not listed yet' : 'No contribution'}
                    </AppText>
                    {' · '}{data.sitesWithoutContribution.map((site) => site.name).join(', ')}
                  </AppText>
                </View>
              ) : null}
              {canManage && data.status === 'OPEN' && data.sitesWithoutContribution?.length ? (
                <Button
                  label="Send reminder"
                  size="compact"
                  variant="secondary"
                  icon="notifications-outline"
                  onPress={() => {
                    void consolidatedService
                      .remindSites(data.id)
                      .then(() => showSuccessAlert('Sites that have not listed food were reminded.', 'Sent'))
                      .catch((error) => showErrorAlert(error, 'Could not send reminder'));
                  }}
                />
              ) : null}
            </Surface>
          </>
        ) : null}

        {/* Logistics */}
        <SectionTitle title="Logistics" />
        <CollectionTimesCard method={data.method} timezone={data.timezone} times={data.times} status={data.status} />
        <Surface style={styles.gap10}>
          <InfoRow
            icon="location-outline"
            label="Shared collection point"
            value={data.point.name}
            sub={[data.point.address, data.point.directions].filter(Boolean).join(' · ')}
          />
          {data.contact?.name ? (
            <>
              <Divider />
              <InfoRow
                icon="call-outline"
                label="On-site contact"
                value={
                  <Pressable onPress={() => { if (data.contact?.phone) void Linking.openURL(`tel:${data.contact.phone}`); }}>
                    <AppText variant="bodyBold">{data.contact.name}</AppText>
                    {data.contact.phone ? <AppText variant="bodySmall" color={palette.primary}>{data.contact.phone}</AppText> : null}
                  </Pressable>
                }
              />
            </>
          ) : null}
          {data.suitabilityNotes ? (
            <>
              <Divider />
              <InfoRow icon="shield-checkmark-outline" label="Food suitability" value={data.suitabilityNotes} />
            </>
          ) : null}
          {data.instructions ? (
            <>
              <Divider />
              <InfoRow icon="document-text-outline" label="Instructions" value={data.instructions} />
            </>
          ) : null}
        </Surface>
      </View>

      <ReceiptSheet
        contribution={receipt}
        onClose={() => setReceipt(null)}
        onSubmit={async (payload) => {
          if (!receipt) return;
          try {
            await consolidatedService.recordReceipt(receipt.id, payload);
            setReceipt(null);
            showSuccessAlert('Receipt recorded.', 'Saved');
            await load();
          } catch (error) {
            showErrorAlert(error, 'Could not record receipt');
          }
        }}
      />

      <SavefulModal visible={menu} onClose={() => setMenu(false)} title="Collection options">
        <View style={styles.menu}>
          {menuItems.map((item) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.85 }]}
              onPress={() => { setMenu(false); item.onPress(); }}
            >
              <IconBubble
                name={item.icon}
                size={36}
                color={item.danger ? palette.danger : palette.kale}
                background={item.danger ? cc.dangerBg : cc.tint}
              />
              <AppText variant="bodyBold" color={item.danger ? palette.danger : palette.black} style={styles.flex}>
                {item.label}
              </AppText>
              <Ionicons name="chevron-forward" size={normalize(16)} color={palette.stone} />
            </Pressable>
          ))}
        </View>
      </SavefulModal>

      <SavefulModal visible={reason != null} onClose={() => setReason(null)} title={reason?.title || 'Reason'}>
        <AppText variant="meta" color={palette.stone}>Saved in the audit trail and shared with the people affected.</AppText>
        <TextInput value={reasonText} onChangeText={setReasonText} placeholder="Add a reason" placeholderTextColor={palette.stone} style={styles.input} multiline />
        <Button label="Confirm" disabled={!reasonText.trim()} onPress={() => {
          if (!reasonText.trim() || !reason) return;
          void reason.onSubmit(reasonText.trim()).then(() => setReason(null)).catch((error) => showErrorAlert(error, 'Could not save'));
        }} />
      </SavefulModal>

      <SavefulModal visible={audit != null} onClose={() => setAudit(null)} title="Audit trail">
        <View style={styles.auditList}>
          {(audit || []).map((entry, index) => (
            <View key={`${entry.id || index}`} style={styles.auditRow}>
              <View style={styles.auditDot} />
              <View style={styles.flex}>
                <AppText variant="bodySmall">{entry.action}</AppText>
                <AppText variant="meta" color={palette.stone}>
                  {[entry.actor, entry.at ? formatInTimezone(entry.at, data.timezone) : null].filter(Boolean).join(' · ')}
                </AppText>
              </View>
            </View>
          ))}
          {audit && audit.length === 0 ? <AppText variant="bodySmall" color={palette.stone}>No audit entries yet.</AppText> : null}
        </View>
      </SavefulModal>

      <SavefulModal visible={reopen} onClose={() => setReopen(false)} title="Reopen submissions">
        <AppText variant="bodySmall" color={palette.stone}>
          Sites can list food again until this time — no later than {formatTimeInZone(data.times.handoverEndAt, data.timezone)}.
        </AppText>
        <AppDateTimePicker
          mode="time"
          value={reopenTime}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_event: DateTimePickerEvent, date?: Date) => { if (date) setReopenTime(date); }}
        />
        <Button label="Reopen" onPress={() => {
          void (async () => {
            try {
              const key = (data.scheduledDate || data.times.handoverEndAt || '').slice(0, 10);
              const until = zonedDateTimeToUtc(key, toHHmm(reopenTime), data.timezone);
              if (data.times.handoverEndAt && new Date(until).getTime() > new Date(data.times.handoverEndAt).getTime()) {
                showErrorAlert('Reopen time must be at or before handover ends.', 'Too late');
                return;
              }
              await consolidatedService.reopenSubmissions(data.id, until);
              setReopen(false);
              showSuccessAlert('Submissions reopened.', 'Updated');
              await load();
            } catch (error) {
              showErrorAlert(error, 'Could not reopen');
            }
          })();
        }} />
      </SavefulModal>
    </Screen>
  );
}

/** One clear "what happens now" card, driven by the collection's status. */
function NextStep({
  data, canManage, blockers, onClose, onReview, onReport,
}: {
  data: CollectionDashboard;
  canManage: boolean;
  blockers: string[];
  onClose: () => void;
  onReview: () => void;
  onReport: () => void;
}) {
  const tz = data.timezone;
  switch (data.status) {
    case 'SCHEDULED':
      return (
        <StepCard icon="calendar-outline" title="Scheduled"
          body={`Sites can start listing food from ${formatInTimezone(data.times.opensAt, tz)}.`} />
      );
    case 'OPEN':
      return (
        <StepCard icon="restaurant-outline" title="Sites are listing food"
          body={`Listing closes at ${formatTimeInZone(data.times.submissionsCloseAt, tz)}. Then record what arrives and publish.`}>
          {canManage ? <Button label="Close submissions now" variant="secondary" icon="lock-closed-outline" onPress={onClose} /> : null}
        </StepCard>
      );
    case 'SUBMISSIONS_CLOSED':
      return (
        <StepCard
          icon="clipboard-outline"
          title={canManage ? 'Check the food, then publish' : 'Record what arrived'}
          body={canManage
            ? 'Record what arrived from each site. When nothing is blocking, review the food and publish one listing to charities.'
            : 'Confirm what physically arrived from each site below.'}
        >
          {canManage ? (
            <>
              {blockers.length ? (
                <View style={styles.blockers}>
                  {blockers.map((message) => (
                    <View key={message} style={styles.exceptionRow}>
                      <Ionicons name="close-circle" size={normalize(16)} color={palette.danger} />
                      <AppText variant="bodySmall" color={palette.midgray} style={styles.flex}>{message}</AppText>
                    </View>
                  ))}
                </View>
              ) : null}
              <Button label="Review food & publish" icon="megaphone-outline" onPress={onReview} disabled={blockers.length > 0} />
            </>
          ) : null}
        </StepCard>
      );
    case 'PUBLISHED':
      return (
        <StepCard icon="megaphone-outline" title="Published — waiting for a charity"
          body={`Charities nearby can now claim ${formatKg(data.totals?.verifiedKg)} kg. Pickup ${formatTimeInZone(data.times.pickupStartAt, tz)} – ${formatTimeInZone(data.times.pickupEndAt, tz)}.`} />
      );
    case 'CLAIMED':
      return (
        <StepCard icon="heart-outline" title={`${data.claim?.charityName || 'A charity'} will collect`}>
          <InfoRow
            icon="time-outline"
            label="Pickup window"
            value={`${formatTimeInZone(data.times.pickupStartAt, tz)} – ${formatTimeInZone(data.times.pickupEndAt, tz)}`}
            sub={pickupInLabel(data.times.pickupStartAt)}
          />
          {data.claim?.driverPickup?.status ? (
            <InfoRow
              icon="car-outline"
              label="Driver"
              value={data.claim.driverPickup.driverName || 'Assigned'}
              sub={data.claim.driverPickup.status.charAt(0) + data.claim.driverPickup.status.slice(1).toLowerCase().replace(/_/g, ' ')}
            />
          ) : (
            <InfoRow icon="walk-outline" label="Collection" value="The charity is collecting in person" />
          )}
        </StepCard>
      );
    case 'AWAITING_ITEM_CHECK':
      return (
        <StepCard icon="hourglass-outline" title="Collected — waiting for the charity's check"
          body="The charity is confirming what it accepted. Site impact is recorded once it does." />
      );
    case 'COMPLETED':
      return (
        <StepCard icon="trophy-outline" title="Completed">
          <StatGrid>
            <Stat label="Accepted" value={formatKg(data.totals?.acceptedKg)} unit="kg" icon="checkmark-circle-outline" />
            <Stat label="Not accepted" value={formatKg(data.totals?.rejectedKg)} unit="kg" icon="close-circle-outline"
              background={cc.warnBg} accent={cc.warnText} />
            <Stat label="Not available" value={formatKg(data.totals?.unavailableKg)} unit="kg" icon="help-circle-outline"
              background={cc.muted} accent={palette.stone} />
          </StatGrid>
          <Pressable onPress={onReport} style={({ pressed }) => [styles.reportLink, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <Ionicons name="bar-chart-outline" size={normalize(18)} color={palette.primary} />
            <AppText variant="bodyBold" color={palette.primary} style={styles.flex}>View full report</AppText>
            <Ionicons name="chevron-forward" size={normalize(16)} color={palette.primary} />
          </Pressable>
        </StepCard>
      );
    case 'CANCELLED':
      return <Notice tone="muted" icon="close-circle-outline" title="Cancelled" body={data.cancelReason || null} />;
    case 'EXPIRED':
      return <Notice tone="muted" icon="time-outline" title="Expired" body="The pickup window ended without a charity collection." />;
    default:
      return null;
  }
}

function StepCard({
  icon, title, body, children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <Surface tone="tint" style={styles.gap12}>
      <View style={styles.stepHead}>
        <IconBubble name={icon} color={palette.white} background={palette.kale} />
        <View style={styles.flex}>
          <AppText variant="subheading">{title}</AppText>
        </View>
      </View>
      {body ? <AppText variant="bodySmall" color={palette.midgray}>{body}</AppText> : null}
      {children}
    </Surface>
  );
}

function exceptionText(code: string, method: CollectionDashboard['method']): string {
  switch (code.toUpperCase()) {
    case 'OVERDUE':
      return method === 'INTERNAL_COLLECTION' ? 'Not collected by the deadline' : 'Not dropped off by the deadline';
    case 'LATE_HANDOVER':
      return method === 'INTERNAL_COLLECTION' ? 'Collected after the deadline' : 'Dropped off after the deadline';
    case 'NOT_RECEIVED':
      return 'Not received at the collection point';
    case 'LATE':
      return 'Listed after the deadline';
    case 'CHANGE_REQUESTED':
      return 'Change requested';
    default:
      return exceptionLabel(code);
  }
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: normalize(16), paddingTop: normalize(4), paddingBottom: normalize(40), gap: normalize(12) },
  flex: { flex: 1, minWidth: 0 },
  gap10: { gap: 10 },
  gap12: { gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyebrow: { letterSpacing: 0.8 },
  blockers: { gap: 8, backgroundColor: palette.white, borderRadius: cc.radiusSm, padding: 12 },
  exceptionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cc.tintBorder,
  },
  strong: { fontFamily: 'Saveful-SemiBold' },
  menuBtn: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  menu: { gap: 6, paddingBottom: 12 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: cc.hairline,
    borderRadius: cc.radiusSm,
    padding: 12,
    marginVertical: 12,
    color: palette.black,
    backgroundColor: palette.white,
    textAlignVertical: 'top',
  },
  auditList: { gap: 2, paddingBottom: 12 },
  auditRow: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  auditDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.kale, marginTop: 6 },
});

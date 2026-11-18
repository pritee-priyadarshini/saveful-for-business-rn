import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { ActionButton as Button } from '@/components/consolidated/ui';
import { Screen } from '@/components/Screen';
import { SavefulModal } from '@/components/SavefulModal';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { GuideHeaderRight, GuideTarget, tours, useScreenGuide } from '@/components/guide';
import { EmptyState, IconBubble, InfoRow, Pill, Surface, cc } from '@/components/consolidated/ui';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { consolidatedService } from '@/services/consolidated.service';
import { useConsolidatedStore } from '@/store/consolidatedStore';
import { palette } from '@/theme/colors';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import { formatInTimezone } from '@/utils/consolidated';
import { normalize } from '@/utils/responsive';
import type { SiteInvitation } from '@/types/consolidated';

/**
 * Canva CM1 — "invitation and accept process". A site only takes part in a
 * collection group once someone who runs it accepts here.
 */
export function ConsolidatedInvitationsScreen() {
  useTransparentStatusBar('light');
  const [rows, setRows] = useState<SiteInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [declining, setDeclining] = useState<SiteInvitation | null>(null);
  const [reason, setReason] = useState('');
  const guide = useScreenGuide(tours.invitationsTour, { ready: !loading && rows.length > 0 });
  const { withLock, submitting } = useSubmitLock();

  const load = useCallback(async () => {
    try {
      setRows(await consolidatedService.listInvitations());
    } catch (error) {
      showErrorAlert(error, 'Could not load invitations');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const afterAnswer = async () => {
    await load();
    // Access (e.g. open collections for this site) may have changed.
    void useConsolidatedStore.getState().fetchMe(true).catch(() => undefined);
  };

  const accept = (row: SiteInvitation) => void withLock(async () => {
    try {
      await consolidatedService.acceptInvitation(row.id);
      showSuccessAlert(
        `${row.site.name} is now part of ${row.group.name}. You'll be able to add food to its collections from List Surplus.`,
        'Invitation accepted',
      );
      await afterAnswer();
    } catch (error) {
      showErrorAlert(error, 'Could not accept');
    }
  });

  const decline = () => {
    const row = declining;
    if (!row) return;
    void withLock(async () => {
      try {
        await consolidatedService.declineInvitation(row.id, reason.trim() || undefined);
        setDeclining(null);
        showSuccessAlert('The group manager has been told.', 'Invitation declined');
        await afterAnswer();
      } catch (error) {
        showErrorAlert(error, 'Could not decline');
      }
    });
  };

  return (
    <Screen
      scrollable
      backgroundColor={palette.creme}
      transparentTop
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={palette.primary}
          onRefresh={() => { setRefreshing(true); load().finally(() => setRefreshing(false)); }}
        />
      }
    >
      <StackHeroHeader
        title="Collection invitations"
        subtitle="Join a shared collection point"
        right={rows.length ? <GuideHeaderRight onGuide={guide.start} /> : undefined}
      />
      <View style={styles.body}>
        {loading ? <ActivityIndicator color={palette.kale} style={styles.loader} /> : null}
        {!loading && rows.length === 0 ? (
          <EmptyState
            icon="mail-open-outline"
            title="You're all caught up"
            body="When a manager invites one of your sites to a shared collection, it appears here."
          />
        ) : null}
        {rows.map((row, index) => (
          <Surface key={row.id} style={styles.card}>
            <GuideTarget id="invites.card" disabled={index > 0} style={styles.cardTop}>
              <View style={styles.head}>
                <IconBubble name="git-merge-outline" size={44} />
                <View style={styles.flex}>
                  <Pill label={`For ${row.site.name}`} color={palette.kale} background={cc.tint} icon="storefront-outline" />
                  <AppText variant="subheading" style={styles.title}>{row.group.name}</AppText>
                  {row.group.description ? (
                    <AppText variant="bodySmall" color={palette.midgray}>{row.group.description}</AppText>
                  ) : null}
                </View>
              </View>

              <View style={styles.rows}>
                {row.group.point ? (
                  <InfoRow
                    icon="location-outline"
                    label="Shared collection point"
                    value={row.group.point.name}
                    sub={[row.group.point.address, row.group.point.directions].filter(Boolean).join(' · ')}
                  />
                ) : null}
                <InfoRow
                  icon="people-outline"
                  label="Who's involved"
                  value={`${row.group.siteCount} site${row.group.siteCount === 1 ? '' : 's'}`}
                  sub={row.group.managers.length ? `Managed by ${row.group.managers.join(', ')}` : null}
                />
                {row.invitedBy || row.invitedAt ? (
                  <InfoRow
                    icon="mail-outline"
                    label="Invited"
                    value={row.invitedBy || 'A manager'}
                    sub={row.invitedAt ? formatInTimezone(row.invitedAt, undefined) : null}
                  />
                ) : null}
              </View>
            </GuideTarget>

            <View style={styles.explain}>
              <Ionicons name="information-circle-outline" size={normalize(16)} color={palette.kale} />
              <AppText variant="meta" color={palette.midgray} style={styles.flex}>
                If you accept, your site can add surplus food to this group's collections from List Surplus.
                Your food still counts in your own site's impact.
              </AppText>
            </View>

            <GuideTarget id="invites.actions" disabled={index > 0} style={styles.actions}>
              <Button
                label="Decline"
                variant="secondary"
                onPress={() => { setReason(''); setDeclining(row); }}
                disabled={submitting}
                style={styles.flex}
              />
              <Button label="Accept" icon="checkmark" onPress={() => accept(row)} disabled={submitting} style={styles.flex} />
            </GuideTarget>
          </Surface>
        ))}
      </View>

      <SavefulModal visible={declining != null} onClose={() => setDeclining(null)} title="Decline invitation">
        <AppText variant="meta" color={palette.stone}>Optional — tell the manager why.</AppText>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Reason (optional)"
          placeholderTextColor={palette.stone}
          style={styles.input}
          multiline
        />
        <Button label="Decline" onPress={decline} loading={submitting} />
      </SavefulModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: normalize(16), paddingTop: normalize(4), paddingBottom: normalize(40), gap: normalize(12) },
  loader: { marginTop: 24 },
  flex: { flex: 1, minWidth: 0 },
  card: { gap: 14 },
  cardTop: { gap: 14 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { marginTop: 8 },
  rows: { gap: 12 },
  explain: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: cc.tint, borderRadius: cc.radiusSm, padding: 10 },
  actions: { flexDirection: 'row', gap: 8 },
  input: {
    minHeight: 80,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cc.hairline,
    borderRadius: cc.radiusSm,
    padding: 12,
    marginVertical: 10,
    color: palette.black,
    backgroundColor: palette.white,
    textAlignVertical: 'top',
  },
});

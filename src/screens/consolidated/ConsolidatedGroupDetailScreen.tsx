import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import {
  ActionButton as Button, Divider, HeaderAction, IconBubble, Notice, Pill, SectionTitle, Stat, StatGrid, Surface, cc,
} from '@/components/consolidated/ui';
import { GuideHeaderRight, GuideTarget, tours, useScreenGuide } from '@/components/guide';
import { useConsolidatedAccess } from '@/hooks/useConsolidatedAccess';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { consolidatedService } from '@/services/consolidated.service';
import { showConfirmAlert } from '@/store/appAlertStore';
import { palette } from '@/theme/colors';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import { formatDateInZone } from '@/utils/consolidated';
import { normalize } from '@/utils/responsive';
import type { ConsolidatedGroup } from '@/types/consolidated';

type SiteState = 'ACCEPTED' | 'PENDING' | 'DECLINED';

const SITE_STATE: Record<SiteState, { label: string; color: string; background: string }> = {
  ACCEPTED: { label: 'Taking part', color: palette.kale, background: cc.tint },
  PENDING: { label: 'Invited', color: cc.warnText, background: cc.warnBg },
  DECLINED: { label: 'Declined', color: palette.danger, background: cc.dangerBg },
};

/** A collection group, read only. Managers change it from Edit. */
export function ConsolidatedGroupDetailScreen() {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const groupId = Number(route.params?.groupId);
  const { canManage } = useConsolidatedAccess();
  const { submitting, withLock } = useSubmitLock();
  const [group, setGroup] = useState<ConsolidatedGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setGroup(await consolidatedService.getGroup(groupId));
    } catch (error) {
      showErrorAlert(error, 'Could not load group');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Reload on every visit, so changes saved in Edit show straight away.
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const archived = group ? !group.isActive : false;
  const editable = canManage && !archived;
  const guide = useScreenGuide(archived ? null : tours.groupDetailTour, { ready: !loading && group != null });

  const edit = () => navigation.navigate('ConsolidatedGroupForm', { groupId });

  const restore = () => {
    showConfirmAlert({
      title: 'Restore this group?',
      message: 'Its sites, collection points and people come back exactly as they were. Past collections stay in history — schedule new ones afterwards.',
      confirmLabel: 'Restore group',
      onConfirm: async () => {
        await withLock(async () => {
          try {
            await consolidatedService.restoreGroup(groupId);
            showSuccessAlert('The group is active again. Schedule a collection to start using it.', 'Group restored');
            await load();
          } catch (error) {
            showErrorAlert(error, 'Could not restore group');
          }
        });
      },
    });
  };

  if (loading || !group) {
    return (
      <Screen backgroundColor={palette.creme} transparentTop>
        <StackHeroHeader title="Collection group" />
        {loading ? <ActivityIndicator color={palette.kale} style={styles.loader} /> : null}
      </Screen>
    );
  }

  // Removed sites are history; a declined site still shows so the manager can invite it again.
  const sites = group.sites.filter((site) => !site.removedAt || site.invitationStatus === 'DECLINED');
  const stateOf = (site: ConsolidatedGroup['sites'][number]): SiteState =>
    site.invitationStatus === 'DECLINED' ? 'DECLINED' : site.invitationStatus === 'PENDING' ? 'PENDING' : 'ACCEPTED';
  const taking = sites.filter((site) => stateOf(site) === 'ACCEPTED').length;
  const invited = sites.filter((site) => stateOf(site) === 'PENDING').length;
  const activePoints = group.points.filter((point) => point.isActive !== false);
  const orderedPoints = [...activePoints, ...group.points.filter((point) => point.isActive === false)];
  const managerIds = new Set(group.managers.map((person) => person.id));

  return (
    <Screen
      scrollable
      backgroundColor={palette.creme}
      transparentTop
      contentStyle={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={palette.primary}
          onRefresh={() => { setRefreshing(true); load().finally(() => setRefreshing(false)); }}
        />
      }
    >
      <StackHeroHeader
        title={group.name}
        subtitle={archived ? 'Archived group · read only' : 'Collection group'}
        right={
          <GuideHeaderRight onGuide={guide.start}>
            {editable ? (
              <GuideTarget id="groupDetail.edit">
                <HeaderAction icon="create-outline" label="Edit" onPress={edit} />
              </GuideTarget>
            ) : null}
          </GuideHeaderRight>
        }
      />

      <View style={styles.body}>
        {archived ? (
          <Notice
            tone="muted"
            icon="archive-outline"
            title="This group is archived"
            body="It can't be scheduled or changed while archived. Its past collections, contributions and reports are kept."
          />
        ) : null}

        {/* Overview */}
        <GuideTarget id="groupDetail.overview">
          <Surface style={styles.gap12}>
            {group.description ? (
              <AppText variant="bodySmall" color={palette.midgray}>{group.description}</AppText>
            ) : null}
            <StatGrid>
              <Stat label="Sites taking part" value={String(taking)} icon="storefront-outline" />
              <Stat label="Invited" value={String(invited)} icon="mail-unread-outline" accent={cc.warnText} />
              <Stat label={activePoints.length === 1 ? 'Collection point' : 'Collection points'} value={String(activePoints.length)} icon="location-outline" />
            </StatGrid>
            <Divider />
            <View style={styles.row}>
              <Ionicons name="calendar-outline" size={normalize(16)} color={palette.kale} />
              <AppText variant="bodySmall" color={palette.midgray} style={styles.flex}>
                {group.nextCollection
                  ? `Next collection ${formatDateInZone(group.nextCollection.scheduledDate.slice(0, 10), group.timezone)}`
                  : 'No collections scheduled yet'}
              </AppText>
            </View>
          </Surface>
        </GuideTarget>

        {/* Collection points */}
        <GuideTarget id="groupDetail.points" style={styles.section}>
          <SectionTitle
            title={orderedPoints.length > 1 ? 'Collection points' : 'Collection point'}
            caption="Where every site brings its food, and where the charity collects."
          />
          <Surface style={styles.list}>
            {orderedPoints.length === 0 ? (
              <AppText variant="bodySmall" color={palette.stone}>No collection point yet.</AppText>
            ) : null}
            {orderedPoints.map((point, index) => {
              const active = point.isActive !== false;
              return (
                <View key={point.id}>
                  {index > 0 ? <Divider style={styles.divider} /> : null}
                  <View style={styles.pointRow}>
                    <IconBubble
                      name="location"
                      size={36}
                      color={active ? palette.kale : palette.stone}
                      background={active ? cc.tintStrong : cc.muted}
                    />
                    <View style={styles.flex}>
                      <View style={styles.titleRow}>
                        <AppText variant="bodyBold" style={styles.flex} color={active ? palette.black : palette.stone}>{point.name}</AppText>
                        {!active ? <Pill label="Inactive" color={palette.stone} background={cc.muted} /> : null}
                      </View>
                      <AppText variant="meta" color={palette.stone}>{point.address}</AppText>
                      {point.directions ? (
                        <View style={styles.directions}>
                          <Ionicons name="navigate-outline" size={normalize(13)} color={palette.midgray} />
                          <AppText variant="meta" color={palette.midgray} style={styles.flex}>{point.directions}</AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </Surface>
        </GuideTarget>

        {/* Sites */}
        <GuideTarget id="groupDetail.sites" style={styles.section}>
          <SectionTitle title="Sites" caption="The host site owns the one listing charities see." />
          <Surface style={styles.list}>
            {sites.length === 0 ? <AppText variant="bodySmall" color={palette.stone}>No sites yet.</AppText> : null}
            {sites.map((site, index) => {
              const state = SITE_STATE[stateOf(site)];
              const host = site.id === group.hostSite.id;
              return (
                <View key={site.id}>
                  {index > 0 ? <Divider style={styles.divider} /> : null}
                  <View style={styles.siteRow}>
                    <IconBubble name="storefront-outline" size={34} />
                    <View style={styles.flex}>
                      <AppText variant="bodyBold" numberOfLines={2}>{site.name}</AppText>
                      {host ? <AppText variant="meta" color={palette.kale}>Host site</AppText> : null}
                    </View>
                    <Pill label={state.label} color={state.color} background={state.background} dot />
                  </View>
                </View>
              );
            })}
          </Surface>
        </GuideTarget>

        {/* People */}
        <GuideTarget id="groupDetail.people" style={styles.section}>
          <SectionTitle title="People" caption="Who runs the collection on the day." />
          <Surface style={styles.gap12}>
            <PeopleGroup
              icon="briefcase-outline"
              title="Managers"
              hint="Schedule collections, approve changes and publish to charities."
              people={group.managers}
            />
            <Divider />
            <PeopleGroup
              icon="clipboard-outline"
              title="Receivers"
              hint="Confirm what arrives at the collection point."
              people={group.receivers}
              alsoManager={managerIds}
            />
          </Surface>
        </GuideTarget>

        {/* Actions */}
        {archived ? (
          canManage ? <Button label="Restore group" icon="refresh-outline" onPress={restore} loading={submitting} /> : null
        ) : (
          <GuideTarget id="groupDetail.actions" style={styles.actions}>
            {canManage ? (
              <Button
                label="Schedule a collection"
                icon="calendar-outline"
                onPress={() => navigation.navigate('ScheduleCollection', { mode: 'create', groupId })}
              />
            ) : null}
            <Button
              label="View collections"
              variant="secondary"
              icon="list-outline"
              onPress={() => navigation.navigate('ConsolidatedCollections', { groupId })}
            />
            {editable ? (
              <Button label="Edit group" variant="ghost" icon="create-outline" onPress={edit} />
            ) : null}
          </GuideTarget>
        )}
      </View>
    </Screen>
  );
}

/** "Mike Chuter" → "MC", the same initials the edit form shows. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

function PeopleGroup({
  icon, title, hint, people, alsoManager,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  hint: string;
  people: { id: number; name: string }[];
  alsoManager?: Set<number>;
}) {
  return (
    <View style={styles.people}>
      <View style={styles.row}>
        <Ionicons name={icon} size={normalize(16)} color={palette.kale} />
        <AppText variant="bodyBold" style={styles.flex}>{title}</AppText>
        <AppText variant="meta" color={palette.stone}>{people.length}</AppText>
      </View>
      <AppText variant="meta" color={palette.stone}>{hint}</AppText>
      {people.length ? (
        <View style={styles.names}>
          {people.map((person) => (
            <View key={person.id} style={styles.person}>
              <View style={styles.avatar}>
                <AppText variant="meta" color={palette.kale} style={styles.initial}>
                  {initials(person.name)}
                </AppText>
              </View>
              <AppText variant="bodySmall" numberOfLines={1} style={styles.personName}>{person.name}</AppText>
              {alsoManager?.has(person.id) ? <AppText variant="meta" color={palette.stone}>· also a manager</AppText> : null}
            </View>
          ))}
        </View>
      ) : (
        <AppText variant="bodySmall" color={palette.stone}>No one yet.</AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 40 },
  loader: { marginTop: 24 },
  body: { paddingHorizontal: normalize(16), paddingTop: normalize(4), gap: normalize(12) },
  flex: { flex: 1, minWidth: 0 },
  gap12: { gap: 12 },
  section: { gap: 10 },
  list: { gap: 0, paddingVertical: normalize(6) },
  divider: { marginVertical: normalize(10) },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  directions: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 4 },
  siteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  people: { gap: 6 },
  names: { gap: 8, marginTop: 4 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  personName: { flexShrink: 1 },
  avatar: {
    width: normalize(28),
    height: normalize(28),
    borderRadius: normalize(14),
    backgroundColor: cc.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontFamily: 'Saveful-SemiBold' },
  actions: { gap: 10, marginTop: normalize(6) },
});

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { ActionButton as Button } from '@/components/consolidated/ui';
import { InputField } from '@/components/InputField';
import { PlacesSearchInput } from '@/components/PlacesSearchInput';
import { Screen } from '@/components/Screen';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { WhiteSelect } from '@/components/WhiteSelect';
import { SiteMultiSelect, UserMultiSelect } from '@/components/consolidated/SiteMultiSelect';
import { Divider, IconBubble, InfoRow, Notice, Pill, SectionTitle, Surface, cc } from '@/components/consolidated/ui';
import { GuideHeaderRight, GuideTarget, tours, useScreenGuide } from '@/components/guide';
import { useConsolidatedAccess } from '@/hooks/useConsolidatedAccess';
import { normalize } from '@/utils/responsive';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { consolidatedService } from '@/services/consolidated.service';
import { useAppContext } from '@/store/AppContext';
import { showConfirmAlert } from '@/store/appAlertStore';
import { useSitesStore } from '@/store/sitesStore';
import { palette } from '@/theme/colors';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import { isVirtualHqSiteId } from '@/utils/defaultHqSite';
import type { CollectionPoint, ConsolidatedGroup, EligibleSite, EligibleUser } from '@/types/consolidated';

export function ConsolidatedGroupFormScreen() {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const groupId = Number(route.params?.groupId);
  const editing = Number.isFinite(groupId) && groupId > 0;
  const { authUser } = useAppContext();
  const rawSites = useSitesStore((state) => state.sites);
  const { submitting, withLock } = useSubmitLock();

  const [loading, setLoading] = useState(editing);
  // An archived group is history: viewable, never editable.
  const [isArchived, setIsArchived] = useState(false);
  const [archivedGroup, setArchivedGroup] = useState<ConsolidatedGroup | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { canManage } = useConsolidatedAccess();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pointName, setPointName] = useState('');
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [directions, setDirections] = useState('');
  const [points, setPoints] = useState<CollectionPoint[]>([]);
  const [siteIds, setSiteIds] = useState<number[]>([]);
  const [hostSiteId, setHostSiteId] = useState<number | null>(null);
  const [managerIds, setManagerIds] = useState<number[]>([]);
  const [receiverIds, setReceiverIds] = useState<number[]>([]);
  const [eligibleSites, setEligibleSites] = useState<EligibleSite[]>([]);
  const [siteStatus, setSiteStatus] = useState<Record<number, string>>({});
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [baseline, setBaseline] = useState<{ sites: number[]; managers: number[]; receivers: number[]; name: string; description: string; host: number | null } | null>(null);

  const myId = Number(authUser?.id);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!editing) {
        if (Number.isFinite(myId) && myId > 0) setManagerIds([myId]);
        try {
          const [sites, users] = await Promise.all([
            consolidatedService.getEligibleSites().catch(() => [] as EligibleSite[]),
            consolidatedService.getEligibleUsers(),
          ]);
          if (!cancelled) {
            if (sites.length) setEligibleSites(sites);
            setEligibleUsers(users);
          }
        } catch {
          if (!cancelled && Number.isFinite(myId)) {
            setEligibleUsers([{
              id: myId,
              name: [authUser?.firstName, authUser?.lastName].filter(Boolean).join(' ') || 'You',
              canManage: true,
            }]);
          }
        }
        return;
      }
      try {
        const [group, sites, users] = await Promise.all([
          consolidatedService.getGroup(groupId),
          consolidatedService.getEligibleSites().catch(() => [] as EligibleSite[]),
          consolidatedService.getEligibleUsers().catch(() => [] as EligibleUser[]),
        ]);
        if (cancelled) return;
        const activeSites = group.sites.filter((site) => !site.removedAt).map((site) => site.id);
        const managers = group.managers.map((user) => user.id);
        const receivers = group.receivers.map((user) => user.id);
        setName(group.name);
        setIsArchived(!group.isActive);
        setArchivedGroup(group.isActive ? null : group);
        setDescription(group.description || '');
        setSiteIds(activeSites);
        setSiteStatus(Object.fromEntries(group.sites.map((site) => [
          site.id,
          site.invitationStatus === 'DECLINED' ? 'DECLINED' : site.invitationStatus || 'ACCEPTED',
        ])));
        setHostSiteId(group.hostSite.id || null);
        setManagerIds(managers);
        setReceiverIds(receivers);
        setPoints(group.points);
        // Existing points are listed above; the fields below are only for adding a new one.
        const knownSites = [
          ...sites,
          ...group.sites.filter((site) => !sites.some((row) => row.id === site.id)).map((site) => ({ id: site.id, name: site.name })),
        ];
        setEligibleSites(knownSites);
        const knownUsers = [...users];
        for (const user of [...group.managers, ...group.receivers]) {
          if (!knownUsers.some((row) => row.id === user.id)) {
            knownUsers.push({ id: user.id, name: user.name, canManage: group.managers.some((row) => row.id === user.id) });
          }
        }
        setEligibleUsers(knownUsers);
        setBaseline({ sites: activeSites, managers, receivers, name: group.name, description: group.description || '', host: group.hostSite.id || null });
      } catch (error) {
        showErrorAlert(error, 'Could not load group');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [authUser?.firstName, authUser?.lastName, editing, groupId, myId, reloadKey]);

  const localSites = useMemo(
    () => (rawSites ?? [])
      .map((site: any) => ({
        id: Number(site?.id),
        name: site?.siteName || site?.name || `Site ${site?.id}`,
      }))
      .filter((site) => Number.isFinite(site.id) && site.id > 0 && !isVirtualHqSiteId(site.id)),
    [rawSites],
  );

  // The API knows which sites this manager may use; the local list is only a fallback.
  const siteOptions = (editing || eligibleSites.length ? eligibleSites : localSites).map((site) => ({
    id: site.id,
    name: site.name,
    hint: !siteIds.includes(site.id)
      ? siteStatus[site.id] === 'DECLINED' ? 'Declined — select to invite again' : undefined
      : siteStatus[site.id] === 'PENDING'
        ? 'Invited — waiting to accept'
        : siteStatus[site.id] === 'ACCEPTED'
          ? 'Taking part'
          : editing ? 'Will be invited when you save' : undefined,
  }));
  const hostOptions = siteOptions.filter((site) => siteIds.includes(site.id)).map((site) => ({ value: site.id, label: site.name }));
  const managerOptions = eligibleUsers
    .filter((user) => user.canManage || managerIds.includes(user.id))
    .map((user) => ({ id: user.id, name: user.name, locked: user.id === myId && !editing }));
  const receiverOptions = eligibleUsers.map((user) => ({ id: user.id, name: user.name }));

  const guide = useScreenGuide(isArchived ? null : tours.groupFormTour, { ready: !loading });

  const save = () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Name is required.';
    if (name.trim().length > 80) nextErrors.name = 'Name must be 80 characters or less.';
    if (!siteIds.length) nextErrors.sites = 'Choose at least one site.';
    if (!hostSiteId || !siteIds.includes(hostSiteId)) nextErrors.host = 'Choose a host site from the participating sites.';
    if (!managerIds.length) nextErrors.managers = 'Choose at least one manager.';
    if (!editing && (!pointName.trim() || !address.trim() || lat == null || lng == null)) {
      nextErrors.point = 'Add a collection point name and address.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    void withLock(async () => {
      try {
        if (!editing) {
          const created = await consolidatedService.createGroup({
            name: name.trim(),
            description: description.trim() || undefined,
            hostSiteId: hostSiteId!,
            siteIds,
            managerUserIds: managerIds,
            receiverUserIds: receiverIds,
            collectionPoint: {
              name: pointName.trim(),
              address: address.trim(),
              postcode: postcode || undefined,
              lat: lat!,
              lng: lng!,
              directions: directions.trim() || undefined,
            },
          });
          const invited = created.pendingSiteCount ?? 0;
          showSuccessAlert(
            invited
              ? `${invited} site${invited === 1 ? ' has' : 's have'} been invited and will take part once they accept. Sites you run joined straight away.`
              : 'All sites have joined the group.',
            'Group created',
          );
        } else {
          // Sites first: a new host site has to be in the group before it can host.
          let invited = 0;
          if (!baseline || baseline.sites.join() !== siteIds.join() || baseline.host !== hostSiteId) {
            const result = (await consolidatedService.setGroupSites(groupId, siteIds, hostSiteId ?? undefined)) as { invited?: number } | null;
            invited = Number(result?.invited) || 0;
          }
          if (!baseline || baseline.name !== name.trim() || baseline.description !== description.trim()) {
            await consolidatedService.updateGroup(groupId, {
              name: name.trim(),
              description: description.trim(),
            });
          }
          if (!baseline || baseline.managers.join() !== managerIds.join() || baseline.receivers.join() !== receiverIds.join()) {
            await consolidatedService.setGroupMembers(groupId, managerIds, receiverIds);
          }
          showSuccessAlert(
            invited ? `Group updated. ${invited} new site${invited === 1 ? ' was' : 's were'} invited.` : 'Group updated.',
            'Saved',
          );
        }
        navigation.navigate('ConsolidatedGroups');
      } catch (error) {
        showErrorAlert(error, 'Could not save group');
      }
    });
  };

  const addPoint = () => {
    if (!editing) return;
    if (!pointName.trim() || lat == null || lng == null) {
      setErrors((prev) => ({ ...prev, point: 'Name and address are required for a new point.' }));
      return;
    }
    void withLock(async () => {
      try {
        const created = await consolidatedService.addPoint(groupId, {
          name: pointName.trim(),
          address: address.trim(),
          postcode: postcode || undefined,
          lat,
          lng,
          directions: directions.trim() || undefined,
        });
        setPoints((prev) => [...prev, created]);
        showSuccessAlert('Collection point added.', 'Saved');
      } catch (error) {
        showErrorAlert(error, 'Could not add collection point');
      }
    });
  };

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
            setLoading(true);
            setReloadKey((key) => key + 1);
          } catch (error) {
            showErrorAlert(error, 'Could not restore group');
          }
        });
      },
    });
  };

  const archive = () => {
    showConfirmAlert({
      title: 'Archive group',
      message: 'Archived groups cannot be scheduled. Existing history is kept.',
      confirmLabel: 'Archive',
      destructive: true,
      onConfirm: async () => {
        try {
          await consolidatedService.archiveGroup(groupId);
          showSuccessAlert('Group archived.', 'Saved');
          navigation.navigate('ConsolidatedGroups');
        } catch (error) {
          showErrorAlert(error, 'Could not archive group');
        }
      },
    });
  };

  return (
    <Screen scrollable backgroundColor={palette.creme} transparentTop contentStyle={styles.screen}>
      <StackHeroHeader
        title={editing ? name || 'Edit group' : 'Create collection group'}
        subtitle={isArchived ? 'Archived group · read only' : 'Sites that share one collection point and one charity pickup'}
        right={isArchived ? undefined : <GuideHeaderRight onGuide={guide.start} />}
      />
      {loading ? <ActivityIndicator color={palette.kale} style={{ marginTop: 24 }} /> : (
        <View style={styles.body}>
          {isArchived && archivedGroup ? (
            <ArchivedGroupSummary group={archivedGroup} canRestore={canManage} restoring={submitting} onRestore={restore} />
          ) : (
          <View style={styles.sections}>
          {/* 1. Details */}
          <FormSection guideId="groupForm.details" title="Group details" caption="Sites see this name when they list food.">
            <InputField label="Group name" value={name} onChangeText={setName} placeholder="e.g. Stadium North" />
            {errors.name ? <AppText variant="meta" color={palette.danger}>{errors.name}</AppText> : null}
            <InputField label="Description" optional value={description} onChangeText={setDescription} multiline placeholder="What this group is for" />
          </FormSection>

          {/* 2. Collection point */}
          <FormSection guideId="groupForm.point" title="Shared collection point" caption="Where every site brings its food, and where the charity collects.">
            {editing && points.length ? points.map((point) => {
              const activePoint = point.isActive !== false;
              return (
                <View key={point.id} style={[styles.pointRow, !activePoint && styles.pointOff]}>
                  <IconBubble name="location" size={36} color={activePoint ? palette.kale : palette.stone} background={activePoint ? cc.tintStrong : cc.muted} />
                  <View style={styles.flex}>
                    <AppText variant="bodyBold">{point.name}</AppText>
                    <AppText variant="meta" color={palette.stone} numberOfLines={2}>{point.address}</AppText>
                  </View>
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      void consolidatedService.updatePoint(groupId, point.id, { isActive: !activePoint }).then((updated) => {
                        setPoints((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
                      }).catch((error) => showErrorAlert(error, 'Could not update point'));
                    }}
                  >
                    <Pill
                      label={activePoint ? 'Active' : 'Inactive'}
                      color={activePoint ? palette.kale : palette.stone}
                      background={activePoint ? cc.tint : cc.muted}
                      dot
                    />
                  </Pressable>
                </View>
              );
            }) : null}
            {editing && points.length ? (
              <AppText variant="meta" color={palette.stone}>Tap a point's status to switch it on or off. To add another point, fill in the fields below.</AppText>
            ) : null}
            <InputField label={editing ? 'New point name' : 'Point name'} value={pointName} onChangeText={setPointName} placeholder="e.g. Loading Dock B" />
            <PlacesSearchInput
              placeholder="Search the address"
              onPlaceSelected={(place) => {
                setAddress(place.address);
                setPostcode(place.postcode || '');
                setLat(place.latitude);
                setLng(place.longitude);
                setErrors((prev) => ({ ...prev, point: '' }));
              }}
            />
            {address ? (
              <View style={styles.addressRow}>
                <Ionicons name="checkmark-circle" size={normalize(16)} color={palette.kale} />
                <AppText variant="meta" color={palette.midgray} style={styles.flex}>{address}</AppText>
              </View>
            ) : null}
            <InputField label="Directions" optional value={directions} onChangeText={setDirections} multiline placeholder="e.g. Rear gate, next to the cool room" />
            {errors.point ? <AppText variant="meta" color={palette.danger}>{errors.point}</AppText> : null}
            {editing ? <Button label="Add collection point" icon="add" variant="secondary" size="compact" onPress={addPoint} loading={submitting} /> : null}
          </FormSection>

          {/* 3. Sites */}
          <FormSection
            guideId="groupForm.sites"
            title="Participating sites"
            caption="Sites you run join straight away. Any other site gets an invitation and takes part once it accepts."
          >
            <SiteMultiSelect options={siteOptions} selected={siteIds} onChange={setSiteIds} />
            {errors.sites ? <AppText variant="meta" color={palette.danger}>{errors.sites}</AppText> : null}
            <AppText variant="bodyBold" style={styles.subLabel}>Host site</AppText>
            <AppText variant="meta" color={palette.stone}>Owns the single listing charities see. Must be one of the sites above.</AppText>
            <WhiteSelect placeholder="Choose the host site" value={hostSiteId} options={hostOptions} onChange={setHostSiteId} emptyText="Select sites first" />
            {errors.host ? <AppText variant="meta" color={palette.danger}>{errors.host}</AppText> : null}
          </FormSection>

          {/* 4. People */}
          <FormSection guideId="groupForm.people" title="People" caption="Who runs the collection on the day.">
            <AppText variant="bodyBold" style={styles.subLabel}>Managers</AppText>
            <AppText variant="meta" color={palette.stone}>Schedule collections, approve changes and publish to charities.</AppText>
            <UserMultiSelect options={managerOptions} selected={managerIds} onChange={setManagerIds} />
            {errors.managers ? <AppText variant="meta" color={palette.danger}>{errors.managers}</AppText> : null}
            <AppText variant="bodyBold" style={styles.subLabel}>Receivers</AppText>
            <AppText variant="meta" color={palette.stone}>Confirm what physically arrives at the collection point.</AppText>
            <UserMultiSelect options={receiverOptions} selected={receiverIds} onChange={setReceiverIds} />
          </FormSection>
          </View>
          )}

          {!isArchived ? (
            <>
              <GuideTarget id="groupForm.save">
                <Button label={editing ? 'Save changes' : 'Create group'} icon="checkmark" onPress={save} loading={submitting} />
              </GuideTarget>
              {editing ? (
                <Button label="Archive group" variant="ghost" icon="archive-outline" onPress={archive} />
              ) : null}
            </>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

/** Archived groups are history: a clear summary, never a disabled form. */
function ArchivedGroupSummary({
  group, canRestore, restoring, onRestore,
}: {
  group: ConsolidatedGroup;
  canRestore: boolean;
  restoring: boolean;
  onRestore: () => void;
}) {
  const points = group.points.filter((point) => point.isActive !== false);
  const sites = group.sites.filter((site) => !site.removedAt || site.invitationStatus === 'DECLINED');
  const names = (list: { name: string }[]) => (list.length ? list.map((row) => row.name).join(', ') : 'None');
  return (
    <View style={styles.sections}>
      <Notice
        tone="muted"
        icon="archive-outline"
        title="This group is archived"
        body="It can't be scheduled or changed while archived. Its past collections, contributions and reports are kept."
      />
      <Surface style={styles.section}>
        {group.description ? (
          <AppText variant="bodySmall" color={palette.midgray}>{group.description}</AppText>
        ) : null}
        <InfoRow
          icon="location-outline"
          label={points.length > 1 ? 'Collection points' : 'Collection point'}
          value={points.length ? points.map((point) => point.name).join(', ') : 'None'}
          sub={points.length === 1 ? points[0].address : null}
        />
        <Divider />
        <View style={styles.summarySites}>
          <InfoRow icon="storefront-outline" label="Sites" value={`${sites.filter((site) => !site.removedAt).length} in the group`} />
          {sites.map((site) => (
            <View key={site.id} style={styles.summarySite}>
              <AppText variant="bodySmall" style={styles.flex}>{site.name}</AppText>
              <AppText
                variant="meta"
                color={site.invitationStatus === 'DECLINED' ? palette.danger : site.invitationStatus === 'PENDING' ? cc.warnText : palette.kale}
              >
                {site.invitationStatus === 'DECLINED' ? 'Declined' : site.invitationStatus === 'PENDING' ? 'Invited' : 'Taking part'}
                {site.id === group.hostSite.id ? ' · host' : ''}
              </AppText>
            </View>
          ))}
        </View>
        <Divider />
        <InfoRow icon="person-outline" label="Managers" value={names(group.managers)} />
        <InfoRow icon="clipboard-outline" label="Receivers" value={names(group.receivers)} />
      </Surface>
      {canRestore ? (
        <>
          <Button label="Restore group" icon="refresh-outline" onPress={onRestore} loading={restoring} />
          <AppText variant="meta" color={palette.stone} style={styles.centerText}>
            Restoring brings the group back exactly as it was. Then schedule new collections from Consolidated Collections.
          </AppText>
        </>
      ) : null}
    </View>
  );
}

function FormSection({ title, caption, guideId, children }: { guideId: string; title: string; caption?: string; children: React.ReactNode }) {
  return (
    <GuideTarget id={guideId} style={styles.sectionWrap}>
      <SectionTitle title={title} caption={caption} />
      <Surface style={styles.section}>{children}</Surface>
    </GuideTarget>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 40 },
  body: { paddingHorizontal: normalize(16), paddingTop: normalize(4), gap: normalize(12) },
  sections: { gap: normalize(12) },
  summarySites: { gap: 8 },
  summarySite: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: normalize(32) },
  centerText: { textAlign: 'center' },
  flex: { flex: 1, minWidth: 0 },
  sectionWrap: { gap: 10 },
  section: { gap: 12 },
  subLabel: { marginTop: 6 },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: cc.tint,
    borderRadius: cc.radiusSm,
    padding: 10,
  },
  pointOff: { backgroundColor: cc.muted },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
});

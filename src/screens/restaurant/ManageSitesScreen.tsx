import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect, type CompositeNavigationProp } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import type { RestaurantTabsParamList } from '../../navigation/types';

import { Screen } from '../../components/Screen';
import { HeroHeader } from '../../components/HeroHeader';
import { AppText } from '../../components/AppText';
import {
  LocationSetupModal,
  type SelectedLocation,
} from '../../components/LocationSetupModal';
import { useAppContext } from '@/store/AppContext';
import { useSitesStore } from '@/store/sitesStore';
import { showConfirmAlert, showAppAlert } from '@/store/appAlertStore';
import { palette } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { useBottomTabPadding } from '@/hooks/useBottomTabPadding';
import { HeaderAddressRow } from '@/components/HeaderAddressRow';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import { buildDashboardShellStyles } from '@/utils/dashboardAdaptive';
import { organizationService } from '@/services/organization.service';
import { useAuthStore } from '@/store/authStore';
import { pickDefaultSiteId, getHqOwnerContact, isVirtualHqSiteId, buildVirtualHqSite, isBusinessMultiHeadOffice } from '@/utils/defaultHqSite';
import { selectCanManageBilling, selectNeedsPlan, useSubscriptionStore } from '@/store/subscriptionStore';
import { getSubscriptionRoute, showSubscriptionRequiredPrompt } from '@/utils/subscriptionAccess';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<RestaurantTabsParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Site = {
  id: number;
  tradingName: string;
  address: string;
  postCode: string;
  managerId: number | null;
  contactName: string;
  email: string;
  mobile: string;
  latitude?: number;
  longitude?: number;
  logoUrl?: string | null;
  hasManager: boolean;
  isDefault: boolean;
};

export default function ManageSitesScreen() {
  useTransparentStatusBar('light');
  const r = useResponsiveLayout();
  const adaptive = useMemo(() => buildDashboardShellStyles(r, { stackHero: true }), [r]);
  const tabBottomPadding = useBottomTabPadding(r.isTablet ? 24 : hp(1.5));
  const navigation = useNavigation<NavigationProp>();
  const { currentProfile, authUser, selectedRole } = useAppContext();
  const {
    organisation,
    sites: rawSites,
    sitesWithManagers,
    fetchSitesWithManagers,
    ensureDefaultHqSite,
    updateSite,
    deleteSite,
    removeAccess,
  } = useSitesStore();

  const [editingSiteId, setEditingSiteId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedSite, setExpandedSite] = useState<number | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  const contentColumn = useMemo(() => {
    if (!r.isTablet || !adaptive.columnWidth) return null;
    return {
      width: adaptive.columnWidth,
      maxWidth: r.contentMaxWidth,
      alignSelf: 'center' as const,
      paddingHorizontal: r.pagePadH,
    };
  }, [r.isTablet, r.contentMaxWidth, r.pagePadH, adaptive.columnWidth]);

  const tabletInsetReset = r.isTablet ? { marginHorizontal: 0, paddingHorizontal: 0 } : null;

  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const brandName =
    organisation?.name ||
    authUser?.profile?.organisation?.name ||
    currentProfile.organization ||
    'Business';
  const brandAddress =
    organisation?.address ||
    authUser?.profile?.organisation?.address ||
    currentProfile.address ||
    'No address available';
  const businessLogo =
    organisation?.logoUrl ||
    authUser?.profile?.organisation?.logoUrl ||
    currentProfile.logo ||
    null;

  const sites = useMemo<Site[]>(() => {
    const byId = new Map<number, any>();

    for (const site of rawSites ?? []) {
      const id = Number(site?.id);
      if (!Number.isFinite(id) || id === 0) continue;
      byId.set(id, { ...site, id });
    }

    const profileSites = Array.isArray(authUser?.profile?.sites)
      ? authUser.profile.sites
      : [];
    for (const site of profileSites) {
      const id = Number(site?.id ?? site?.siteId);
      if (!Number.isFinite(id) || id === 0) continue;
      const existing = byId.get(id);
      byId.set(id, {
        ...site,
        ...existing,
        id,
        siteName:
          existing?.siteName ||
          site?.siteName ||
          site?.locationName ||
          site?.name ||
          existing?.name,
        createdAt: existing?.createdAt || site?.createdAt,
      });
    }

    const mergedRaw = [...byId.values()].sort((a, b) => {
      return (
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
    });
    const merged =
      mergedRaw.length > 0
        ? mergedRaw
        : isBusinessMultiHeadOffice(authUser) || selectedRole === 'restaurant_multi'
          ? [buildVirtualHqSite(authUser, organisation)]
          : [];
    const defaultId = pickDefaultSiteId(merged) ?? merged[0]?.id;
    const owner = getHqOwnerContact(authUser);

    return merged.map((raw) => {
      const managed = sitesWithManagers.find((site) => site.id === raw.id);
      const isDefault = raw.id === defaultId || isVirtualHqSiteId(raw.id);
      const assignedName = managed?.contactName || '';
      const hasAssignedManager = !!managed?.managerId;
      return {
        id: raw.id,
        tradingName:
          managed?.tradingName ||
          raw.siteName ||
          raw.locationName ||
          raw.name ||
          `Site ${raw.id}`,
        address: managed?.address || raw.address || '',
        postCode: managed?.postCode || raw.postcode || raw.postCode || '',
        managerId: managed?.managerId ?? null,
        contactName: hasAssignedManager
          ? assignedName
          : isDefault
            ? owner.name || assignedName || 'Head office'
            : assignedName || 'No manager assigned',
        email: hasAssignedManager
          ? managed?.email || '-'
          : isDefault
            ? owner.email || managed?.email || '-'
            : managed?.email || raw.contactEmail || '-',
        mobile: hasAssignedManager
          ? managed?.mobile || '-'
          : isDefault
            ? owner.mobile || managed?.mobile || '-'
            : managed?.mobile || raw.contactMobile || '-',
        latitude: raw?.latitude,
        longitude: raw?.longitude,
        logoUrl: businessLogo,
        hasManager: hasAssignedManager || isDefault,
        isDefault,
      };
    });
  }, [sitesWithManagers, rawSites, businessLogo, authUser, organisation, selectedRole]);

  const managedCount = useMemo(
    () => sites.filter((site) => site.hasManager).length,
    [sites],
  );

  const actions: Array<{
    label: string;
    primary?: boolean;
    tab?: keyof RestaurantTabsParamList;
    screen?: string;
    route?: keyof RootStackParamList;
  }> = [
    {
      label: 'Create listing',
      tab: 'Listings' as const,
      screen: 'Surplus',
      primary: true,
    },
    { label: 'Add Location', route: 'CreateSite' },
    { label: 'View Analytics', tab: 'Insights' },
    { label: 'Your Profile', route: 'Account' },
  ];

  const needsPlan = useSubscriptionStore(selectNeedsPlan);
  const entitled = useSubscriptionStore((s) => s.entitlements?.entitled === true);
  const billedLocked = selectedRole === 'restaurant_multi' ? !entitled : needsPlan;

  const promptForPlan = useCallback(() => {
    const route = getSubscriptionRoute('restaurant_multi');
    if (!route) return;
    showSubscriptionRequiredPrompt({
      canManageBilling: selectCanManageBilling(),
      onContinue: () => navigation.navigate(route),
    });
  }, [navigation]);

  const goToCreateSite = useCallback(() => {
    if (billedLocked) {
      promptForPlan();
      return;
    }
    navigation.navigate('CreateSite' as any);
  }, [billedLocked, promptForPlan, navigation]);

  const loadData = async (force = false) => {
    try {
      await ensureDefaultHqSite();
    } catch {
      // HQ preview from the org profile is enough to render Home.
    }
    try {
      await fetchSitesWithManagers(force);
    } catch {
      // Home should still show HQ if the org list is gated or empty.
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData(true);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadData(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const toggleExpanded = (siteId: number) => {
    if (expandedSite === siteId) {
      setExpandedSite(null);
      setEditingSiteId(null);
      return;
    }
    setEditingSiteId(null);
    setExpandedSite(siteId);
  };

  const startEditing = (site: Site) => {
    const raw = rawSites.find((s: any) => s.id === site.id);
    setEditingSiteId(site.id);
    setEditForm({
      tradingName: String(raw?.siteName || site.tradingName || ''),
      address: String(raw?.address || site.address || ''),
      postCode: String(raw?.postcode || site.postCode || ''),
      latitude: raw?.latitude ?? site.latitude ?? '',
      longitude: raw?.longitude ?? site.longitude ?? '',
    });
    setExpandedSite(site.id);
  };

  const handleSaveLocation = async () => {
    if (actionLoading || !editingSiteId) return;
    setActionLoading(true);
    try {
      const latitude = Number(editForm.latitude);
      const longitude = Number(editForm.longitude);
      const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

      if (!isVirtualHqSiteId(editingSiteId)) {
        await updateSite(editingSiteId, {
          siteName: editForm.tradingName,
          address: editForm.address,
          postcode: editForm.postCode,
          ...(hasCoordinates ? { latitude, longitude } : {}),
        });
      }

      const orgId = authUser?.profile?.organisation?.id;
      if (orgId && hasCoordinates) {
        await organizationService.updateCoordinates(orgId, {
          latitude,
          longitude,
        });
        await refreshProfile();
      }

      await loadData(true);
      setEditingSiteId(null);
      setEditForm({});
      showSuccessAlert('Location updated successfully');
    } catch (err: unknown) {
      showErrorAlert(err, 'Could not update location', 'Could not update location');
    } finally {
      setActionLoading(false);
    }
  };

  const requestDeleteLocation = (siteId: number) => {
    const target = sites.find((site) => site.id === siteId);
    if (target?.isDefault) {
      showAppAlert({
        variant: 'info',
        title: 'Default site',
        message:
          'Your default head-office site can’t be removed. Rename it if you want a different label.',
      });
      return;
    }

    showConfirmAlert({
      title: 'Delete location?',
      message:
        'This removes the site from your business. Managers linked only to this site may lose access.',
      confirmLabel: 'Delete location',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteSite(siteId);
          setExpandedSite(null);
          setEditingSiteId(null);
          await loadData(true);
          showSuccessAlert('Site removed successfully', 'Deleted');
        } catch (err) {
          showErrorAlert(err, 'Could not remove location', 'Could not remove location');
          throw err;
        }
      },
    });
  };

  const requestRemoveManager = (siteId: number, managerId: number | null) => {
    showConfirmAlert({
      title: 'Remove manager?',
      message:
        'They will be removed from this site only. If they manage other sites, those stay unchanged.',
      confirmLabel: 'Remove manager',
      destructive: true,
      onConfirm: async () => {
        try {
          if (!managerId) {
            showAppAlert({
              variant: 'info',
              title: 'Nothing to remove',
              message: 'No manager assigned to this site',
            });
            return;
          }
          await removeAccess(siteId, managerId);
          await loadData(true);
          showSuccessAlert('Manager removed from this site');
        } catch (err: unknown) {
          showErrorAlert(err, 'Could not remove manager', 'Could not remove manager');
          throw err;
        }
      },
    });
  };

  return (
    <Screen scrollable={false} backgroundColor={palette.creme} transparentTop>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <LocationSetupModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        searchPlaceholder="Search restaurant address..."
        initialLocation={
          Number.isFinite(Number(editForm.latitude)) &&
          Number.isFinite(Number(editForm.longitude))
            ? {
                latitude: Number(editForm.latitude),
                longitude: Number(editForm.longitude),
                address: String(editForm.address || ''),
                postcode: String(editForm.postCode || ''),
              }
            : null
        }
        onConfirm={async ({ latitude, longitude, address, postcode }: SelectedLocation) => {
          setEditForm((prev: any) => ({
            ...prev,
            address,
            latitude,
            longitude,
            postCode: postcode || prev.postCode,
          }));
          setLocationModalVisible(false);
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          adaptive.scrollContent,
          { paddingBottom: tabBottomPadding },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={r.isTablet ? { width: r.width, alignSelf: 'center' as const } : undefined}>
          <HeroHeader
            source={require('../../../assets/placeholder/kale-header.png')}
            height={r.isTablet ? adaptive.heroHeight : hp(14)}
            style={[{ marginBottom: hp(1.2) }, adaptive.heroBleed]}
          >
            <View style={[styles.heroContent, adaptive.heroContent]}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroTextBlock}>
                  <AppText
                    variant="caption"
                    style={[styles.heroEyebrow, adaptive.heroEyebrow]}
                    numberOfLines={1}
                  >
                    {brandName}
                  </AppText>
                  <AppText
                    variant="h6"
                    style={[styles.heroTitle, adaptive.heroTitle]}
                    numberOfLines={1}
                  >
                    Your sites
                  </AppText>
                  <HeaderAddressRow
                    address={brandAddress}
                    iconSize={normalize(15)}
                    style={styles.heroAddressRow}
                    textStyle={[styles.heroAddress, adaptive.heroLocationText]}
                  />
                </View>

                <Pressable
                  style={[styles.heroIconCircle, adaptive.heroIconCircle]}
                  onPress={() => navigation.navigate('Account')}
                  accessibilityRole="button"
                  accessibilityLabel="Open account profile"
                >
                  {businessLogo ? (
                    <Image
                      source={{ uri: businessLogo }}
                      style={styles.logoImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <AppText style={styles.logoFallback}>{brandName[0] || 'B'}</AppText>
                  )}
                </Pressable>
              </View>

              <View style={[styles.heroStatsPill, adaptive.heroStatsPill]}>
                <Ionicons name="business-outline" size={normalize(14)} color={palette.white} />
                <AppText
                  variant="caption"
                  style={[styles.heroStatsText, adaptive.heroStatsText]}
                  numberOfLines={1}
                >
                  {sites.length === 0
                    ? 'No locations yet'
                    : `${managedCount} of ${sites.length} sites managed`}
                </AppText>
              </View>
            </View>
          </HeroHeader>
        </View>

        <View style={contentColumn}>
        <AppText variant="subheading" style={[styles.sectionTitle, tabletInsetReset, adaptive.sectionTitle]}>
          What to do today !
        </AppText>

        <View style={[styles.actionGrid, tabletInsetReset, r.isTablet && styles.actionGridTablet]}>
          {actions.map((item) => (
            <Pressable
              key={item.label}
              style={[
                styles.actionCard,
                r.isTablet && styles.actionCardTablet,
                item.primary && styles.actionCardPrimary,
              ]}
              onPress={() => {
                const billedAction = item.tab === 'Listings' || item.route === 'CreateSite';
                if (billedAction && billedLocked) {
                  promptForPlan();
                  return;
                }
                if (item.tab) {
                  navigation.navigate(item.tab as any, item.screen ? { screen: item.screen } : undefined);
                } else if (item.route) {
                  navigation.navigate(item.route as any);
                }
              }}
            >
              <AppText
                variant="bodyBold"
                style={[styles.actionText, item.primary && styles.actionTextPrimary]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {item.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={[styles.sitesHeader, tabletInsetReset]}>
          <View style={styles.sitesHeaderLeft}>
            <AppText variant="subheading" style={styles.sitesTitle}>
              Your Sites
            </AppText>
            <View style={styles.countBadge}>
              <AppText variant="bodySmall" style={styles.countBadgeText}>
                {sites.length}
              </AppText>
            </View>
          </View>
          <Pressable
            style={styles.addLink}
            onPress={goToCreateSite}
            hitSlop={8}
          >
            <Ionicons name="add" size={normalize(16)} color={palette.kale} />
            <AppText variant="bodyBold" style={styles.addLinkText}>
              Add
            </AppText>
          </Pressable>
        </View>

        {sites.length === 0 ? (
          <View style={[styles.emptyCard, tabletInsetReset]}>
            <View style={styles.emptyIcon}>
              <Ionicons name="business-outline" size={normalize(26)} color={palette.kale} />
            </View>
            <AppText variant="bodyBold" style={styles.emptyTitle}>
              No locations yet
            </AppText>
            <AppText variant="bodySmall" style={styles.emptyCopy}>
              Your head-office site is created automatically so you can list surplus from HQ. Add more locations for other teams.
            </AppText>
            <Pressable
              style={styles.emptyCta}
              onPress={goToCreateSite}
            >
              <AppText variant="bodyBold" style={styles.emptyCtaText}>
                Add Location
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {sites.map((site, index) => {
          const isExpanded = expandedSite === site.id;
          const isEditing = editingSiteId === site.id;

          return (
            <View
              key={site.id}
              style={[
                styles.siteCard,
                isExpanded && styles.siteCardExpanded,
                r.isTablet && { marginHorizontal: 0 },
              ]}
            >
              <Pressable style={styles.siteHeader} onPress={() => toggleExpanded(site.id)}>
                <View style={styles.siteLeft}>
                  <View style={styles.siteLogoWrap}>
                    <Image
                      source={
                        site.logoUrl
                          ? { uri: site.logoUrl }
                          : require('../../../assets/placeholder/kale-header.png')
                      }
                      style={styles.siteLogo}
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.siteTitleRow}>
                      <AppText variant="bodySmall" style={styles.siteIndex}>
                        {site.isDefault ? 'Default' : `Site ${index + 1}`}
                      </AppText>
                      {site.isDefault ? (
                        <View style={[styles.statusChip, styles.statusChipDefault]}>
                          <AppText
                            variant="bodySmall"
                            style={[styles.statusChipText, styles.statusChipTextDefault]}
                            numberOfLines={1}
                          >
                            HQ
                          </AppText>
                        </View>
                      ) : null}
                      <View
                        style={[
                          styles.statusChip,
                          site.hasManager ? styles.statusChipOk : styles.statusChipWarn,
                        ]}
                      >
                        <AppText
                          variant="bodySmall"
                          style={[
                            styles.statusChipText,
                            site.hasManager
                              ? styles.statusChipTextOk
                              : styles.statusChipTextWarn,
                          ]}
                          numberOfLines={1}
                        >
                          {site.hasManager ? 'Managed' : 'Needs manager'}
                        </AppText>
                      </View>
                    </View>

                    <AppText
                      variant="bodyBold"
                      style={styles.siteName}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {site.tradingName}
                    </AppText>

                    <AppText
                      variant="bodySmall"
                      style={styles.siteAddress}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {[site.address, site.postCode].filter(Boolean).join(' · ')}
                    </AppText>
                  </View>
                </View>

                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={normalize(20)}
                  color={palette.midgray}
                />
              </Pressable>

              {isExpanded ? (
                <View style={styles.details}>
                  {isEditing ? (
                    <>
                      <View style={styles.fieldBlock}>
                        <AppText variant="bodyBold" style={styles.fieldLabel}>
                          Location Name
                        </AppText>
                        <TextInput
                          value={String(editForm.tradingName || '')}
                          onChangeText={(v) => setEditForm({ ...editForm, tradingName: v })}
                          style={styles.input}
                        />
                      </View>

                      <View style={styles.fieldBlock}>
                        <AppText variant="bodyBold" style={styles.fieldLabel}>
                          Post Code
                        </AppText>
                        <AppText variant="bodySmall" style={styles.helperText}>
                          Auto-filled when you update the map location.
                        </AppText>
                        <TextInput
                          value={String(editForm.postCode || '')}
                          editable={false}
                          style={[styles.input, styles.inputReadonly]}
                          placeholder="Set location on map"
                          placeholderTextColor={palette.textMuted}
                        />
                      </View>

                      <View style={styles.fieldBlock}>
                        <AppText variant="bodyBold" style={styles.fieldLabel}>
                          Address / Location
                        </AppText>
                        <AppText variant="bodySmall" style={styles.helperText}>
                          Use map search so latitude, longitude, and postcode update with the
                          address.
                        </AppText>
                        {!!editForm.address ? (
                          <AppText variant="bodySmall" style={styles.addressPreview}>
                            {String(editForm.address)}
                          </AppText>
                        ) : null}
                        <Pressable
                          style={styles.mapBtn}
                          onPress={() => setLocationModalVisible(true)}
                        >
                          <Ionicons name="map-outline" size={normalize(16)} color={palette.white} />
                          <AppText variant="bodyBold" style={styles.mapBtnText}>
                            Update on Map
                          </AppText>
                        </Pressable>
                      </View>

                      <View style={styles.detailActions}>
                        <Pressable
                          style={[styles.secondaryBtn, actionLoading && styles.btnDisabled]}
                          disabled={actionLoading}
                          onPress={() => {
                            setEditingSiteId(null);
                            setEditForm({});
                          }}
                        >
                          <AppText variant="bodyBold" style={styles.secondaryBtnText}>
                            Cancel
                          </AppText>
                        </Pressable>
                        <Pressable
                          style={[styles.primaryBtn, actionLoading && styles.btnDisabled]}
                          disabled={actionLoading}
                          onPress={handleSaveLocation}
                        >
                          <AppText variant="bodyBold" style={styles.primaryBtnText}>
                            {actionLoading ? 'Saving…' : 'Save changes'}
                          </AppText>
                        </Pressable>
                      </View>

                      {site.isDefault ? (
                        <AppText variant="caption" style={styles.helperText}>
                          Default head-office site can’t be removed.
                        </AppText>
                      ) : (
                        <Pressable
                          style={[styles.dangerOutlineBtn, actionLoading && styles.btnDisabled]}
                          disabled={actionLoading}
                          onPress={() => requestDeleteLocation(site.id)}
                        >
                          <AppText variant="bodyBold" style={styles.dangerOutlineText}>
                            Delete location
                          </AppText>
                        </Pressable>
                      )}
                    </>
                  ) : (
                    <>
                      <View style={styles.metaGrid}>
                        <View style={styles.metaRow}>
                          <AppText variant="bodySmall" style={styles.metaLabel}>
                            Manager
                          </AppText>
                          <AppText variant="bodyBold" style={styles.metaValue}>
                            {site.contactName}
                          </AppText>
                        </View>
                        <View style={styles.metaRow}>
                          <AppText variant="bodySmall" style={styles.metaLabel}>
                            Email
                          </AppText>
                          <AppText variant="bodyBold" style={styles.metaValue}>
                            {site.email}
                          </AppText>
                        </View>
                        <View style={styles.metaRow}>
                          <AppText variant="bodySmall" style={styles.metaLabel}>
                            Mobile
                          </AppText>
                          <AppText variant="bodyBold" style={styles.metaValue}>
                            {site.mobile}
                          </AppText>
                        </View>
                      </View>

                      <View style={styles.detailActions}>
                        <Pressable style={styles.secondaryBtn} onPress={() => startEditing(site)}>
                          <Ionicons
                            name="create-outline"
                            size={normalize(16)}
                            color={palette.black}
                          />
                          <AppText variant="bodyBold" style={styles.secondaryBtnText}>
                            Edit
                          </AppText>
                        </Pressable>

                        {!isVirtualHqSiteId(site.id) && !site.isDefault ? (
                          <Pressable
                            style={styles.primaryBtn}
                            onPress={() =>
                              navigation.navigate('CreateSite', {
                                mode: 'manager',
                                siteId: site.id,
                              })
                            }
                          >
                            <AppText variant="bodyBold" style={styles.primaryBtnText}>
                              {site.hasManager ? 'Update manager' : 'Assign manager'}
                            </AppText>
                          </Pressable>
                        ) : null}
                      </View>

                      {site.hasManager && site.managerId && !site.isDefault ? (
                        <Pressable
                          style={styles.dangerOutlineBtn}
                          onPress={() => requestRemoveManager(site.id, site.managerId)}
                        >
                          <AppText variant="bodyBold" style={styles.dangerOutlineText}>
                            Remove manager
                          </AppText>
                        </Pressable>
                      ) : site.isDefault ? (
                        <AppText variant="caption" style={styles.helperText}>
                          Head office operates this default site. Listing requires a plan.
                        </AppText>
                      ) : null}
                    </>
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: hp(2),
  },
  heroContent: {
    flex: 1,
    paddingHorizontal: wp(5),
    justifyContent: 'flex-end',
    paddingBottom: hp(1.6),
    gap: hp(0.8),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: wp(3),
    width: '100%',
  },
  heroTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: hp(0.15),
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'none',
    letterSpacing: 0.3,
    fontSize: normalize(12),
  },
  heroTitle: {
    color: palette.white,
    textTransform: 'none',
    fontSize: normalize(24),
    lineHeight: normalize(28),
  },
  heroAddressRow: {
    marginTop: hp(0.2),
    maxWidth: '100%',
  },
  heroAddress: {
    color: 'rgba(255,255,255,0.9)',
    opacity: 1,
    fontSize: normalize(13),
    lineHeight: normalize(17),
    paddingTop: 0,
  },
  heroIconCircle: {
    width: normalize(46),
    height: normalize(46),
    borderRadius: normalize(23),
    flexShrink: 0,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoFallback: {
    color: palette.eggplant,
    fontWeight: 'bold',
    fontSize: normalize(18),
  },
  heroStatsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: wp(1.5),
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingVertical: hp(0.6),
    paddingHorizontal: wp(3),
    borderRadius: normalize(20),
    maxWidth: '100%',
  },
  heroStatsText: {
    color: palette.white,
    flexShrink: 1,
    textTransform: 'none',
    fontSize: normalize(13),
  },
  sectionTitle: {
    marginHorizontal: wp(6),
    marginBottom: hp(2),
    textAlign: 'center',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    marginBottom: hp(2.5),
  },
  actionGridTablet: {
    width: '100%',
    gap: 12,
  },
  actionCard: {
    backgroundColor: 'white',
    width: '48%',
    paddingVertical: hp(2.3),
    paddingHorizontal: wp(2),
    borderRadius: normalize(14),
    marginBottom: hp(1.4),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.strokecream,
  },
  actionCardTablet: {
    flexGrow: 1,
    flexBasis: '47%',
    maxWidth: '48%',
    minHeight: 56,
  },
  actionCardPrimary: {
    backgroundColor: palette.kale,
    borderColor: palette.kale,
  },
  actionText: {
    textAlign: 'center',
    width: '100%',
    flexShrink: 1,
  },
  actionTextPrimary: {
    color: palette.white,
  },
  sitesHeader: {
    marginHorizontal: wp(4),
    marginBottom: hp(1.2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sitesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  sitesTitle: {
    textAlign: 'left',
    marginBottom: 0,
  },
  countBadge: {
    minWidth: normalize(24),
    height: normalize(24),
    borderRadius: normalize(12),
    paddingHorizontal: wp(1.5),
    backgroundColor: '#E8F3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: palette.kale,
    fontWeight: '700',
    textTransform: 'none',
  },
  addLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(0.5),
    paddingVertical: hp(0.4),
    paddingHorizontal: wp(1),
  },
  addLinkText: {
    color: palette.kale,
    textTransform: 'none',
  },
  emptyCard: {
    marginHorizontal: wp(4),
    marginBottom: hp(2),
    backgroundColor: palette.white,
    borderRadius: normalize(16),
    borderWidth: 1,
    borderColor: palette.strokecream,
    paddingVertical: hp(3),
    paddingHorizontal: wp(5),
    alignItems: 'center',
    gap: hp(0.8),
  },
  emptyIcon: {
    width: normalize(52),
    height: normalize(52),
    borderRadius: normalize(26),
    backgroundColor: '#E8F3EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.4),
  },
  emptyTitle: {
    textTransform: 'none',
    textAlign: 'center',
  },
  emptyCopy: {
    textAlign: 'center',
    color: palette.textMuted,
    textTransform: 'none',
    lineHeight: normalize(18),
  },
  emptyCta: {
    marginTop: hp(1),
    backgroundColor: palette.kale,
    borderRadius: normalize(12),
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.2),
  },
  emptyCtaText: {
    color: palette.white,
    textTransform: 'none',
  },
  siteCard: {
    backgroundColor: 'white',
    marginHorizontal: wp(4),
    marginBottom: hp(1.2),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.4),
    borderRadius: normalize(14),
    borderWidth: 1,
    borderColor: palette.strokecream,
  },
  siteCardExpanded: {
    borderColor: '#B7DCC4',
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: wp(2),
  },
  siteLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    gap: wp(2.5),
    minWidth: 0,
  },
  siteLogoWrap: {
    width: normalize(48),
    height: normalize(48),
    borderRadius: normalize(24),
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  siteLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  siteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(0.35),
    flexWrap: 'wrap',
  },
  siteIndex: {
    color: palette.primary,
    textTransform: 'none',
  },
  statusChip: {
    borderRadius: normalize(999),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.2),
  },
  statusChipOk: {
    backgroundColor: '#E8F3EC',
  },
  statusChipWarn: {
    backgroundColor: '#FFF4E5',
  },
  statusChipDefault: {
    backgroundColor: '#EFEAFE',
  },
  statusChipText: {
    fontSize: normalize(11),
    textTransform: 'none',
    fontWeight: '700',
  },
  statusChipTextOk: {
    color: palette.kale,
  },
  statusChipTextWarn: {
    color: '#B45309',
  },
  statusChipTextDefault: {
    color: palette.primary,
  },
  siteName: {
    flexShrink: 1,
    textTransform: 'none',
    marginBottom: hp(0.2),
  },
  siteAddress: {
    color: palette.textMuted,
    textTransform: 'none',
    lineHeight: normalize(17),
  },
  details: {
    marginTop: hp(1.2),
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: hp(1.2),
    gap: hp(1.2),
  },
  metaGrid: {
    gap: hp(0.9),
  },
  metaRow: {
    gap: hp(0.15),
  },
  metaLabel: {
    color: palette.textMuted,
    textTransform: 'none',
  },
  metaValue: {
    textTransform: 'none',
  },
  fieldBlock: {
    gap: hp(0.4),
  },
  fieldLabel: {
    textTransform: 'none',
  },
  helperText: {
    color: palette.textMuted,
    textTransform: 'none',
  },
  input: {
    backgroundColor: '#FAFAFA',
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(11),
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: '#eee',
  },
  inputReadonly: {
    backgroundColor: '#F4FAF6',
  },
  addressPreview: {
    textTransform: 'none',
    color: palette.black,
    lineHeight: normalize(18),
  },
  mapBtn: {
    marginTop: hp(0.4),
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    backgroundColor: '#3b82f6',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.9),
    borderRadius: normalize(10),
  },
  mapBtnText: {
    color: palette.white,
    textTransform: 'none',
  },
  detailActions: {
    flexDirection: 'row',
    gap: wp(2.5),
  },
  primaryBtn: {
    flex: 1,
    minHeight: normalize(44),
    backgroundColor: palette.middlegreen,
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(2),
  },
  primaryBtnText: {
    color: palette.white,
    textTransform: 'none',
    textAlign: 'center',
  },
  secondaryBtn: {
    flex: 1,
    minHeight: normalize(44),
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: wp(1.5),
    paddingHorizontal: wp(2),
  },
  secondaryBtnText: {
    color: palette.black,
    textTransform: 'none',
  },
  dangerOutlineBtn: {
    minHeight: normalize(44),
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerOutlineText: {
    color: palette.danger,
    textTransform: 'none',
  },
  btnDisabled: {
    opacity: 0.65,
  },
});

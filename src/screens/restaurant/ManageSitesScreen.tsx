import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  Linking,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

import { Screen } from '../../components/Screen';
import { HeroHeader } from '../../components/HeroHeader';
import { AppText } from '../../components/AppText';
import { Skeleton } from '../../components/Skeleton';
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
import { useSafeBottomPadding } from '@/hooks/useBottomTabPadding';
import { HeaderAddressRow } from '@/components/HeaderAddressRow';
import { hp, normalize, wp } from '@/utils/responsive';
import { organizationService } from '@/services/organization.service';
import { useAuthStore } from '@/store/authStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ManageSites'>;

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
};

export default function ManageSitesScreen() {
  useTransparentStatusBar('light');
  const safeBottomPadding = useSafeBottomPadding(hp(1.5));
  const navigation = useNavigation<NavigationProp>();
  const { logout, currentProfile, authUser } = useAppContext();
  const {
    organisation,
    sites: rawSites,
    sitesWithManagers,
    isFetchingManagers: loading,
    fetchSitesWithManagers,
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
    return sitesWithManagers.map((site) => {
      const raw = rawSites.find((s: any) => s.id === site.id);
      return {
        id: site.id,
        tradingName: site.tradingName,
        address: site.address,
        postCode: site.postCode,
        managerId: site.managerId,
        contactName: site.contactName,
        email: site.email,
        mobile: site.mobile,
        latitude: raw?.latitude,
        longitude: raw?.longitude,
        logoUrl: businessLogo,
        hasManager: !!site.managerId,
      };
    });
  }, [sitesWithManagers, rawSites, businessLogo]);

  const managedCount = useMemo(
    () => sites.filter((site) => site.hasManager).length,
    [sites],
  );

  const actions = [
    { label: 'Add Location', route: 'CreateSite', primary: true },
    { label: 'View Analytics', route: 'SiteAnalytics' },
    { label: 'Your Profile', route: 'Account' },
    {
      label: 'Contact Saveful',
      action: () => Linking.openURL('https://www.saveful.com/contact'),
    },
  ];

  const loadData = async (force = false) => {
    await fetchSitesWithManagers(force);
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData(true);
    } catch (e) {
      showErrorAlert(e, 'Could not load sites', 'Could not load sites');
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData(true).catch((e) =>
        showErrorAlert(e, 'Could not load sites', 'Could not load sites'),
      );
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

      await updateSite(editingSiteId, {
        siteName: editForm.tradingName,
        address: editForm.address,
        postcode: editForm.postCode,
        ...(hasCoordinates ? { latitude, longitude } : {}),
      });

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

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <View style={styles.skeletonHero}>
        <Skeleton width="100%" height="100%" borderRadius={0} />
      </View>

      <View style={styles.skeletonTitle}>
        <Skeleton width={wp(50)} height={normalize(24)} />
      </View>

      <View style={styles.actionGrid}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.actionCard, styles.skeletonActionCard]}>
            <Skeleton width="60%" height={normalize(14)} />
          </View>
        ))}
      </View>

      <View style={styles.skeletonTitle}>
        <Skeleton width={wp(40)} height={normalize(24)} />
      </View>

      {[1, 2].map((i) => (
        <View key={i} style={[styles.siteCard, styles.skeletonSiteCard]}>
          <View style={styles.siteHeader}>
            <View style={styles.siteLeft}>
              <Skeleton
                width={normalize(48)}
                height={normalize(48)}
                borderRadius={normalize(24)}
              />
              <View style={{ flex: 1, gap: normalize(6) }}>
                <Skeleton width="70%" height={normalize(18)} />
                <Skeleton width="90%" height={normalize(14)} />
                <Skeleton width="40%" height={normalize(14)} />
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  if (loading && sites.length === 0) {
    return (
      <Screen scrollable={false} backgroundColor={palette.creme} transparentTop>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        {renderSkeleton()}
      </Screen>
    );
  }

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
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <HeroHeader
          source={require('../../../assets/placeholder/kale-header.png')}
          height={hp(14)}
          style={{ marginBottom: hp(1.2) }}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroTextBlock}>
                <AppText variant="caption" style={styles.heroEyebrow} numberOfLines={1}>
                  {brandName}
                </AppText>
                <AppText variant="h6" style={styles.heroTitle} numberOfLines={1}>
                  Your sites
                </AppText>
                <HeaderAddressRow
                  address={brandAddress}
                  iconSize={normalize(15)}
                  style={styles.heroAddressRow}
                  textStyle={styles.heroAddress}
                />
              </View>

              <Pressable
                style={styles.heroIconCircle}
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

            <View style={styles.heroStatsPill}>
              <Ionicons name="business-outline" size={normalize(14)} color={palette.white} />
              <AppText variant="caption" style={styles.heroStatsText} numberOfLines={1}>
                {sites.length === 0
                  ? 'No locations yet'
                  : `${managedCount} of ${sites.length} sites managed`}
              </AppText>
            </View>
          </View>
        </HeroHeader>

        <AppText variant="subheading" style={styles.sectionTitle}>
          What to do today !
        </AppText>

        <View style={styles.actionGrid}>
          {actions.map((item) => (
            <Pressable
              key={item.label}
              style={[styles.actionCard, item.primary && styles.actionCardPrimary]}
              onPress={() => {
                if (item.route) {
                  navigation.navigate(item.route as any);
                } else if (item.action) {
                  item.action();
                }
              }}
            >
              <AppText
                variant="bodyBold"
                style={[styles.actionText, item.primary && styles.actionTextPrimary]}
              >
                {item.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.sitesHeader}>
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
            onPress={() => navigation.navigate('CreateSite' as any)}
            hitSlop={8}
          >
            <Ionicons name="add" size={normalize(16)} color={palette.kale} />
            <AppText variant="bodyBold" style={styles.addLinkText}>
              Add
            </AppText>
          </Pressable>
        </View>

        {sites.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="business-outline" size={normalize(26)} color={palette.kale} />
            </View>
            <AppText variant="bodyBold" style={styles.emptyTitle}>
              No locations yet
            </AppText>
            <AppText variant="bodySmall" style={styles.emptyCopy}>
              Add your first restaurant site so teams can list surplus food nearby.
            </AppText>
            <Pressable
              style={styles.emptyCta}
              onPress={() => navigation.navigate('CreateSite' as any)}
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
            <View key={site.id} style={[styles.siteCard, isExpanded && styles.siteCardExpanded]}>
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
                        Site {index + 1}
                      </AppText>
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

                      <Pressable
                        style={[styles.dangerOutlineBtn, actionLoading && styles.btnDisabled]}
                        disabled={actionLoading}
                        onPress={() => requestDeleteLocation(site.id)}
                      >
                        <AppText variant="bodyBold" style={styles.dangerOutlineText}>
                          Delete location
                        </AppText>
                      </Pressable>
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
                      </View>

                      {site.hasManager ? (
                        <Pressable
                          style={styles.dangerOutlineBtn}
                          onPress={() => requestRemoveManager(site.id, site.managerId)}
                        >
                          <AppText variant="bodyBold" style={styles.dangerOutlineText}>
                            Remove manager
                          </AppText>
                        </Pressable>
                      ) : null}
                    </>
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.stickyFooter, { paddingBottom: safeBottomPadding }]}>
        <Pressable style={styles.logoutBtn} onPress={logout}>
          <AppText variant="bodyBold" style={styles.logoutText}>
            Logout
          </AppText>
        </Pressable>
      </View>
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
  actionCard: {
    backgroundColor: 'white',
    width: '48%',
    paddingVertical: hp(2.3),
    borderRadius: normalize(14),
    marginBottom: hp(1.4),
    alignItems: 'center',
    elevation: 2,
  },
  actionCardPrimary: {
    backgroundColor: palette.kale,
  },
  actionText: {
    textAlign: 'center',
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
  stickyFooter: {
    borderTopWidth: 1,
    borderTopColor: palette.strokecream,
    backgroundColor: palette.creme,
    paddingTop: hp(1.2),
    paddingHorizontal: wp(4),
  },
  logoutBtn: {
    backgroundColor: palette.white,
    paddingVertical: hp(1.5),
    borderRadius: normalize(12),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  logoutText: {
    color: palette.black,
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
  skeletonWrap: {
    paddingBottom: hp(4),
  },
  skeletonHero: {
    height: hp(18),
    width: '100%',
    marginBottom: hp(2.5),
    overflow: 'hidden',
  },
  skeletonTitle: {
    alignItems: 'center',
    marginBottom: hp(2),
  },
  skeletonActionCard: {
    elevation: 0,
    shadowOpacity: 0,
  },
  skeletonSiteCard: {
    elevation: 0,
    shadowOpacity: 0,
  },
});

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  Linking,
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
import { useAppContext } from '@/store/AppContext';
import { useSitesStore } from '@/store/sitesStore';
import { showConfirmAlert } from '@/store/appAlertStore';
import { palette } from '@/theme/colors';
import { showErrorAlert, showInfoAlert } from '@/utils/apiError';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { useSafeBottomPadding } from '@/hooks/useBottomTabPadding';
import { HeaderAddressRow } from '@/components/HeaderAddressRow';
import { hp, normalize, wp } from '@/utils/responsive';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ManageSites'>;

export default function ManageSitesScreen() {
  useTransparentStatusBar('light');
  const safeBottomPadding = useSafeBottomPadding(hp(4));
  const navigation = useNavigation<NavigationProp>();
  const { logout, currentProfile } = useAppContext();
  const {
    organisation,
    sitesWithManagers: sites,
    isFetchingManagers: loading,
    fetchSitesWithManagers,
    removeAccess,
  } = useSitesStore();

  const [expandedSite, setExpandedSite] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [removingManagerSiteId, setRemovingManagerSiteId] = useState<number | null>(null);

  const brandName =
    organisation?.name || currentProfile.organization || 'Business';
  const brandAddress =
    organisation?.address || currentProfile.address || 'No address available';
  const businessLogo = organisation?.logoUrl || currentProfile.logo || null;

  const actions = [
    { label: 'Add Location', route: 'CreateSite', primary: true },
    { label: 'View Analytics', route: 'SiteAnalytics' },
    { label: 'Your Profile', route: 'Account' },
    { label: 'Contact Saveful', action: () => Linking.openURL('https://www.saveful.com/contact') },
  ];

  useFocusEffect(
    React.useCallback(() => {
      fetchSitesWithManagers().catch((e) =>
        showErrorAlert(e, 'Could not load sites', 'Could not load sites'),
      );
    }, [fetchSitesWithManagers]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchSitesWithManagers(true);
    } catch (e) {
      showErrorAlert(e, 'Could not load sites', 'Could not load sites');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemoveManager = async (siteId: number, userId: number) => {
    showConfirmAlert({
      title: 'Remove Manager',
      message: 'Are you sure you want to remove this manager?',
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
      destructive: true,
      onConfirm: async () => {
        if (removingManagerSiteId !== null) return;
        setRemovingManagerSiteId(siteId);
        try {
          await removeAccess(siteId, userId);
          await fetchSitesWithManagers(true);
        } catch (err) {
          showErrorAlert(err, 'Could not remove manager', 'Failed to remove manager');
        } finally {
          setRemovingManagerSiteId(null);
        }
      },
    });
  };

  const handleAssignManager = (siteId: number) => {
    navigation.navigate('CreateSite', {
      mode: 'manager',
      siteId,
    });
  };

  const handleDeleteSite = (_siteId: number) => {
    showInfoAlert('API to be integrated', 'Delete Site');
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
            <Skeleton width={normalize(56)} height={normalize(32)} borderRadius={normalize(8)} />
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: safeBottomPadding }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[palette.primary]}
            tintColor={palette.primary}
          />
        }
      >
        <HeroHeader
          source={require('../../../assets/placeholder/kale-header.png')}
          style={{ marginBottom: hp(2.5) }}
        >
          <View style={[styles.topBar, { paddingTop: hp(2) }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="h6" style={styles.whiteText} numberOfLines={2}>
                {brandName}
              </AppText>

              <HeaderAddressRow
                address={brandAddress}
                iconSize={normalize(22)}
                textStyle={styles.location}
              />
            </View>

            <View style={styles.logoCircle}>
              {businessLogo ? (
                <Image source={{ uri: businessLogo }} style={styles.logoImage} />
              ) : (
                <AppText style={styles.logoFallback}>{brandName[0] || 'B'}</AppText>
              )}
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
                if (item.route) navigation.navigate(item.route as any);
                else item.action?.();
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

        <AppText variant="subheading" style={styles.sectionTitle}>
          Your Sites
        </AppText>

        {sites.length === 0 && (
          <View style={{ paddingHorizontal: wp(5), marginTop: hp(1.2) }}>
            <AppText variant="bodyLarge">No sites created yet</AppText>
          </View>
        )}

        {sites.map((site, index) => (
          <View key={site.id} style={styles.siteCard}>
            <AppText variant="bodyBold" style={styles.siteIndex}>
              Site {index + 1}
            </AppText>

            <View style={styles.siteHeader}>
              <View style={styles.siteLeft}>
                <View style={styles.siteLogoWrap}>
                  <Image
                    source={
                      businessLogo
                        ? { uri: businessLogo }
                        : require('../../../assets/placeholder/kale-header.png')
                    }
                    style={styles.siteLogo}
                  />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="bodyBold" style={styles.siteName} numberOfLines={2}>
                    {site.tradingName}
                  </AppText>

                  <AppText
                    variant="bodySmall"
                    style={styles.siteAddress}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {site.address}
                  </AppText>

                  <AppText variant="bodySmall" style={styles.siteAddress}>
                    {site.postCode}
                  </AppText>
                </View>
              </View>

              <View style={styles.siteActionsCol}>
                <Pressable
                  style={styles.viewBtn}
                  onPress={() => setExpandedSite(expandedSite === site.id ? null : site.id)}
                >
                  <AppText variant="bodyBold" style={styles.viewText}>
                    View
                  </AppText>
                </Pressable>
              </View>
            </View>

            {expandedSite === site.id && (
              <View style={styles.details}>
                <AppText variant="bodyBold">Manager: {site.contactName}</AppText>
                <AppText variant="bodyBold">Email: {site.email}</AppText>
                <AppText variant="bodyBold">Mobile: {site.mobile}</AppText>

                <View style={styles.detailActions}>
                  <Pressable
                    style={[styles.saveBtn, { flex: 1, marginTop: 0 }]}
                    onPress={() => handleAssignManager(site.id)}
                  >
                    <AppText variant="bodyBold" style={styles.viewText}>
                      {site.managerId ? 'Replace Manager' : 'Add Manager'}
                    </AppText>
                  </Pressable>

                  {site.managerId ? (
                    <Pressable
                      style={[
                        styles.saveBtn,
                        {
                          flex: 1,
                          marginTop: 0,
                          backgroundColor: '#D9534F',
                        },
                        removingManagerSiteId === site.id && { opacity: 0.65 },
                      ]}
                      disabled={removingManagerSiteId !== null}
                      onPress={() => {
                        if (site.managerId) {
                          handleRemoveManager(site.id, site.managerId);
                        }
                      }}
                    >
                      <AppText variant="bodyBold" style={styles.viewText}>
                        {removingManagerSiteId === site.id ? 'Removing...' : 'Remove Manager'}
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>

                <Pressable
                  style={[styles.saveBtn, { backgroundColor: '#D9534F' }]}
                  onPress={() => handleDeleteSite(site.id)}
                >
                  <AppText variant="bodyBold" style={styles.viewText}>
                    Delete Site
                  </AppText>
                </Pressable>
              </View>
            )}
          </View>
        ))}

        <View style={styles.bottomActions}>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <AppText variant="bodyBold" style={{ color: palette.black }}>
              Logout
            </AppText>
          </Pressable>

          <Pressable
            style={styles.logoutBtn}
            onPress={() =>
              showConfirmAlert({
                title: 'Delete Account',
                message: 'Are you sure you want to delete your account?',
                confirmLabel: 'Yes, Delete',
                cancelLabel: 'Cancel',
                destructive: true,
                onConfirm: logout,
              })
            }
          >
            <AppText variant="bodyBold" style={{ color: palette.black }}>
              Delete My Account
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: wp(3),
    paddingLeft: wp(4),
    paddingRight: wp(4),
  },
  whiteText: {
    color: 'white',
    fontSize: normalize(20),
  },
  location: {
    color: 'white',
    opacity: 0.8,
    fontSize: normalize(16),
    paddingTop: hp(0.5),
  },
  logoCircle: {
    width: normalize(50),
    height: normalize(50),
    borderRadius: normalize(25),
    flexShrink: 0,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: normalize(25),
  },
  logoFallback: {
    color: palette.eggplant,
    fontWeight: 'bold',
    fontSize: normalize(18),
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
    paddingHorizontal: wp(2),
    borderRadius: normalize(14),
    marginBottom: hp(1.4),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: normalize(64),
    elevation: 2,
  },
  actionCardPrimary: {
    backgroundColor: palette.kale,
  },
  actionText: {
    textAlign: 'center',
    fontSize: normalize(13),
  },
  actionTextPrimary: {
    color: palette.white,
  },
  bottomActions: {
    marginTop: hp(2),
    paddingHorizontal: wp(4),
    gap: hp(1),
  },
  logoutBtn: {
    backgroundColor: palette.creme,
    paddingVertical: hp(1.5),
    marginHorizontal: wp(4),
    borderRadius: normalize(12),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  siteCard: {
    backgroundColor: 'white',
    marginHorizontal: wp(4),
    marginBottom: hp(1.4),
    padding: wp(4),
    borderRadius: normalize(12),
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
    minWidth: 0,
  },
  siteLogoWrap: {
    width: normalize(48),
    height: normalize(48),
    borderRadius: normalize(24),
    overflow: 'hidden',
    marginRight: wp(2.5),
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
  siteIndex: {
    color: palette.primary,
    marginBottom: hp(0.7),
  },
  siteName: {
    flexShrink: 1,
  },
  siteAddress: {
    color: '#777',
  },
  siteActionsCol: {
    alignItems: 'flex-end',
    gap: hp(0.7),
    flexShrink: 0,
  },
  viewBtn: {
    backgroundColor: palette.middlegreen,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.7),
    borderRadius: normalize(8),
  },
  viewText: {
    color: 'white',
    fontSize: normalize(13),
  },
  detailActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2.5),
    marginTop: hp(1.8),
  },
  saveBtn: {
    marginTop: hp(1.2),
    backgroundColor: palette.middlegreen,
    padding: normalize(12),
    borderRadius: normalize(8),
    alignItems: 'center',
  },
  details: {
    marginTop: hp(1.2),
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: hp(1.2),
    gap: hp(0.6),
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

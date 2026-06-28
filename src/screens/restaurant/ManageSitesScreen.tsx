import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  Linking,
  Alert,
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
import { palette } from '@/theme/colors';
import { showErrorAlert } from '@/utils/apiError';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { hp, normalize, wp } from '@/utils/responsive';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ManageSites'>;

export default function ManageSitesScreen() {
  useTransparentStatusBar('light');
  const navigation = useNavigation<NavigationProp>();
  const { logout } = useAppContext();
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

  const actions = [
    { label: 'Add Site & Manager', route: 'CreateSite' },
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
    Alert.alert(
      'Remove Manager',
      'Are you sure you want to remove this manager?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
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
        },
      ],
    );
  };

  const handleAssignManager = (siteId: number) => {
    navigation.navigate('CreateSite', {
      mode: 'manager',
      siteId,
    });
  };

  const handleDeleteSite = (siteId: number) => {
    Alert.alert('Delete Site', 'API to be integrated', [{ text: 'OK' }]);
  };

  const renderSkeleton = () => (
    <View style={{ paddingHorizontal: wp(5) }}>
      <View style={{ height: hp(18), width: '100%', marginBottom: hp(2), overflow: 'hidden' }}>
        <Skeleton width="100%" height="100%" borderRadius={0} />
      </View>
      
      <View style={{ alignItems: 'center', marginBottom: hp(2) }}>
        <Skeleton width={wp(50)} height={normalize(24)} />
      </View>

      <View style={styles.actionGrid}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.actionCard, { elevation: 0, shadowOpacity: 0 }]}>
            <Skeleton width="60%" height={normalize(14)} />
          </View>
        ))}
      </View>

      <View style={{ alignItems: 'center', marginBottom: hp(2) }}>
        <Skeleton width={wp(40)} height={normalize(24)} />
      </View>

      {[1, 2].map((i) => (
        <View key={i} style={[styles.siteCard, { elevation: 0, shadowOpacity: 0 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Skeleton width={normalize(60)} height={normalize(60)} borderRadius={normalize(10)} style={{ marginRight: wp(3) }} />
            <View style={{ flex: 1, gap: 5 }}>
              <Skeleton width="70%" height={normalize(18)} />
              <Skeleton width="90%" height={normalize(14)} />
              <Skeleton width="40%" height={normalize(14)} />
            </View>
          </View>
          <Skeleton width={normalize(60)} height={normalize(35)} borderRadius={normalize(8)} />
        </View>
      ))}
    </View>
  );

  return (
    <Screen scrollable={false} backgroundColor={palette.creme} transparentTop>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[palette.primary]} // Android
            tintColor={palette.primary} // iOS
          />
        }
      >
        {loading ? (
          renderSkeleton()
        ) : (
          <>
            {/* HERO */}
            <HeroHeader
              source={require('../../../assets/placeholder/feed-bg.png')}
              contentStyle={styles.heroContentWrap}
            >
              <View style={styles.heroContent}>
                <AppText variant="h5" style={styles.businessName}>
                  {organisation?.name || 'Business'}
                </AppText>

                {organisation?.logoUrl && (
                  <Image
                    source={{ uri: organisation.logoUrl }}
                    style={styles.logoTopRight}
                  />
                )}
              </View>
            </HeroHeader>

            {/* ACTIONS */}
            <AppText variant="subheading" style={styles.sectionTitle}>
              What to do today !
            </AppText>

            <View style={styles.actionGrid}>
              {actions.map((item) => (
                <Pressable
                  key={item.label}
                  style={styles.actionCard}
                  onPress={() => {
                    if (item.route) navigation.navigate(item.route as any);
                    else item.action?.();
                  }}
                >
                  <AppText variant="bodyBold" style={styles.actionText}>
                    {item.label}
                  </AppText>
                </Pressable>
              ))}
            </View>

            {/* SITES */}
            <AppText variant="subheading" style={styles.sectionTitle}>
              Your Sites
            </AppText>

            {sites.length === 0 && (
              <AppText style={{ textAlign: 'center', marginTop: 20 }}>
                No sites created yet
              </AppText>
            )}

            {sites.map((site, index) => (
              <View key={site.id} style={styles.siteCard}>

                <AppText variant="bodyBold" style={styles.siteIndex}>
                  Site {index + 1}
                </AppText>

                <View style={styles.siteHeader}>
                  <View style={styles.siteLeft}>
                    <Image
                      source={require('../../../assets/placeholder/kale-header.png')}
                      style={styles.siteLogo}
                    />

                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyBold" style={styles.siteName}>
                        {site.tradingName}
                      </AppText>

                      <AppText variant="bodySmall">
                        {site.address}
                      </AppText>

                      <AppText variant="bodySmall">
                        {site.postCode}
                      </AppText>
                    </View>
                  </View>

                  <Pressable
                    style={styles.viewBtn}
                    onPress={() =>
                      setExpandedSite(
                        expandedSite === site.id ? null : site.id
                      )
                    }
                  >
                    <AppText variant="bodyBold" style={{ color: palette.white }}>View</AppText>
                  </Pressable>
                </View>

                {expandedSite === site.id && (
                  <View style={styles.details}>

                    <AppText variant="bodyBold">
                      Manager: {site.contactName}
                    </AppText>

                    <AppText variant="bodyBold">
                      Email: {site.email}
                    </AppText>

                    <AppText variant="bodyBold">
                      Mobile: {site.mobile}
                    </AppText>

                    {/* ACTIONS */}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>

                      {/* ADD / REPLACE MANAGER */}
                      <Pressable
                        style={styles.viewBtn}
                        onPress={() => handleAssignManager(site.id)}
                      >
                        <AppText variant="bodyBold" style={{ color: palette.white }}>
                          {site.managerId ? 'Replace Manager' : 'Add Manager'}
                        </AppText>
                      </Pressable>

                      {/* REMOVE MANAGER */}
                      {site.managerId && (
                        <Pressable
                          style={[styles.viewBtn, removingManagerSiteId === site.id && { opacity: 0.65 }]}
                          disabled={removingManagerSiteId !== null}
                          onPress={() => {
                            if (site.managerId) {
                              handleRemoveManager(site.id, site.managerId);
                            }
                          }}
                        >
                          <AppText variant="bodyBold" style={{ color: palette.white }}>
                            {removingManagerSiteId === site.id ? 'Removing...' : 'Remove Manager'}
                          </AppText>
                        </Pressable>
                      )}

                    </View>

                    {/* DELETE SITE */}
                    <Pressable
                      style={[styles.logoutBtn, { marginTop: 10 }]}
                      onPress={() => handleDeleteSite(site.id)}
                    >
                      <AppText variant="bodyBold">Delete Site</AppText>
                    </Pressable>

                  </View>
                )}
              </View>
            ))}

            {/* FOOTER */}
            <View style={styles.bottomActions}>
              <Pressable style={styles.logoutBtn} onPress={logout}>
                <AppText variant="bodyBold">Logout</AppText>
              </Pressable>

              <Pressable
                style={styles.logoutBtn}
                onPress={() =>
                  Alert.alert('Delete Account', 'API to be added soon')
                }
              >
                <AppText variant="bodyBold">Delete My Account</AppText>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({

  heroContentWrap: {
    justifyContent: 'center',
    marginBottom: hp(2),
  },

  logoTopRight: {
    width: wp(22),
    height: wp(22),
    borderRadius: wp(11),
    resizeMode: 'cover',
    position: 'absolute',
    right: wp(5),
  },

  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp(4),
  },

  businessName: {
    color: 'white',
    fontSize: normalize(24),
  },

  logo: {
    width: wp(24),
    height: hp(6),
    resizeMode: 'contain',
  },

  sectionTitle: {
    marginHorizontal: wp(5),
    marginBottom: hp(2),
    textAlign: 'center',
    fontSize: normalize(20),
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
    paddingVertical: hp(2.5),
    borderRadius: normalize(14),
    marginBottom: hp(1.5),
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  actionText: {
    textAlign: 'center',
    fontSize: normalize(14),
  },

  bottomActions: {
    marginTop: hp(2),
    paddingHorizontal: wp(5),
    gap: hp(1),
    paddingBottom: hp(4),
  },

  logoutBtn: {
    backgroundColor: palette.creme,
    paddingVertical: hp(1.8),
    borderRadius: normalize(12),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },

  siteCard: {
    backgroundColor: 'white',
    marginHorizontal: wp(4),
    marginBottom: hp(1.5),
    padding: wp(4),
    borderRadius: normalize(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  siteLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },

  siteLogo: {
    width: normalize(40),
    height: normalize(40),
    marginRight: wp(3),
    resizeMode: 'contain',
  },

  siteIndex: {
    color: palette.primary,
    marginBottom: hp(0.5),
    fontSize: normalize(14),
  },

  siteName: {
    flexShrink: 1,
    fontSize: normalize(16),
  },

  siteAddress: {
    color: '#777',
    fontSize: normalize(14),
  },

  viewBtn: {
    backgroundColor: palette.middlegreen,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderRadius: normalize(8),
  },

  editBtn: {
    backgroundColor: palette.blueberry,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.8),
    borderRadius: normalize(8),
  },

  viewText: {
    color: 'white',
    fontSize: normalize(14),
  },

  input: {
    backgroundColor: '#FAFAFA',
    padding: hp(1.2),
    borderRadius: normalize(8),
    borderWidth: 1,
    borderColor: '#eee',
    fontSize: normalize(14),
  },

  inputWrapper: {
    position: 'relative',
  },

  eyeIcon: {
    position: 'absolute',
    right: wp(2.5),
    top: hp(1.5),
  },

  saveBtn: {
    marginTop: hp(1.2),
    backgroundColor: palette.middlegreen,
    padding: hp(1.5),
    borderRadius: normalize(8),
    alignItems: 'center',
  },

  details: {
    marginTop: hp(1.2),
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: hp(1.2),
    gap: hp(0.8),
  },
});
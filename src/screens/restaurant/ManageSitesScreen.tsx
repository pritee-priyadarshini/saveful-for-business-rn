import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  ImageBackground,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { useAppContext } from '@/store/AppContext';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { sitesService } from '@/services/sites.service';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ManageSites'>;

export default function ManageSitesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { logout } = useAppContext();

  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [organisation, setOrganisation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const actions = [
    { label: 'Create Site', route: 'CreateSite' },
    { label: 'View Analytics', route: 'SiteAnalytics' },
    { label: 'Your Profile', route: 'AdminProfile' },
    { label: 'Contact Saveful', action: () => Linking.openURL('https://www.saveful.com/contact') },
  ];

  useFocusEffect(
    React.useCallback(() => {
      fetchSites();
    }, [])
  );

  const fetchSites = async () => {
    try {
      setLoading(true);
      const res = await sitesService.getOrganisation();
      const data = res.data;
      setOrganisation(data.organisation);

      const sitesWithManagers = await Promise.all(
        (data.sites || []).map(async (s: any) => {
          try {
            const staffRes = await sitesService.listStaff(s.id);
            const staff = staffRes.data || [];

            const managerEntry = staff.find(
              (u: any) => u.siteRole === 'SITE_ADMIN'
            );

            const manager = managerEntry?.user;

            return {
              id: s.id,
              tradingName: s.siteName,
              address: s.address,
              postCode: s.postcode,
              managerId: managerEntry?.userId || null,
              contactName: manager ? `${manager.firstName} ${manager.lastName}` : 'Manager not yet assigned',
              email: manager?.email || '-',
              mobile: manager?.phoneNumber || '-',
              logo: null,
            };
          } catch (err) {
            console.log(`Staff fetch failed for site ${s.id}`);

            return {
              id: s.id,
              tradingName: s.siteName,
              address: s.address,
              postCode: s.postcode,
              managerId: null,
              contactName: 'No Manager',
              email: '-',
              mobile: '-',
              logo: null,
            };
          }
        })
      );

      setSites(sitesWithManagers);
    } catch (error) {
      console.log('Fetch sites error', error);
    } finally {
      setLoading(false);
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
            try {
              await sitesService.removeAccess(siteId, userId);
              fetchSites();
            } catch (err) {
              Alert.alert('Error', 'Failed to remove manager');
            }
          },
        },
      ]
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

  if (loading) {
    return (
      <Screen>
        <AppText>Loading sites...</AppText>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView>

        {/* HERO */}
        <ImageBackground
          source={require('../../../assets/placeholder/feed-bg.png')}
          style={styles.heroBg}
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
        </ImageBackground>

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
              <AppText variant="label" style={styles.actionText}>
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
                  <AppText variant="label" style={styles.siteName}>
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
                <AppText variant="label" style={{ color: palette.white }}>View</AppText>
              </Pressable>
            </View>

            {expandedSite === site.id && (
              <View style={styles.details}>

                <AppText variant="label">
                  Manager: {site.contactName}
                </AppText>

                <AppText variant="label">
                  Email: {site.email}
                </AppText>

                <AppText variant="label">
                  Mobile: {site.mobile}
                </AppText>

                {/* ACTIONS */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>

                  {/* ADD / REPLACE MANAGER */}
                  <Pressable
                    style={styles.viewBtn}
                    onPress={() => handleAssignManager(site.id)}
                  >
                    <AppText variant="label" style={{ color: palette.white }}>Add / Replace Manager</AppText>
                  </Pressable>

                  {/* REMOVE MANAGER */}
                  {site.managerId && (
                    <Pressable
                      style={styles.viewBtn}
                      onPress={() =>
                        handleRemoveManager(site.id, site.managerId)
                      }
                    >
                      <AppText variant="label" style={{ color: palette.white }}>Remove Manager</AppText>
                    </Pressable>
                  )}

                </View>

                {/* DELETE SITE */}
                <Pressable
                  style={[styles.logoutBtn, { marginTop: 10 }]}
                  onPress={() => handleDeleteSite(site.id)}
                >
                  <AppText variant="label">Delete Site</AppText>
                </Pressable>

              </View>
            )}
          </View>
        ))}

        {/* FOOTER */}
        <View style={styles.bottomActions}>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <AppText variant="label">Logout</AppText>
          </Pressable>

          <Pressable
            style={styles.logoutBtn}
            onPress={() =>
              Alert.alert('Delete Account', 'API to be added soon')
            }
          >
            <AppText variant="label">Delete My Account</AppText>
          </Pressable>
        </View>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({

  heroBg: {
    height: hp(18),
    justifyContent: 'center',
    marginBottom: hp(2),
  },

  logoTopRight: {
    width: wp(30),
    height: hp(10),
    resizeMode: 'contain',
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
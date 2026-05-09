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
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { useAppContext } from '@/store/AppContext';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import { sitesService } from '@/services/sites.service';

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
    height: 140,
    justifyContent: 'center',
    marginBottom: 20,
  },

  logoTopRight: {
    width: 120,
    height: 80,
    resizeMode: 'contain',
    position: 'absolute',
    right: 20,
  },

  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },

  businessName: {
    color: 'white',
  },

  logo: {
    width: 90,
    height: 50,
    resizeMode: 'contain',
  },

  sectionTitle: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  actionCard: {
    backgroundColor: 'white',
    width: '48%',
    paddingVertical: 20,
    borderRadius: 14,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
  },

  actionText: {
    textAlign: 'center',
  },
  bottomActions: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },

  logoutBtn: {
    backgroundColor: palette.creme,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },

  siteCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
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
    width: 40,
    height: 40,
    marginRight: 10,
    resizeMode: 'contain',
  },

  siteIndex: {
    color: palette.primary,
    marginBottom: 6,
  },

  siteName: {
    flexShrink: 1,
  },

  siteAddress: {
    color: '#777',
  },

  viewBtn: {
    backgroundColor: palette.middlegreen,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  editBtn: {
    backgroundColor: palette.blueberry,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },

  viewText: {
    color: 'white',
  },

  input: {
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },

  inputWrapper: {
    position: 'relative',
  },

  eyeIcon: {
    position: 'absolute',
    right: 10,
    top: 12,
  },

  saveBtn: {
    marginTop: 10,
    backgroundColor: palette.middlegreen,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  details: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
});
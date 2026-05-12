import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';

import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { useAppContext } from '@/store/AppContext';
import { charityService } from '@/services/charity.service';

type CharityUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  role: string;
  isActive?: boolean;
};

type CharityOrganisation = {
  id?: number;
  name?: string;
  registrationNumber?: string;
  logoUrl?: string;
  address?: string;
};

type CharityLocation = {
  id?: number;
  locationName?: string;
  address?: string;
  postcode?: string;
};

type CharityProfileData = {
  organisation: CharityOrganisation | null;
  currentUser: CharityUser | null;
  assignedLocation: CharityLocation | null;
};

export default function CharityAdminProfileScreen() {
  const navigation = useNavigation();
  const { authUser } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] =
    useState<CharityProfileData>({
      organisation: null,
      currentUser: null,
      assignedLocation: null,
    });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      let currentUser: CharityUser | null = null;
      if (authUser?.id) {
        const userRes = await charityService.getUser(
          Number(authUser.id)
        );

        currentUser = userRes?.data || null;
      }

      let assignedLocation: CharityLocation | null = null;

      if (
        authUser?.profile?.sites &&
        authUser.profile.sites.length > 0
      ) {
        assignedLocation = authUser.profile.sites[0];
      }
      const organisation = authUser?.profile?.organisation || null;
      setProfileData({
        organisation,
        currentUser,
        assignedLocation,
      });
    } catch (error) {
      console.log(
        'CHARITY_ADMIN_PROFILE_FETCH_ERROR:',
        error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
  };

  const adminName = useMemo(() => {
    if (!profileData.currentUser) return '-';

    return `${profileData.currentUser.firstName || ''} ${profileData.currentUser.lastName || ''}`.trim();
  }, [profileData.currentUser]);

  const profileFields = useMemo(
    () => [
      {
        label: 'Name',
        value: adminName || '-',
        icon: 'person-outline',
      },
      {
        label: 'Email',
        value: profileData.currentUser?.email || '-',
        icon: 'mail-outline',
      },
      {
        label: 'Contact',
        value: profileData.currentUser?.mobile || '-',
        icon: 'call-outline',
      },
      {
        label: 'Role',
        value: profileData.currentUser?.role || '-',
        icon: 'shield-checkmark-outline',
      },
      {
        label: 'Assigned Location',
        value: profileData.assignedLocation?.locationName || 'Head Office',
        icon: 'location-outline',
      },
    ],
    [adminName, profileData]
  );

  if (loading) {
    return (
      <Screen backgroundColor={palette.creme}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator
            size="large"
            color={palette.middlegreen}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        <View style={styles.headerBg}>
          <Image
            source={require('../../../assets/placeholder/feed-bg.png')}
            style={styles.headerImage}
          />

          <View style={styles.headerContent}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={palette.white}
              />
            </Pressable>

            <AppText variant="h5" style={styles.headerTitle} >
              CHARITY ADMIN PROFILE
            </AppText>
          </View>
        </View>

        <View style={styles.profileCard}>
          {profileData.organisation?.logoUrl ? (
            <Image
              source={{ uri: profileData.organisation.logoUrl, }}
              style={styles.logo}
            />
          ) : (
            <View style={styles.placeholderLogo}>
              <Ionicons
                name="image-outline"
                size={40}
                color="#999"
              />
            </View>
          )}

          <AppText variant="h7" style={styles.charityName}>
            {profileData.organisation?.name || 'N/A'}
          </AppText>

          <AppText variant="bodySmall" style={styles.charityId}>
            REG ID:{' '} {profileData.organisation?.registrationNumber || 'N/A'}
          </AppText>
        </View>

        <View style={styles.form}>
          <View style={styles.formHeader}>
            <AppText variant="bodyLarge">
              Super Admin Details
            </AppText>
          </View>

          {profileFields.map((field, index) => (
            <View
              key={`${field.label}-${index}`}
              style={[
                styles.infoRow,
                index !== profileFields.length - 1 &&
                styles.infoBorder,
              ]}
            >
              <View style={styles.infoLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={field.icon as any}
                    size={18}
                    color={palette.middlegreen}
                  />
                </View>

                <View style={styles.textContainer}>
                  <AppText variant="label" style={styles.label}>
                    {field.label}
                  </AppText>

                  <AppText variant="body" style={styles.value} >
                    {field.value}
                  </AppText>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.form}>
          <View style={styles.formHeader}>
            <AppText variant="bodyLarge">
              Organisation Details
            </AppText>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="business-outline"
                  size={18}
                  color={palette.middlegreen}
                />
              </View>

              <View style={styles.textContainer}>
                <AppText variant="label" style={styles.label}>
                  Address
                </AppText>

                <AppText variant="body" style={styles.value} >
                  {profileData.organisation?.address || '-'}
                </AppText>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },

  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerBg: {
    height: 160,
    position: 'relative',
  },

  headerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },

  headerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },

  headerTitle: {
    color: palette.white,
    textAlign: 'center',
  },

  backBtn: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },

  profileCard: {
    backgroundColor: palette.white,
    marginHorizontal: spacing.lg,
    marginTop: -50,
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',

    elevation: 3,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },

  logo: {
    width: 120,
    height: 90,
    resizeMode: 'cover',
    borderRadius: 12,
    marginBottom: spacing.md,
  },

  placeholderLogo: {
    width: 120,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#F3F3F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  charityName: {
    textAlign: 'center',
  },

  charityId: {
    marginTop: spacing.sm,
    color: '#666',
  },

  form: {
    backgroundColor: palette.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,

    elevation: 2,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },

  formHeader: {
    marginBottom: spacing.md,
  },


  infoRow: {
    paddingVertical: spacing.md,
  },

  infoBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },

  infoLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F7F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },

  textContainer: {
    flex: 1,
  },

  label: {
    color: '#777',
    marginBottom: 2,
  },

  value: {
    color: '#111',
    lineHeight: 22,
  },
});
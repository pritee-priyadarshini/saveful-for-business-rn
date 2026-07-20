import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Linking,
  Alert,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pickSquareImage } from '@/utils/pickSquareImage';
import { Picker } from '@react-native-picker/picker';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { HeroHeader } from '../../components/HeroHeader';
import {
  LocationSetupModal,
  type SelectedLocation,
} from '../../components/LocationSetupModal';
import { useAppContext } from '../../store/AppContext';

import { spacing } from '../../theme/spacing';
import { InputField } from '@/components/InputField';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { palette } from '@/theme/colors';
import { useCharityStore } from '@/store/charityStore';
import { useAuthStore } from '@/store/authStore';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import { NotificationPermissionSettings } from '@/components/NotificationPermissionSettings';
import { authService } from '@/services/auth.service';
import { organizationService } from '@/services/organization.service';
import { sitesService } from '@/services/sites.service';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { StatusBar } from 'expo-status-bar';
import {
  resolveProfileDisplayAddress,
  DEFAULT_PICKUP_RADIUS_KM,
} from '@/utils/authSession';
import {
  normalizeAuthProfile,
  resolveProfileCoordinates,
} from '@/utils/coordinates';
import { fetchCurrentLocation } from '@/utils/currentLocation';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

function buildProfileForm(authUser: ReturnType<typeof useAuthStore.getState>['authUser']) {
  const org = authUser?.profile?.organisation;
  const coords = resolveProfileCoordinates(normalizeAuthProfile(authUser));

  return {
    firstName: authUser?.profile?.user?.firstName || '',
    lastName: authUser?.profile?.user?.lastName || '',
    email: authUser?.profile?.user?.email || '',
    mobile: authUser?.profile?.user?.phoneNumber || '',
    businessName: org?.name || '',
    address: resolveProfileDisplayAddress(authUser?.profile),
    registration: org?.registrationNumber || '',
    venueType: org?.venueType || '',
    branding: org?.brandName || '',
    radius: String(DEFAULT_PICKUP_RADIUS_KM),
    latitude: coords?.lat ?? null,
    longitude: coords?.lng ?? null,
  };
}

export function ProfileScreen() {
  useTransparentStatusBar('light');
  const { currentProfile, authUser } = useAppContext();
  const { updateLocation } = useCharityStore();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

  const navigation = useNavigation<NavigationProp>();
  const canGoBack = navigation.canGoBack();

  const [openSection, setOpenSection] = useState<string | null>(null);
  const { submitting, withLock } = useSubmitLock();
  const [logo, setLogo] = useState<string | null>(
    currentProfile.logo || authUser?.profile?.organisation?.logoUrl || null,
  );
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshProfile().catch(() => undefined);
    }, [refreshProfile]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } catch {
      // Silent — profile may still show cached data.
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile]);

  useEffect(() => {
    const remoteLogo = currentProfile.logo || authUser?.profile?.organisation?.logoUrl || null;

    setLogo((current) => {
      if (!remoteLogo) return current;
      if (current?.startsWith('file') || current?.startsWith('content')) return current;
      return remoteLogo;
    });
  }, [currentProfile.logo, authUser?.profile?.organisation?.logoUrl]);

  const rawCreatedAt =
    authUser?.profile?.organisation?.createdAt ||
    authUser?.profile?.user?.createdAt;
  const sinceDate = rawCreatedAt
    ? new Date(rawCreatedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : '';

  const selectedSiteId = authUser?.profile?.sites?.[0]?.id;

  const pickImage = async () => {
    try {
      const uri = await pickSquareImage();
      if (uri) {
        setLogo(uri);
      }
    } catch (error: any) {
      Alert.alert('Image selection failed', 'Please try again.');
    }
  };

  const editLogo = async () => {
    if (!logo) return;
    await pickImage();
  };

  const removeLogo = () => {
    setLogo(null);
  };

  const { selectedRole, logout } = useAppContext();

  const isRestaurant = selectedRole === 'restaurant_single' || selectedRole === 'restaurant_multi';
  const isCharity = selectedRole === 'charity_single' || selectedRole === 'charity_multi';
  const isFarmerConsumer = selectedRole === 'farmer';
  const isFarmBusiness = selectedRole === 'farm_business';
  const isCollector = isCharity || isFarmerConsumer;
  const usesSiteAddress = isRestaurant || isFarmBusiness;

  const [formData, setFormData] = useState(() => buildProfileForm(authUser));

  useEffect(() => {
    setFormData(buildProfileForm(authUser));
  }, [authUser]);

  const updateField = (key: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const applySelectedLocation = ({ latitude, longitude, address }: SelectedLocation) => {
    setFormData((prev: any) => ({
      ...prev,
      address,
      latitude,
      longitude,
    }));
  };

  const handleUseGpsLocation = async () => {
    if (gpsLoading) return;
    setGpsLoading(true);
    try {
      const location = await fetchCurrentLocation();
      if (!location) return;
      applySelectedLocation(location);
    } finally {
      setGpsLoading(false);
    }
  };

  const handleUpdateContact = async () => {
    if (submitting) return;
    await withLock(async () => {
      try {
        await authService.updateProfile({ phoneNumber: formData.mobile.trim() });
        await refreshProfile();
        showSuccessAlert('Contact updated');
      } catch (err) {
        showErrorAlert(err, 'Could not update contact', 'Failed to update contact');
      }
    });
  };

  const handleUpdateBusiness = async () => {
    if (submitting) return;
    await withLock(async () => {
      try {
        const orgId = authUser?.profile?.organisation?.id;
        const siteId = authUser?.profile?.sites?.[0]?.id;
        const trimmedAddress = formData.address.trim();
        const latitude = formData.latitude != null ? Number(formData.latitude) : null;
        const longitude = formData.longitude != null ? Number(formData.longitude) : null;
        const hasCoordinates =
          latitude != null &&
          longitude != null &&
          Number.isFinite(latitude) &&
          Number.isFinite(longitude);

        if (trimmedAddress && !hasCoordinates) {
          Alert.alert(
            'Update location',
            'Please use Search Address or Use My Location so latitude and longitude update with the address.',
          );
          return;
        }

        if (usesSiteAddress) {
          if (!siteId) {
            Alert.alert('Error', 'Site not found');
            return;
          }
          await sitesService.updateSite(siteId, {
            address: trimmedAddress,
            ...(hasCoordinates ? { latitude: latitude!, longitude: longitude! } : {}),
          });
        } else if (isCharity || isFarmerConsumer) {
          if (!siteId) {
            Alert.alert('Error', 'Location not found');
            return;
          }
          await updateLocation(siteId, {
            address: trimmedAddress,
            ...(hasCoordinates ? { latitude: latitude!, longitude: longitude! } : {}),
          });
        }

        // Keep organisation coordinates in sync — discovery / map flows use these.
        if (orgId && hasCoordinates) {
          await organizationService.updateCoordinates(orgId, {
            latitude: latitude!,
            longitude: longitude!,
          });
        }

        if (orgId && (formData.registration.trim() || (isRestaurant && formData.venueType.trim()))) {
          const form = new FormData();
          if (formData.registration.trim()) {
            form.append('registrationNumber', formData.registration.trim());
          }
          if (isRestaurant && formData.venueType.trim()) {
            form.append('venueType', formData.venueType.trim());
          }
          await organizationService.updateOrganisation(orgId, form);
        }

        await refreshProfile();
        showSuccessAlert('Details updated');
      } catch (err) {
        showErrorAlert(err, 'Could not update details', 'Failed to update');
      }
    });
  };

  const handleUpdateExtra = async () => {
    if (submitting) return;
    await withLock(async () => {
      try {
        const orgId = authUser?.profile?.organisation?.id;
        if (!orgId) {
          Alert.alert('Error', 'Organisation not found');
          return;
        }

        const hasNewLogo = logo && (logo.startsWith('file') || logo.startsWith('content'));
        const hasBrandingChange = formData.branding.trim().length > 0;

        if (!hasBrandingChange && !hasNewLogo) {
          Alert.alert('Nothing to save', 'Update branding or choose a logo first.');
          return;
        }

        const form = new FormData();
        if (hasBrandingChange) {
          form.append('brandName', formData.branding.trim());
        }

        if (hasNewLogo) {
          form.append('logo', {
            uri: logo,
            name: 'logo.jpg',
            type: 'image/jpeg',
          } as any);
        }

        await organizationService.updateOrganisation(orgId, form);
        await refreshProfile();
        showSuccessAlert('Branding updated');
      } catch (err) {
        showErrorAlert(err, 'Could not update branding', 'Failed to update branding');
      }
    });
  };

  const [loggingOut, setLoggingOut] = useState(false);

  const runLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      Alert.alert('Logout failed', 'Please try again.');
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    void runLogout();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void runLogout(),
        },
      ],
    );
  };

  const toggle = (key: string) => {
    setOpenSection(openSection === key ? null : key);
  };

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  const showManageAccess =
    isRestaurant || isCharity || (isFarmerConsumer && !!selectedSiteId);

  // DYNAMIC SECTIONS
  const sections = [
    {
      key: 'personal',
      title: 'Personal Details',
      fields: [
        { label: 'First Name', value: formData.firstName, editable: false },
        { label: 'Last Name', value: formData.lastName, editable: false },
        { label: 'Email', value: currentProfile.email || '', editable: false },
        { label: 'Mobile', value: currentProfile.phone, editable: true },
        { label: 'Password', value: '********', editable: true },
      ],
    },
    {
      key: 'notifications',
      title: 'Notifications',
      fields: [],
    },
    {
      key: 'business',
      title: isCharity ? 'Charity Details' : isFarmerConsumer ? 'Farm Details' : 'Business Details',
      fields: isCollector
        ? [
          { label: 'Name', value: currentProfile.organization, editable: false },
          { label: 'Address', value: currentProfile.address, editable: true },
          { label: 'Registration No.', value: formData.registration, editable: true },
        ]
        : [
          { label: 'Name', value: currentProfile.organization, editable: false },
          { label: 'Address', value: currentProfile.address, editable: true },
          { label: 'Registration No.', value: formData.registration, editable: true },
          { label: 'Venue Type', value: formData.venueType || '—', editable: true },
        ],
    },
    {
      key: 'extra',
      title: 'Extra Info (Branding + Logo)',
      fields: [
        { label: 'Branding', value: formData.branding || '—', editable: true },
        { label: 'Logo', value: 'Upload Logo', editable: true, isUpload: true },
      ],
    },
    ...(isCollector
      ? [
        {
          key: 'pickup',
          title: 'Pickup Preferences',
          fields: [
            {
              label: 'Radius (km)',
              value: String(DEFAULT_PICKUP_RADIUS_KM),
              editable: false,
            },
          ],
        },
      ]
      : []),
  ];

  return (
    <Screen backgroundColor={palette.creme} transparentTop scrollable={false}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <LocationSetupModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        initialLocation={
          formData.latitude != null && formData.longitude != null
            ? {
                latitude: Number(formData.latitude),
                longitude: Number(formData.longitude),
                address: formData.address,
              }
            : null
        }
        onConfirm={async (location) => {
          applySelectedLocation(location);
          setLocationModalVisible(false);
        }}
        searchPlaceholder={
          isCharity
            ? 'Search charity address...'
            : isFarmerConsumer || isFarmBusiness
              ? 'Search farm address...'
              : 'Search business address...'
        }
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
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
          height={hp(16)}
          style={{ marginBottom: hp(2) }}
        >
          <View style={styles.headerContent}>
            {canGoBack ? (
              <Pressable
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
                hitSlop={8}
              >
                <Ionicons name="arrow-back" size={normalize(22)} color="white" />
              </Pressable>
            ) : (
              <View style={styles.backBtnSpacer} />
            )}

            <View style={styles.headerTextBlock}>
              <AppText variant="heading" style={styles.white} numberOfLines={2}>
                {currentProfile.name}
              </AppText>

              <AppText variant="caption" style={styles.white} numberOfLines={1}>
                {sinceDate ? `Saveful for Business since ${sinceDate}` : 'Saveful for Business'}
              </AppText>
            </View>

            <View style={styles.profileCircle}>
              {logo ? (
                <Image source={{ uri: logo }} style={styles.profileImage} resizeMode="cover" />
              ) : (
                <AppText variant="bodyBold" style={styles.profileInitial}>
                  {currentProfile.name?.trim()?.[0]?.toUpperCase() || 'S'}
                </AppText>
              )}
            </View>
          </View>
        </HeroHeader>

        <View style={styles.scroll}>

          <Card style={styles.card}>
            <AppText variant="body" style={{ textAlign: 'center' }}>Need a hand?</AppText>

            <View style={styles.centerDivider} />

            <AppText variant="bodySmall">
              We're here to help! If you need a hand with anything in the app, or have any questions feel free to reach out and we'll help out.
            </AppText>

            <Pressable
              style={styles.supportBtn}
              onPress={() => openLink('https://www.saveful.com/contact')}
            >
              <AppText variant='label'>Contact Support </AppText>
            </Pressable>
          </Card>

          {/* DYNAMIC ACCORDIONS */}
          {sections.map((section) => (
            <View key={section.key}>
              <Pressable
                style={styles.accordionHeader}
                onPress={() => toggle(section.key)}
              >
                <AppText variant='label'>{section.title}</AppText>
                <Ionicons
                  name={openSection === section.key ? 'remove' : 'add'}
                  size={18}
                />
              </Pressable>

              {openSection === section.key && (
                <Card style={styles.accordionContent}>

                  {section.key === 'personal' && (
                    <>
                      <InputField label="First Name" value={formData.firstName} editable={false} />
                      <InputField label="Last Name" value={formData.lastName} editable={false} />
                      <InputField
                        label="Email"
                        value={formData.email}
                        editable={false}
                      />
                      <InputField
                        label="Mobile"
                        value={formData.mobile}
                        editable={true}
                        onChangeText={(v) => updateField('mobile', v)}
                      />
                      <View style={{ marginTop: spacing.sm }}>
                        <AppText variant="bodyBold">Password</AppText>
                        <Pressable
                          style={styles.passwordLink}
                          onPress={() => navigation.navigate('ForgotPassword')}
                        >
                          <AppText variant="body" style={styles.linkText}>
                            Change Password
                          </AppText>
                          <Ionicons name="chevron-forward" size={16} color={palette.primary} />
                        </Pressable>
                      </View>
                    </>
                  )}

                  {section.key === 'notifications' && <NotificationPermissionSettings />}

                  {section.key === 'business' && (
                    <>
                      <InputField
                        label="Name"
                        value={formData.businessName}
                        editable={false}
                      />

                      <View style={styles.locationSection}>
                        <AppText variant="bodyBold">Address / Location</AppText>
                        <AppText variant="bodySmall" style={styles.locationHint}>
                          Update address with map search so latitude and longitude stay accurate for pickups.
                        </AppText>

                        <View style={styles.locationPickerRow}>
                          <Pressable
                            style={[styles.locationPickerBtn, gpsLoading && styles.locationPickerBtnDisabled]}
                            onPress={handleUseGpsLocation}
                            disabled={gpsLoading}
                          >
                            {gpsLoading ? (
                              <ActivityIndicator size="small" color={palette.kale} />
                            ) : (
                              <Ionicons name="locate" size={normalize(14)} color={palette.kale} />
                            )}
                            <AppText style={styles.locationPickerBtnText}>
                              {gpsLoading ? 'Getting location...' : 'Use My Location'}
                            </AppText>
                          </Pressable>

                          <Pressable
                            style={[styles.locationPickerBtn, styles.locationPickerBtnSearch]}
                            onPress={() => setLocationModalVisible(true)}
                          >
                            <Ionicons name="search" size={normalize(14)} color={palette.white} />
                            <AppText style={[styles.locationPickerBtnText, styles.locationPickerBtnTextWhite]}>
                              Search Address
                            </AppText>
                          </Pressable>
                        </View>

                        {!!formData.address && (
                          <View style={styles.selectedAddressBox}>
                            <Ionicons name="checkmark-circle" size={normalize(16)} color={palette.middlegreen} />
                            <AppText style={styles.selectedAddressText} numberOfLines={3}>
                              {formData.address}
                            </AppText>
                          </View>
                        )}

                        {formData.latitude != null && formData.longitude != null ? (
                          <AppText variant="caption" style={styles.coordsHint}>
                            Lat {Number(formData.latitude).toFixed(5)}, Lng {Number(formData.longitude).toFixed(5)}
                          </AppText>
                        ) : null}
                      </View>

                      <InputField
                        label="Registration No."
                        value={formData.registration}
                        editable={true}
                        onChangeText={(v) => updateField('registration', v)}
                      />

                      {!isCollector && (
                        <>
                          <AppText variant="bodyBold">Venue Type</AppText>

                          <View style={[styles.dropdown,]} >
                            <Picker
                              enabled={true}
                              selectedValue={formData.venueType}
                              onValueChange={(value) =>
                                updateField('venueType', value)
                              }
                            >
                              <Picker.Item label="Select venue type" value="" />
                              <Picker.Item label="Cafe/Restaurant" value="CAFE_RESTAURANT" />
                              <Picker.Item label="Bakery" value="BAKERY" />
                              <Picker.Item label="Grocery Store" value="GROCERY_STORE" />
                              <Picker.Item label="Food Truck" value="FOOD_TRUCK" />
                              <Picker.Item label="Caterers" value="CATERING_SERVICE" />
                              <Picker.Item label="Hotel" value="HOTEL" />
                              <Picker.Item label="Wedding Venue" value="WEDDING_VENUE" />
                              <Picker.Item label="Cloud Kitchen" value="CLOUD_KITCHEN" />
                              <Picker.Item label="Other" value="OTHER" />
                            </Picker>
                          </View>
                        </>
                      )}
                    </>
                  )}

                  {section.key === 'extra' && (
                    <>
                      <InputField
                        label="Branding"
                        value={formData.branding}
                        editable={true}
                        onChangeText={(v) => updateField('branding', v)}
                      />

                      <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
                        <AppText variant="bodyBold">Logo</AppText>
                        <AppText variant="bodySmall" style={{ color: palette.textMuted }}>
                          Centre your subject — the logo displays as a circle in the app
                        </AppText>

                        {!logo ? (
                          <Pressable style={styles.uploadBox} onPress={pickImage}>
                            <AppText variant="bodySmall">Select from gallery</AppText>
                          </Pressable>
                        ) : (
                          <View style={styles.logoActions}>
                            <Pressable style={styles.logoPreviewWrap} onPress={editLogo}>
                              <Image
                                source={{ uri: logo }}
                                style={styles.logoPreviewImg}
                                resizeMode="cover"
                              />
                              <View style={styles.editBadge}>
                                <AppText variant="bodyBold" style={styles.editBadgeText}>Edit</AppText>
                              </View>
                            </Pressable>

                            <View style={styles.logoButtons}>
                              <Pressable style={styles.logoActionBtn} onPress={editLogo}>
                                <AppText variant="bodyBold">Crop / Zoom</AppText>
                              </Pressable>
                              <Pressable style={styles.logoActionBtn} onPress={removeLogo}>
                                <AppText variant="bodyBold">Remove</AppText>
                              </Pressable>
                              <Pressable style={[styles.logoActionBtn, styles.logoActionBtnPrimary]} onPress={pickImage}>
                                <AppText variant="bodyBold" style={{ color: palette.white }}>Replace</AppText>
                              </Pressable>
                            </View>
                          </View>
                        )}
                      </View>
                    </>
                  )}

                  {section.key === 'pickup' && (
                    <InputField
                      label="Radius (km)"
                      value={String(DEFAULT_PICKUP_RADIUS_KM)}
                      editable={false}
                    />
                  )}

                  {/* SAVE BUTTON */}
                  {section.key === 'personal' ||
                  section.key === 'business' ||
                  section.key === 'extra' ? (
                    <Pressable
                      style={[styles.saveBtn, submitting && { opacity: 0.65 }]}
                      disabled={submitting}
                      onPress={() => {
                        if (section.key === 'personal') {
                          handleUpdateContact();
                        }

                        if (section.key === 'business') {
                          handleUpdateBusiness();
                        }

                        if (section.key === 'extra') {
                          handleUpdateExtra();
                        }
                      }}
                    >
                      <AppText
                        variant="bodyBold"
                        style={{ color: 'white' }}
                      >
                        {submitting ? 'Saving...' : 'Save Changes'}
                      </AppText>
                    </Pressable>
                  ) : null}

                </Card>
              )}
            </View>
          ))}

          {/* LINKS */}
          {isRestaurant && (
            <Pressable
              style={styles.linkRow}
              onPress={() =>
                navigation.navigate(
                  selectedRole === 'restaurant_multi' ? 'MultiSitePlans' : 'SingleSitePlans',
                )
              }
            >
              <AppText variant='body'>Plans</AppText>
              <Ionicons name="chevron-forward" size={18} />
            </Pressable>
          )}

          {showManageAccess && (
            <Pressable
              style={styles.linkRow}
              onPress={() =>
                navigation.navigate(
                  isCharity
                    ? 'CharityManageAccess'
                    : isFarmerConsumer
                      ? 'FarmerManageAccess'
                      : 'ManageAccess',
                  {
                    locationId: selectedSiteId ?? 0,
                    orgType: isCharity ? 'charity' : isFarmerConsumer ? 'farmer' : 'restaurant',
                  }
                )
              }
            >
              <AppText variant="body">
                Manage Access
              </AppText>

              <Ionicons
                name="people-outline"
                size={18}
              />
            </Pressable>
          )}

          {[
            { label: 'Privacy Policy', url: 'https://www.saveful.com/privacy-policy' },
            { label: 'Terms of Service', url: 'https://www.saveful.com/saveful-for-business-terms-conditions' },
            { label: 'FAQ', url: 'https://www.saveful.com/faq#saveful-for-business-faq' },
          ].map((item, index) => (
            <Pressable
              key={index}
              style={styles.linkRow}
              onPress={() => openLink(item.url)}
            >
              <AppText variant='body'>{item.label}</AppText>
              <Ionicons name="open-outline" size={18} />
            </Pressable>
          ))}

          {/* ACTIONS */}
          <Pressable
            style={[styles.actionBtn, loggingOut && styles.actionBtnDisabled]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            <AppText variant='label'>{loggingOut ? 'Logging out...' : 'Log out'}</AppText>
          </Pressable>

          <Pressable
            style={[styles.actionBtn, loggingOut && styles.actionBtnDisabled]}
            onPress={handleDeleteAccount}
            disabled={loggingOut}
          >
            <AppText variant='label'>Delete my account</AppText>
          </Pressable>

        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },

  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingBottom: hp(1.5),
    gap: spacing.sm,
  },

  backBtn: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  backBtnSpacer: {
    width: normalize(40),
    height: normalize(40),
  },

  headerTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },

  card: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: normalize(8),
    backgroundColor: palette.creme,
    elevation: 4,
  },

  locationSection: {
    gap: hp(0.8),
    marginBottom: hp(0.5),
  },

  locationHint: {
    color: palette.textMuted,
    textTransform: 'none',
  },

  locationPickerRow: {
    flexDirection: 'row',
    gap: wp(2),
  },

  locationPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.2),
    borderWidth: 1,
    borderColor: palette.kale,
    backgroundColor: palette.white,
    borderRadius: normalize(10),
    paddingVertical: hp(1.1),
    paddingHorizontal: wp(2),
  },

  locationPickerBtnSearch: {
    backgroundColor: palette.kale,
    borderColor: palette.kale,
  },

  locationPickerBtnDisabled: {
    opacity: 0.7,
  },

  locationPickerBtnText: {
    color: palette.kale,
    fontSize: normalize(12),
    fontWeight: '700',
    textTransform: 'none',
  },

  locationPickerBtnTextWhite: {
    color: palette.white,
  },

  selectedAddressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2),
    backgroundColor: '#EEF7F1',
    borderRadius: normalize(10),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
  },

  selectedAddressText: {
    flex: 1,
    color: palette.black,
    fontSize: normalize(13),
    lineHeight: normalize(18),
    textTransform: 'none',
  },

  coordsHint: {
    color: palette.midgray,
    textTransform: 'none',
  },

  centerDivider: {
    width: '96%',
    height: 1,
    backgroundColor: palette.border,
  },

  white: {
    color: 'white',
  },

  profileCircle: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(22),
    backgroundColor: '#A8E6CF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },

  profileImage: {
    width: '100%',
    height: '100%',
  },

  profileInitial: {
    color: palette.primary,
  },

  supportBtn: {
    borderWidth: 1,
    borderRadius: normalize(12),
    padding: spacing.sm,
    alignItems: 'center',
  },
  logoPreview: {
    width: wp(20),
    height: hp(10),
    borderRadius: normalize(8),
  },

  logoActions: {
    gap: hp(1.2),
  },

  logoPreviewWrap: {
    alignSelf: 'flex-start',
    width: normalize(120),
    height: normalize(120),
    borderRadius: normalize(60),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: hp(1),
  },

  logoPreviewImg: {
    width: '100%',
    height: '100%',
  },

  editBadge: {
    position: 'absolute',
    right: -wp(2),
    bottom: -hp(0.6),
    backgroundColor: palette.primary,
    paddingHorizontal: wp(2.2),
    paddingVertical: hp(0.4),
    borderRadius: normalize(999),
  },

  editBadgeText: {
    color: palette.white,
    fontSize: normalize(11),
  },

  logoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },

  logoActionBtn: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: normalize(12),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
  },

  logoActionBtnPrimary: {
    backgroundColor: palette.middlegreen,
    borderWidth: 0,
  },

  accordionHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderColor: palette.white,
  },

  accordionContent: {
    marginHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: palette.white,
    borderRadius: normalize(10),
  },

  uploadBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    borderRadius: normalize(12),
    padding: spacing.md,
    alignItems: 'center',
  },

  linkRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderColor: palette.white,
  },

  passwordLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderColor: palette.border,
  },

  linkText: {
    color: palette.primary,
  },

  actionBtn: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: normalize(6),
    borderWidth: 1,
    alignItems: 'center',
  },

  actionBtnDisabled: {
    opacity: 0.6,
  },
  passwordWrapper: {
    position: 'relative',
  },

  saveBtn: {
    backgroundColor: palette.primary,
    padding: spacing.md,
    borderRadius: normalize(12),
    alignItems: 'center',
    marginTop: spacing.xs,
  },

  editableInput: {
    backgroundColor: '#F0FFF4',
    borderColor: palette.middlegreen,
  },

  readOnlyInput: {
    backgroundColor: '#F4F4F5',
    borderColor: '#D4D4D8',
    opacity: 0.9,
  },

  dropdown: {
    borderWidth: 1,
    borderRadius: normalize(12),
    overflow: 'hidden',
  },
});
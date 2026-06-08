import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { useAppContext } from '../../store/AppContext';

import { spacing } from '../../theme/spacing';
import { InputField } from '@/components/InputField';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { palette } from '@/theme/colors';
import { charityService } from '@/services/charity.service';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

export function ProfileScreen() {
  const { currentProfile, authUser, setAuthUser } = useAppContext();
  type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

  const navigation = useNavigation<NavigationProp>();

  const [openSection, setOpenSection] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(
    authUser?.profile?.organisation?.logoUrl ||
    authUser?.profile?.organisation?.logo ||
    null
  );

  const rawCreatedAt =
    authUser?.profile?.organisation?.createdAt ||
    authUser?.profile?.user?.createdAt;
  const sinceDate = rawCreatedAt
    ? new Date(rawCreatedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : '';

  const selectedSiteId = authUser?.profile?.sites?.[0]?.id;

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setLogo(result.assets[0].uri);
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

  const handleUpdateContact = async () => {
    try {
      if (!authUser?.id) {
        Alert.alert('Error', 'User not found');
        return;
      }
      await charityService.updateUser(authUser.id, { mobile: formData.mobile, });

      Alert.alert('Success', 'Contact updated');
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Failed to update contact');
    }
  };

  const handleUpdateLocation = async () => {
    try {
      const locationId = authUser?.profile?.sites?.[0]?.id;
      if (!locationId) {
        Alert.alert('Error', 'Location not found');
        return;
      }

      await charityService.updateLocation(locationId, {
        address: formData.address,
        postcode: '',
        radiusKm: Number(formData.radius),
      });

      Alert.alert('Success', 'Details updated');
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Failed to update');
    }
  };

  const handleUpdateExtra = async () => {
    try {
      const orgId = authUser?.profile?.organisation?.id;
      if (!orgId) {
        Alert.alert('Error', 'Organisation not found');
        return;
      }

      const form = new FormData();
      form.append('brandName', formData.branding);

      if (logo && (logo.startsWith('file') || logo.startsWith('content'))) {
        form.append('logo', {
          uri: logo,
          name: 'logo.jpg',
          type: 'image/jpeg',
        } as any);
      }

      await charityService.updateOrganisation(orgId, form);
      Alert.alert('Success', 'Branding updated');
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Failed to update branding');
    }
  };

  const { logout } = useAppContext();

  const handleLogout = () => {
    logout();
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
          onPress: handleLogout,
        },
      ]
    );
  };

  const site = authUser?.profile?.sites?.[0];

  const [formData, setFormData] = useState<any>({
    firstName: authUser?.profile?.user?.firstName || '',
    lastName: authUser?.profile?.user?.lastName || '',
    email: authUser?.profile?.user?.email || '',
    mobile: authUser?.profile?.user?.phoneNumber || '',
    businessName: authUser?.profile?.organisation?.name || '',
    address: site?.address || '',
    registration: authUser?.profile?.organisation?.registrationNumber || '',
    venueType: authUser?.profile?.organisation?.venueType || '',
    branding: authUser?.profile?.organisation?.branding || '',
    radius: site?.radiusKm ? String(site.radiusKm) : '',
  });

  const updateField = (key: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggle = (key: string) => {
    setOpenSection(openSection === key ? null : key);
  };

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  const { selectedRole } = useAppContext();

  const isRestaurant = selectedRole === 'restaurant_single' || selectedRole === 'restaurant_multi';

  const isCharity = selectedRole === 'charity_single' || selectedRole === 'charity_multi';

  // DYNAMIC SECTIONS
  const sections = [
    {
      key: 'personal',
      title: 'Personal Details',
      fields: [
        { label: 'First Name', value: currentProfile.name.split(' ')[0], editable: false },
        { label: 'Last Name', value: currentProfile.name.split(' ')[1] || '', editable: false },
      ],
    },
    {
      key: 'contact',
      title: 'Contact Details',
      fields: [
        { label: 'Email', value: currentProfile.email || '', editable: false },
        { label: 'Mobile', value: currentProfile.phone, editable: true },
        { label: 'Password', value: '********', editable: true },
      ],
    },
    {
      key: 'business',
      title: isCharity ? 'Charity Details' : 'Business Details',
      fields: isCharity
        ? [
          { label: 'Name', value: currentProfile.organization, editable: false },
          { label: 'Address', value: currentProfile.address, editable: true },
          { label: 'Registration No.', value: formData.registration, editable: true },
        ]
        : [
          { label: 'Name', value: currentProfile.organization, editable: false },
          { label: 'Address', value: currentProfile.address, editable: true },
          { label: 'Registration No.', value: formData.registration, editable: true },
          { label: 'Venue Type', value: 'Bakery', editable: true },
        ],
    },
    {
      key: 'extra',
      title: 'Extra Info (Branding + Logo)',
      fields: [
        { label: 'Branding', value: 'Saveful Brand', editable: true },
        { label: 'Logo', value: 'Upload Logo', editable: true, isUpload: true },
      ],
    },
    ...(isCharity
      ? [
        {
          key: 'pickup',
          title: 'Pickup Preferences',
          fields: [
            { label: 'Radius (km)', value: '5', editable: true },
          ],
        },
      ]
      : []),
  ];

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* HEADER */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/placeholder/modal-head-backgrounda.png')}
            style={styles.headerBg}
            resizeMode='cover'
          />
          <View style={styles.headerContent}>
            <View>
              <AppText variant="heading" style={styles.white}>
                {currentProfile.name}
              </AppText>

              <AppText variant="caption" style={styles.white}>
                {sinceDate ? `Saveful for Business since ${sinceDate}` : 'Saveful for Business'}
              </AppText>
            </View>

            <View style={styles.profileCircle}>
              <AppText variant="bodyBold">
                {currentProfile.name[0]}
              </AppText>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>

          {/* NEED HELP */}
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
                    </>
                  )}

                  {section.key === 'contact' && (
                    <>
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
                          onPress={() =>
                            navigation.navigate('ForgotPassword')
                          }
                        >
                          <AppText variant="body" style={styles.linkText}>
                            Change Password
                          </AppText>

                          <Ionicons name="chevron-forward" size={16} color={palette.primary} />
                        </Pressable>
                      </View>
                    </>
                  )}

                  {section.key === 'business' && (
                    <>
                      <InputField
                        label="Name"
                        value={formData.businessName}
                        editable={false}
                      />

                      <InputField
                        label="Address"
                        value={formData.address}
                        editable={true}
                        onChangeText={(v) => updateField('address', v)}
                      />

                      <InputField
                        label="Registration No."
                        value={formData.registration}
                        editable={true}
                        onChangeText={(v) => updateField('registration', v)}
                      />

                      {!isCharity && (
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
                      value={formData.radius}
                      onChangeText={(v) => updateField('radius', v)}
                    />
                  )}

                  {/* SAVE BUTTON */}
                  {((section.key === 'contact' ||
                    section.key === 'business' ||
                    section.key === 'extra') &&
                    true) ||
                    (section.key === 'pickup' && isCharity) ? (
                    <Pressable
                      style={styles.saveBtn}
                      onPress={() => {
                        if (section.key === 'contact') {
                          handleUpdateContact();
                        }

                        if (section.key === 'business' || section.key === 'pickup') {
                          handleUpdateLocation();
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
                        Save Changes
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
              onPress={() => navigation.navigate('RestaurantPlan')}
            >
              <AppText variant='body'>Plans</AppText>
              <Ionicons name="chevron-forward" size={18} />
            </Pressable>
          )}

          {(isRestaurant || isCharity) && (
            <Pressable
              style={styles.linkRow}
              onPress={() =>
                navigation.navigate(
                  isCharity ? 'CharityManageAccess' : 'ManageAccess',
                  {
                    locationId: selectedSiteId,
                    orgType: isCharity ? 'charity' : 'restaurant',
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
          <Pressable style={styles.actionBtn} onPress={handleLogout}>
            <AppText variant='label'>Log out</AppText>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={handleDeleteAccount}>
            <AppText variant='label'>Delete my account</AppText>
          </Pressable>

        </ScrollView>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
  },

  header: {
    height: hp(25),
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },

  headerBg: {
    width: '100%',
    height: '100%',
  },

  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    marginTop: -(hp(25) - 5),
    zIndex: 1,
  },

  scroll: {
    paddingTop: hp(10),
    paddingBottom: spacing.xl,
  },

  card: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: normalize(8),
    backgroundColor: palette.creme,
    elevation: 4,
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
    width: wp(11),
    height: hp(5.5),
    borderRadius: normalize(22),
    backgroundColor: '#A8E6CF',
    alignItems: 'center',
    justifyContent: 'center',
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
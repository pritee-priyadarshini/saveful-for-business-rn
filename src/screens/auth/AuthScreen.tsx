import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Image,
  ImageBackground,
  Alert,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { Screen } from '../../components/Screen';
import { useAppContext } from '../../store/AppContext';
import { palette } from '../../theme/colors';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { authService } from '@/services/auth.service';
import { mapRole } from '@/utils/roleMapper';
import { spacing } from '@/theme/spacing';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

type NavProp = NativeStackNavigationProp<AuthStackParamList>;

export function AuthScreen() {
  const {
    restaurantForm,
    charityForm,
    selectedRole,
    updateRestaurantField,
    updateCharityField,
  } = useAppContext();

  const navigation = useNavigation<NavProp>();

  const isRestaurant =
    selectedRole === 'restaurant_single' ||
    selectedRole === 'restaurant_multi';

  const [loading, setLoading] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(['personal']);
  const [isChecked, setIsChecked] = useState(false);

  const toggle = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const currentLogo = isRestaurant
    ? restaurantForm.logo
    : (charityForm as any).logo;

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;

      if (isRestaurant) {
        updateRestaurantField('logo', uri);
      } else {
        updateCharityField('logo' as any, uri);
      }
    } catch (error: any) {
      Alert.alert('Image selection failed', 'Please try again.');
    }
  };

  const editLogo = async () => {
    if (!currentLogo) return;
    await pickImage();
  };

  const removeLogo = () => {
    if (isRestaurant) {
      updateRestaurantField('logo', '');
    } else {
      updateCharityField('logo' as any, '');
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);

      const form = new FormData();

      if (isRestaurant) {
        if (restaurantForm.password !== restaurantForm.confirmPassword) {
          Alert.alert('Passwords do not match');
          return;
        }

        form.append('firstName', restaurantForm.firstName);
        form.append('lastName', restaurantForm.lastName);
        form.append('email', restaurantForm.email);
        form.append('password', restaurantForm.password);
        form.append('mobile', restaurantForm.mobile);
        form.append('businessName', restaurantForm.businessName);
        form.append('businessAddress', restaurantForm.businessAddress);
        form.append('registrationNumber', restaurantForm.registrationNumber);
        form.append('brandName', restaurantForm.branding);
        form.append('venueType', restaurantForm.venueType);
        form.append('orgType', mapRole(selectedRole));
        form.append('region', 'IN');
        form.append('latitude', '20.2961');
        form.append('longitude', '85.8245');

        if (restaurantForm.logo) {
          form.append('logo', {
            uri: restaurantForm.logo,
            name: 'logo.jpg',
            type: 'image/jpeg',
          } as any);
        }

        await authService.registerBusiness(form);
      } else {
        if (charityForm.password !== charityForm.confirmPassword) {
          Alert.alert('Passwords do not match');
          return;
        }

        form.append('firstName', charityForm.firstName);
        form.append('lastName', charityForm.lastName);
        form.append('email', charityForm.email);
        form.append('password', charityForm.password);
        form.append('mobile', charityForm.mobile);
        form.append('charityName', charityForm.charityName);
        form.append('charityAddress', charityForm.charityAddress);
        form.append('registrationNumber', charityForm.registrationNumber);
        form.append('brandName', charityForm.branding);
        form.append('charityType', mapRole(selectedRole));
        form.append('pickupPostCode', charityForm.postcodes);
        form.append('pickupRadiusKm', charityForm.pickupRadius || '5');
        form.append('region', 'IN');
        form.append('latitude', '20.2961');
        form.append('longitude', '85.8245');

        if (charityForm.logo) {
          form.append('logo', {
            uri: charityForm.logo,
            name: 'logo.jpg',
            type: 'image/jpeg',
          } as any);
        }

        await authService.registerCharity(form);
      }

      navigation.navigate('EmailVerification');
    } catch (error: any) {
      Alert.alert('Registration failed', error?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <ImageBackground
          source={require('../../../assets/placeholder/kale-header.png')}
          style={styles.headerBg}
          resizeMode="cover"
        >
          <AppText variant="heading" color={palette.white} style={styles.headerTitle}>
            {isRestaurant ? 'Create your Saveful Business Account' : 'Create your Saveful Charity Account'}
          </AppText>
        </ImageBackground>

        <View style={styles.cremeSection}>
          <AppText variant="bodyLarge" style={styles.subHeader}>
            Get set up in minutes and start saving and sharing food.
          </AppText>

          {/* PERSONAL */}
          <Section
            title="Personal Details"
            active={openSections.includes('personal')}
            onPress={() => toggle('personal')}
          >
            <InputField
              label="First Name"
              placeholder="Enter first name"
              value={isRestaurant ? restaurantForm.firstName : charityForm.firstName}
              onChangeText={(v) =>
                isRestaurant
                  ? updateRestaurantField('firstName', v)
                  : updateCharityField('firstName', v)
              }
            />
            <InputField
              label="Last Name"
              placeholder="Enter last name"
              value={isRestaurant ? restaurantForm.lastName : charityForm.lastName}
              onChangeText={(v) =>
                isRestaurant
                  ? updateRestaurantField('lastName', v)
                  : updateCharityField('lastName', v)
              }
            />
          </Section>

          {/* CONTACT */}
          <Section
            title="Contact Details"
            active={openSections.includes('contact')}
            onPress={() => toggle('contact')}
          >
            <InputField
              label="Email"
              placeholder="Enter email"
              value={isRestaurant ? restaurantForm.email : charityForm.email}
              onChangeText={(v) =>
                isRestaurant
                  ? updateRestaurantField('email', v)
                  : updateCharityField('email', v)
              }
            />
            <InputField
              label="Mobile"
              placeholder="Enter mobile"
              value={isRestaurant ? restaurantForm.mobile : charityForm.mobile}
              onChangeText={(v) =>
                isRestaurant
                  ? updateRestaurantField('mobile', v)
                  : updateCharityField('mobile', v)
              }
            />
            <InputField
              label="Password"
              placeholder="Enter password"
              value={isRestaurant ? restaurantForm.password : charityForm.password}
              onChangeText={(v) =>
                isRestaurant
                  ? updateRestaurantField('password', v)
                  : updateCharityField('password', v)
              }
            />
            <InputField
              label="Confirm Password"
              placeholder="Re-enter password"
              value={
                isRestaurant ? restaurantForm.confirmPassword : charityForm.confirmPassword
              }
              onChangeText={(v) =>
                isRestaurant
                  ? updateRestaurantField('confirmPassword', v)
                  : updateCharityField('confirmPassword', v)
              }
            />
          </Section>

          {/* BUSINESS / CHARITY */}
          {isRestaurant ? (
            <Section
              title="Business Details"
              active={openSections.includes('business')}
              onPress={() => toggle('business')}
            >
              <InputField
                label="Business Name"
                placeholder="Enter name"
                value={restaurantForm.businessName}
                onChangeText={(v) => updateRestaurantField('businessName', v)}
              />
              <InputField
                label="Address"
                placeholder="Enter address"
                value={restaurantForm.businessAddress}
                onChangeText={(v) => updateRestaurantField('businessAddress', v)}
              />
              <InputField
                label="Business Registration Number"
                placeholder="Enter number"
                value={restaurantForm.registrationNumber}
                onChangeText={(v) => updateRestaurantField('registrationNumber', v)}
              />

              <AppText variant="label">Venue Type</AppText>
              <View style={styles.dropdown}>
                <Picker
                  selectedValue={restaurantForm.venueType}
                  onValueChange={(value) => updateRestaurantField('venueType', value)}
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
            </Section>
          ) : (
            <Section
              title="Charity / Non Profit Details"
              active={openSections.includes('charity')}
              onPress={() => toggle('charity')}
            >yyy
              <InputField
                label="Charity / Non Profit Name"
                placeholder="Enter name"
                value={charityForm.charityName}
                onChangeText={(v) => updateCharityField('charityName', v)}
              />
              <InputField
                label="Address"
                placeholder="Enter address"
                value={charityForm.charityAddress}
                onChangeText={(v) => updateCharityField('charityAddress', v)}
              />
              <InputField
                label="Registration Number"
                placeholder="Enter number"
                value={charityForm.registrationNumber}
                onChangeText={(v) => updateCharityField('registrationNumber', v)}
              />
              <InputField
                label="Postcode *"
                placeholder="Enter postcode"
                value={charityForm.postcodes}
                onChangeText={(v) => updateCharityField('postcodes', v)}
              />
            </Section>
          )}

          {/* EXTRA INFO */}
          <Section
            title="Extra Info"
            active={openSections.includes('extra')}
            onPress={() => toggle('extra')}
          >
            <InputField
              label="Branding"
              placeholder="Brand name"
              value={
                isRestaurant
                  ? restaurantForm.branding || ''
                  : (charityForm as any).branding || ''
              }
              onChangeText={(v) =>
                isRestaurant
                  ? updateRestaurantField('branding', v)
                  : updateCharityField('branding' as any, v)
              }
            />

            <View style={{ gap: spacing.xs }}>
              <AppText variant="label">Logo</AppText>

              {!currentLogo ? (
                <Pressable style={styles.upload} onPress={pickImage}>
                  <AppText>Upload</AppText>
                </Pressable>
              ) : (
                <View style={styles.logoActions}>
                  <Pressable style={styles.logoPreviewWrap} onPress={editLogo}>
                    <Image
                      source={{ uri: currentLogo }}
                      style={styles.logoPreview}
                      resizeMode="contain"
                    />
                    <View style={styles.editBadge}>
                      <AppText variant="label" style={styles.editBadgeText}>Edit</AppText>
                    </View>
                  </Pressable>

                  <View style={styles.logoButtons}>
                    <Pressable style={styles.secondaryButton} onPress={editLogo}>
                      <AppText variant="label">Crop / Zoom</AppText>
                    </Pressable>
                    <Pressable style={styles.secondaryButton} onPress={removeLogo}>
                      <AppText variant="label">Remove</AppText>
                    </Pressable>
                    <Pressable style={styles.primaryButton} onPress={pickImage}>
                      <AppText variant="label" style={{ color: palette.white }}>Replace</AppText>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </Section>

          {/* PICKUP (Charity only) */}
          {!isRestaurant && (
            <Section
              title="Pickup Preferences"
              active={openSections.includes('pickup')}
              onPress={() => toggle('pickup')}
            >
              <InputField
                label="Radius in Km (can change it later)"
                placeholder="50"
                value={charityForm.pickupRadius}
                onChangeText={(v) => updateCharityField('pickupRadius', v)}
              />
            </Section>
          )}

          <View style={styles.checkboxRow}>
            <Pressable
              style={[styles.checkbox, isChecked && styles.checkboxChecked]}
              onPress={() => setIsChecked(!isChecked)}
            >
              {isChecked && <AppText variant="label" style={styles.tick}>✓</AppText>}
            </Pressable>

            <AppText variant="label" style={styles.disclaimer}>
              By continuing, I agree to the Saveful for Business{' '}
              <AppText
                variant="label"
                style={styles.disclaimerLink}
                onPress={() => Linking.openURL('https://www.saveful.com/app-terms-conditions')}
              >
                Terms & Conditions
              </AppText>
              {' '}and{' '}
              <AppText
                variant="label"
                style={styles.disclaimerLink}
                onPress={() => Linking.openURL('https://www.saveful.com/privacy-policy')}
              >
                Privacy Policy
              </AppText>
              . We’ll send me important updates - I can opt out anytime.
            </AppText>
          </View>

          {/* BUTTON + TIP + DISCLAIMER */}
          <View style={styles.bottomInline}>
            <Button
              label={loading ? 'Creating...' : 'Create Account'}
              onPress={handleRegister}
              disabled={!isChecked || loading}
              style={{ backgroundColor: palette.middlegreen }}
            />

            <AppText variant="label" style={styles.tip}>
              {isRestaurant && (
                <AppText variant="label" style={styles.tip}>
                  No payment required to get started
                </AppText>
              )}
            </AppText>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

/* SECTION */
function Section({ title, active, onPress, children }: any) {
  return (
    <View style={styles.section}>
      <Pressable onPress={onPress} style={styles.sectionHeader}>
        <AppText variant="bodyBold">{title}</AppText>
        <AppText>{active ? '−' : '+'}</AppText>
      </Pressable>
      {active && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: hp(1.5),
    paddingBottom: hp(4),
  },

  headerBg: {
    width: '100%',
    height: hp(20),
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    textAlign: 'center',
    paddingHorizontal: wp(5),
    fontSize: normalize(24),
  },

  cremeSection: {
    backgroundColor: palette.creme,
    padding: wp(5),
    borderBottomLeftRadius: normalize(24),
    borderBottomRightRadius: normalize(24),
    marginBottom: hp(1.5),
  },

  subHeader: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: normalize(16),
  },

  section: {
    borderRadius: normalize(20),
    backgroundColor: palette.creme,
  },

  sectionHeader: {
    padding: wp(4),
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  sectionContent: {
    padding: wp(4),
    gap: hp(1),
    borderTopWidth: 1,
  },

  dropdown: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: normalize(14),
  },

  upload: {
    padding: wp(4),
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: normalize(14),
    alignItems: 'center',
  },

  logoActions: {
    gap: hp(1.2),
  },

  logoPreviewWrap: {
    alignSelf: 'flex-start',
  },

  logoPreview: {
    width: normalize(120),
    height: normalize(120),
    marginTop: hp(1),
    borderRadius: normalize(12),
    borderWidth: 1,
    borderColor: palette.border,
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

  secondaryButton: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: normalize(12),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
  },

  primaryButton: {
    backgroundColor: palette.middlegreen,
    borderRadius: normalize(12),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
  },

  bottomInline: {
    gap: hp(1),
    marginTop: hp(2),
  },

  tip: {
    textAlign: 'center',
    opacity: 0.6,
    fontSize: normalize(12),
  },

  disclaimer: {
    marginTop: hp(1),
    textAlign: 'center',
    opacity: 0.5,
    flex: 1,
    fontSize: normalize(11),
  },

  disclaimerLink: {
    color: palette.primary,
    textDecorationLine: 'underline',
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },

  checkbox: {
    width: normalize(20),
    height: normalize(20),
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: normalize(4),
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxChecked: {
    backgroundColor: palette.primary,
  },

  tick: {
    color: palette.white,
    fontSize: normalize(14),
  },
});
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Image,
  ImageBackground,
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
import { spacing } from '../../theme/spacing';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';

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

  const [openSections, setOpenSections] = useState<string[]>(['personal']);
  const [isChecked, setIsChecked] = useState(false);

  const toggle = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;

      if (isRestaurant) {
        updateRestaurantField('logo', uri);
      } else {
        updateCharityField('logo' as any, uri);
      }
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
                label="Registration Number"
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
                  <Picker.Item label="Cafe" value="cafe" />
                  <Picker.Item label="Bakery" value="bakery" />
                  <Picker.Item label="Grocery Store" value="grocery_store" />
                  <Picker.Item label="Food Truck" value="food_truck" />
                  <Picker.Item label="Restaurant" value="restaurant" />
                  <Picker.Item label="Hotel" value="hotel" />
                  <Picker.Item label="Wedding" value="wedding" />
                  <Picker.Item label="Caterers" value="caterers" />
                  <Picker.Item label="Other" value="other" />
                </Picker>
              </View>
            </Section>
          ) : (
            <Section
              title="Charity / Non Profit Details"
              active={openSections.includes('charity')}
              onPress={() => toggle('charity')}
            >
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

              <Pressable style={styles.upload} onPress={pickImage}>
                <AppText>Upload</AppText>
              </Pressable>

              {/* Image Preview */}
              {(isRestaurant ? restaurantForm.logo : (charityForm as any).logo) && (
                <Image
                  source={{ uri: isRestaurant ? restaurantForm.logo : (charityForm as any).logo }}
                  style={styles.logoPreview}
                  resizeMode="contain"
                />
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
                label="Postcodes"
                placeholder="3000, 3001"
                value={charityForm.postcodes}
                onChangeText={(v) => updateCharityField('postcodes', v)}
              />
              <InputField
                label="Radius (can change it later)"
                placeholder="10 km"
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
              By continuing, you agree to the Saveful for Business Terms & Conditions and Privacy Policy. We’ll send you important updates - you can opt out anytime.
            </AppText>
          </View>

          {/* BUTTON + TIP + DISCLAIMER */}
          <View style={styles.bottomInline}>
            <Button
              label="Create Account"
              onPress={() => {
                if (isChecked) {
                  navigation.navigate('EmailVerification');
                }
              }}
              disabled={!isChecked}
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
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },

  headerBg: {
    width: '100%',
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },

  cremeSection: {
    backgroundColor: palette.creme,
    padding: spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: spacing.md,
  },

  subHeader: {
    textAlign: 'center',
    opacity: 0.7,
  },

  section: {
    borderRadius: 20,
    backgroundColor: palette.creme,
  },

  sectionHeader: {
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  sectionContent: {
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
  },

  dropdown: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
  },

  upload: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    alignItems: 'center',
  },

  logoPreview: {
    width: 120,
    height: 120,
    marginTop: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },

  bottomInline: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  tip: {
    textAlign: 'center',
    opacity: 0.6,
  },

  disclaimer: {
    marginTop: spacing.sm,
    textAlign: 'center',
    opacity: 0.5,
    flex: 1,
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxChecked: {
    backgroundColor: palette.primary,
  },

  tick: {
    color: palette.white,
  },
});
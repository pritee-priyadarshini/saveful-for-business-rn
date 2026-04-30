import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Linking,
  Alert
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

export function ProfileScreen() {
  const { currentProfile } = useAppContext();
  type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

  const navigation = useNavigation<NavigationProp>();

  const [openSection, setOpenSection] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow access to gallery');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setLogo(result.assets[0].uri);
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

  const [formData, setFormData] = useState<any>({
    firstName: currentProfile.name.split(' ')[0],
    lastName: currentProfile.name.split(' ')[1] || '',
    email: 'user@email.com',
    mobile: currentProfile.phone,
    password: '',
    businessName: currentProfile.organization,
    address: currentProfile.address,
    registration: 'REG123',
    venueType: 'Bakery',
    branding: 'Saveful Brand',
    radius: '5',
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
        { label: 'Email', value: 'user@email.com', editable: false },
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
          { label: 'Registration No.', value: 'REG123', editable: true },
        ]
        : [
          { label: 'Name', value: currentProfile.organization, editable: false },
          { label: 'Address', value: currentProfile.address, editable: true },
          { label: 'Registration No.', value: 'REG123', editable: true },
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
            source={require('../../../assets/placeholder/feed-bg.png')}
            style={styles.headerBg}
            resizeMode='cover'
          />
          <View style={styles.headerContent}>
            <View>
              <AppText variant="heading" style={styles.white}>
                {currentProfile.name}
              </AppText>

              <AppText variant="caption" style={styles.white}>
                Saveful for Business since Sep 2025
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

                      <View style={styles.passwordWrapper}>
                        <InputField
                          label="Password"
                          value={formData.password}
                          editable={true}
                          onChangeText={(v) => updateField('password', v)}
                          secureTextEntry={!showPassword}
                        />

                        {true && (
                          <Pressable
                            style={styles.eyeIcon}
                            onPress={() => setShowPassword(prev => !prev)}
                          >
                            <Ionicons
                              name={
                                showPassword
                                  ? 'eye-off-outline'
                                  : 'eye-outline'
                              }
                              size={18}
                              color="#666"
                            />
                          </Pressable>
                        )}
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
                          <AppText variant="label">Venue Type</AppText>

                          <View style={[styles.dropdown,]} >
                            <Picker
                              enabled={true}
                              selectedValue={formData.venueType}
                              onValueChange={(value) =>
                                updateField('venueType', value)
                              }
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

                      <AppText variant="label">Upload Logo</AppText>
                      <Pressable style={[styles.uploadBox,]} onPress={pickImage}
                      >
                        {logo ? (
                          <Image
                            source={{ uri: logo }}
                            style={styles.logoPreview}
                          />
                        ) : (
                          <AppText variant="bodySmall"> Select from gallery </AppText>
                        )}
                      </Pressable>
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
                      onPress={() =>
                        console.log('Saving:', section.key, formData)
                      }
                    >
                      <AppText
                        variant="label"
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
                navigation.navigate( isCharity ? 'CharityManageAccess' : 'ManageAccess' )
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
            { label: 'Terms of Service', url: 'https://www.saveful.com/app-terms-conditions' },
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

          {/* UNITED NATIONS */}
          <Card style={styles.card}>
            <Pressable onPress={() => openLink('https://wedocs.unep.org/items/dbe2cd4c-8384-4636-8359-5847f42b9711')}>
              <AppText variant="bodySmall">
                🌍 ^United Nations Environment Programs's Food Waste Index Report
                2024: Think, Eat, Save, Tracking Food Waste to Halve Global Food Waste.
              </AppText>
            </Pressable>
          </Card>

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
    height: 200,
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
    marginTop: -195,
    zIndex: 1,
  },

  scroll: {
    paddingTop: 80,
    paddingBottom: spacing.xl,
  },

  card: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: 8,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#A8E6CF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  supportBtn: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
  },
  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
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
    borderRadius: 10,
  },

  uploadBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    borderRadius: 12,
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

  actionBtn: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  passwordWrapper: {
    position: 'relative',
  },

  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 38,
  },

  saveBtn: {
    backgroundColor: palette.primary,
    padding: spacing.md,
    borderRadius: 12,
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
    borderRadius: 12,
    overflow: 'hidden',
  },
});
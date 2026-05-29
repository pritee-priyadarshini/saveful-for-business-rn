import React from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
} from 'react-native';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/AppNavigator';
import { useAppContext } from '@/store/AppContext';

import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function AdminProfileScreen() {
  type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

  const navigation = useNavigation<NavigationProp>();

  const { authUser, currentProfile } = useAppContext();

  const organisation = authUser?.profile?.organisation;
  const user = authUser?.profile?.user;
  const adminName =  `${user?.firstName ?? ''} ${user?.lastName ?? ''}`;
  const email = user?.email ?? '';
  const phone = user?.phoneNumber ?? '';
  const organisationName = organisation?.name ?? '';
  const organisationId = organisation?.id ?? '';
  const logoUrl = organisation?.logoUrl ?? '';

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
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
              <Ionicons name="arrow-back" size={24} color={palette.white} />
            </Pressable>

            <AppText variant='h5' style={styles.headerTitle}>
              ADMIN PROFILE
            </AppText>
          </View>

        </View>

        {/* BUSINESS CARD */}
        <View style={styles.profileCard}>
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={styles.logo}
            />
          ) : (
            <View style={styles.emptyLogo}>
              <Ionicons
                name="image-outline"
                size={40}
                color="#999"
              />
            </View>
          )}

          <AppText variant="h7"> {organisationName}</AppText>
          <AppText variant="bodySmall"> ID: {organisationId}</AppText>
        </View>

        {/* ADMIN DETAILS CARD */}
        <View style={styles.detailsCard}>
          <AppText variant="bodyBold" style={styles.sectionTitle} >
            Super Admin Details
          </AppText>

          <View style={styles.fieldBlock}>
            <AppText variant="label"style={styles.label}>
              Name
            </AppText>

            <View style={styles.readOnlyField}>
              <AppText variant="bodySmall"> {adminName} </AppText>
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <AppText variant="label"style={styles.label}>
              Email Address
            </AppText>

            <View style={styles.readOnlyField}>
              <AppText variant="bodySmall"> {email} </AppText>
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <AppText variant="label"style={styles.label}>
              Contact Number
            </AppText>

            <View style={styles.readOnlyField}>
              <AppText variant="bodySmall"> {phone} </AppText>
            </View>
          </View>

        </View>

        {/* CHANGE PASSWORD */}
        <View style={styles.actionCard}>
          <AppText variant="bodyBold" style={styles.sectionTitle} >
            Password
          </AppText>

          <Pressable
            style={styles.passwordBtn}
            onPress={() =>
              navigation.navigate('ForgotPassword')
            }
          >
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={palette.white}
            />

            <AppText variant="label" style={styles.passwordBtnText} >
              Change Password
            </AppText>
          </Pressable>

          <AppText variant="caption" style={styles.helperText}>
            A verification code will be sent to your registered email address.
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
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
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },

  headerTitle: {
    color: palette.white,
  },

  backBtn: {
    position: 'absolute',
    top: 20,
    left: 20,
  },

  profileCard: {
    backgroundColor: palette.white,
    marginHorizontal: spacing.md,
    marginTop: -50,
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 3,
  },

  logo: {
    width: 120,
    height: 90,
    resizeMode: 'contain',
    marginBottom: spacing.sm,
  },

  emptyLogo: {
    width: 120,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  detailsCard: {
    backgroundColor: palette.white,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 16,
    padding: spacing.md,
  },

  actionCard: {
    backgroundColor: palette.white,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 16,
    padding: spacing.md,
  },

  sectionTitle: {
    marginBottom: spacing.md,
  },

  fieldBlock: {
    marginBottom: spacing.md,
  },

  label: {
    marginBottom: spacing.xs,
    color: palette.black,
  },

  readOnlyField: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.stone,
    borderRadius: 12,
    padding: 12,
  },

  passwordBtn: {
    backgroundColor: palette.primary,
    borderRadius: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  passwordBtnText: {
    color: palette.white,
    marginLeft: 8,
  },

  helperText: {
    textAlign: 'center',
    marginTop: spacing.sm,
    opacity: 0.7,
  },
});
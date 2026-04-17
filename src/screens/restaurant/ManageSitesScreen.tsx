import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  ImageBackground,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { useAppContext } from '@/store/AppContext';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ManageSites'>;

type Site = {
  id: string;
  tradingName: string;
  logo: any;
  address: string;
  contactName: string;
  email: string;
  mobile: string;
};

export default function ManageSitesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { logout } = useAppContext();

  const actions = [
    { label: 'Create Site', route: 'CreateSite' },
    { label: 'View Analytics', route: 'SiteAnalytics' },
    { label: 'Your Profile', route: 'AdminProfile' },
    { label: 'Contact Saveful', action: () => Linking.openURL('https://www.saveful.com/contact') },
  ];

  const businessName = 'Burger King India';

  const [expandedSite, setExpandedSite] = useState<string | null>(null);

  const [sites] = useState<Site[]>([
    {
      id: '1',
      tradingName: 'Burger King India - DN Regalia Mall',
      logo: require('../../../assets/intro/burger_king_logo.png'),
      address: 'DN Regalia Mall, Patrapada, Bhubaneswar',
      contactName: 'John Doe',
      email: 'john@demo.com',
      mobile: '+61 400 000 000',
    },
    {
      id: '2',
      tradingName: 'Burger King India - Esplanade Mall',
      logo: require('../../../assets/intro/burger_king_logo.png'),
      address: 'Esplanade Mall, Rasulgarh, Bhubaneswar',
      contactName: 'Jack Phoe',
      email: 'jack@demo.com',
      mobile: '+61 400 123 456',
    },
  ]);

  const businessLogo = sites[0]?.logo;

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView >

        {/* HERO HEADER */}
        <ImageBackground
          source={require('../../../assets/placeholder/feed-bg.png')}
          style={styles.heroBg}
        >
          <View style={styles.heroContent}>
            <AppText variant='h5' style={styles.businessName}>
              {businessName}
            </AppText>

            {businessLogo && (
              <Image
                source={businessLogo}
                style={styles.logoTopRight}
              />
            )}
          </View>
        </ImageBackground>

        {/* WHAT TO DO */}
        <AppText variant='subheading' style={styles.sectionTitle}>
          What to do today !
        </AppText>

        <View style={styles.actionGrid}>
          {actions.map((item) => (
            <Pressable
              key={item.label}
              style={styles.actionCard}
              onPress={() => {
                if (item.route) {
                  navigation.navigate(item.route as any);
                } else if (item.action) {
                  item.action();
                }
              }}
            >
              <AppText variant='label' style={styles.actionText}>
                {item.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        {/* YOUR SITES */}
        <AppText variant='subheading' style={styles.sectionTitle}>
          Your Sites
        </AppText>

        {sites.map((site, index) => (
          <View key={site.id} style={styles.siteCard}>

            {/* SITE NUMBER */}
            <AppText variant='bodyBold' style={styles.siteIndex}>
              Site {index + 1}
            </AppText>

            <View style={styles.siteHeader}>

              {/* LEFT SIDE */}
              <View style={styles.siteLeft}>
                <Image
                  source={site.logo}
                  style={styles.siteLogo}
                />

                <View style={{ flex: 1 }}>
                  <AppText variant='label' style={styles.siteName}>
                    {site.tradingName}
                  </AppText>

                  <AppText variant='bodySmall' style={styles.siteAddress}>
                    {site.address}
                  </AppText>
                </View>
              </View>

              {/* VIEW BUTTON */}
              <Pressable
                style={styles.viewBtn}
                onPress={() =>
                  setExpandedSite(
                    expandedSite === site.id ? null : site.id
                  )
                }
              >
                <AppText variant='label' style={styles.viewText}>
                  View
                </AppText>
              </Pressable>
            </View>

            {/* EXPANDED DETAILS */}
            {expandedSite === site.id && (
              <View style={styles.details}>
                <AppText variant='label'>Manager: {site.contactName}</AppText>
                <AppText variant='label'>Email: {site.email}</AppText>
                <AppText variant='label'>Mobile: {site.mobile}</AppText>
              </View>
            )}
          </View>
        ))}


        <View style={styles.bottomActions}>

          {/* Logout */}
          <Pressable
            style={styles.logoutBtn}
            onPress={logout}
          >
            <AppText variant='label' style={{ color: palette.black }}>
              Logout
            </AppText>
          </Pressable>

          {/* Delete Account */}
          <Pressable
            style={styles.logoutBtn}
            onPress={() =>
              Alert.alert(
                'Delete Account',
                'Are you sure you want to delete your account?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Yes, Delete',
                    style: 'destructive',
                    onPress: logout, // temp logic
                  },
                ]
              )
            }
          >
            <AppText variant='label' style={{ color: palette.black }}>
              Delete My Account
            </AppText>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  viewText: {
    color: 'white',
  },

  details: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
});
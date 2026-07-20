import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import { useAppContext } from '@/store/AppContext';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import {
  ENTERPRISE_CONTACT_OPTIONS,
  ENTERPRISE_LOCATION_OPTIONS,
  type EnterpriseContactPref,
  type EnterpriseLocationRange,
} from './multiSitePlans';
import {
  BUSINESS_VENUE_OPTIONS,
  getBusinessVenueLabel,
} from '@/constants/venueTypes';

const ACCENT = palette.kale;
const FIELD_BORDER = '#D6D6D0';
const CARD_BORDER = `${palette.kale}99`;

type Nav = NativeStackNavigationProp<RootStackParamList, 'EnterpriseConsult'>;

type DetailKey = 'firstName' | 'lastName' | 'businessName' | 'businessType' | 'mobile';

const TEXT_FIELDS: { key: Exclude<DetailKey, 'businessType'>; label: string; keyboard?: 'default' | 'phone-pad' }[] = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'businessName', label: 'Business Name' },
  { key: 'mobile', label: 'Mobile', keyboard: 'phone-pad' },
];

function QuietCheckbox({
  selected,
  label,
  onPress,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.optionCell}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
    >
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected ? (
          <Ionicons name="checkmark" size={normalize(16)} color={ACCENT} />
        ) : null}
      </View>
      <AppText color={palette.black} style={styles.optionLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

function BusinessTypeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayLabel = getBusinessVenueLabel(value) || 'Select business type';

  return (
    <View style={styles.fieldBlock}>
      <AppText color={palette.midgray} style={styles.fieldLabel}>
        Business Type
      </AppText>
      <View style={[styles.typeSelectorBox, expanded && styles.typeSelectorBoxExpanded]}>
        <Pressable
          style={styles.typeSelectorHeader}
          onPress={() => setExpanded((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel="Select business type"
        >
          <AppText color={palette.black} style={styles.typeSelectorValue}>
            {displayLabel}
          </AppText>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={normalize(18)}
            color={ACCENT}
          />
        </Pressable>

        {expanded ? (
          <View style={styles.typeOptionsList}>
            {BUSINESS_VENUE_OPTIONS.map((option) => {
              const isSelected = value === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.typeOptionRow, isSelected && styles.typeOptionRowSelected]}
                  onPress={() => {
                    onChange(option.value);
                    setExpanded(false);
                  }}
                >
                  <View style={[styles.typeRadio, isSelected && styles.typeRadioActive]}>
                    {isSelected ? <View style={styles.typeRadioInner} /> : null}
                  </View>
                  <AppText color={palette.black} style={styles.typeOptionText}>
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function EnterpriseConsultScreen() {
  useTransparentStatusBar('dark');
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { authUser, currentProfile } = useAppContext();

  const initialDetails = useMemo(() => {
    const user = authUser?.profile?.user as
      | { firstName?: string; lastName?: string; phoneNumber?: string }
      | undefined;
    const org = (authUser?.profile?.organisation ??
      authUser?.profile?.organization) as
      | {
          name?: string;
          venueType?: string;
          businessType?: string;
          type?: string;
          category?: string;
        }
      | undefined;

    const firstName = user?.firstName?.trim() || currentProfile.name.split(' ')[0] || '';
    const lastName =
      user?.lastName?.trim() ||
      currentProfile.name.split(' ').slice(1).join(' ') ||
      '';

    const venueType =
      org?.venueType?.trim() ||
      org?.businessType?.trim() ||
      org?.type?.trim() ||
      org?.category?.trim() ||
      '';

    return {
      firstName,
      lastName,
      businessName: org?.name?.trim() || currentProfile.organization || '',
      businessType: venueType,
      mobile: user?.phoneNumber?.trim() || currentProfile.phone || '',
    };
  }, [authUser, currentProfile]);

  const [details, setDetails] = useState(initialDetails);
  const [locationRange, setLocationRange] = useState<EnterpriseLocationRange | null>(null);
  const [contactPref, setContactPref] = useState<EnterpriseContactPref | null>(null);
  const [notes, setNotes] = useState('');

  const updateDetail = (key: DetailKey, value: string) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = () => {
    console.log('Enterprise consult request', {
      details,
      locationRange,
      contactPref,
      notes: notes.trim(),
      businessTypeLabel: getBusinessVenueLabel(details.businessType),
    });
    navigation.navigate('EnterpriseThanks');
  };

  return (
    <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            {
              paddingTop: Math.max(insets.top, hp(1.2)),
              paddingBottom: Math.max(insets.bottom, hp(2)) + hp(2),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={normalize(22)} color={palette.black} />
          </Pressable>

          <AppText color={palette.black} style={styles.title}>
            Let's talk about Enterprise
          </AppText>
          <AppText color={palette.black} style={styles.subtitle}>
            We'll use the details you've already provided and contact you to discuss the best
            solution for your business.
          </AppText>

          <AppText color={palette.midgray} style={styles.sectionLabel}>
            Your details
          </AppText>

          <View style={styles.card}>
            {TEXT_FIELDS.slice(0, 3).map((field) => (
              <View key={field.key} style={styles.fieldBlock}>
                <AppText color={palette.midgray} style={styles.fieldLabel}>
                  {field.label}
                </AppText>
                <TextInput
                  style={styles.textInput}
                  value={details[field.key]}
                  onChangeText={(value) => updateDetail(field.key, value)}
                  placeholder={field.label}
                  placeholderTextColor={palette.midgray}
                  keyboardType={field.keyboard ?? 'default'}
                  autoCapitalize="words"
                />
              </View>
            ))}

            <BusinessTypeSelector
              value={details.businessType}
              onChange={(value) => updateDetail('businessType', value)}
            />

            {TEXT_FIELDS.slice(3).map((field) => (
              <View key={field.key} style={styles.fieldBlock}>
                <AppText color={palette.midgray} style={styles.fieldLabel}>
                  {field.label}
                </AppText>
                <TextInput
                  style={styles.textInput}
                  value={details[field.key]}
                  onChangeText={(value) => updateDetail(field.key, value)}
                  placeholder={field.label}
                  placeholderTextColor={palette.midgray}
                  keyboardType={field.keyboard ?? 'default'}
                  autoCapitalize="none"
                />
              </View>
            ))}
          </View>

          <AppText color={ACCENT} style={styles.moreTitle}>
            We just need a few more details
          </AppText>

          <View style={styles.card}>
            <AppText color={palette.black} style={styles.questionLabel}>
              How many locations do you manage?*
            </AppText>
            <View style={styles.optionsGrid}>
              {ENTERPRISE_LOCATION_OPTIONS.map((option) => (
                <QuietCheckbox
                  key={option.id}
                  label={option.label}
                  selected={locationRange === option.id}
                  onPress={() => setLocationRange(option.id)}
                />
              ))}
            </View>

            <AppText color={palette.black} style={[styles.questionLabel, styles.questionSpacer]}>
              When would you like us to contact you?*
            </AppText>
            <View style={styles.optionsGrid}>
              {ENTERPRISE_CONTACT_OPTIONS.map((option) => (
                <QuietCheckbox
                  key={option.id}
                  label={option.label}
                  selected={contactPref === option.id}
                  onPress={() => setContactPref(option.id)}
                />
              ))}
            </View>

            <AppText color={palette.black} style={[styles.questionLabel, styles.questionSpacer]}>
              Anything you'd like us to know? (Optional)
            </AppText>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="type message here"
              placeholderTextColor={palette.midgray}
              multiline
              textAlignVertical="top"
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
            onPress={onSubmit}
            accessibilityRole="button"
            accessibilityLabel="Request Enterprise Consultation"
          >
            <AppText color={ACCENT} style={styles.submitText}>
              Request Enterprise Consultation
            </AppText>
            <Ionicons name="arrow-forward" size={normalize(18)} color={ACCENT} />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: wp(5),
    gap: hp(1.15),
  },
  backBtn: {
    width: normalize(40),
    height: normalize(36),
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(26),
    lineHeight: normalize(32),
    textAlign: 'center',
    textTransform: 'none',
  },
  subtitle: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(13),
    lineHeight: normalize(19),
    textAlign: 'center',
    textTransform: 'none',
    marginTop: -hp(0.25),
    marginBottom: hp(0.35),
    paddingHorizontal: wp(1),
  },
  sectionLabel: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(13),
    lineHeight: normalize(17),
    textTransform: 'none',
  },
  moreTitle: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(16),
    lineHeight: normalize(21),
    textAlign: 'center',
    textTransform: 'none',
    marginTop: hp(0.5),
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: normalize(12),
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.5),
    gap: hp(1.1),
  },
  fieldBlock: {
    gap: hp(0.45),
  },
  fieldLabel: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(12),
    lineHeight: normalize(15),
    textTransform: 'none',
  },
  textInput: {
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: normalize(10),
    backgroundColor: palette.white,
    paddingHorizontal: wp(3),
    paddingVertical: Platform.OS === 'ios' ? hp(1.15) : hp(0.95),
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(14),
    lineHeight: normalize(19),
    color: palette.black,
  },
  typeSelectorBox: {
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: normalize(10),
    backgroundColor: palette.white,
    overflow: 'hidden',
  },
  typeSelectorBoxExpanded: {
    borderColor: ACCENT,
  },
  typeSelectorHeader: {
    minHeight: normalize(44),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.05),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
  },
  typeSelectorValue: {
    flex: 1,
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(14),
    lineHeight: normalize(19),
    textTransform: 'none',
  },
  typeOptionsList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: FIELD_BORDER,
    maxHeight: normalize(220),
  },
  typeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
  },
  typeOptionRowSelected: {
    backgroundColor: '#F3FAF5',
  },
  typeRadio: {
    width: normalize(18),
    height: normalize(18),
    borderRadius: normalize(9),
    borderWidth: 1.5,
    borderColor: FIELD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
  },
  typeRadioActive: {
    borderColor: ACCENT,
  },
  typeRadioInner: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
    backgroundColor: ACCENT,
  },
  typeOptionText: {
    flex: 1,
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(14),
    lineHeight: normalize(18),
    textTransform: 'none',
  },
  questionLabel: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(13),
    lineHeight: normalize(18),
    textTransform: 'none',
  },
  questionSpacer: {
    marginTop: hp(0.35),
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -wp(1),
  },
  optionCell: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    paddingHorizontal: wp(1),
    paddingVertical: hp(0.7),
  },
  checkbox: {
    width: normalize(24),
    height: normalize(24),
    borderRadius: normalize(6),
    borderWidth: 1.5,
    borderColor: FIELD_BORDER,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: ACCENT,
    backgroundColor: '#F3FAF5',
  },
  optionLabel: {
    flex: 1,
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(13),
    lineHeight: normalize(17),
    textTransform: 'none',
  },
  notesInput: {
    minHeight: normalize(96),
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    backgroundColor: palette.white,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(14),
    lineHeight: normalize(20),
    color: palette.black,
  },
  submitBtn: {
    marginTop: hp(0.5),
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: normalize(12),
    minHeight: normalize(52),
    paddingHorizontal: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.white,
  },
  submitText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    lineHeight: normalize(19),
    textTransform: 'none',
    flex: 1,
    paddingRight: wp(2),
  },
  pressed: {
    opacity: 0.88,
  },
});

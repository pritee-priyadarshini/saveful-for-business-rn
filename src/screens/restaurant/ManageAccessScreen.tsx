import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { InputField } from '../../components/InputField';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useSitesStore } from '@/store/sitesStore';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { hp, normalize } from '@/utils/responsive';
import { useSafeBottomPadding } from '@/hooks/useBottomTabPadding';

const RESTAURANT_ROLE_OPTIONS = [
  { label: 'Site Admin', value: 'SITE_ADMIN' },
  { label: 'Staff', value: 'STAFF' },
];

const inputProps = { compact: true as const, labelVariant: 'bodyBold' as const };

export default function ManageAccessScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const safeBottomPadding = useSafeBottomPadding(hp(4));
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const {
    firstSiteId: siteId,
    maxUsersPerSite: maxUsers,
    staffBySiteId,
    isFetching: loading,
    fetchFirstSiteTeam,
    assignManager,
    addStaff,
    removeAccess,
  } = useSitesStore();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    password: '',
    role: '',
  });

  const [roleExpanded, setRoleExpanded] = useState(false);
  const { submitting, withLock } = useSubmitLock();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const members = siteId ? staffBySiteId[siteId] ?? [] : [];

  const isLimitReached = maxUsers > 0 && members.length >= maxUsers;

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      if (!siteId) {
        Alert.alert('Error', 'No site found');
        return;
      }

      if (!form.firstName.trim() || !form.lastName.trim()) {
        Alert.alert('Error', 'First name and last name are required');
        return;
      }

      if (!form.email.trim() || !form.password.trim() || !form.role) {
        Alert.alert('Error', 'Email, password, and role are required');
        return;
      }

      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        phoneNumber: form.mobile.trim() || undefined,
      };

      await withLock(async () => {
        if (form.role === 'SITE_ADMIN') {
          await assignManager(siteId, payload);
        } else {
          await addStaff(siteId, payload);
        }

        showSuccessAlert('User added');

        setForm({
          firstName: '',
          lastName: '',
          email: '',
          mobile: '',
          password: '',
          role: '',
        });

        Keyboard.dismiss();

        await fetchFirstSiteTeam(true);
      });
    } catch (err: unknown) {
      showErrorAlert(err, 'Could not add user', 'Failed to add user');
    }
  };

  const handleDelete = (userId: number) => {
    if (!siteId) return;

    Alert.alert(
      'Remove user',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (deletingId !== null) return;
            setDeletingId(userId);
            try {
              await removeAccess(siteId, userId);
              await fetchFirstSiteTeam(true);
            } catch (err) {
              showErrorAlert(err, 'Could not remove user', 'Failed to remove user');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    fetchFirstSiteTeam().catch((e) =>
      showErrorAlert(e, 'Could not load team', 'Could not load team members'),
    );
  }, [fetchFirstSiteTeam]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + normalize(20)}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Screen backgroundColor={palette.creme}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.container,
              { paddingBottom: safeBottomPadding + (keyboardVisible ? hp(3) : 0) },
            ]}
            showsVerticalScrollIndicator={false}
          >

        {/* HEADER */}
        <ImageBackground
          source={require('../../../assets/placeholder/kale-header.png')}
          style={styles.headerBg}
        >
          <Pressable style={styles.backIcon} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>

          <View style={styles.headerContent}>
            <AppText variant="h4" style={styles.white}>
              Manage Access
            </AppText>

            <View style={{ height: 6 }} />

            <AppText variant="bodyBold" style={styles.white}>
              Manage your team and permissions
            </AppText>
          </View>
        </ImageBackground>

        {/* SUBTEXT */}
        <View style={styles.subTextBox}>
          <AppText variant="bodySmall">
            Your restaurant is now live. We’ve notified nearby charities and we’ll let you know as soon as surplus is noted and someone claims it
          </AppText>
        </View>

        {/* CURRENT PLAN CARD */}
        <View style={styles.sectionBox}>
          <AppText variant="bodyBold">
            Current Plan
          </AppText>

          <AppText variant="bodySmall">
            $69 / month
          </AppText>

          <AppText variant="bodySmall">
            {members.length} / {maxUsers} users have been added
          </AppText>
        </View>

        {/* FORM CARD */}
        <View style={styles.sectionBox}>
          <AppText variant="bodyBold" style={styles.sectionTitle}>
            Add Team Member
          </AppText>

          <View style={styles.formFields}>
            <InputField
              label="First name"
              placeholder="Enter first name"
              {...inputProps}
              value={form.firstName}
              onChangeText={(v) => setForm({ ...form, firstName: v })}
              autoCapitalize="words"
            />

            <InputField
              label="Last name"
              placeholder="Enter last name"
              {...inputProps}
              value={form.lastName}
              onChangeText={(v) => setForm({ ...form, lastName: v })}
              autoCapitalize="words"
            />

            <InputField
              label="Email"
              placeholder="Enter email"
              {...inputProps}
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <InputField
              label="Phone number"
              placeholder="Enter phone number"
              {...inputProps}
              value={form.mobile}
              onChangeText={(v) => setForm({ ...form, mobile: v })}
              keyboardType="phone-pad"
            />

            <InputField
              label="Password"
              placeholder="Enter password"
              {...inputProps}
              value={form.password}
              onChangeText={(v) => setForm({ ...form, password: v })}
              isPassword
            />

            <View style={styles.pickerField}>
              <AppText variant="bodyBold" style={styles.pickerLabel}>
                Role
              </AppText>
              <View style={[styles.roleSelectorBox, roleExpanded && styles.roleSelectorBoxExpanded]}>
                <Pressable
                  style={styles.roleSelectorHeader}
                  onPress={() => setRoleExpanded((prev) => !prev)}
                >
                  <AppText
                    variant="bodySmall"
                    style={[styles.roleSelectorValue, !form.role && styles.rolePlaceholderText]}
                    numberOfLines={1}
                  >
                    {RESTAURANT_ROLE_OPTIONS.find((o) => o.value === form.role)?.label || 'Select role'}
                  </AppText>
                  <Ionicons
                    name={roleExpanded ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color={palette.kale}
                  />
                </Pressable>
                {roleExpanded ? (
                  <View style={styles.roleOptionsList}>
                    {RESTAURANT_ROLE_OPTIONS.map((option) => {
                      const isSelected = form.role === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          style={[styles.roleOptionRow, isSelected && styles.roleOptionRowSelected]}
                          onPress={() => {
                            setForm({ ...form, role: option.value });
                            setRoleExpanded(false);
                          }}
                        >
                          <View style={[styles.roleRadio, isSelected && styles.roleRadioActive]}>
                            {isSelected ? <View style={styles.roleRadioInner} /> : null}
                          </View>
                          <AppText variant="bodySmall" style={styles.roleOptionText}>
                            {option.label}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <Pressable
            disabled={loading || submitting || isLimitReached}
            onPress={handleSubmit}
            style={[
              styles.addBtn,
              (isLimitReached || submitting) && { backgroundColor: '#ccc' },
            ]}
          >
            <AppText variant="bodyBold" style={styles.white}>
              {submitting ? 'Adding...' : '+ Add User'}
            </AppText>
          </Pressable>
        </View>

        {/* TEAM MEMBERS */}
        <View style={styles.sectionTitleBox}>
          <AppText variant="bodyBold">Team Members</AppText>
        </View>

        {members.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <View>
              <AppText variant="bodyBold"> {member.firstName} {member.lastName} </AppText>
              <AppText variant="bodySmall">{member.email}</AppText>
              <AppText variant="bodySmall">{member.mobile}</AppText>
              <AppText variant="bodySmall"> Role: {member.role === 'SITE_ADMIN' ? 'Site Admin' : 'Staff'}</AppText>
            </View>

            <View style={styles.actions}>
              {member.role !== 'SITE_ADMIN' && (
                <>
                  <Pressable
                    onPress={() => handleDelete(member.id)}
                    disabled={deletingId !== null}
                    style={{ opacity: deletingId === member.id ? 0.5 : 1 }}
                  >
                    {deletingId === member.id ? (
                      <ActivityIndicator size="small" color="red" />
                    ) : (
                      <Ionicons name="trash-outline" size={20} color="red" />
                    )}
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ))}

          </ScrollView>
        </Screen>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },

  headerBg: {
    height: 160,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  backIcon: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
  },

  headerContent: {
    alignItems: 'center',
  },

  white: {
    color: palette.white,
    textAlign: 'center',
  },

  subTextBox: {
    marginHorizontal: spacing.md,
  },

  sectionBox: {
    backgroundColor: palette.white,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.md,
  },

  sectionTitle: {
    textTransform: 'none',
  },

  formFields: {
    gap: spacing.md,
  },

  pickerField: {
    gap: spacing.xs,
  },

  pickerLabel: {
    textTransform: 'none',
    color: palette.black,
  },

  roleSelectorBox: {
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: 10,
    backgroundColor: palette.white,
    overflow: 'hidden',
  },

  roleSelectorBoxExpanded: {
    minHeight: 44,
  },

  roleSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
  },

  roleSelectorValue: {
    flex: 1,
    color: palette.black,
    textTransform: 'none',
    paddingRight: 8,
  },

  rolePlaceholderText: {
    color: palette.stone,
  },

  roleOptionsList: {
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
  },

  roleOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },

  roleOptionRowSelected: {
    backgroundColor: '#F7FAF7',
  },

  roleRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#C8C8C8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  roleRadioActive: {
    borderColor: palette.kale,
  },

  roleRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.kale,
  },

  roleOptionText: {
    flex: 1,
    color: palette.black,
    textTransform: 'none',
  },

  sectionTitleBox: {
    marginHorizontal: spacing.md,
  },

  addBtn: {
    backgroundColor: palette.primary,
    padding: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },

  memberRow: {
    backgroundColor: palette.white,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
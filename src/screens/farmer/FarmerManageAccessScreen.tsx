import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { InputField } from '../../components/InputField';
import { Skeleton } from '../../components/Skeleton';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { FarmerConsumerMemberRole } from '@/services/farmerConsumer.service';
import {
  useFarmerConsumerStore,
  type FarmerConsumerMember,
} from '@/store/farmerConsumerStore';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';

const MIN_PASSWORD_LENGTH = 8;
const FALLBACK_KEYBOARD_HEIGHT = Platform.OS === 'ios' ? 336 : 280;

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

const inputPropsBase = { compact: true as const, labelVariant: 'bodyBold' as const };

const FARMER_ROLE_OPTIONS = [
  { label: 'Site Admin', value: 'site_admin' },
  { label: 'Site Team Member', value: 'site_team_member' },
];

type AccessType = 'user' | 'driver';

const PROTECTED_ROLES = new Set(['SUPER_ADMIN']);

function validatePassword(password: string, confirmPassword: string): string | null {
  if (!password) return 'Please enter a password.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!confirmPassword) return 'Please confirm the password.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  return null;
}

export default function FarmerManageAccessScreen() {
  useTransparentStatusBar('light');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [activeTab, setActiveTab] = useState<AccessType>('user');
  const [roleExpanded, setRoleExpanded] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const activeFieldRef = useRef<View | null>(null);
  const keyboardHeightRef = useRef(0);

  const {
    users: members,
    isFetchingUsers: loadingMembers,
    fetchUsers,
    addMember,
    updateUser,
    deleteUser,
  } = useFarmerConsumerStore();
  const { submitting, withLock } = useSubmitLock();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const scrollActiveFieldIntoView = useCallback(() => {
    const field = activeFieldRef.current;
    if (!field) return;

    requestAnimationFrame(() => {
      field.measureInWindow((_x, fieldY, _w, fieldH) => {
        const gap = hp(2);
        const activeKeyboardHeight = keyboardHeightRef.current || FALLBACK_KEYBOARD_HEIGHT;
        const visibleBottom = height - activeKeyboardHeight - gap;
        const fieldBottom = fieldY + fieldH;

        if (fieldBottom > visibleBottom) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, scrollYRef.current + (fieldBottom - visibleBottom)),
            animated: true,
          });
        }
      });
    });
  }, []);

  const handleFieldFocus = useCallback(
    (field: View) => {
      activeFieldRef.current = field;
      const shortDelay = Platform.OS === 'ios' ? 80 : 150;
      const longDelay = Platform.OS === 'ios' ? 320 : 420;
      setTimeout(scrollActiveFieldIntoView, shortDelay);
      setTimeout(scrollActiveFieldIntoView, longDelay);
    },
    [scrollActiveFieldIntoView],
  );

  const inputProps = {
    ...inputPropsBase,
    onFieldFocus: handleFieldFocus,
  };

  useEffect(() => {
    fetchUsers(true).catch((e) =>
      showErrorAlert(e, 'Could not load team', 'Could not load team members'),
    );
  }, [fetchUsers]);

  useFocusEffect(
    useCallback(() => {
      fetchUsers(true).catch(() => {});
    }, [fetchUsers]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchUsers(true);
    } catch (e) {
      showErrorAlert(e, 'Could not load team', 'Could not load team members');
    } finally {
      setRefreshing(false);
    }
  }, [fetchUsers]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;
      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
      setTimeout(scrollActiveFieldIntoView, Platform.OS === 'ios' ? 80 : 150);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      activeFieldRef.current = null;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollActiveFieldIntoView]);

  const emptyForm = {
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    role: '',
  };

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const mapRoleToApi = (role: string): FarmerConsumerMemberRole => {
    switch (role) {
      case 'site_admin':
        return FarmerConsumerMemberRole.ADMIN;
      case 'site_team_member':
        return FarmerConsumerMemberRole.TEAM_MEMBER;
      case 'driver':
        return FarmerConsumerMemberRole.DRIVER;
      default:
        return FarmerConsumerMemberRole.TEAM_MEMBER;
    }
  };

  const filteredMembers = members.filter((member) => {
    if (activeTab === 'driver') {
      return member.role === 'DRIVER';
    }
    return member.role !== 'DRIVER';
  });

  const mapApiRoleToUI = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'site_admin';
      case 'TEAM_MEMBER':
        return 'site_team_member';
      case 'DRIVER':
        return 'driver';
      default:
        return '';
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setRoleExpanded(false);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      const finalRole = activeTab === 'driver' ? 'driver' : form.role;

      if (!form.firstName.trim() || !form.lastName.trim() || !form.mobile.trim()) {
        showErrorAlert('First name, last name, and mobile are required', 'Error');
        return;
      }

      if (!editingId) {
        if (!form.email.trim() || !finalRole) {
          showErrorAlert('Please fill all required fields', 'Error');
          return;
        }

        const passwordError = validatePassword(form.password, form.confirmPassword);
        if (passwordError) {
          showErrorAlert(passwordError, 'Error');
          return;
        }
      }

      await withLock(async () => {
        if (editingId) {
          await updateUser(Number(editingId), {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            mobile: form.mobile.trim(),
          });

          showSuccessAlert('User updated');
        } else {
          await addMember({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim().toLowerCase(),
            mobile: form.mobile.trim(),
            password: form.password,
            role: mapRoleToApi(finalRole),
          });
          showSuccessAlert(
            activeTab === 'driver'
              ? 'Driver added. Login credentials were sent by email.'
              : 'User added. Login credentials were sent by email.',
          );
        }

        await fetchUsers(true);
        resetForm();
      });
    } catch (e: unknown) {
      showErrorAlert(e, 'Something went wrong', 'Something went wrong');
    }
  };

  const handleEdit = (member: FarmerConsumerMember) => {
    if (!member.id || PROTECTED_ROLES.has(member.role)) return;

    setActiveTab(member.role === 'DRIVER' ? 'driver' : 'user');
    setForm({
      firstName: member.firstName ?? '',
      lastName: member.lastName ?? '',
      email: member.email ?? '',
      mobile: member.mobile ?? '',
      password: '',
      confirmPassword: '',
      role: mapApiRoleToUI(member.role),
    });
    setEditingId(String(member.id));
  };

  const handleDelete = async (id: number) => {
    if (deletingId) return;
    setDeletingId(String(id));
    try {
      await deleteUser(id);
      await fetchUsers(true);
    } catch (e) {
      showErrorAlert(e, 'Could not delete user', 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const prettyRole = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Owner';
      case 'ADMIN':
        return 'Site Admin';
      case 'TEAM_MEMBER':
        return 'Site Team Member';
      case 'DRIVER':
        return 'Driver';
      default:
        return role?.replace(/_/g, ' ') ?? 'Unknown';
    }
  };

  const memberKey = (member: FarmerConsumerMember, index: number) =>
    member.id ? `${member.role}-${member.id}` : `${member.role}-${member.email ?? index}`;

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(14)} borderRadius={0} />
      <View style={styles.skeletonTabRow}>
        <Skeleton width={wp(40)} height={normalize(40)} borderRadius={normalize(10)} />
        <Skeleton width={wp(40)} height={normalize(40)} borderRadius={normalize(10)} />
      </View>
      {[1, 2, 3].map((i) => (
        <Skeleton
          key={i}
          width={wp(92)}
          height={normalize(64)}
          borderRadius={normalize(12)}
          style={styles.skeletonCard}
        />
      ))}
    </View>
  );

  if (loadingMembers && members.length === 0) {
    return (
      <Screen backgroundColor={palette.creme} transparentTop>
        <StackHeroHeader
          title="Manage Access"
          subtitle="Add and manage users & drivers"
          height={hp(14)}
        />
        {renderSkeleton()}
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? normalize(8) : 0}
    >
      <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          onScroll={(event) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.kale} />
          }
          contentContainerStyle={[
            styles.container,
            {
              paddingBottom: keyboardVisible ? keyboardHeight + hp(4) : hp(8),
            },
          ]}
        >
            <StackHeroHeader
              title="Manage Access"
              subtitle="Add and manage users & drivers"
              height={hp(14)}
            />

            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tabPill, activeTab === 'user' && styles.activeTab]}
                onPress={() => {
                  setActiveTab('user');
                  resetForm();
                }}
              >
                <AppText
                  variant="bodyBold"
                  style={[styles.tabText, activeTab === 'user' && styles.activeTabText]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  ellipsizeMode="tail"
                >
                  Add User
                </AppText>
              </Pressable>

              <Pressable
                style={[styles.tabPill, activeTab === 'driver' && styles.activeTab]}
                onPress={() => {
                  setActiveTab('driver');
                  resetForm();
                }}
              >
                <AppText
                  variant="bodyBold"
                  style={[styles.tabText, activeTab === 'driver' && styles.activeTabText]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  ellipsizeMode="tail"
                >
                  Add Driver
                </AppText>
              </Pressable>
            </View>

            <View style={styles.sectionBox}>
              <AppText variant="bodyBold">
                {editingId
                  ? `Edit ${activeTab === 'user' ? 'User' : 'Driver'}`
                  : `Add ${activeTab === 'user' ? 'User' : 'Driver'}`}
              </AppText>

              <View style={styles.formFields}>
                <InputField
                  label="First Name"
                  placeholder="Enter first name"
                  {...inputProps}
                  value={form.firstName}
                  onChangeText={(v) => setForm({ ...form, firstName: v })}
                />

                <InputField
                  label="Last Name"
                  placeholder="Enter last name"
                  {...inputProps}
                  value={form.lastName}
                  onChangeText={(v) => setForm({ ...form, lastName: v })}
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
                  editable={!editingId}
                />

                <InputField
                  label="Mobile"
                  placeholder="Enter mobile number"
                  {...inputProps}
                  value={form.mobile}
                  onChangeText={(v) => setForm({ ...form, mobile: v })}
                  keyboardType="phone-pad"
                />

                {activeTab === 'user' ? (
                  <View style={styles.pickerField}>
                    <AppText variant="bodyBold" style={styles.pickerLabel}>
                      Role
                    </AppText>
                    <View
                      style={[styles.roleSelectorBox, roleExpanded && styles.roleSelectorBoxExpanded]}
                    >
                      <Pressable
                        style={styles.roleSelectorHeader}
                        onPress={() => !editingId && setRoleExpanded((prev) => !prev)}
                      >
                        <AppText
                          variant="bodySmall"
                          style={[styles.roleSelectorValue, !form.role && styles.rolePlaceholderText]}
                          numberOfLines={1}
                        >
                          {FARMER_ROLE_OPTIONS.find((o) => o.value === form.role)?.label ||
                            'Select role'}
                        </AppText>
                        {!editingId ? (
                          <Ionicons
                            name={roleExpanded ? 'chevron-up' : 'chevron-down'}
                            size={normalize(18)}
                            color={palette.kale}
                          />
                        ) : null}
                      </Pressable>
                      {roleExpanded && !editingId ? (
                        <View style={styles.roleOptionsList}>
                          {FARMER_ROLE_OPTIONS.map((option) => {
                            const isSelected = form.role === option.value;
                            return (
                              <Pressable
                                key={option.value}
                                style={[
                                  styles.roleOptionRow,
                                  isSelected && styles.roleOptionRowSelected,
                                ]}
                                onPress={() => {
                                  setForm({ ...form, role: option.value });
                                  setRoleExpanded(false);
                                }}
                              >
                                <View
                                  style={[styles.roleRadio, isSelected && styles.roleRadioActive]}
                                >
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
                ) : (
                  <View style={styles.pickerField}>
                    <AppText variant="label" style={styles.pickerLabel}>
                      Role
                    </AppText>
                    <View style={styles.roleLocked}>
                      <AppText variant="bodyBold">Driver</AppText>
                    </View>
                  </View>
                )}

                {!editingId ? (
                  <>
                    <InputField
                      label="Password"
                      placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                      {...inputProps}
                      value={form.password}
                      onChangeText={(v) => setForm({ ...form, password: v })}
                      isPassword
                    />
                    <InputField
                      label="Confirm Password"
                      placeholder="Re-enter password"
                      {...inputProps}
                      value={form.confirmPassword}
                      onChangeText={(v) => setForm({ ...form, confirmPassword: v })}
                      isPassword
                    />
                  </>
                ) : null}
              </View>

              <Pressable
                style={[styles.addBtn, submitting && { opacity: 0.65 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <AppText variant="bodyBold" style={styles.white}>
                  {submitting
                    ? 'Saving...'
                    : editingId
                      ? 'Update'
                      : `+ Add ${activeTab === 'user' ? 'User' : 'Driver'}`}
                </AppText>
              </Pressable>
            </View>

            <View style={styles.sectionTitleBox}>
              <AppText variant="bodyBold">
                {activeTab === 'user' ? 'Users' : 'Drivers'}
              </AppText>
            </View>

            {filteredMembers.length === 0 ? (
              <View style={styles.emptyWrap}>
                <AppText variant="bodySmall" color={palette.stone}>
                  {activeTab === 'user' ? 'No users added yet' : 'No drivers added yet'}
                </AppText>
              </View>
            ) : (
              filteredMembers.map((member, index) => (
                <View key={memberKey(member, index)} style={styles.memberRow}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyBold">
                      {member.firstName} {member.lastName}
                    </AppText>
                    <AppText variant="bodySmall">Email: {member.email || '—'}</AppText>
                    <AppText variant="bodySmall">Phone: {member.mobile || '—'}</AppText>
                    <AppText variant="bodySmall">Role: {prettyRole(member.role)}</AppText>
                  </View>

                  {!PROTECTED_ROLES.has(member.role) && member.id ? (
                    <View style={styles.actions}>
                      <Pressable onPress={() => handleEdit(member)}>
                        <Ionicons name="create-outline" size={normalize(22)} />
                      </Pressable>

                      <Pressable
                        onPress={() => handleDelete(member.id)}
                        disabled={deletingId !== null}
                        style={{ opacity: deletingId === String(member.id) ? 0.5 : 1 }}
                      >
                        {deletingId === String(member.id) ? (
                          <ActivityIndicator size="small" color={palette.chilli} />
                        ) : (
                          <Ionicons
                            name="trash-outline"
                            size={normalize(22)}
                            color={palette.chilli}
                          />
                        )}
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: hp(2),
    flexGrow: 1,
  },
  tabRow: {
    flexDirection: 'row',
    gap: wp(2.5),
    marginHorizontal: wp(4),
    marginBottom: hp(2),
    paddingBottom: hp(0.5),
  },
  tabPill: {
    flex: 1,
    minWidth: 0,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.5),
    borderRadius: normalize(999),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
  },
  activeTab: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  tabText: {
    color: palette.black,
    textAlign: 'center',
    width: '100%',
  },
  activeTabText: {
    color: palette.white,
  },
  sectionBox: {
    backgroundColor: palette.white,
    padding: wp(4),
    marginHorizontal: wp(4),
    borderRadius: normalize(12),
    borderWidth: 1,
    borderColor: palette.border,
    gap: hp(1.5),
  },
  formFields: {
    gap: spacing.md,
  },
  sectionTitleBox: {
    marginHorizontal: wp(4),
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
    borderRadius: normalize(10),
    backgroundColor: palette.white,
    overflow: 'hidden',
  },
  roleSelectorBoxExpanded: {
    minHeight: normalize(44),
  },
  roleSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    minHeight: normalize(44),
  },
  roleSelectorValue: {
    flex: 1,
    color: palette.black,
    textTransform: 'none',
    paddingRight: wp(2),
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
    gap: wp(2.5),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.1),
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  roleOptionRowSelected: {
    backgroundColor: '#F7FAF7',
  },
  roleRadio: {
    width: normalize(18),
    height: normalize(18),
    borderRadius: normalize(9),
    borderWidth: 2,
    borderColor: '#C8C8C8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleRadioActive: {
    borderColor: palette.kale,
  },
  roleRadioInner: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
    backgroundColor: palette.kale,
  },
  roleOptionText: {
    flex: 1,
    color: palette.black,
    textTransform: 'none',
  },
  roleLocked: {
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: normalize(10),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    backgroundColor: '#F4F4F5',
  },
  addBtn: {
    backgroundColor: palette.primary,
    paddingVertical: hp(1.3),
    borderRadius: normalize(8),
    alignItems: 'center',
    marginTop: hp(0.5),
  },
  white: {
    color: palette.white,
  },
  emptyWrap: {
    marginHorizontal: wp(4),
    paddingVertical: hp(1),
  },
  memberRow: {
    backgroundColor: palette.white,
    padding: wp(4),
    marginHorizontal: wp(4),
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: wp(3),
  },
  skeletonWrap: {
    gap: hp(1.2),
  },
  skeletonTabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: wp(3),
    paddingVertical: hp(1),
  },
  skeletonCard: {
    alignSelf: 'center',
  },
});

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { InputField } from '../../components/InputField';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useSitesStore } from '@/store/sitesStore';
import { useSubscriptionStore, selectCanManageBilling } from '@/store/subscriptionStore';
import { showConfirmAlert } from '@/store/appAlertStore';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import { runPortalSession } from '@/utils/billingFlow';
import { getBillingErrorMessage, isNoBillingAccountError } from '@/utils/billingErrors';
import { billingCycleLabel, formatBillingDate } from '@/utils/billingHelpers';
import { usePlanCancellation } from '@/hooks/usePlanCancellation';
import { PendingPlanChangeBanner } from '@/components/PendingPlanChangeBanner';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { hp, normalize } from '@/utils/responsive';
import { useSafeBottomPadding } from '@/hooks/useBottomTabPadding';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { getSubscriptionRoute } from '@/utils/subscriptionAccess';
import { formatMobileForDisplay } from '@/data/countryCodes';
import { useAppContext } from '@/store/AppContext';

const RESTAURANT_ROLE_OPTIONS = [
  { label: 'Site Admin', value: 'SITE_ADMIN' },
  { label: 'Staff', value: 'STAFF' },
];

const FALLBACK_KEYBOARD_HEIGHT = Platform.OS === 'ios' ? 336 : 280;

const inputPropsBase = { compact: true as const, labelVariant: 'bodyBold' as const };

export default function ManageAccessScreen() {
  useTransparentStatusBar('light');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { selectedRole } = useAppContext();
  const entitlements = useSubscriptionStore((s) => s.entitlements);
  const openPortal = useSubscriptionStore((s) => s.openPortal);
  const isMutating = useSubscriptionStore((s) => s.isMutating);
  const canManageBilling = selectCanManageBilling();

  const planLabel =
    entitlements?.planDisplayName ||
    entitlements?.planName ||
    'No active plan';
  const planStatus = entitlements?.status
    ? entitlements.status.replace(/_/g, ' ').toLowerCase()
    : entitlements?.billingRequired
      ? 'not subscribed'
      : 'free';
  const priceHint = entitlements?.entitled
    ? entitlements.status === 'TRIALING' && entitlements.trialEndsAt
      ? `Trial ends ${new Date(entitlements.trialEndsAt).toLocaleDateString()}`
      : planStatus
    : 'Choose a plan to unlock write access';

  const { cancelPlan, resumePlan, canCancel, canResume, accessUntilLabel } =
    usePlanCancellation();

  // Billing cycle and billed site count only became visible with the plan-change API.
  const billingSummary = React.useMemo(() => {
    if (!entitlements?.entitled) return null;
    const parts: string[] = [];
    if (entitlements.billingCycle) {
      parts.push(`Billed ${billingCycleLabel(entitlements.billingCycle)}`);
    }
    if (entitlements.quantity != null && entitlements.quantity > 0) {
      parts.push(
        `${entitlements.quantity} ${entitlements.quantity === 1 ? 'site' : 'sites'} billed`,
      );
    }
    const renews = formatBillingDate(entitlements.currentPeriodEnd);
    if (renews) {
      parts.push(entitlements.cancelAtPeriodEnd ? `Ends ${renews}` : `Renews ${renews}`);
    }
    return parts.length ? parts.join(' · ') : null;
  }, [entitlements]);
  const route = useRoute();
  const routeLocationId = (route.params as { locationId?: number } | undefined)?.locationId;
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const safeBottomPadding = useSafeBottomPadding(hp(4));
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const activeFieldRef = useRef<View | null>(null);
  const keyboardHeightRef = useRef(0);

  const scrollActiveFieldIntoView = useCallback(() => {
    const field = activeFieldRef.current;
    if (!field) return;

    requestAnimationFrame(() => {
      field.measureInWindow((_x, fieldY, _w, fieldH) => {
        const gap = hp(2.5);
        const activeKeyboardHeight = keyboardHeightRef.current || FALLBACK_KEYBOARD_HEIGHT;
        const visibleBottom = windowHeight - activeKeyboardHeight - gap;
        const fieldBottom = fieldY + fieldH;

        if (fieldBottom > visibleBottom) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, scrollYRef.current + (fieldBottom - visibleBottom)),
            animated: true,
          });
        }
      });
    });
  }, [windowHeight]);

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
  const {
    firstSiteId: storeSiteId,
    maxUsersPerSite: maxUsers,
    staffBySiteId,
    isFetching: loading,
    fetchFirstSiteTeam,
    fetchStaff,
    assignManager,
    addStaff,
    removeAccess,
  } = useSitesStore();

  const siteId =
    routeLocationId != null && routeLocationId > 0 ? routeLocationId : storeSiteId;

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
        showErrorAlert('No site found', 'Error');
        return;
      }

      if (!form.firstName.trim() || !form.lastName.trim()) {
        showErrorAlert('First name and last name are required', 'Error');
        return;
      }

      if (!form.email.trim() || !form.password.trim() || !form.role) {
        showErrorAlert('Email, password, and role are required', 'Error');
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

    showConfirmAlert({
      title: 'Remove user',
      message: 'Are you sure?',
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
      destructive: true,
      onConfirm: async () => {
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
    });
  };

  useEffect(() => {
    fetchFirstSiteTeam().catch((e) =>
      showErrorAlert(e, 'Could not load team', 'Could not load team members'),
    );
  }, [fetchFirstSiteTeam]);

  useEffect(() => {
    if (!siteId) return;
    fetchStaff(siteId, true).catch(() => undefined);
  }, [siteId, fetchStaff]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchFirstSiteTeam(true);
      if (siteId) {
        await fetchStaff(siteId, true);
      }
    } catch (e) {
      showErrorAlert(e, 'Could not load team', 'Could not load team members');
    } finally {
      setRefreshing(false);
    }
  }, [fetchFirstSiteTeam, fetchStaff, siteId]);

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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + normalize(20)}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScroll={(event) => {
              scrollYRef.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            contentContainerStyle={[
              styles.container,
              {
                paddingBottom:
                  safeBottomPadding +
                  (keyboardVisible
                    ? Math.max(keyboardHeight, FALLBACK_KEYBOARD_HEIGHT) * 0.35 + hp(3)
                    : hp(2)),
              },
            ]}
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

        <StackHeroHeader
          title="Manage Access"
          subtitle="Manage your team and permissions"
          height={hp(14)}
        />

        {/* SUBTEXT */}
        <View style={styles.subTextBox}>
          <AppText variant="bodySmall">
            Your site is now live. We’ve notified nearby charities and we’ll let you know as soon as surplus is noted and someone claims it
          </AppText>
        </View>

        {/* CURRENT PLAN CARD */}
        <View style={styles.sectionBox}>
          <AppText variant="bodyBold">
            Current Plan
          </AppText>

          <AppText variant="bodySmall">
            {planLabel}
          </AppText>

          <AppText variant="bodySmall">
            {priceHint}
          </AppText>

          <AppText variant="bodySmall">
            {members.length} / {maxUsers || '—'} users have been added
          </AppText>

          {billingSummary ? (
            <AppText variant="bodySmall">{billingSummary}</AppText>
          ) : null}

          {entitlements?.cancelAtPeriodEnd ? (
            <AppText variant="bodySmall" color={palette.danger}>
              {accessUntilLabel
                ? `Cancelled — access continues until ${accessUntilLabel}.`
                : 'Cancelled — access continues until the end of this period.'}
            </AppText>
          ) : null}

          {entitlements?.pendingPlanId ? (
            <View style={{ marginTop: spacing.sm }}>
              <PendingPlanChangeBanner canManageBilling={canManageBilling} />
            </View>
          ) : null}

          {canManageBilling && entitlements?.entitled ? (
            <Pressable
              style={{ marginTop: spacing.sm }}
              onPress={() => {
                const route = getSubscriptionRoute(selectedRole);
                if (route) navigation.navigate(route);
              }}
              disabled={isMutating}
            >
              <AppText variant="bodyBold" color={palette.primary}>
                Change plan
              </AppText>
            </Pressable>
          ) : null}

          {canManageBilling ? (
            <Pressable
              style={{ marginTop: spacing.sm }}
              onPress={() => {
                const route = getSubscriptionRoute(selectedRole);
                if (!entitlements?.entitled && route) {
                  navigation.navigate(route);
                  return;
                }
                void (async () => {
                  try {
                    const url = await openPortal();
                    await runPortalSession(url);
                  } catch (error) {
                    if (isNoBillingAccountError(error) && route) {
                      navigation.navigate(route);
                      return;
                    }
                    showErrorAlert(
                      error,
                      'Billing',
                      getBillingErrorMessage(
                        error,
                        'We could not open the billing portal. Please try again.',
                      ),
                    );
                  }
                })();
              }}
              disabled={isMutating}
            >
              <AppText variant="bodyBold" color={palette.primary}>
                {!entitlements?.entitled ? 'Choose a plan' : 'Manage billing'}
              </AppText>
            </Pressable>
          ) : null}

          {canManageBilling && (canCancel || canResume) ? (
            <Pressable
              style={{ marginTop: spacing.sm }}
              onPress={canResume ? resumePlan : cancelPlan}
              disabled={isMutating}
            >
              <AppText
                variant="bodyBold"
                color={canResume ? palette.primary : palette.danger}
              >
                {canResume ? 'Resume plan' : 'Cancel plan'}
              </AppText>
            </Pressable>
          ) : null}
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
            <AppText variant="bodyBold" style={styles.addBtnText}>
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
              <AppText variant="bodySmall">{formatMobileForDisplay(member.mobile)}</AppText>
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

  addBtnText: {
    color: palette.white,
    textTransform: 'none',
    fontSize: normalize(16),
    
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
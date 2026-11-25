import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { IN_APP_PLANS_ENABLED } from '@/config/features';
import type { ProductModule } from '@/services/subscriptions.service';
import { useAppContext } from '@/store/AppContext';
import { selectCanManageBilling, useSubscriptionStore } from '@/store/subscriptionStore';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import { getSubscriptionRoute } from '@/utils/subscriptionAccess';
import { isModuleOffered, MODULE_LABEL } from '@/utils/moduleAccess';
import {
  MODULE_FALLBACK_COPY,
  MODULE_THEME,
  planCardCopy,
} from '@/screens/subscription/singleSitePlans';
import { PlanTick } from './PlanCardParts';

/** The same artwork as each module's Home card, so the sheet reads as "that card". */
const MODULE_ART: Record<ProductModule, number> = {
  MFC: require('../../../assets/newmfc/make-food-count-home.png'),
  CONNECT: require('../../../assets/newmfc/saveful-connect-home.png'),
};

/** Ticks shown in the sheet — enough to explain the module, not the whole plan card. */
const UPSELL_TICK_COUNT = 4;

/** What the person should do next, given who they are and the in-app purchase policy. */
export function moduleUpsellMessage(params: {
  module: ProductModule;
  offered: boolean;
  canManageBilling: boolean;
}): string {
  const label = MODULE_LABEL[params.module];
  if (!params.offered) return `${label} isn't available for your type of organisation.`;
  if (!params.canManageBilling) return `Ask your organisation admin to add ${label} to your plan.`;
  if (IN_APP_PLANS_ENABLED) return `Add ${label} to your plan to start using it.`;
  // Plans are sold on the website, not in the app — explain, with no buy link.
  // canManageBilling means this person is the admin, so address them directly.
  return `You can add ${label} to your organisation's plan on the Saveful website.`;
}

/**
 * Explains a module the organisation's plan doesn't include.
 * - `sheet`: the body of the bottom sheet (ModuleUpsellScreen)
 * - `inline`: a small card inside a screen (MFC summary, Food Impact "Redistributed")
 *
 * While IN_APP_PLANS_ENABLED is false it never offers a way to buy.
 */
export function ModuleUpsellPanel({
  module,
  variant = 'sheet',
  onClose,
  closeLabel = 'OK',
  style,
}: {
  module: ProductModule;
  variant?: 'sheet' | 'inline';
  /** Shows a close button (sheet only). */
  onClose?: () => void;
  closeLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const navigation = useNavigation<any>();
  const { selectedRole } = useAppContext();
  const plans = useSubscriptionStore((s) => s.plans);
  const canManageBilling = selectCanManageBilling();
  const offered = isModuleOffered(selectedRole, module);
  const inline = variant === 'inline';

  const theme = MODULE_THEME[module];
  const label = MODULE_LABEL[module];

  // The org's own plan copy when the catalogue is loaded, else the design copy.
  const copy = useMemo(() => {
    const plan = plans.find((p) => p.module === module && !p.contactSalesOnly);
    if (plan) return planCardCopy(plan);
    const fallback = MODULE_FALLBACK_COPY[module];
    return { ...fallback, ticks: fallback.features, allowances: [] };
  }, [module, plans]);

  const message = moduleUpsellMessage({ module, offered, canManageBilling });
  const plansRoute = getSubscriptionRoute(selectedRole);
  const canAddInApp = IN_APP_PLANS_ENABLED && offered && canManageBilling && plansRoute != null;

  return (
    <View
      style={[
        inline ? [styles.inlineCard, { backgroundColor: theme.tint, borderColor: theme.border }] : styles.sheetBody,
        style,
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.artWrap, inline && styles.artWrapInline, { backgroundColor: theme.tint }]}>
          <Image source={MODULE_ART[module]} style={styles.art} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
        <View style={styles.headerCopy}>
          <View style={[styles.lockPill, { backgroundColor: theme.color }]}>
            <Ionicons name="lock-closed" size={normalize(10)} color={palette.white} />
            <AppText color={palette.white} style={styles.lockText}>
              Not in your plan
            </AppText>
          </View>
          <AppText color={theme.color} style={[styles.title, inline && styles.titleInline]}>
            {label}
          </AppText>
          <AppText color={theme.color} style={styles.tagline}>
            {copy.tagline}
          </AppText>
        </View>
      </View>

      {inline ? null : (
        <>
          <AppText color={palette.midgray} style={styles.description}>
            {copy.description}
          </AppText>
          <View style={styles.ticks}>
            {copy.ticks.slice(0, UPSELL_TICK_COUNT).map((tick) => (
              <PlanTick key={tick} label={tick} color={theme.color} />
            ))}
          </View>
          {offered ? (
            <AppText color={palette.stone} style={styles.bundleNote}>
              {`${label} is also part of the Complete Solution, with Make Food Count and Saveful Connect together.`}
            </AppText>
          ) : null}
        </>
      )}

      <View style={[styles.messageBox, inline && styles.messageBoxInline]}>
        <Ionicons name="information-circle-outline" size={normalize(18)} color={palette.stone} />
        <AppText color={palette.black} style={styles.messageText}>
          {message}
        </AppText>
      </View>

      {canAddInApp ? (
        <Pressable
          onPress={() => navigation.navigate(plansRoute)}
          style={({ pressed }) => [styles.primary, { backgroundColor: theme.color }, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Add ${label}`}
        >
          <AppText color={palette.white} style={styles.primaryText}>
            {`Add ${label}`}
          </AppText>
        </Pressable>
      ) : null}

      {onClose && !inline ? (
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            canAddInApp ? styles.secondary : styles.primary,
            canAddInApp ? { borderColor: theme.color } : { backgroundColor: theme.color },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        >
          <AppText color={canAddInApp ? theme.color : palette.white} style={styles.primaryText}>
            {closeLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheetBody: {
    gap: hp(1.2),
  },
  inlineCard: {
    borderWidth: 1,
    borderRadius: normalize(16),
    padding: wp(4),
    gap: hp(1),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3.5),
  },
  artWrap: {
    width: normalize(92),
    height: normalize(92),
    borderRadius: normalize(18),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artWrapInline: {
    width: normalize(64),
    height: normalize(64),
    borderRadius: normalize(14),
  },
  art: {
    width: '100%',
    height: '100%',
  },
  headerCopy: {
    flex: 1,
    gap: hp(0.4),
  },
  lockPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: normalize(999),
    paddingHorizontal: wp(2.2),
    paddingVertical: hp(0.3),
  },
  lockText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(10),
    textTransform: 'none',
  },
  title: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(21),
    textTransform: 'none',
  },
  titleInline: {
    fontSize: normalize(17),
  },
  tagline: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(13),
    lineHeight: normalize(18),
    textTransform: 'none',
  },
  description: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(13.5),
    lineHeight: normalize(19),
    textTransform: 'none',
  },
  ticks: {
    gap: hp(0.7),
  },
  bundleNote: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(12.5),
    lineHeight: normalize(17),
    textTransform: 'none',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2),
    backgroundColor: palette.creme,
    borderRadius: normalize(12),
    padding: wp(3.5),
  },
  messageBoxInline: {
    backgroundColor: palette.white,
  },
  messageText: {
    flex: 1,
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(13.5),
    lineHeight: normalize(19),
    textTransform: 'none',
  },
  primary: {
    minHeight: normalize(48),
    borderRadius: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    minHeight: normalize(48),
    borderRadius: normalize(12),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(15),
    textTransform: 'none',
  },
  pressed: {
    opacity: 0.85,
  },
});

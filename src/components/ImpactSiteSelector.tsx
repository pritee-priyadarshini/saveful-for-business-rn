import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import type { AccessibleSite } from '@/utils/impactSites';

const MAX_VISIBLE_OPTIONS = 4;
const OPTION_HEIGHT = normalize(48);

type Props = {
  sites: AccessibleSite[];
  /** null = All sites (only when includeAllSites) */
  selectedSiteId: number | null;
  onChange: (siteId: number | null) => void;
  loading?: boolean;
  /** When false, only individual sites are listed (no All sites). */
  includeAllSites?: boolean;
  label?: string;
};

export function ImpactSiteSelector({
  sites,
  selectedSiteId,
  onChange,
  loading = false,
  includeAllSites = true,
  label = 'Site',
}: Props) {
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    const siteOptions = sites.map((site) => ({
      id: site.id as number | null,
      label: site.name?.trim() || `Site ${site.id}`,
    }));

    if (!includeAllSites || sites.length <= 1) {
      return siteOptions;
    }

    return [{ id: null as number | null, label: 'All sites' }, ...siteOptions];
  }, [sites, includeAllSites]);

  const selectedLabel =
    options.find((opt) => opt.id === selectedSiteId)?.label ??
    (includeAllSites && sites.length > 1
      ? 'All sites'
      : sites[0]?.name || 'Select site');

  useEffect(() => {
    setOpen(false);
  }, [selectedSiteId]);

  // Single site: quiet label only — no dropdown.
  if (sites.length <= 1) {
    const only = sites[0];
    if (!only) return null;
    return (
      <View style={styles.singleWrap}>
        <Ionicons name="location-outline" size={normalize(16)} color={palette.kale} />
        <AppText style={styles.singleText} numberOfLines={1}>
          {only.name || 'Your site'}
        </AppText>
      </View>
    );
  }

  const listMaxHeight = OPTION_HEIGHT * Math.min(MAX_VISIBLE_OPTIONS, options.length);

  return (
    <View style={styles.wrap}>
      {label ? <AppText style={styles.label}>{label}</AppText> : null}

      <Pressable
        style={({ pressed }) => [styles.trigger, open && styles.triggerOpen, pressed && styles.pressed]}
        onPress={() => !loading && setOpen(true)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Selected site ${selectedLabel}`}
      >
        <View style={styles.triggerIcon}>
          <Ionicons name="business-outline" size={normalize(15)} color={palette.white} />
        </View>
        <AppText style={styles.triggerText} numberOfLines={1}>
          {loading ? 'Loading sites…' : selectedLabel}
        </AppText>
        <Ionicons name="chevron-down" size={normalize(18)} color={palette.stone} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <AppText style={styles.modalTitle}>Select site</AppText>

            <ScrollView
              style={{ maxHeight: listMaxHeight }}
              bounces={false}
              nestedScrollEnabled
              showsVerticalScrollIndicator={options.length > MAX_VISIBLE_OPTIONS}
              keyboardShouldPersistTaps="handled"
            >
              {options.map((opt) => {
                const active = opt.id === selectedSiteId;
                return (
                  <Pressable
                    key={opt.id == null ? 'all' : String(opt.id)}
                    style={({ pressed }) => [
                      styles.option,
                      { minHeight: OPTION_HEIGHT },
                      active && styles.optionActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      onChange(opt.id);
                      setOpen(false);
                    }}
                  >
                    <AppText
                      style={[styles.optionText, active && styles.optionTextActive]}
                      numberOfLines={2}
                    >
                      {opt.label}
                    </AppText>
                    {active ? (
                      <Ionicons name="checkmark" size={normalize(18)} color={palette.kale} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: hp(0.2),
  },
  label: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(12),
    color: palette.midgray,
    textTransform: 'none',
    marginBottom: hp(0.45),
  },
  singleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingVertical: hp(0.4),
    marginBottom: hp(0.2),
  },
  singleText: {
    flex: 1,
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(13),
    color: palette.black,
    textTransform: 'none',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: palette.strokecream,
    borderRadius: normalize(12),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.05),
    minHeight: normalize(48),
  },
  triggerOpen: {
    borderColor: palette.kale,
  },
  triggerIcon: {
    width: normalize(28),
    height: normalize(28),
    borderRadius: normalize(8),
    backgroundColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: {
    flex: 1,
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    color: palette.black,
    textTransform: 'none',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: palette.creme,
    borderTopLeftRadius: normalize(18),
    borderTopRightRadius: normalize(18),
    paddingHorizontal: wp(4),
    paddingTop: hp(1.2),
    paddingBottom: hp(3),
    ...Platform.select({
      ios: {
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: { elevation: 10 },
    }),
  },
  handle: {
    alignSelf: 'center',
    width: normalize(40),
    height: normalize(4),
    borderRadius: normalize(2),
    backgroundColor: palette.strokecream,
    marginBottom: hp(1),
  },
  modalTitle: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(16),
    color: palette.black,
    textAlign: 'center',
    textTransform: 'none',
    marginBottom: hp(1),
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
    paddingHorizontal: wp(3.5),
    backgroundColor: palette.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.strokecream,
  },
  optionActive: {
    backgroundColor: '#E8F3EC',
  },
  optionText: {
    flex: 1,
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(14),
    color: palette.black,
    textTransform: 'none',
  },
  optionTextActive: {
    fontFamily: 'Saveful-Bold',
    color: palette.kale,
  },
  pressed: {
    opacity: 0.85,
  },
});

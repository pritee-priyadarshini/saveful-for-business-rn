import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { MfcCta, MfcFooter, MfcNotice, MfcPageTitle } from '@/components/makeFoodCount/MfcAppUi';
import { MfcArt, SOURCE_ART } from '@/components/makeFoodCount/MfcArt';
import { MfcStepper } from '@/components/makeFoodCount/MfcStepper';
import { MFC, MFC_SOURCE_TINT, MFC_STEP_INDEX, SOURCE_META } from '@/constants/makeFoodCount';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import type { MakeFoodCountStackParamList } from '@/navigation/MakeFoodCountStack';
import { useAuthStore } from '@/store/authStore';
import { useMakeFoodCountStore } from '@/store/makeFoodCountStore';
import { useSitesStore } from '@/store/sitesStore';
import { palette } from '@/theme/colors';
import { FOOD_SOURCES, type FoodSource } from '@/types/makeFoodCount';
import { resolveListingSiteId } from '@/utils/listingSite';
import { normalize, useResponsiveLayout } from '@/utils/responsive';

type Navigation = NativeStackNavigationProp<MakeFoodCountStackParamList, 'MfcSources'>;

const CARD_GAP = 12;

function positiveId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function resolveSiteId(authUser: unknown): Promise<number | null> {
  const draftSite = useMakeFoodCountStore.getState().siteId;
  if (draftSite != null) return draftSite;
  const sites = useSitesStore.getState().sites ?? [];
  if (sites.length === 1) {
    const only = positiveId(sites[0]?.id);
    if (only) return only;
  }
  return resolveListingSiteId(authUser);
}

/** MFC-002 — same choice-card template as Today's Surplus. */
export function SourcesScreen() {
  const navigation = useNavigation<Navigation>();
  const r = useResponsiveLayout();
  const authUser = useAuthStore((state) => state.authUser);
  const storeSources = useMakeFoodCountStore((state) => state.sources);
  const { submitting, withLock } = useSubmitLock();

  // A finished (saved) record is not reopened here: a new recording starts empty.
  const [selected, setSelected] = useState<FoodSource[]>(() =>
    useMakeFoodCountStore.getState().status === 'SAVED' ? [] : storeSources,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void useMakeFoodCountStore.getState().loadTaxonomy();
  }, []);

  const toggle = useCallback((source: FoodSource) => {
    setError(null);
    setSelected((current) =>
      current.includes(source) ? current.filter((entry) => entry !== source) : [...current, source],
    );
  }, []);

  const count = selected.length;

  // Phones: one column of four cards at their natural height. Tablets: a 2 x 2 grid.
  // Cards never stretch to fill the screen (tall phones used to get big empty cards).
  const columns = r.isTablet ? 2 : 1;
  const rows = useMemo(() => {
    const out: FoodSource[][] = [];
    for (let i = 0; i < FOOD_SOURCES.length; i += columns) out.push(FOOD_SOURCES.slice(i, i + columns));
    return out;
  }, [columns]);

  const onContinue = () =>
    withLock(async () => {
      if (count === 0) return;
      setError(null);
      const ordered = FOOD_SOURCES.filter((source) => selected.includes(source));
      const siteId = await resolveSiteId(authUser);
      if (siteId == null) {
        setError('We could not find a site for this record. Choose a site in the header and try again.');
        return;
      }
      // The last record is finished: start a new one instead of adding to it.
      if (useMakeFoodCountStore.getState().status === 'SAVED') useMakeFoodCountStore.getState().clearDraft();
      const store = useMakeFoodCountStore.getState();
      store.setSources(ordered);
      const id = await store.createOrLoadDraft({ siteId, sources: ordered });
      const { syncStatus, lastError } = useMakeFoodCountStore.getState();
      if (id == null && syncStatus !== 'offline') {
        setError(lastError ?? 'We could not start this record. Try again.');
        return;
      }
      navigation.navigate('MfcRecord', { source: ordered[0] });
    });

  return (
    <Screen
      scrollable
      backgroundColor={MFC.page}
      contentStyle={styles.screenContent}
      transparentTop
      footer={
        <MfcFooter>
          <MfcCta
            label={`Continue (${count} selected)`}
            accessibilityLabel={`Continue, ${count} selected`}
            arrow
            disabled={count === 0}
            loading={submitting}
            onPress={onContinue}
            style={styles.flex}
          />
        </MfcFooter>
      }
    >
      <View
        style={[
          styles.contentWrap,
          { paddingHorizontal: r.pagePadH, paddingTop: r.space(12, 16) },
          r.isTablet && { maxWidth: r.contentMaxWidth },
        ]}
      >
        <MfcStepper activeIndex={MFC_STEP_INDEX.sources} />

        <MfcPageTitle
          eyebrow="Make Food Count / Select sources"
          title="What would you like to track?"
          subtitle="Select one or more categories."
          compact
        />

        <View style={styles.cardsWrap} accessibilityRole="list">
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={[styles.cardRow, columns > 1 && styles.cardRowTablet]}>
              {row.map((source) => {
                const meta = SOURCE_META[source];
                const tint = MFC_SOURCE_TINT[source];
                const isOn = selected.includes(source);
                return (
                  <Pressable
                    key={source}
                    onPress={() => toggle(source)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isOn }}
                    accessibilityLabel={`${meta.label}. ${meta.description}`}
                    style={({ pressed }) => [
                      styles.card,
                      columns > 1 && styles.cardTablet,
                      isOn ? { backgroundColor: tint.bg, borderColor: MFC.purple } : null,
                      isOn && styles.cardOn,
                      pressed && styles.pressed,
                    ]}
                  >
                    {/* The photo sits on its source's colour, so the four read apart at a glance. */}
                    <View style={[styles.photo, { backgroundColor: isOn ? MFC.white : tint.bg, borderColor: tint.border }]}>
                      <MfcArt art={SOURCE_ART[source]} size={64} tile={false} />
                    </View>
                    <View style={styles.cardText}>
                      <AppText variant="bodyBold" color={MFC.ink} style={styles.cardTitle}>
                        {meta.label}
                      </AppText>
                      <AppText variant="bodySmall" color={MFC.muted} numberOfLines={2} style={styles.cardDesc}>
                        {meta.description}
                      </AppText>
                    </View>
                    <View style={[styles.check, isOn && styles.checkOn]}>
                      {isOn ? <Ionicons name="checkmark" size={normalize(15)} color={palette.white} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {error ? <MfcNotice tone="danger" title={error} /> : null}

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { flexGrow: 1, paddingBottom: 16 },
  flex: { flex: 1 },
  contentWrap: { flex: 1, width: '100%', alignSelf: 'center', gap: 12 },
  cardsWrap: { gap: CARD_GAP, marginTop: 4 },
  cardRow: { gap: CARD_GAP },
  cardRowTablet: { flexDirection: 'row' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(14),
    borderRadius: normalize(18),
    borderWidth: 1,
    borderColor: '#E7DFEF',
    backgroundColor: MFC.white,
    padding: normalize(12),
    paddingRight: normalize(16),
    shadowColor: MFC.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTablet: { flex: 1 },
  cardOn: { borderWidth: 2, padding: normalize(12) - 1, paddingRight: normalize(16) - 1 },
  photo: {
    width: normalize(76),
    height: normalize(76),
    borderRadius: normalize(16),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDesc: { lineHeight: normalize(19) },
  cardText: { flex: 1, minWidth: 0, gap: 3 },
  cardTitle: { fontFamily: 'Saveful-Bold', fontSize: normalize(17) },
  check: {
    width: normalize(26),
    height: normalize(26),
    borderRadius: normalize(13),
    borderWidth: 1.5,
    borderColor: '#C9BFD6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MFC.white,
  },
  checkOn: { backgroundColor: MFC.purple, borderColor: MFC.purple },
  continueTablet: { alignSelf: 'flex-end', minWidth: 300 },
  pressed: { opacity: 0.9 },
});

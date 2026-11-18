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

const CARD_MIN = 96;
const CARD_GAP = 10;

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

  // Responsive fill: phones one column of four, tablets a 2 x 2 grid. Each card takes its share of
  // the free height (never less than CARD_MIN, so small phones scroll instead of squashing).
  const columns = r.isTablet ? 2 : 1;
  const rows = useMemo(() => {
    const out: FoodSource[][] = [];
    for (let i = 0; i < FOOD_SOURCES.length; i += columns) out.push(FOOD_SOURCES.slice(i, i + columns));
    return out;
  }, [columns]);
  const [cardsHeight, setCardsHeight] = useState(0);
  const cardHeight = cardsHeight > 0 ? Math.max(CARD_MIN, (cardsHeight - CARD_GAP * (rows.length - 1)) / rows.length) : CARD_MIN;
  const artSize = Math.round(Math.min(120, Math.max(60, cardHeight * 0.62)) / normalize(1));
  const roomy = cardHeight >= 130;
  const titleSize = normalize(roomy ? 19 : 17);

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
          title="What sources of food waste do you have?"
          subtitle="Select all that apply. You can record several sources in one session."
          compact
        />

        {/* The four options share the space between the title and the pinned button. */}
        <View
          style={styles.cardsWrap}
          accessibilityRole="list"
          onLayout={(event) => setCardsHeight(event.nativeEvent.layout.height)}
        >
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
                    accessibilityLabel={`${meta.label}. ${meta.description}. For example ${meta.example}`}
                    style={({ pressed }) => [
                      styles.card,
                      { backgroundColor: tint.bg, borderColor: isOn ? MFC.purple : tint.border, minHeight: CARD_MIN },
                      isOn && styles.cardOn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <MfcArt art={SOURCE_ART[source]} size={artSize} tile={false} />
                    <View style={styles.cardText}>
                      <AppText variant="bodyBold" color={MFC.ink} style={[styles.cardTitle, { fontSize: titleSize }]}>
                        {meta.label}
                      </AppText>
                      <AppText variant="bodySmall" color={MFC.ink} numberOfLines={2} style={styles.cardDesc}>
                        {meta.description}
                      </AppText>
                      <AppText variant="meta" color={MFC.muted} numberOfLines={roomy ? 2 : 1} style={styles.cardExample}>
                        {`e.g. ${meta.example}`}
                      </AppText>
                    </View>
                    <View style={[styles.check, isOn && styles.checkOn]}>
                      {isOn ? <Ionicons name="checkmark" size={normalize(16)} color={palette.white} /> : null}
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
  cardsWrap: { flex: 1, gap: CARD_GAP },
  cardRow: { flex: 1, gap: CARD_GAP },
  cardRowTablet: { flexDirection: 'row' },
  cardOn: { borderWidth: 2 },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: normalize(10),
    paddingLeft: normalize(10),
    paddingRight: normalize(14),
  },
  cardDesc: { lineHeight: normalize(19) },
  cardExample: { fontSize: normalize(12) },
  cardText: { flex: 1, minWidth: 0, gap: 2 },
  cardTitle: { fontFamily: 'Saveful-Bold', fontSize: normalize(16) },
  check: {
    width: normalize(24),
    height: normalize(24),
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#B8AEC6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MFC.white,
  },
  checkOn: { backgroundColor: MFC.purple, borderColor: MFC.purple },
  continueTablet: { alignSelf: 'flex-end', minWidth: 300 },
  pressed: { opacity: 0.9 },
});

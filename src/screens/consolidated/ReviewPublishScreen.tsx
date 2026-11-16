import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { ActionButton as Button } from '@/components/consolidated/ui';
import { Screen } from '@/components/Screen';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { DeclarationCheckbox } from '@/components/consolidated/DeclarationCheckbox';
import { Divider, IconBubble, InfoRow, Notice, Pill, SectionTitle, Surface, cc, tabular } from '@/components/consolidated/ui';
import { normalize } from '@/utils/responsive';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { consolidatedService } from '@/services/consolidated.service';
import { useConsolidatedStore } from '@/store/consolidatedStore';
import { palette } from '@/theme/colors';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import { formatKg, formatWindowInZone } from '@/utils/consolidated';
import type { PublishPreview } from '@/types/consolidated';

export function ReviewPublishScreen() {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const collectionId = Number(route.params?.collectionId);
  const fetchDeclarations = useConsolidatedStore((state) => state.fetchDeclarations);
  const declarations = useConsolidatedStore((state) => state.declarations);
  const { submitting, withLock } = useSubmitLock();
  const [preview, setPreview] = useState<PublishPreview | null>(null);
  const [openBreakdown, setOpenBreakdown] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      consolidatedService.getPublishPreview(collectionId),
      fetchDeclarations().catch(() => null),
    ]).then(([next]) => {
      if (!cancelled) setPreview(next);
    }).catch((err) => showErrorAlert(err, 'Could not load preview'));
    return () => { cancelled = true; };
  }, [collectionId, fetchDeclarations]);

  const publish = () => {
    if (!accepted) {
      setError('Please confirm before publishing.');
      return;
    }
    const declaration = declarations?.MANAGER;
    if (!declaration) {
      setError('Declaration is still loading.');
      return;
    }
    void withLock(async () => {
      try {
        await consolidatedService.publish(collectionId, { version: declaration.version, accepted: true });
        showSuccessAlert('Published to charities.', 'Published');
        navigation.goBack();
      } catch (err) {
        showErrorAlert(err, 'Could not publish');
      }
    });
  };

  const totalKg = preview ? preview.items.reduce((sum, item) => sum + Number(item.qtyKg || 0), 0) : 0;
  const storage = preview?.items.find((item) => item.storageLabel)?.storageLabel;
  const allergens = preview?.items[0]?.allergens || [];

  return (
    <Screen scrollable backgroundColor={palette.creme} transparentTop contentStyle={styles.screen}>
      <StackHeroHeader title="Review & publish" subtitle="One listing for charities — check it, then publish" />
      {!preview ? <ActivityIndicator color={palette.kale} style={styles.loader} /> : (
        <View style={styles.body}>
          {preview.blockers.length ? (
            <Notice tone="danger" title="Fix these before publishing">
              {preview.blockers.map((item) => (
                <View key={item} style={styles.bullet}>
                  <Ionicons name="close-circle" size={normalize(15)} color={palette.danger} />
                  <AppText variant="bodySmall" color={palette.midgray} style={styles.flex}>{item}</AppText>
                </View>
              ))}
            </Notice>
          ) : null}
          {preview.warnings.length ? (
            <Notice tone="warn" title="Good to know">
              {preview.warnings.map((item) => (
                <View key={item} style={styles.bullet}>
                  <Ionicons name="information-circle" size={normalize(15)} color={cc.warnText} />
                  <AppText variant="bodySmall" color={palette.midgray} style={styles.flex}>{item}</AppText>
                </View>
              ))}
            </Notice>
          ) : null}

          {/* What the charity sees */}
          <SectionTitle title="Charity preview" caption="Exactly what charities will see. No site names, no mention of outlets." />
          <Surface style={styles.listing}>
            <View style={styles.listingHead}>
              <View style={styles.flex}>
                <Pill label="Available" color={palette.kale} background={cc.tint} dot />
                <AppText variant="subheading" style={styles.listingTitle}>{preview.pointName}</AppText>
                <AppText variant="bodySmall" color={palette.stone}>{preview.pointAddress}</AppText>
              </View>
              <View style={styles.kgBadge}>
                <AppText variant="subheading" color={palette.white} style={tabular}>{formatKg(totalKg)}</AppText>
                <AppText variant="meta" color={palette.white}>kg</AppText>
              </View>
            </View>
            <View style={styles.metaRow}>
              <Pill
                label={`Pickup ${formatWindowInZone(preview.pickupStartAt, preview.pickupEndAt, preview.timezone)}`}
                color={palette.primary}
                background={palette.creme3}
                icon="time-outline"
              />
              {storage ? <Pill label={storage} color={palette.primary} background={palette.creme3} icon="snow-outline" /> : null}
            </View>
            <Divider />
            {preview.items.map((item, index) => (
              <View key={`${item.name}-${index}`} style={styles.itemRow}>
                <View style={styles.itemDot} />
                <View style={styles.flex}>
                  <AppText variant="bodyBold">{item.name}</AppText>
                  {item.quantityDescription ? <AppText variant="meta" color={palette.stone}>{item.quantityDescription}</AppText> : null}
                </View>
                <AppText variant="bodyBold">{formatKg(item.qtyKg)} kg</AppText>
              </View>
            ))}
            {allergens.length ? (
              <AppText variant="meta" color={palette.stone}>Allergens · {allergens.join(', ')}</AppText>
            ) : null}
            {preview.suitabilityNotes || preview.instructions ? <Divider /> : null}
            {preview.suitabilityNotes ? (
              <InfoRow icon="shield-checkmark-outline" label="Handling" value={preview.suitabilityNotes} />
            ) : null}
            {preview.instructions ? (
              <InfoRow icon="document-text-outline" label="Instructions" value={preview.instructions} />
            ) : null}
          </Surface>

          {/* Site breakdown (manager only) */}
          <Surface onPress={() => setOpenBreakdown((value) => !value)} style={styles.breakdown}>
            <View style={styles.breakdownHead}>
              <IconBubble name="storefront-outline" size={34} />
              <View style={styles.flex}>
                <AppText variant="bodyBold">Where it came from</AppText>
                <AppText variant="meta" color={palette.stone}>
                  {preview.breakdown.length} site{preview.breakdown.length === 1 ? '' : 's'} · for your records only
                </AppText>
              </View>
              <Ionicons name={openBreakdown ? 'chevron-up' : 'chevron-down'} size={normalize(18)} color={palette.stone} />
            </View>
            {openBreakdown ? preview.breakdown.map((site) => (
              <View key={site.siteName} style={styles.siteBlock}>
                <View style={styles.itemRow}>
                  <AppText variant="bodyBold" style={styles.flex}>{site.siteName}</AppText>
                  <AppText variant="bodyBold" color={palette.kale}>{formatKg(site.verifiedKg)} kg</AppText>
                </View>
                {site.items.map((item) => (
                  <AppText key={item.name} variant="meta" color={palette.stone}>
                    {item.name} · {formatKg(item.verifiedKg)} kg{item.quantityDescription ? ` · ${item.quantityDescription}` : ''}
                  </AppText>
                ))}
              </View>
            )) : null}
          </Surface>

          <DeclarationCheckbox
            title="Manager declaration"
            declaration={declarations?.MANAGER}
            checked={accepted}
            onChange={(value) => { setAccepted(value); setError(null); }}
            error={error}
          />
          <Button
            label="Publish to charities"
            icon="megaphone-outline"
            onPress={publish}
            loading={submitting}
            disabled={preview.blockers.length > 0}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 40 },
  loader: { marginTop: 24 },
  body: { paddingHorizontal: normalize(16), paddingTop: normalize(4), gap: normalize(12) },
  flex: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  eyebrow: { letterSpacing: 0.8 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  previewLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  listing: { gap: 12, borderColor: palette.kale, borderWidth: 1.5 },
  listingHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  listingTitle: { marginTop: 8 },
  kgBadge: {
    minWidth: normalize(64),
    borderRadius: cc.radiusSm,
    backgroundColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.kale },
  breakdown: { gap: 10 },
  breakdownHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  siteBlock: { gap: 3, backgroundColor: cc.muted, borderRadius: cc.radiusSm, padding: 10 },
});

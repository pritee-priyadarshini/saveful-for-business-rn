import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { ActionButton as Button } from '@/components/consolidated/ui';
import { SavefulModal } from '@/components/SavefulModal';
import { QuantityInput } from '@/components/consolidated/QuantityInput';
import { cc } from '@/components/consolidated/ui';
import { palette } from '@/theme/colors';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import type { DashboardContribution } from '@/types/consolidated';
import { formatKg } from '@/utils/consolidated';
import { normalize } from '@/utils/responsive';

type Mode = 'RECEIVED' | 'ADJUST' | 'NOT_RECEIVED';

type Props = {
  contribution: DashboardContribution | null;
  onClose: () => void;
  onSubmit: (payload: {
    status: 'RECEIVED' | 'NOT_RECEIVED';
    items?: { itemId?: number | null; foodItemId: number; verifiedQtyKg: number }[];
    note?: string;
  }) => Promise<void>;
};

const OPTIONS: { value: Mode; title: string; body: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }[] = [
  { value: 'RECEIVED', title: 'Received', body: 'Everything arrived as listed', icon: 'checkmark-circle', color: palette.kale, bg: cc.tint },
  { value: 'ADJUST', title: 'Adjust quantity', body: 'Less arrived than was listed', icon: 'create', color: palette.primary, bg: palette.creme3 },
  { value: 'NOT_RECEIVED', title: 'Not received', body: 'Nothing arrived from this site', icon: 'close-circle', color: palette.danger, bg: cc.dangerBg },
];

/** Received / Adjust quantity / Not received — Canva SM4 → CM3 receipt at the shared point. */
export function ReceiptSheet({ contribution, onClose, onSubmit }: Props) {
  const { submitting, withLock } = useSubmitLock();
  const [mode, setMode] = useState<Mode>('RECEIVED');
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!contribution) return;
    const next: Record<number, number> = {};
    contribution.items.forEach((item) => {
      next[item.foodItemId] = item.verifiedQtyKg ?? item.submittedQtyKg;
    });
    setQtys(next);
    setMode('RECEIVED');
    setNote('');
  }, [contribution]);

  const listed = (contribution?.items || []).reduce((sum, item) => sum + Number(item.submittedQtyKg || 0), 0);
  const adjusted = (contribution?.items || []).reduce((sum, item) => sum + (qtys[item.foodItemId] ?? 0), 0);

  const submit = () => {
    if (!contribution) return;
    void withLock(async () => {
      if (mode === 'NOT_RECEIVED') {
        await onSubmit({ status: 'NOT_RECEIVED', note: note.trim() || undefined });
        return;
      }
      if (mode === 'ADJUST') {
        await onSubmit({
          status: 'RECEIVED',
          items: contribution.items.map((item) => ({
            itemId: item.itemId,
            foodItemId: item.foodItemId,
            verifiedQtyKg: qtys[item.foodItemId] ?? 0,
          })),
          note: note.trim() || undefined,
        });
        return;
      }
      await onSubmit({ status: 'RECEIVED', note: note.trim() || undefined });
    });
  };

  return (
    <SavefulModal
      visible={contribution != null}
      onClose={onClose}
      title="What arrived?"
      subtitle={contribution ? `${contribution.site.name} · ${formatKg(listed)} kg listed` : undefined}
    >
      <View style={styles.wrap}>
        {OPTIONS.map((option) => {
          const on = mode === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setMode(option.value)}
              style={[styles.option, on && { borderColor: option.color, backgroundColor: option.bg }]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              <Ionicons name={option.icon} size={normalize(22)} color={on ? option.color : palette.stone} />
              <View style={styles.flex}>
                <AppText variant="bodyBold" color={on ? option.color : palette.black}>{option.title}</AppText>
                <AppText variant="meta" color={palette.stone}>{option.body}</AppText>
              </View>
              <View style={[styles.radio, on && { borderColor: option.color }]}>
                {on ? <View style={[styles.radioDot, { backgroundColor: option.color }]} /> : null}
              </View>
            </Pressable>
          );
        })}

        {mode === 'ADJUST' && contribution ? (
          <View style={styles.adjust}>
            {contribution.items.map((item) => (
              <QuantityInput
                key={item.foodItemId}
                label={`${item.name} · listed ${formatKg(item.submittedQtyKg)} kg`}
                value={qtys[item.foodItemId] ?? 0}
                max={item.submittedQtyKg}
                onChange={(value) => setQtys((prev) => ({ ...prev, [item.foodItemId]: value }))}
              />
            ))}
            <AppText variant="meta" color={palette.stone}>
              Verified {formatKg(adjusted)} of {formatKg(listed)} kg. It can't be more than was listed.
            </AppText>
          </View>
        ) : null}

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={mode === 'NOT_RECEIVED' ? 'What happened? (optional)' : 'Note (optional)'}
          placeholderTextColor={palette.stone}
          style={styles.note}
          multiline
        />
        <Button label="Save" icon="checkmark" onPress={submit} loading={submitting} />
      </View>
    </SavefulModal>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingBottom: 12 },
  flex: { flex: 1, minWidth: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: cc.hairline,
    borderRadius: cc.radiusSm,
    padding: 12,
    backgroundColor: palette.white,
  },
  radio: {
    width: normalize(20),
    height: normalize(20),
    borderRadius: normalize(10),
    borderWidth: 2,
    borderColor: '#CFC8BA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: normalize(10), height: normalize(10), borderRadius: normalize(5) },
  adjust: { gap: 10, backgroundColor: cc.muted, borderRadius: cc.radiusSm, padding: 12 },
  note: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: cc.hairline,
    borderRadius: cc.radiusSm,
    padding: 12,
    backgroundColor: palette.white,
    color: palette.black,
    textAlignVertical: 'top',
  },
});

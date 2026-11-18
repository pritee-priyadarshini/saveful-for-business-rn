import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { cc, ProgressBar } from '@/components/consolidated/ui';
import { palette } from '@/theme/colors';
import type { KindOutcome } from '@/types/makeFoodCount';
import { describeOutcome, OUTCOME_STEPS } from '@/utils/makeFoodCountSummary';

/**
 * Eligible → Listed → Claimed → Collected for one listing kind, with a plain status line.
 * Renders nothing until something has been listed.
 */
export function OutcomeProgress({ outcome, label }: { outcome: KindOutcome | null | undefined; label: string }) {
  const summary = describeOutcome(outcome);
  if (!summary) return null;

  const color = summary.tone === 'warn' ? cc.warnText : summary.tone === 'good' ? palette.kale : palette.black;
  const barColor = summary.tone === 'warn' ? palette.orange : palette.kale;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`${label}: ${summary.text}. Step ${summary.step + 1} of ${OUTCOME_STEPS.length}, ${OUTCOME_STEPS[summary.step]}`}
    >
      <ProgressBar value={summary.step} total={OUTCOME_STEPS.length - 1} color={barColor} />
      <View style={styles.steps}>
        {OUTCOME_STEPS.map((step, index) => (
          <AppText
            key={step}
            variant="meta"
            color={index <= summary.step ? palette.black : palette.stone}
            style={[styles.step, index === summary.step && styles.stepActive]}
            numberOfLines={1}
          >
            {step}
          </AppText>
        ))}
      </View>
      <AppText variant="bodySmall" color={color} style={styles.text}>
        {summary.text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  steps: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  step: { flexShrink: 1 },
  stepActive: { fontFamily: 'Saveful-SemiBold' },
  text: { fontFamily: 'Saveful-SemiBold' },
});

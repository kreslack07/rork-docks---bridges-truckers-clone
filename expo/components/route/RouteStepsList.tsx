import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Navigation, ChevronRight } from 'lucide-react-native';
import { ThemeColors } from '@/constants/colors';
import { RouteStep } from '@/types';
import { formatDistance, formatDuration } from '@/services/routing';
import { cachedStyles } from '@/utils/styleCache';

interface RouteStepsListProps {
  colors: ThemeColors;
  steps: RouteStep[];
}

function RouteStepsList({ colors, steps }: RouteStepsListProps) {
  const [showSteps, setShowSteps] = useState<boolean>(false);
  const styles = cachedStyles(makeStyles, colors);

  const handleToggle = useCallback(() => {
    setShowSteps(prev => !prev);
  }, []);

  return (
    <>
      <TouchableOpacity
        style={styles.stepsToggle}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <Navigation size={16} color={colors.primary} />
        <Text style={styles.stepsToggleText}>
          {showSteps ? 'Hide' : 'Show'} Turn-by-Turn ({steps.length} steps)
        </Text>
        <ChevronRight
          size={16}
          color={colors.textSecondary}
          style={{ transform: [{ rotate: showSteps ? '90deg' : '0deg' }] }}
        />
      </TouchableOpacity>

      {showSteps && (
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <View style={styles.stepIndex}>
                <Text style={styles.stepIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepInstruction}>{step.instruction}</Text>
                <View style={styles.stepMeta}>
                  <Text style={styles.stepDistance}>
                    {formatDistance(step.distance)}
                  </Text>
                  <Text style={styles.stepDuration}>
                    {formatDuration(step.duration)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

export default React.memo(RouteStepsList);

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  stepsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepsToggleText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  stepsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndexText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  stepMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  stepDistance: {
    color: colors.textMuted,
    fontSize: 11,
  },
  stepDuration: {
    color: colors.textMuted,
    fontSize: 11,
  },
});

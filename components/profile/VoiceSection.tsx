import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Volume2, VolumeX } from 'lucide-react-native';
import { ThemeColors } from '@/constants/colors';

interface VoiceSectionProps {
  colors: ThemeColors;
  voiceOn: boolean;
  onToggle: () => void;
}

function VoiceSection({ colors, voiceOn, onToggle }: VoiceSectionProps) {
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Volume2 size={16} color={colors.textSecondary} />
        <Text style={styles.sectionTitle}>Voice Navigation</Text>
      </View>
      <View style={styles.notifToggleRow}>
        <View style={styles.voiceToggleInfo}>
          <Text style={styles.notifToggleLabel}>Turn-by-turn audio</Text>
          <Text style={styles.voiceHint}>Speaks directions while navigating</Text>
        </View>
        <TouchableOpacity
          style={[styles.notifToggle, voiceOn && styles.notifToggleOn]}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          {voiceOn ? <Volume2 size={12} color={colors.primary} /> : <VolumeX size={12} color={colors.textMuted} />}
          <Text style={[styles.notifToggleText, voiceOn && styles.notifToggleTextOn]}>
            {voiceOn ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default React.memo(VoiceSection);

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    flex: 1,
  },
  voiceToggleInfo: {
    flex: 1,
  },
  voiceHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  notifToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifToggleLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  notifToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifToggleOn: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  notifToggleText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  notifToggleTextOn: {
    color: colors.primary,
  },
});

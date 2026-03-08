import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';
import { ThemeColors } from '@/constants/colors';

interface NotificationPrefs {
  hazardAlerts: boolean;
  routeUpdates: boolean;
  newDocks: boolean;
}

interface NotificationSettingsProps {
  colors: ThemeColors;
  prefs: NotificationPrefs;
  unreadCount: number;
  onUpdatePrefs: (update: Partial<NotificationPrefs>) => void;
}

function NotificationSettings({ colors, prefs, unreadCount, onUpdatePrefs }: NotificationSettingsProps) {
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Bell size={16} color={colors.textSecondary} />
        <Text style={styles.sectionTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>
      {([
        { key: 'hazardAlerts' as const, label: 'Hazard Alerts' },
        { key: 'routeUpdates' as const, label: 'Route Updates' },
        { key: 'newDocks' as const, label: 'New Docks' },
      ]).map(({ key, label }) => (
        <View key={key} style={styles.notifToggleRow}>
          <Text style={styles.notifToggleLabel}>{label}</Text>
          <TouchableOpacity
            style={[styles.notifToggle, prefs[key] && styles.notifToggleOn]}
            onPress={() => onUpdatePrefs({ [key]: !prefs[key] })}
            activeOpacity={0.7}
          >
            <Text style={[styles.notifToggleText, prefs[key] && styles.notifToggleTextOn]}>
              {prefs[key] ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

export default React.memo(NotificationSettings);

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
  unreadBadge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700' as const,
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

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Search, MapPin, AlertTriangle, Inbox, Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';

type EmptyType = 'search' | 'docks' | 'hazards' | 'favourites' | 'generic';

interface EmptyStateProps {
  type?: EmptyType;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const getIcon = (type: EmptyType, color: string) => {
  switch (type) {
    case 'search': return <Search size={36} color={color} />;
    case 'docks': return <MapPin size={36} color={color} />;
    case 'hazards': return <AlertTriangle size={36} color={color} />;
    case 'favourites': return <Inbox size={36} color={color} />;
    case 'generic': return <Inbox size={36} color={color} />;
  }
};

const EMPTY_DEFAULTS: Record<EmptyType, { defaultTitle: string; defaultMessage: string }> = {
  search: {
    defaultTitle: 'No results found',
    defaultMessage: 'Try a different search term or adjust your filters.',
  },
  docks: {
    defaultTitle: 'No docks nearby',
    defaultMessage: 'Move the map or zoom out to find loading docks in the area.',
  },
  hazards: {
    defaultTitle: 'No hazards found',
    defaultMessage: 'No clearance hazards match your current filters.',
  },
  favourites: {
    defaultTitle: 'No favourites yet',
    defaultMessage: 'Tap the heart icon on docks you visit frequently to save them here.',
  },
  generic: {
    defaultTitle: 'Nothing here',
    defaultMessage: 'No data to display right now.',
  },
};

export default function EmptyState({ type = 'generic', title, message, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  const config = EMPTY_DEFAULTS[type];
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container} testID="empty-state">
      <View style={styles.iconCircle}>
        {getIcon(type, colors.textMuted)}
      </View>
      <Text style={styles.title}>{title ?? config.defaultTitle}</Text>
      <Text style={styles.message}>{message ?? config.defaultMessage}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction} activeOpacity={0.7}>
          <Plus size={16} color={colors.background} />
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 6,
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
  },
  actionBtnText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});

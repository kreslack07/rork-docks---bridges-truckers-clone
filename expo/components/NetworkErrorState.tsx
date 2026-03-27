import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WifiOff, RefreshCw, CloudOff } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

interface NetworkErrorStateProps {
  message?: string;
  onRetry?: () => void;
  isLoading?: boolean;
  compact?: boolean;
}

export default function NetworkErrorState({
  message,
  onRetry,
  isLoading = false,
  compact = false,
}: NetworkErrorStateProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <CloudOff size={16} color={colors.textMuted} />
        <Text style={styles.compactText}>
          {message || 'Could not load data'}
        </Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.compactRetry} activeOpacity={0.7}>
            <RefreshCw size={14} color={colors.primary} />
            <Text style={styles.compactRetryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <WifiOff size={28} color={colors.textMuted} />
      </View>
      <Text style={styles.title}>Connection Issue</Text>
      <Text style={styles.message}>
        {message || 'Unable to load data. Check your internet connection and try again.'}
      </Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryBtn, isLoading && styles.retryBtnDisabled]}
          onPress={isLoading ? undefined : onRetry}
          activeOpacity={0.7}
        >
          <RefreshCw size={16} color={colors.background} />
          <Text style={styles.retryBtnText}>
            {isLoading ? 'Retrying...' : 'Try Again'}
          </Text>
        </TouchableOpacity>
      )}
      <Text style={styles.hint}>
        Cached data may be available while you{"'"}re offline
      </Text>
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  retryBtnDisabled: {
    opacity: 0.6,
  },
  retryBtnText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactText: {
    color: colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  compactRetry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primary + '15',
  },
  compactRetryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
});

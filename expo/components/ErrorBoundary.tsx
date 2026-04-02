import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { DarkTheme, LightTheme, ThemeColors } from '@/constants/colors';
import { cachedStyles } from '@/utils/styleCache';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function getThemeColors(): ThemeColors {
  try {
    const scheme = require('react-native').Appearance?.getColorScheme?.();
    return scheme === 'light' ? LightTheme : DarkTheme;
  } catch {
    return DarkTheme;
  }
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('[ErrorBoundary] Caught error:', error.message);
    logger.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const colors = getThemeColors();
      const dynamicStyles = cachedStyles(makeDynamicStyles, colors);
      return (
        <View style={dynamicStyles.container}>
          <View style={dynamicStyles.iconCircle}>
            <AlertTriangle size={32} color={colors.warning} />
          </View>
          <Text style={dynamicStyles.title}>Something went wrong</Text>
          <Text style={dynamicStyles.message}>
            {this.props.fallbackMessage || 'An unexpected error occurred. Please try again.'}
          </Text>
          {this.state.error && (
            <Text style={dynamicStyles.errorDetail} numberOfLines={3}>
              {this.state.error.message}
            </Text>
          )}
          <TouchableOpacity style={dynamicStyles.retryBtn} onPress={this.handleReset} activeOpacity={0.7}>
            <RefreshCw size={18} color={colors.background} />
            <Text style={dynamicStyles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const makeDynamicStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.warning + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  errorDetail: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace' }),
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '700' as const,
  },
});

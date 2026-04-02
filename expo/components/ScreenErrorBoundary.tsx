import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { ThemeColors, DarkTheme } from '@/constants/colors';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  screenName?: string;
  colors?: ThemeColors;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ScreenErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(`[ScreenErrorBoundary:${this.props.screenName ?? 'unknown'}] Caught error:`, error.message);
    logger.error(`[ScreenErrorBoundary:${this.props.screenName ?? 'unknown'}] Component stack:`, errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const c = this.props.colors ?? DarkTheme;
      return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
          <View style={[styles.iconCircle, { backgroundColor: c.warning + '15' }]}>
            <AlertTriangle size={28} color={c.warning} />
          </View>
          <Text style={[styles.title, { color: c.text }]}>
            {this.props.screenName ? `${this.props.screenName} crashed` : 'Something went wrong'}
          </Text>
          <Text style={[styles.message, { color: c.textSecondary }]}>
            This screen encountered an error. The rest of the app is still working.
          </Text>
          {this.state.error && (
            <Text style={[styles.errorDetail, { color: c.textMuted }]} numberOfLines={3}>
              {this.state.error.message}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: c.primary }]}
            onPress={this.handleReset}
            activeOpacity={0.7}
            testID="screen-error-retry"
          >
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.retryText}>Reload Screen</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  errorDetail: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace' }),
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
});

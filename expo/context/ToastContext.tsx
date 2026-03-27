import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, AlertTriangle, CircleCheck as CheckCircle, Info, WifiOff } from 'lucide-react-native';
import createContextHook from '@nkzw/create-context-hook';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';

export type ToastType = 'error' | 'success' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

const MAX_QUEUE_SIZE = 5;

export const [ToastProvider, useToast] = createContextHook(() => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const queueRef = useRef<ToastMessage[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isShowingRef = useRef(false);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      isShowingRef.current = false;
      setToast(null);
      return;
    }

    const next = queueRef.current.shift()!;
    isShowingRef.current = true;
    setToast(next);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      showNext();
    }, next.duration ?? 3500);
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message?: string, duration: number = 3500) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    const newToast: ToastMessage = { id, type, title, message, duration };

    queueRef.current.push(newToast);
    if (queueRef.current.length > MAX_QUEUE_SIZE) {
      queueRef.current = queueRef.current.slice(-MAX_QUEUE_SIZE);
    }

    if (!isShowingRef.current) {
      showNext();
    }
  }, [showNext]);

  const dismissToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    showNext();
  }, [showNext]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      queueRef.current = [];
    };
  }, []);

  return { toast, showToast, dismissToast };
});

export function ToastOverlay() {
  const { toast, dismissToast } = useToast();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [visibleToast, setVisibleToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (toast) {
      setVisibleToast(toast);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -120,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisibleToast(null);
      });
    }
  }, [toast, slideAnim, opacityAnim]);

  const styles = useMemo(() => makeToastStyles(colors), [colors]);

  if (!visibleToast) return null;
  const accent = getAccentColor(visibleToast.type, colors);
  const IconComponent = getToastIcon(visibleToast.type, visibleToast.title);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.toast, { borderLeftColor: accent }]}>
        <View style={[styles.iconWrap, { backgroundColor: accent + '18' }]}>
          <IconComponent size={16} color={accent} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{visibleToast.title}</Text>
          {visibleToast.message && (
            <Text style={styles.message} numberOfLines={2}>{visibleToast.message}</Text>
          )}
        </View>
        <TouchableOpacity onPress={dismissToast} hitSlop={12} style={styles.closeBtn}>
          <X size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function getAccentColor(type: ToastType, colors: ThemeColors): string {
  switch (type) {
    case 'error': return colors.danger;
    case 'success': return colors.success;
    case 'warning': return colors.warning;
    case 'info': return colors.primary;
  }
}

function getToastIcon(type: ToastType, title?: string) {
  if (type === 'error') {
    const isNetwork = title?.toLowerCase().includes('offline') ||
      title?.toLowerCase().includes('connection') ||
      title?.toLowerCase().includes('network');
    return isNetwork ? WifiOff : AlertTriangle;
  }
  switch (type) {
    case 'success': return CheckCircle;
    case 'warning': return AlertTriangle;
    case 'info': return Info;
  }
}

const makeToastStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    position: Platform.OS === 'web' ? ('fixed' as 'absolute') : 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 8 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.25)' },
    }),
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
  },
});

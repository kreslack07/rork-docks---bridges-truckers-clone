import React, { useState, useCallback, useMemo } from 'react';
import ScreenErrorBoundary from '@/components/ScreenErrorBoundary';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Mail, Lock, User, LogIn, UserPlus, Eye, EyeOff, Truck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ThemeColors } from '@/constants/colors';

function AuthScreenContent() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signIn, signUp, isSigningIn, isSigningUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const isLoading = isSigningIn || isSigningUp;

  const validateEmail = useCallback((e: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert('Missing Email', 'Please enter your email address.');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup' && !displayName.trim()) {
      Alert.alert('Missing Name', 'Please enter your display name.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (mode === 'signup') {
        await signUp({ email: email.trim(), password, displayName: displayName.trim() });
      } else {
        await signIn({ email: email.trim(), password });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    }
  }, [email, password, displayName, mode, signIn, signUp, validateEmail, router]);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: mode === 'signin' ? 'Sign In' : 'Create Account' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <Truck size={44} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>
            {mode === 'signin' ? 'Welcome Back' : 'Join TruckDock'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {mode === 'signin'
              ? 'Sign in to sync your favourites and reports'
              : 'Create an account to save your data across devices'}
          </Text>
        </View>

        <View style={styles.formCard}>
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Display Name</Text>
              <View style={styles.inputWrapper}>
                <User size={16} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={colors.textMuted}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  testID="auth-name-input"
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputWrapper}>
              <Mail size={16} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                testID="auth-email-input"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={16} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Min. 6 characters"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                testID="auth-password-input"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                {showPassword ? (
                  <EyeOff size={18} color={colors.textMuted} />
                ) : (
                  <Eye size={18} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
          testID="auth-submit-btn"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <>
              {mode === 'signin' ? (
                <LogIn size={18} color={colors.background} />
              ) : (
                <UserPlus size={18} color={colors.background} />
              )}
              <Text style={styles.submitBtnText}>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchMode}
          onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          activeOpacity={0.7}
        >
          <Text style={styles.switchModeText}>
            {mode === 'signin'
              ? "Don't have an account? "
              : 'Already have an account? '}
          </Text>
          <Text style={styles.switchModeLink}>
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>Continue without account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function AuthScreen() {
  return (
    <ScreenErrorBoundary screenName="Authentication">
      <AuthScreenContent />
    </ScreenErrorBoundary>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800' as const,
    marginBottom: 6,
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 13,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  switchMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  switchModeText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  switchModeLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipBtnText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});

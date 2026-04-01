import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  Shield,
  FileText,
  Trash2,
  LogIn,
  LogOut,
  User,
  Info,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, ThemeMode } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useVoice, useUnits } from '@/context/UserPreferencesContext';
import AppearanceSection from '@/components/profile/AppearanceSection';
import VoiceSection from '@/components/profile/VoiceSection';
import NotificationSettings from '@/components/profile/NotificationSettings';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, mode, isDark, setThemeMode } = useTheme();
  const { user, isAuthenticated, signOut, deleteAccount, isDeletingAccount } = useAuth();
  const { unreadCount, prefs, updatePrefs } = useNotifications();
  const { isVoiceEnabled: voiceOn, setVoiceEnabled: setVoiceOnCtx } = useVoice();
  const { unitSystem, setUnitSystem } = useUnits();

  const handleToggleVoice = useCallback(() => {
    const newVal = !voiceOn;
    setVoiceOnCtx(newVal);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [voiceOn, setVoiceOnCtx]);

  const handleThemeChange = useCallback((newMode: ThemeMode) => {
    setThemeMode(newMode);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [setThemeMode]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          void signOut();
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }, [signOut]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  }, [deleteAccount]);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {isAuthenticated ? (
        <View style={styles.accountCard}>
          <View style={styles.accountAvatar}>
            <User size={22} color={colors.primary} />
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{user?.displayName ?? 'User'}</Text>
            <Text style={styles.accountEmail}>{user?.email ?? ''}</Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.signInCard}
          onPress={() => router.push('/auth')}
          activeOpacity={0.7}
          testID="settings-sign-in-btn"
        >
          <LogIn size={20} color={colors.primary} />
          <View style={styles.signInContent}>
            <Text style={styles.signInTitle}>Sign In</Text>
            <Text style={styles.signInSub}>Sync your data across devices</Text>
          </View>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      <Text style={styles.groupLabel}>PREFERENCES</Text>

      <AppearanceSection
        colors={colors}
        mode={mode}
        isDark={isDark}
        onThemeChange={handleThemeChange}
      />

      <VoiceSection
        colors={colors}
        voiceOn={voiceOn}
        onToggle={handleToggleVoice}
      />

      <NotificationSettings
        colors={colors}
        prefs={prefs}
        unreadCount={unreadCount}
        onUpdatePrefs={updatePrefs}
      />

      <View style={styles.unitCard}>
        <Text style={styles.unitCardTitle}>Units</Text>
        <Text style={styles.unitCardDesc}>Choose measurement system</Text>
        <View style={styles.unitToggleRow}>
          {(['metric', 'imperial'] as const).map((u) => (
            <TouchableOpacity
              key={u}
              style={[styles.unitToggleBtn, unitSystem === u && styles.unitToggleBtnActive]}
              onPress={() => {
                setUnitSystem(u);
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
              accessibilityLabel={`Switch to ${u} units`}
              accessibilityRole="button"
              accessibilityState={{ selected: unitSystem === u }}
            >
              <Text style={[styles.unitToggleText, unitSystem === u && styles.unitToggleTextActive]}>
                {u === 'metric' ? 'Metric (m, km, t)' : 'Imperial (ft, mi, lbs)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.groupLabel}>INFO</Text>

      <View style={styles.legalGroup}>
        <TouchableOpacity
          style={styles.legalItem}
          onPress={() => router.push('/about')}
          activeOpacity={0.7}
          testID="settings-about-btn"
          accessibilityLabel="About this app"
          accessibilityRole="button"
        >
          <View style={styles.legalItemIcon}>
            <Info size={16} color={colors.textSecondary} />
          </View>
          <Text style={styles.legalItemText}>About & Changelog</Text>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={styles.groupLabel}>LEGAL</Text>

      <View style={styles.legalGroup}>
        <TouchableOpacity
          style={styles.legalItem}
          onPress={() => router.push('/privacy-policy')}
          activeOpacity={0.7}
          testID="settings-privacy-btn"
          accessibilityLabel="Privacy Policy"
          accessibilityRole="button"
        >
          <View style={styles.legalItemIcon}>
            <Shield size={16} color={colors.textSecondary} />
          </View>
          <Text style={styles.legalItemText}>Privacy Policy</Text>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.legalDivider} />
        <TouchableOpacity
          style={styles.legalItem}
          onPress={() => router.push('/terms-of-service')}
          activeOpacity={0.7}
          testID="settings-terms-btn"
          accessibilityLabel="Terms of Service"
          accessibilityRole="button"
        >
          <View style={styles.legalItemIcon}>
            <FileText size={16} color={colors.textSecondary} />
          </View>
          <Text style={styles.legalItemText}>Terms of Service</Text>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {isAuthenticated && (
        <>
          <Text style={styles.groupLabel}>ACCOUNT</Text>

          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            activeOpacity={0.7}
            testID="settings-sign-out-btn"
          >
            <LogOut size={16} color={colors.warning} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
            disabled={isDeletingAccount}
            testID="settings-delete-account-btn"
          >
            <Trash2 size={16} color={colors.danger} />
            <Text style={styles.deleteText}>
              {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.versionText}>Docks & Bridges Trucker v1.0.0</Text>
    </ScrollView>
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
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  accountEmail: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  signInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  signInContent: {
    flex: 1,
  },
  signInTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  signInSub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  groupLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  legalGroup: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  legalItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalItemText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
  },
  legalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 58,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.warning + '10',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.warning + '25',
    marginBottom: 10,
  },
  signOutText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.danger + '10',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.danger + '25',
    marginBottom: 10,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  unitCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitCardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  unitCardDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
  },
  unitToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unitToggleBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  unitToggleBtnActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  unitToggleText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  unitToggleTextActive: {
    color: colors.primary,
  },
  versionText: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
});

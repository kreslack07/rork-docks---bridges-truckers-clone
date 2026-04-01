import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Truck,
  Heart,
  AlertTriangle,
  MapPin,
  Plus,
  Clock,
  ChevronRight,
  WifiOff,
  Wifi,
  Trash2,
  Info,
  Settings,
  Search,
  Users,
  HelpCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useTruckProfile } from '@/context/TruckSettingsContext';
import { useFavourites } from '@/context/FavouritesContext';
import { useLiveData } from '@/context/LiveDataContext';
import { useFleet } from '@/context/FleetContext';
import { TruckProfile } from '@/types';
import EmptyState from '@/components/EmptyState';
import TruckForm from '@/components/profile/TruckForm';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile, updateProfile } = useTruckProfile();
  const { favouriteDockIds, recentRoutes, clearRecentRoutes, favouriteCount } = useFavourites();
  const { docks, isOffline } = useLiveData();
  const { truckCount, activeTruck } = useFleet();

  const favouriteDocks = useMemo(() => {
    const idSet = new Set(favouriteDockIds);
    return docks.filter((d) => idSet.has(d.id));
  }, [docks, favouriteDockIds]);

  const handleClearRecents = useCallback(() => {
    Alert.alert('Clear History', 'Remove all recent routes?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          clearRecentRoutes();
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }, [clearRecentRoutes]);

  const handleSaveProfile = useCallback((updates: Partial<TruckProfile>) => {
    updateProfile(updates);
  }, [updateProfile]);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heroSection}>
        <View style={styles.truckIconContainer}>
          <Truck size={48} color={colors.primary} />
        </View>
        <Text style={styles.heroTitle}>
          {profile.name || 'Set Up Your Truck'}
        </Text>
        <Text style={styles.heroSubtitle}>
          Your truck details help us find the safest route
        </Text>
        {profile.plateNumber ? (
          <View style={styles.plateBadge}>
            <Text style={styles.plateLabel}>REGO</Text>
            <Text style={styles.plateValue}>{profile.plateNumber}</Text>
          </View>
        ) : null}
        {isOffline && (
          <View style={styles.offlineBadge}>
            <WifiOff size={12} color={colors.warning} />
            <Text style={styles.offlineBadgeText}>Offline — using cached data</Text>
          </View>
        )}
        {!isOffline && (
          <View style={styles.onlineBadge}>
            <Wifi size={12} color={colors.success} />
            <Text style={styles.onlineBadgeText}>Connected</Text>
          </View>
        )}
      </View>

      <TruckForm
        colors={colors}
        profile={profile}
        onSave={handleSaveProfile}
      />

      <View style={styles.topActions}>
        <TouchableOpacity
          style={styles.topActionBtn}
          onPress={() => router.push('/search')}
          activeOpacity={0.7}
          testID="profile-search-btn"
          accessibilityLabel="Search docks and hazards"
          accessibilityRole="button"
        >
          <Search size={18} color={colors.primary} />
          <Text style={styles.topActionText}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.topActionBtn}
          onPress={() => router.push('/(tabs)/profile/settings')}
          activeOpacity={0.7}
          testID="profile-settings-btn"
          accessibilityLabel="Open settings"
          accessibilityRole="button"
        >
          <Settings size={18} color={colors.textSecondary} />
          <Text style={styles.topActionText}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.helpBtn}
          accessibilityLabel="Get help and support"
          accessibilityRole="button"
          onPress={() => Alert.alert(
            'Need Help?',
            'For support, bug reports, or feedback:\n\nEmail: support@docksandbridges.com.au\n\nYou can also report issues directly in the app using the Report Hazard or Report Dock buttons.',
            [{ text: 'OK' }],
          )}
          activeOpacity={0.7}
          testID="profile-help-btn"
        >
          <HelpCircle size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Users size={16} color={colors.textSecondary} />
          <Text style={styles.sectionTitle}>Fleet ({truckCount})</Text>
        </View>
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => router.push('/fleet-manage')}
          activeOpacity={0.7}
          testID="profile-fleet-btn"
        >
          <View style={styles.listItemIcon}>
            <Truck size={16} color={colors.primary} />
          </View>
          <View style={styles.listItemContent}>
            <Text style={styles.listItemTitle}>
              {activeTruck ? activeTruck.name : 'Manage Fleet'}
            </Text>
            <Text style={styles.listItemSub}>
              {truckCount === 0 ? 'Add trucks for fleet operators' : `${truckCount} truck${truckCount !== 1 ? 's' : ''} in fleet`}
            </Text>
          </View>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/report-hazard')}
          activeOpacity={0.7}
          testID="profile-report-hazard-btn"
          accessibilityLabel="Report a hazard"
          accessibilityRole="button"
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.warning + '15' }]}>
            <AlertTriangle size={20} color={colors.warning} />
          </View>
          <Text style={styles.quickActionLabel}>Report{'\n'}Hazard</Text>
          <Plus size={14} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/report-dock')}
          activeOpacity={0.7}
          testID="profile-report-dock-btn"
          accessibilityLabel="Report a dock"
          accessibilityRole="button"
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + '15' }]}>
            <MapPin size={20} color={colors.primary} />
          </View>
          <Text style={styles.quickActionLabel}>Report{'\n'}Dock</Text>
          <Plus size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Heart size={16} color={colors.danger} />
          <Text style={styles.sectionTitle}>Favourites ({favouriteCount})</Text>
          {favouriteCount > 0 && (
            <TouchableOpacity
              onPress={() => router.push('/favourites')}
              style={styles.clearBtn}
              accessibilityLabel="View all favourite docks"
              accessibilityRole="button"
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
        {favouriteDocks.length > 0 ? (
          favouriteDocks.slice(0, 5).map((dock) => (
            <TouchableOpacity
              key={dock.id}
              style={styles.listItem}
              onPress={() => router.push({ pathname: '/dock-details', params: { id: dock.id } })}
              activeOpacity={0.7}
              accessibilityLabel={`${dock.name}, ${dock.business}`}
              accessibilityRole="button"
            >
              <View style={styles.listItemIcon}>
                <MapPin size={16} color={colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle} numberOfLines={1}>{dock.name}</Text>
                <Text style={styles.listItemSub} numberOfLines={1}>{dock.business}</Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))
        ) : (
          <EmptyState type="favourites" />
        )}
      </View>

      {recentRoutes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={styles.sectionTitle}>Recent Routes</Text>
            <TouchableOpacity onPress={handleClearRecents} style={styles.clearBtn} testID="profile-clear-recents-btn">
              <Trash2 size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {recentRoutes.slice(0, 5).map((route) => (
            <View key={route.id} style={styles.listItem}>
              <View style={styles.listItemIcon}>
                <Clock size={14} color={colors.textMuted} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle} numberOfLines={1}>{route.destination}</Text>
                <Text style={styles.listItemSub}>
                  {new Date(route.timestamp).toLocaleDateString('en-AU')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.infoCard}>
        <Info size={16} color={colors.textSecondary} />
        <Text style={styles.infoText}>
          Data sourced from OpenStreetMap. Always verify clearance signs on approach. Report inaccuracies to help other drivers.
        </Text>
      </View>

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
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 4,
  },
  truckIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800' as const,
    marginBottom: 4,
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warning + '15',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  offlineBadgeText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.success + '15',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  onlineBadgeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  plateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
  plateLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  plateValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600' as const,
    flex: 1,
    lineHeight: 17,
  },
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
  clearBtn: {
    padding: 6,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  listItemSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  topActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  topActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topActionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  helpBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  versionText: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
});

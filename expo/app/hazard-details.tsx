import React, { useMemo } from 'react';
import ScreenErrorBoundary from '@/components/ScreenErrorBoundary';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import {
  AlertTriangle,
  Zap,
  MapPin,
  Calendar,
  Ruler,
  AlertCircle,
  Wifi,
  ExternalLink,
  Navigation,
  Weight,
  Share2,
} from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useLiveData } from '@/context/LiveDataContext';
import { useTruckProfile } from '@/context/UserPreferencesContext';
import { useAuth } from '@/context/AuthContext';
import { useCommunityData } from '@/hooks/useCommunityData';
import { openInWaze } from '@/services/waze';
import * as Haptics from 'expo-haptics';
import ClearanceCard from '@/components/hazard/ClearanceCard';
import CommunitySection from '@/components/hazard/CommunitySection';
import { cachedStyles } from '@/utils/styleCache';

function HazardDetailsScreenContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { profile } = useTruckProfile();
  const { findHazardById, isLoadingHazards } = useLiveData();
  const { user, isAuthenticated } = useAuth();
  const {
    addVerification,
    addReport,
    upvoteReport,
    getVerificationsForHazard,
    getReportsForHazard,
    getConfirmedCount,
    getDisputedCount,
    hasUserVerified,
  } = useCommunityData();

  const hazard = useMemo(() => findHazardById(id ?? ''), [id, findHazardById]);
  const verifications = useMemo(() => getVerificationsForHazard(id ?? ''), [id, getVerificationsForHazard]);
  const reports = useMemo(() => getReportsForHazard(id ?? ''), [id, getReportsForHazard]);
  const confirmedCount = useMemo(() => getConfirmedCount(id ?? ''), [id, getConfirmedCount]);
  const disputedCount = useMemo(() => getDisputedCount(id ?? ''), [id, getDisputedCount]);
  const userHasVerified = useMemo(() => hasUserVerified(id ?? '', user?.id ?? ''), [id, user?.id, hasUserVerified]);

  const styles = cachedStyles(makeStyles, colors);

  if (!hazard) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: isLoadingHazards ? 'Loading...' : 'Not Found' }} />
        <View style={styles.errorState}>
          {isLoadingHazards ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.errorText}>Loading hazard data...</Text>
            </>
          ) : (
            <>
              <AlertCircle size={48} color={colors.textMuted} />
              <Text style={styles.errorText}>Hazard not found</Text>
            </>
          )}
        </View>
      </View>
    );
  }

  const isLive = hazard.id.startsWith('osm-');
  const hasClearance = hazard.clearanceHeight < 90;
  const heightBlocked = hasClearance && hazard.clearanceHeight < profile.height;
  const weightBlocked = hazard.weightLimit ? profile.weight > hazard.weightLimit : false;
  const widthBlocked = hazard.widthLimit ? profile.width > hazard.widthLimit : false;
  const isBlocked = heightBlocked || weightBlocked || widthBlocked;
  const isTight = !isBlocked && hasClearance && hazard.clearanceHeight < profile.height + 0.3;
  const statusColor = isBlocked ? colors.danger : isTight ? colors.warning : colors.success;
  const statusLabel = isBlocked ? 'CANNOT PASS' : isTight ? 'TIGHT FIT' : 'SAFE TO PASS';
  const clearanceDiff = hazard.clearanceHeight - profile.height;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Stack.Screen options={{ title: hazard.name, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />

      <View style={styles.headerSection}>
        <View style={[styles.iconLarge, { backgroundColor: statusColor + '15', borderColor: statusColor + '30' }]}>
          {hazard.type === 'weight_limit' ? (
            <Weight size={32} color={statusColor} />
          ) : hazard.type === 'bridge' ? (
            <AlertTriangle size={32} color={statusColor} />
          ) : (
            <Zap size={32} color={statusColor} />
          )}
        </View>
        <Text style={styles.title}>{hazard.name}</Text>
        <Text style={styles.subtitle}>
          {hazard.type === 'weight_limit' ? 'Weight Restriction' : hazard.type === 'bridge' ? 'Low Bridge' : 'Low-Hanging Wires'}
        </Text>
        {isLive && (
          <View style={styles.liveBadge}>
            <Wifi size={10} color={colors.success} />
            <Text style={styles.liveBadgeText}>Live OpenStreetMap Data</Text>
          </View>
        )}
      </View>

      <View style={[styles.statusBanner, { backgroundColor: statusColor + '12', borderColor: statusColor + '30' }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <View style={styles.statusContent}>
          <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
          <Text style={styles.statusDetail}>
            {widthBlocked && !heightBlocked && !weightBlocked
              ? `Your truck (${profile.width.toFixed(1)}m wide) exceeds the ${hazard.widthLimit}m width limit`
              : weightBlocked && !heightBlocked
              ? `Your truck (${profile.weight.toFixed(1)}t) exceeds the ${hazard.weightLimit}t weight limit${widthBlocked ? ` and exceeds ${hazard.widthLimit}m width limit` : ''}`
              : heightBlocked
              ? `Your truck is ${Math.abs(clearanceDiff).toFixed(1)}m too tall for this ${hazard.type}${weightBlocked ? ` and exceeds ${hazard.weightLimit}t weight limit` : ''}${widthBlocked ? ` and exceeds ${hazard.widthLimit}m width limit` : ''}`
              : isTight
              ? `Only ${clearanceDiff.toFixed(1)}m clearance — proceed with extreme caution`
              : `${hazard.type === 'weight_limit' ? 'Your truck is within the weight limit' : hasClearance ? `${clearanceDiff.toFixed(1)}m of clearance above your truck` : 'No height restriction at this location'}`}
          </Text>
        </View>
      </View>

      <View style={styles.navActionRow}>
        <TouchableOpacity
          style={styles.navActionBtn}
          onPress={() => {
            const url = Platform.select({
              ios: `maps://app?daddr=${hazard.latitude},${hazard.longitude}`,
              android: `google.navigation:q=${hazard.latitude},${hazard.longitude}`,
              default: `https://www.google.com/maps/dir/?api=1&destination=${hazard.latitude},${hazard.longitude}`,
            });
            if (url) void Linking.openURL(url);
          }}
          activeOpacity={0.7}
        >
          <ExternalLink size={16} color={colors.primary} />
          <Text style={styles.navActionBtnText}>Open in Maps</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navActionWazeBtn}
          onPress={() => {
            void openInWaze({
              latitude: hazard.latitude,
              longitude: hazard.longitude,
              label: hazard.name,
            });
          }}
          activeOpacity={0.7}
        >
          <Navigation size={16} color={colors.waze} />
          <Text style={styles.navActionWazeBtnText}>Open in Waze</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.shareBtn}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const clearanceText = hazard.type === 'weight_limit'
            ? `Weight limit: ${hazard.weightLimit}t`
            : `Clearance: ${hazard.clearanceHeight.toFixed(1)}m`;
          const mapsUrl = `https://www.google.com/maps?q=${hazard.latitude},${hazard.longitude}`;
          void Share.share({
            message: `${hazard.name}\n${hazard.road}, ${hazard.city} ${hazard.state}\n${clearanceText}\nLast verified: ${hazard.lastVerified}\n\n${mapsUrl}`,
            title: hazard.name,
          });
        }}
        activeOpacity={0.7}
        accessibilityLabel={`Share ${hazard.name} with other drivers`}
        accessibilityRole="button"
      >
        <Share2 size={16} color={colors.primary} />
        <Text style={styles.shareBtnText}>Share with Other Drivers</Text>
      </TouchableOpacity>

      <ClearanceCard
        hazard={hazard}
        colors={colors}
        truckHeight={profile.height}
        truckWeight={profile.weight}
        heightBlocked={heightBlocked}
        weightBlocked={weightBlocked}
      />

      <CommunitySection
        hazard={hazard}
        colors={colors}
        isAuthenticated={isAuthenticated}
        userId={user?.id}
        userDisplayName={user?.displayName}
        verifications={verifications}
        reports={reports}
        confirmedCount={confirmedCount}
        disputedCount={disputedCount}
        userHasVerified={userHasVerified}
        addVerification={addVerification}
        addReport={addReport}
        upvoteReport={upvoteReport}
      />

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <MapPin size={16} color={colors.textSecondary} />
          <View style={styles.cardRowContent}>
            <Text style={styles.cardRowLabel}>Location</Text>
            <Text style={styles.cardRowValue}>{hazard.road}</Text>
            <Text style={styles.cardRowSub}>
              {hazard.city}{hazard.state ? `, ${hazard.state}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardRow}>
          <Calendar size={16} color={colors.textSecondary} />
          <View style={styles.cardRowContent}>
            <Text style={styles.cardRowLabel}>Last Verified</Text>
            <Text style={styles.cardRowValue}>{hazard.lastVerified}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardRow}>
          <Ruler size={16} color={colors.textSecondary} />
          <View style={styles.cardRowContent}>
            <Text style={styles.cardRowLabel}>Coordinates</Text>
            <Text style={styles.cardRowValue}>
              {hazard.latitude.toFixed(4)}, {hazard.longitude.toFixed(4)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Description</Text>
        <Text style={styles.descriptionText}>{hazard.description}</Text>
      </View>

      {isBlocked && (
        <View style={styles.warningCard}>
          <AlertTriangle size={20} color={colors.danger} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Do Not Attempt</Text>
            <Text style={styles.warningText}>
              {heightBlocked && weightBlocked
                ? `Your truck (${profile.height.toFixed(1)}m) exceeds the ${hazard.clearanceHeight.toFixed(1)}m clearance and your weight (${profile.weight.toFixed(1)}t) exceeds the ${hazard.weightLimit}t limit. Find an alternative route.`
                : heightBlocked
                ? `Your truck height of ${profile.height.toFixed(1)}m exceeds the clearance of ${hazard.clearanceHeight.toFixed(1)}m. You must find an alternative route.`
                : weightBlocked
                ? `Your truck weight of ${profile.weight.toFixed(1)}t exceeds the ${hazard.weightLimit}t weight limit. You must find an alternative route.`
                : widthBlocked
                ? `Your truck width of ${profile.width.toFixed(1)}m exceeds the ${hazard.widthLimit}m width limit. You must find an alternative route.`
                : 'This hazard blocks your vehicle. Check the Route Planner for safe alternatives.'}
            </Text>
          </View>
        </View>
      )}

      {isLive && (
        <View style={styles.sourceCard}>
          <Wifi size={14} color={colors.success} />
          <Text style={styles.sourceText}>
            This hazard was detected from OpenStreetMap maxheight data. Always verify clearance signs on approach.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

export default function HazardDetailsScreen() {
  return (
    <ScreenErrorBoundary screenName="Hazard Details">
      <HazardDetailsScreenContent />
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
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  iconLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800' as const,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.success + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 8,
  },
  liveBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  navActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  navActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  navActionBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  navActionWazeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.waze + '15',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.waze + '30',
  },
  navActionWazeBtnText: {
    color: colors.waze,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 2,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '800' as const,
    marginBottom: 4,
  },
  statusDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  cardRowContent: {
    flex: 1,
  },
  cardRowLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardRowValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  cardRowSub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  descriptionText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  warningCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.danger + '10',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.danger + '25',
    marginBottom: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  warningText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.success + '10',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.success + '25',
  },
  sourceText: {
    color: colors.success,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary + '12',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  shareBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});

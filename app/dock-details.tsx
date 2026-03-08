import React, { useMemo, useCallback } from 'react';
import ScreenErrorBoundary from '@/components/ScreenErrorBoundary';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import {
  MapPin,
  Truck,
  Navigation,
  Info,
  AlertCircle,
  Route,
  Clock,
  Phone,
  ExternalLink,
  Building2,
  Tag,
  Wifi,
  Heart,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { BUSINESS_CATEGORY_LABELS } from '@/constants/categories';
import { useLiveData } from '@/context/LiveDataContext';
import { useFavourites } from '@/context/FavouritesContext';
import { openInWaze } from '@/services/waze';

function DockDetailsScreenContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { findDockById, isLoadingDocks } = useLiveData();
  const { isFavourite, toggleFavourite } = useFavourites();

  const dock = useMemo(() => findDockById(id ?? ''), [id, findDockById]);
  const isFav = useMemo(() => isFavourite(id ?? ''), [id, isFavourite]);

  const handleToggleFav = useCallback(() => {
    if (id) {
      toggleFavourite(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [id, toggleFavourite]);

  const openInMaps = useCallback(() => {
    if (!dock) return;
    const url = Platform.select({
      ios: `maps://app?daddr=${dock.latitude},${dock.longitude}`,
      android: `google.navigation:q=${dock.latitude},${dock.longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${dock.latitude},${dock.longitude}`,
    });
    if (url) Linking.openURL(url);
  }, [dock]);

  const handleOpenWaze = useCallback(() => {
    if (!dock) return;
    openInWaze({
      latitude: dock.latitude,
      longitude: dock.longitude,
      label: dock.name,
    });
  }, [dock]);

  const callDock = useCallback(() => {
    if (dock?.phone) Linking.openURL(`tel:${dock.phone}`);
  }, [dock]);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!dock) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: isLoadingDocks ? 'Loading...' : 'Not Found' }} />
        <View style={styles.errorState}>
          {isLoadingDocks ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.errorText}>Loading dock data...</Text>
            </>
          ) : (
            <>
              <AlertCircle size={48} color={colors.textMuted} />
              <Text style={styles.errorText}>Dock not found</Text>
            </>
          )}
        </View>
      </View>
    );
  }

  const isLive = dock.id.startsWith('osm-');
  const dockTypeLabel =
    dock.dockType === 'both'
      ? 'Loading & Unloading'
      : dock.dockType === 'loading'
      ? 'Loading Only'
      : 'Unloading Only';

  const categoryLabel = BUSINESS_CATEGORY_LABELS[dock.businessCategory] ?? dock.businessCategory;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Stack.Screen options={{ title: dock.name }} />

      <View style={styles.headerSection}>
        <View style={styles.iconLarge}>
          <MapPin size={32} color={colors.primary} />
        </View>
        <Text style={styles.title}>{dock.name}</Text>
        <Text style={styles.business}>{dock.business}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.categoryBadge}>
            <Building2 size={12} color={colors.primary} />
            <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
          </View>
          {isLive && (
            <View style={styles.liveBadge}>
              <Wifi size={10} color={colors.success} />
              <Text style={styles.liveBadgeText}>Live Data</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={openInMaps} activeOpacity={0.7}>
          <ExternalLink size={18} color={colors.primary} />
          <Text style={styles.actionBtnText}>Maps</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.wazeBtn} onPress={handleOpenWaze} activeOpacity={0.7}>
          <Navigation size={18} color="#33ccff" />
          <Text style={styles.wazeBtnText}>Waze</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtnSecondary, isFav && styles.favBtnActive]}
          onPress={handleToggleFav}
          activeOpacity={0.7}
        >
          <Heart size={18} color={isFav ? colors.danger : colors.primary} fill={isFav ? colors.danger : 'none'} />
        </TouchableOpacity>
        {dock.phone && (
          <TouchableOpacity style={styles.actionBtnSecondary} onPress={callDock} activeOpacity={0.7}>
            <Phone size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <MapPin size={16} color={colors.textSecondary} />
          <View style={styles.cardRowContent}>
            <Text style={styles.cardRowLabel}>Address</Text>
            <Text style={styles.cardRowValue}>{dock.address}</Text>
            <Text style={styles.cardRowSub}>
              {dock.city}, {dock.state}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardRow}>
          <Truck size={16} color={colors.textSecondary} />
          <View style={styles.cardRowContent}>
            <Text style={styles.cardRowLabel}>Dock Type</Text>
            <Text style={styles.cardRowValue}>{dockTypeLabel}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardRow}>
          <Tag size={16} color={colors.textSecondary} />
          <View style={styles.cardRowContent}>
            <Text style={styles.cardRowLabel}>Business Category</Text>
            <Text style={styles.cardRowValue}>{categoryLabel}</Text>
          </View>
        </View>

        {dock.operatingHours && (
          <>
            <View style={styles.divider} />
            <View style={styles.cardRow}>
              <Clock size={16} color={colors.textSecondary} />
              <View style={styles.cardRowContent}>
                <Text style={styles.cardRowLabel}>Operating Hours</Text>
                <Text style={styles.cardRowValue}>{dock.operatingHours}</Text>
              </View>
            </View>
          </>
        )}

        {dock.phone && (
          <>
            <View style={styles.divider} />
            <View style={styles.cardRow}>
              <Phone size={16} color={colors.textSecondary} />
              <View style={styles.cardRowContent}>
                <Text style={styles.cardRowLabel}>Phone</Text>
                <Text style={styles.cardRowValue}>{dock.phone}</Text>
              </View>
            </View>
          </>
        )}

        <View style={styles.divider} />

        <View style={styles.cardRow}>
          <Navigation size={16} color={colors.textSecondary} />
          <View style={styles.cardRowContent}>
            <Text style={styles.cardRowLabel}>Coordinates</Text>
            <Text style={styles.cardRowValue}>
              {dock.latitude.toFixed(4)}, {dock.longitude.toFixed(4)}
            </Text>
          </View>
        </View>
      </View>

      {dock.isOffRoad && (
        <View style={styles.offRoadBanner}>
          <Route size={16} color={colors.warning} />
          <Text style={styles.offRoadText}>
            This dock has off-road access — GPS may not show the correct entry
            point. Follow the access notes below.
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Description</Text>
        <Text style={styles.descriptionText}>{dock.description}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Access Notes</Text>
        <View style={styles.accessNotesBox}>
          <Info size={16} color={colors.primary} />
          <Text style={styles.accessNotesText}>{dock.accessNotes}</Text>
        </View>
      </View>

      {isLive && (
        <View style={styles.sourceCard}>
          <Wifi size={14} color={colors.success} />
          <Text style={styles.sourceText}>
            This data was fetched live from OpenStreetMap. Information may vary — always verify on arrival.
          </Text>
        </View>
      )}

      <View style={styles.coordsCard}>
        <Text style={styles.coordsTitle}>GPS Coordinates</Text>
        <Text style={styles.coordsValue}>
          Lat: {dock.latitude.toFixed(6)}
        </Text>
        <Text style={styles.coordsValue}>
          Lng: {dock.longitude.toFixed(6)}
        </Text>
        <Text style={styles.coordsHint}>
          Use these coordinates if your GPS cannot find the dock address
        </Text>
      </View>
    </ScrollView>
  );
}

export default function DockDetailsScreen() {
  return (
    <ScreenErrorBoundary screenName="Dock Details">
      <DockDetailsScreenContent />
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
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800' as const,
    textAlign: 'center',
    marginBottom: 4,
  },
  business: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  categoryBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.success + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  liveBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
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
  actionBtnSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  favBtnActive: {
    backgroundColor: colors.danger + '15',
    borderColor: colors.danger + '30',
  },
  actionBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  wazeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#33ccff' + '15',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#33ccff' + '30',
  },
  wazeBtnText: {
    color: '#33ccff',
    fontSize: 14,
    fontWeight: '700' as const,
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
  offRoadBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.warning + '12',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  offRoadText: {
    color: colors.warning,
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
    fontWeight: '500' as const,
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
  accessNotesBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.primary + '08',
    borderRadius: 10,
    padding: 12,
  },
  accessNotesText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.success + '10',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
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
  coordsCard: {
    backgroundColor: colors.elevated,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coordsTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  coordsValue: {
    color: colors.text,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
  coordsHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 8,
    lineHeight: 16,
  },
});

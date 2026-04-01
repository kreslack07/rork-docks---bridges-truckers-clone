import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Heart,
  MapPin,
  Building2,
  ChevronRight,
  Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useFavourites } from '@/context/FavouritesContext';
import { useLiveData } from '@/context/LiveDataContext';
import { useUserLocation } from '@/hooks/useUserLocation';
import { haversineDistance } from '@/utils/geo';
import { BUSINESS_CATEGORY_LABELS } from '@/constants/categories';
import { Dock } from '@/types';
import EmptyState from '@/components/EmptyState';
import ScreenErrorBoundary from '@/components/ScreenErrorBoundary';

interface FavDockItem extends Dock {
  distance: number | null;
}

function FavouritesScreenContent() {
  const router = useRouter();
  const { colors } = useTheme();
  const { favouriteDockIds, toggleFavourite } = useFavourites();
  const { docks } = useLiveData();
  const { userLocation, getUserLocation } = useUserLocation();

  React.useEffect(() => {
    void getUserLocation();
  }, [getUserLocation]);

  const favouriteDocks = useMemo<FavDockItem[]>(() => {
    const idSet = new Set(favouriteDockIds);
    const favs = docks.filter((d) => idSet.has(d.id));
    return favs
      .map((d) => ({
        ...d,
        distance: userLocation
          ? haversineDistance(userLocation.latitude, userLocation.longitude, d.latitude, d.longitude)
          : null,
      }))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [docks, favouriteDockIds, userLocation]);

  const handleRemoveFav = useCallback((dockId: string) => {
    toggleFavourite(dockId);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [toggleFavourite]);

  const handleNavigate = useCallback((dock: Dock) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/dock-details', params: { id: dock.id } });
  }, [router]);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const renderItem = useCallback(({ item }: { item: FavDockItem }) => {
    const categoryLabel = BUSINESS_CATEGORY_LABELS[item.businessCategory] ?? item.businessCategory;
    return (
      <TouchableOpacity
        style={styles.dockCard}
        onPress={() => handleNavigate(item)}
        activeOpacity={0.7}
        accessibilityLabel={`${item.name}, ${item.business}, ${item.city}${item.distance != null ? `, ${item.distance < 1 ? `${Math.round(item.distance * 1000)} metres away` : `${item.distance.toFixed(1)} kilometres away`}` : ''}`}
        accessibilityRole="button"
      >
        <View style={styles.dockIconWrap}>
          <MapPin size={20} color={colors.primary} />
        </View>
        <View style={styles.dockContent}>
          <Text style={styles.dockName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.dockBusiness} numberOfLines={1}>{item.business}</Text>
          <View style={styles.dockMeta}>
            <View style={styles.categoryChip}>
              <Building2 size={9} color={colors.primary} />
              <Text style={styles.categoryChipText}>{categoryLabel}</Text>
            </View>
            <Text style={styles.dockCity}>{item.city}, {item.state}</Text>
          </View>
        </View>
        <View style={styles.dockRight}>
          {item.distance != null && (
            <Text style={styles.distanceText}>
              {item.distance < 1
                ? `${Math.round(item.distance * 1000)}m`
                : `${item.distance.toFixed(1)}km`}
            </Text>
          )}
          <View style={styles.dockActions}>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemoveFav(item.id)}
              hitSlop={8}
              accessibilityLabel={`Remove ${item.name} from favourites`}
              accessibilityRole="button"
            >
              <Trash2 size={14} color={colors.textMuted} />
            </TouchableOpacity>
            <ChevronRight size={14} color={colors.textMuted} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [styles, colors, handleNavigate, handleRemoveFav]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Favourite Docks' }} />

      {favouriteDocks.length > 0 && (
        <View style={styles.headerBar}>
          <Heart size={14} color={colors.danger} />
          <Text style={styles.headerBarText}>
            {favouriteDocks.length} saved dock{favouriteDocks.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <FlatList
        data={favouriteDocks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            type="favourites"
            title="No favourite docks yet"
            message="Tap the heart icon on any dock to save it here for quick access."
          />
        }
      />
    </View>
  );
}

export default function FavouritesScreen() {
  return (
    <ScreenErrorBoundary screenName="Favourites">
      <FavouritesScreenContent />
    </ScreenErrorBoundary>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.danger + '08',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBarText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  dockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    }),
  },
  dockIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dockContent: {
    flex: 1,
  },
  dockName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  dockBusiness: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  dockMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryChipText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  dockCity: {
    color: colors.textMuted,
    fontSize: 11,
  },
  dockRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  distanceText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  dockActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

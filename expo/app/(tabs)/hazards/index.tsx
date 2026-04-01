import React, { useState, useMemo, useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import { useRouter } from 'expo-router';
import { Search, AlertTriangle, Zap, ArrowUpDown, Wifi, Shield, Weight, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useLiveData } from '@/context/LiveDataContext';
import { useTruckProfile } from '@/context/UserPreferencesContext';
import { useCommunityData } from '@/hooks/useCommunityData';
import { Hazard, HazardFilter } from '@/types';
import { ListSkeletonLoader } from '@/components/SkeletonLoader';
import EmptyState from '@/components/EmptyState';
import { getHazardColor as getHazardColorUtil, getHazardStatusLabel } from '@/utils/hazards';
import { useUserLocation } from '@/hooks/useUserLocation';
import { haversineDistance } from '@/utils/geo';
import { cachedStyles } from '@/utils/styleCache';

type SortMode = 'nearest' | 'name' | 'height_asc' | 'height_desc' | 'city';

export default function HazardsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useTruckProfile();
  const { hazards, isLoadingHazards, refetchHazards } = useLiveData();
  const { getConfirmedCount, getDisputedCount } = useCommunityData();
  const [search, setSearch] = useState<string>('');
  const [filter, setFilter] = useState<HazardFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('nearest');
  const { userLocation, getUserLocation } = useUserLocation();
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchHazards();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchHazards]);

  const filteredHazards = useMemo(() => {
    let result = hazards;

    if (filter === 'bridge') result = result.filter((h) => h.type === 'bridge');
    if (filter === 'wire') result = result.filter((h) => h.type === 'wire');
    if (filter === 'weight_limit') result = result.filter((h) => h.type === 'weight_limit' || h.weightLimit != null);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.road.toLowerCase().includes(q) ||
          h.city.toLowerCase().includes(q) ||
          h.state.toLowerCase().includes(q)
      );
    }

    switch (sortMode) {
      case 'nearest':
        if (userLocation) {
          result = [...result].sort((a, b) => {
            const distA = haversineDistance(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude);
            const distB = haversineDistance(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude);
            return distA - distB;
          });
        } else {
          result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        }
        break;
      case 'height_asc':
        result = [...result].sort((a, b) => a.clearanceHeight - b.clearanceHeight);
        break;
      case 'height_desc':
        result = [...result].sort((a, b) => b.clearanceHeight - a.clearanceHeight);
        break;
      case 'city':
        result = [...result].sort((a, b) => a.city.localeCompare(b.city));
        break;
      default:
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [search, filter, sortMode, hazards, userLocation]);

  const liveCount = useMemo(() => hazards.filter(h => h.id.startsWith('osm-')).length, [hazards]);

  const getStatusColor = useCallback(
    (hazard: Hazard) => getHazardColorUtil(hazard, profile, colors),
    [profile, colors]
  );

  const getStatusLabel = useCallback(
    (hazard: Hazard) => getHazardStatusLabel(hazard, profile),
    [profile]
  );

  const cycleSortMode = useCallback(() => {
    setSortMode((prev) => {
      const next = prev === 'nearest' ? 'name'
        : prev === 'name' ? 'height_asc'
        : prev === 'height_asc' ? 'height_desc'
        : prev === 'height_desc' ? 'city'
        : 'nearest';
      if (next === 'nearest' && !userLocation) {
        void getUserLocation();
      }
      return next;
    });
  }, [userLocation, getUserLocation]);

  const getSortLabel = useCallback(() => {
    switch (sortMode) {
      case 'nearest':
        return 'Nearest';
      case 'height_asc':
        return 'Height ↑';
      case 'height_desc':
        return 'Height ↓';
      case 'city':
        return 'City';
      default:
        return 'Name';
    }
  }, [sortMode]);

  const typeCounts = useMemo(() => {
    let bridges = 0;
    let wires = 0;
    let weightLimited = 0;
    for (const h of hazards) {
      if (h.type === 'bridge') bridges++;
      else if (h.type === 'wire') wires++;
      if (h.type === 'weight_limit' || h.weightLimit != null) weightLimited++;
    }
    return { bridges, wires, weightLimited };
  }, [hazards]);

  const filters = useMemo<{ key: HazardFilter; label: string; count: number }[]>(() => [
    { key: 'all', label: 'All', count: hazards.length },
    { key: 'bridge', label: 'Bridges', count: typeCounts.bridges },
    { key: 'wire', label: 'Wires', count: typeCounts.wires },
    { key: 'weight_limit', label: 'Weight', count: typeCounts.weightLimited },
  ], [hazards.length, typeCounts]);

  const styles = cachedStyles(makeStyles, colors);


  const callbacksRef = useRef({ getStatusColor, getStatusLabel, getConfirmedCount, getDisputedCount });
  callbacksRef.current = { getStatusColor, getStatusLabel, getConfirmedCount, getDisputedCount };

  const renderItem = useCallback(
    ({ item }: { item: Hazard }) => (
      <HazardListItem
        item={item}
        styles={styles}
        colors={colors}
        callbacksRef={callbacksRef}
        onPress={(id) => router.push({ pathname: '/hazard-details', params: { id } })}
      />
    ),
    [styles, colors, router]
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchWrapper}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search hazards..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            testID="hazards-search-input"
            accessibilityLabel="Search hazards by name, road, city, or state"
            accessibilityRole="search"
          />
        </View>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={cycleSortMode}
          activeOpacity={0.7}
          testID="hazards-sort-btn"
          accessibilityLabel={`Sort by ${getSortLabel()}`}
          accessibilityRole="button"
        >
          {sortMode === 'nearest' ? (
            <MapPin size={14} color={colors.primary} />
          ) : (
            <ArrowUpDown size={14} color={colors.textSecondary} />
          )}
          <Text style={[styles.sortBtnText, sortMode === 'nearest' && { color: colors.primary }]}>{getSortLabel()}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
            accessibilityLabel={`Filter by ${f.label}, ${f.count} items`}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f.key }}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === f.key && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
            <View
              style={[
                styles.filterBadge,
                filter === f.key && styles.filterBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.filterBadgeText,
                  filter === f.key && styles.filterBadgeTextActive,
                ]}
              >
                {f.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.truckBar}>
        <Text style={styles.truckBarLabel}>Your truck:</Text>
        <Text style={styles.truckBarValue}>{profile.height.toFixed(1)}m</Text>
        <Text style={styles.truckBarDivider}>·</Text>
        <Text style={styles.truckBarValue}>{profile.weight.toFixed(1)}t</Text>
        {liveCount > 0 && (
          <View style={styles.liveCountBadge}>
            <Wifi size={10} color={colors.success} />
            <Text style={styles.liveCountText}>{liveCount} live</Text>
          </View>
        )}
        {isLoadingHazards && (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
        )}
      </View>

      <FlatList
        data={filteredHazards}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={ListSeparator}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        removeClippedSubviews={true}
        maxToRenderPerBatch={12}
        windowSize={7}
        initialNumToRender={10}
        updateCellsBatchingPeriod={50}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          isLoadingHazards ? (
            <ListSkeletonLoader count={6} type="hazard" />
          ) : search.trim() ? (
            <EmptyState
              type="search"
              title="No hazards found"
              message={`No hazards match "${search}"`}
            />
          ) : (
            <EmptyState
              type="hazards"
              title="No hazards available"
              message="Pull down to refresh, or report a new hazard you encounter."
              actionLabel="Report Hazard"
              onAction={() => router.push('/report-hazard')}
            />
          )
        }
      />
    </View>
  );
}

interface HazardListItemProps {
  item: Hazard;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
  callbacksRef: React.MutableRefObject<{
    getStatusColor: (h: Hazard) => string;
    getStatusLabel: (h: Hazard) => string;
    getConfirmedCount: (id: string) => number;
    getDisputedCount: (id: string) => number;
  }>;
  onPress: (id: string) => void;
}

const HazardListItem = memo(function HazardListItem({ item, styles, colors, callbacksRef, onPress }: HazardListItemProps) {
  const callbacks = callbacksRef.current;
  if (!callbacks) return null;
  const { getStatusColor, getStatusLabel, getConfirmedCount, getDisputedCount } = callbacks;
  const statusColor = getStatusColor(item);
  const statusLabel = getStatusLabel(item);
  const isLive = item.id.startsWith('osm-');
  const confirmed = getConfirmedCount(item.id);
  const disputed = getDisputedCount(item.id);

  return (
    <TouchableOpacity
      style={styles.hazardCard}
      activeOpacity={0.7}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(item.id);
      }}
      testID={`hazard-${item.id}`}
      accessibilityLabel={`${item.name}, ${item.road}, ${item.city}. Clearance ${item.type === 'weight_limit' ? `${item.weightLimit} tonnes` : `${item.clearanceHeight.toFixed(1)} metres`}. ${statusLabel}`}
      accessibilityRole="button"
    >
      <View style={styles.hazardCardLeft}>
        <View style={[styles.hazardTypeIcon, { backgroundColor: statusColor + '15' }]}>
          {item.type === 'weight_limit' ? (
            <Weight size={18} color={statusColor} />
          ) : item.type === 'bridge' ? (
            <AlertTriangle size={18} color={statusColor} />
          ) : (
            <Zap size={18} color={statusColor} />
          )}
        </View>
      </View>
      <View style={styles.hazardCardCenter}>
        <Text style={styles.hazardCardName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.hazardCardRoad}>
          {item.road}, {item.city} {item.state}
        </Text>
        <View style={styles.hazardCardMeta}>
          <Text style={styles.hazardCardVerified}>
            Verified: {item.lastVerified}
          </Text>
          {isLive && (
            <View style={styles.liveTag}>
              <Wifi size={8} color={colors.success} />
              <Text style={styles.liveTagText}>Live</Text>
            </View>
          )}
          {(confirmed > 0 || disputed > 0) && (
            <View style={styles.communityTag}>
              <Shield size={8} color={colors.primary} />
              <Text style={styles.communityTagText}>{confirmed}✓ {disputed}✗</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.hazardCardRight}>
        {item.type === 'weight_limit' ? (
          <Text style={[styles.hazardCardHeight, { color: statusColor }]}>
            {item.weightLimit}t
          </Text>
        ) : (
          <Text style={[styles.hazardCardHeight, { color: statusColor }]}>
            {item.clearanceHeight.toFixed(1)}m
          </Text>
        )}
        {item.weightLimit != null && item.type !== 'weight_limit' && (
          <Text style={[styles.weightBadgeText, { color: colors.warning }]}>
            {item.weightLimit}t
          </Text>
        )}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const keyExtractor = (item: Hazard) => item.id;

const HAZARD_ITEM_HEIGHT = 82;
const SEPARATOR_HEIGHT = 10;

const getItemLayout = (_data: ArrayLike<Hazard> | null | undefined, index: number) => ({
  length: HAZARD_ITEM_HEIGHT,
  offset: (HAZARD_ITEM_HEIGHT + SEPARATOR_HEIGHT) * index,
  index,
});

const separatorStyle = { height: SEPARATOR_HEIGHT } as const;
const ListSeparator = memo(function ListSeparator() { return <View style={separatorStyle} />; });

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 10,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  filterChipTextActive: {
    color: colors.background,
  },
  filterBadge: {
    backgroundColor: colors.elevated,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  filterBadgeActive: {
    backgroundColor: colors.primaryDark,
  },
  filterBadgeText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700' as const,
  },
  filterBadgeTextActive: {
    color: colors.white,
  },
  truckBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  truckBarLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  truckBarValue: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  liveCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  liveCountText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
  },
  hazardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  hazardCardLeft: {
    alignItems: 'center',
  },
  hazardTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hazardCardCenter: {
    flex: 1,
  },
  hazardCardName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  hazardCardRoad: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  hazardCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  hazardCardVerified: {
    color: colors.textMuted,
    fontSize: 10,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  liveTagText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '600' as const,
  },
  communityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  communityTagText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '600' as const,
  },
  hazardCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  hazardCardHeight: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  weightBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  truckBarDivider: {
    color: colors.textMuted,
    fontSize: 12,
  },
});

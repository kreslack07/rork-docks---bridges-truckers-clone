import React, { useState, useMemo, useCallback } from 'react';
import ScreenErrorBoundary from '@/components/ScreenErrorBoundary';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Search, MapPin, AlertTriangle, Zap, X, Clock, Building2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useLiveData } from '@/context/LiveDataContext';
import { useTruckProfile } from '@/context/TruckSettingsContext';
import { useFavourites } from '@/context/FavouritesContext';
import { BUSINESS_CATEGORY_LABELS } from '@/constants/categories';
import { Dock, Hazard } from '@/types';
import EmptyState from '@/components/EmptyState';
import { ListSkeletonLoader } from '@/components/SkeletonLoader';

type SearchResult = {
  id: string;
  type: 'dock' | 'hazard';
  title: string;
  subtitle: string;
  data: Dock | Hazard;
};

function SearchScreenContent() {
  const router = useRouter();
  const { colors } = useTheme();
  const { docks, hazards, isLoadingDocks, isLoadingHazards } = useLiveData();
  const { profile } = useTruckProfile();
  const { recentRoutes } = useFavourites();
  const [query, setQuery] = useState<string>('');

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    const dockResults: SearchResult[] = docks
      .filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.business.toLowerCase().includes(q) ||
        d.address.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q)
      )
      .map(d => ({
        id: d.id,
        type: 'dock' as const,
        title: d.name,
        subtitle: `${d.business} · ${d.city}, ${d.state}`,
        data: d,
      }));

    const hazardResults: SearchResult[] = hazards
      .filter(h =>
        h.name.toLowerCase().includes(q) ||
        h.road.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q)
      )
      .map(h => ({
        id: h.id,
        type: 'hazard' as const,
        title: h.name,
        subtitle: `${h.road} · ${h.city}, ${h.state}`,
        data: h,
      }));

    return [...dockResults, ...hazardResults].slice(0, 30);
  }, [query, docks, hazards]);

  const handleSelect = useCallback((item: SearchResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.type === 'dock') {
      router.push({ pathname: '/dock-details', params: { id: item.id } });
    } else {
      router.push({ pathname: '/hazard-details', params: { id: item.id } });
    }
  }, [router]);

  const getHazardColor = useCallback((hazard: Hazard) => {
    const hasClearance = hazard.clearanceHeight < 90;
    if (hasClearance && hazard.clearanceHeight < profile.height) return colors.danger;
    if (hasClearance && hazard.clearanceHeight < profile.height + 0.3) return colors.warning;
    return colors.success;
  }, [profile.height, colors]);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const renderItem = useCallback(({ item }: { item: SearchResult }) => {
    const isDock = item.type === 'dock';
    const dock = isDock ? item.data as Dock : null;
    const hazard = !isDock ? item.data as Hazard : null;

    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
        testID={`search-result-${item.id}`}
      >
        <View style={[
          styles.resultIcon,
          { backgroundColor: isDock ? colors.primary + '15' : (hazard ? getHazardColor(hazard) + '15' : colors.elevated) }
        ]}>
          {isDock ? (
            <MapPin size={18} color={colors.primary} />
          ) : hazard?.type === 'bridge' ? (
            <AlertTriangle size={18} color={getHazardColor(hazard)} />
          ) : (
            <Zap size={18} color={hazard ? getHazardColor(hazard) : colors.textMuted} />
          )}
        </View>
        <View style={styles.resultContent}>
          <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.resultSubtitle} numberOfLines={1}>{item.subtitle}</Text>
          {dock && (
            <View style={styles.resultTags}>
              <View style={styles.resultTag}>
                <Building2 size={9} color={colors.primary} />
                <Text style={styles.resultTagText}>
                  {BUSINESS_CATEGORY_LABELS[dock.businessCategory] ?? dock.businessCategory}
                </Text>
              </View>
            </View>
          )}
          {hazard && (
            <View style={styles.resultTags}>
              <Text style={[styles.resultClearance, { color: getHazardColor(hazard) }]}>
                {hazard.clearanceHeight.toFixed(1)}m clearance
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [handleSelect, getHazardColor, colors, styles]);
  const isLoading = isLoadingDocks || isLoadingHazards;
  const hasQuery = query.trim().length > 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Search', headerShown: true }} />

      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search docks, hazards, businesses..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
            returnKeyType="search"
            testID="search-input"
          />
          {hasQuery && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {hasQuery && (
          <Text style={styles.resultCount}>
            {results.length} result{results.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <FlatList
        data={hasQuery ? results : []}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {isLoading && hasQuery && <ListSkeletonLoader count={4} type="search" />}
            {!hasQuery && recentRoutes.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={styles.recentTitle}>Recent Searches</Text>
                {recentRoutes.slice(0, 5).map(route => (
                  <TouchableOpacity
                    key={route.id}
                    style={styles.recentItem}
                    onPress={() => setQuery(route.destination.split(',')[0])}
                    activeOpacity={0.7}
                  >
                    <Clock size={14} color={colors.textMuted} />
                    <Text style={styles.recentText} numberOfLines={1}>{route.destination}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          hasQuery && !isLoading ? (
            <EmptyState
              type="search"
              title="No matches"
              message={`No docks or hazards match "${query}"`}
            />
          ) : !hasQuery && !isLoading && recentRoutes.length === 0 ? (
            <EmptyState
              type="search"
              title="Search anything"
              message="Find docks by business name, address, or city. Search hazards by road or location."
            />
          ) : null
        }
      />
    </View>
  );
}

export default function SearchScreen() {
  return (
    <ScreenErrorBoundary screenName="Search">
      <SearchScreenContent />
    </ScreenErrorBoundary>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBarContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 13,
  },
  resultCount: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  resultSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  resultTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  resultTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary + '12',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  resultTagText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  resultClearance: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  recentSection: {
    paddingBottom: 8,
  },
  recentTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  recentText: {
    color: colors.text,
    fontSize: 14,
    flex: 1,
  },
});

import { useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { usePersistedQuery } from '@/hooks/usePersistedQuery';

const FAVOURITES_KEY = 'favourite_docks';
const RECENT_KEY = 'recent_routes';

export interface RecentRoute {
  id: string;
  destination: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export const [FavouritesProvider, useFavourites] = createContextHook(() => {
  const favs = usePersistedQuery<string[]>({
    key: FAVOURITES_KEY,
    queryKey: ['favouriteDocks'],
    defaultValue: [],
  });

  const recents = usePersistedQuery<RecentRoute[]>({
    key: RECENT_KEY,
    queryKey: ['recentRoutes'],
    defaultValue: [],
  });

  const { updateValue: updateFavs } = favs;
  const { updateValue: updateRecents, setValue: setRecents } = recents;

  const toggleFavourite = useCallback((dockId: string) => {
    updateFavs((prev) => {
      return prev.includes(dockId)
        ? prev.filter((id) => id !== dockId)
        : [...prev, dockId];
    });
  }, [updateFavs]);

  const favouriteSet = useMemo(() => new Set(favs.value), [favs.value]);

  const isFavourite = useCallback(
    (dockId: string) => favouriteSet.has(dockId),
    [favouriteSet],
  );

  const addRecentRoute = useCallback((route: Omit<RecentRoute, 'id' | 'timestamp'>) => {
    updateRecents((prev) => {
      const newRoute: RecentRoute = {
        ...route,
        id: `route-${Date.now()}`,
        timestamp: Date.now(),
      };
      const filtered = prev.filter((r) => r.destination !== route.destination);
      return [newRoute, ...filtered].slice(0, 20);
    });
  }, [updateRecents]);

  const clearRecentRoutes = useCallback(() => {
    setRecents([]);
  }, [setRecents]);

  const favouriteCount = useMemo(() => favs.value.length, [favs.value]);

  return {
    favouriteDockIds: favs.value,
    recentRoutes: recents.value,
    toggleFavourite,
    isFavourite,
    addRecentRoute,
    clearRecentRoutes,
    favouriteCount,
  };
});

import { useState, useMemo, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { Dock, Hazard } from '@/types';

export type MapFilter = 'all' | 'docks' | 'bridges' | 'wires' | 'weight';

export function useMapFilters(docks: Dock[], hazards: Hazard[]) {
  const [filter, setFilter] = useState<MapFilter>('all');

  const filteredDocks = useMemo(() => {
    if (filter === 'bridges' || filter === 'wires') return [];
    return docks;
  }, [filter, docks]);

  const filteredHazards = useMemo(() => {
    if (filter === 'docks') return [];
    if (filter === 'bridges') return hazards.filter(h => h.type === 'bridge');
    if (filter === 'wires') return hazards.filter(h => h.type === 'wire');
    if (filter === 'weight') return hazards.filter(h => h.type === 'weight_limit' || h.weightLimit != null);
    return hazards;
  }, [filter, hazards]);

  const cycleFilter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const order: MapFilter[] = ['all', 'docks', 'bridges', 'wires', 'weight'];
    const idx = order.indexOf(filter);
    setFilter(order[(idx + 1) % order.length]);
  }, [filter]);

  const filterLabel = useMemo(() => {
    switch (filter) {
      case 'all': return 'All';
      case 'docks': return 'Docks';
      case 'bridges': return 'Bridges';
      case 'wires': return 'Wires';
      case 'weight': return 'Weight';
    }
  }, [filter]);

  const clearFilter = useCallback(() => setFilter('all'), []);

  return {
    filter,
    filteredDocks,
    filteredHazards,
    cycleFilter,
    filterLabel,
    clearFilter,
  };
}

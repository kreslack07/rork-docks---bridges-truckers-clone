import React, { memo, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { MapPin, AlertTriangle, Zap, Weight } from 'lucide-react-native';
import { Dock, Hazard, TruckProfile } from '@/types';
import { ThemeColors } from '@/constants/colors';
import { getHazardColor } from '@/utils/hazards';
import { platformShadow } from '@/utils/shadows';

let cachedColors: ThemeColors | null = null;
let cachedStyles: ReturnType<typeof buildMarkerStyles> | null = null;

function getSharedStyles(colors: ThemeColors) {
  if (cachedColors === colors && cachedStyles) return cachedStyles;
  cachedColors = colors;
  cachedStyles = buildMarkerStyles(colors);
  return cachedStyles;
}

interface DockMarkerProps {
  dock: Dock;
  colors: ThemeColors;
  onPress: (dock: Dock) => void;
}

const DOCK_ANCHOR = { x: 0.5, y: 0.5 } as const;

export const DockMarkerItem = memo(function DockMarkerItem({ dock, colors, onPress }: DockMarkerProps) {
  const styles = getSharedStyles(colors);
  const handlePress = useCallback(() => onPress(dock), [onPress, dock]);
  const coordinate = useMemo(() => ({ latitude: dock.latitude, longitude: dock.longitude }), [dock.latitude, dock.longitude]);
  return (
    <Marker
      coordinate={coordinate}
      title={dock.name}
      description={dock.business}
      onPress={handlePress}
      tracksViewChanges={false}
      anchor={DOCK_ANCHOR}
      testID={`dock-marker-${dock.id}`}
    >
      <View style={styles.dockMarker}>
        <MapPin size={14} color={colors.white} />
      </View>
    </Marker>
  );
});

interface HazardMarkerProps {
  hazard: Hazard;
  colors: ThemeColors;
  profile: TruckProfile;
  onPress: (hazard: Hazard) => void;
}

const HAZARD_ANCHOR = { x: 0.5, y: 0.5 } as const;

export const HazardMarkerItem = memo(function HazardMarkerItem({ hazard, colors, profile, onPress }: HazardMarkerProps) {
  const styles = getSharedStyles(colors);
  const hazardColor = useMemo(() => getHazardColor(hazard, profile, colors), [hazard, profile, colors]);
  const handlePress = useCallback(() => onPress(hazard), [onPress, hazard]);
  const coordinate = useMemo(() => ({ latitude: hazard.latitude, longitude: hazard.longitude }), [hazard.latitude, hazard.longitude]);
  const description = useMemo(() => {
    if (hazard.type === 'weight_limit') return `${hazard.weightLimit}t weight limit`;
    if (hazard.clearanceHeight < 90) return `${hazard.clearanceHeight}m clearance`;
    return 'Clearance unknown';
  }, [hazard.type, hazard.weightLimit, hazard.clearanceHeight]);

  return (
    <Marker
      coordinate={coordinate}
      title={hazard.name}
      description={description}
      onPress={handlePress}
      tracksViewChanges={false}
      anchor={HAZARD_ANCHOR}
      testID={`hazard-marker-${hazard.id}`}
    >
      <View style={[styles.hazardMarker, { backgroundColor: hazardColor }]}>
        {hazard.type === 'weight_limit' ? (
          <Weight size={12} color={colors.white} />
        ) : hazard.type === 'bridge' ? (
          <AlertTriangle size={12} color={colors.white} />
        ) : (
          <Zap size={12} color={colors.white} />
        )}
      </View>
    </Marker>
  );
});

interface MarkerListProps {
  docks: Dock[];
  hazards: Hazard[];
  colors: ThemeColors;
  profile: TruckProfile;
  onDockPress: (dock: Dock) => void;
  onHazardPress: (hazard: Hazard) => void;
}

export const MapMarkerList = memo(function MapMarkerList({ docks, hazards, colors, profile, onDockPress, onHazardPress }: MarkerListProps) {
  return (
    <>
      {docks.map((dock) => (
        <DockMarkerItem key={dock.id} dock={dock} colors={colors} onPress={onDockPress} />
      ))}
      {hazards.map((hazard) => (
        <HazardMarkerItem key={hazard.id} hazard={hazard} colors={colors} profile={profile} onPress={onHazardPress} />
      ))}
    </>
  );
});

const buildMarkerStyles = (colors: ThemeColors) => StyleSheet.create({
  dockMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.mapDock,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    ...platformShadow({ offsetY: 1, radius: 3, opacity: 0.3, elevation: 3 }),
  },
  hazardMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    ...platformShadow({ offsetY: 1, radius: 3, opacity: 0.3, elevation: 3 }),
  },
});

import React, { memo, useMemo, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Marker } from 'react-native-maps';
import { MapPin, AlertTriangle, Zap, Weight } from 'lucide-react-native';
import { Dock, Hazard, TruckProfile } from '@/types';
import { ThemeColors } from '@/constants/colors';
import { getHazardColor } from '@/utils/hazards';

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

export const DockMarkerItem = memo(function DockMarkerItem({ dock, colors, onPress }: DockMarkerProps) {
  const styles = getSharedStyles(colors);
  const handlePress = useCallback(() => onPress(dock), [onPress, dock]);
  return (
    <Marker
      coordinate={{ latitude: dock.latitude, longitude: dock.longitude }}
      title={dock.name}
      description={dock.business}
      onPress={handlePress}
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

export const HazardMarkerItem = memo(function HazardMarkerItem({ hazard, colors, profile, onPress }: HazardMarkerProps) {
  const styles = getSharedStyles(colors);
  const hazardColor = useMemo(() => getHazardColor(hazard, profile, colors), [hazard, profile, colors]);
  const handlePress = useCallback(() => onPress(hazard), [onPress, hazard]);
  const description = useMemo(() => {
    if (hazard.type === 'weight_limit') return `${hazard.weightLimit}t weight limit`;
    if (hazard.clearanceHeight < 90) return `${hazard.clearanceHeight}m clearance`;
    return 'Clearance unknown';
  }, [hazard.type, hazard.weightLimit, hazard.clearanceHeight]);

  return (
    <Marker
      coordinate={{ latitude: hazard.latitude, longitude: hazard.longitude }}
      title={hazard.name}
      description={description}
      onPress={handlePress}
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
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 3 },
      android: { elevation: 3 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.3)' },
    }),
  },
  hazardMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 3 },
      android: { elevation: 3 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.3)' },
    }),
  },
});

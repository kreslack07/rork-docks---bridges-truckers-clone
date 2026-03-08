import React, { memo, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Marker } from 'react-native-maps';
import { MapPin, AlertTriangle, Zap, Weight } from 'lucide-react-native';
import { Dock, Hazard, TruckProfile } from '@/types';
import { ThemeColors } from '@/constants/colors';
import { getHazardColor } from '@/utils/hazards';

interface DockMarkerProps {
  dock: Dock;
  colors: ThemeColors;
  onPress: (dock: Dock) => void;
}

export const DockMarkerItem = memo(function DockMarkerItem({ dock, colors, onPress }: DockMarkerProps) {
  const styles = useMemo(() => markerStyles(colors), [colors]);
  return (
    <Marker
      coordinate={{ latitude: dock.latitude, longitude: dock.longitude }}
      title={dock.name}
      description={dock.business}
      onPress={() => onPress(dock)}
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
  const styles = useMemo(() => markerStyles(colors), [colors]);
  const hazardColor = useMemo(() => getHazardColor(hazard, profile, colors), [hazard, profile, colors]);
  return (
    <Marker
      coordinate={{ latitude: hazard.latitude, longitude: hazard.longitude }}
      title={hazard.name}
      description={hazard.type === 'weight_limit' ? `${hazard.weightLimit}t weight limit` : hazard.clearanceHeight < 90 ? `${hazard.clearanceHeight}m clearance` : 'Clearance unknown'}
      onPress={() => onPress(hazard)}
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

const markerStyles = (colors: ThemeColors) => StyleSheet.create({
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

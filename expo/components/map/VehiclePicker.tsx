import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Truck, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ThemeColors } from '@/constants/colors';
import { TRUCK_TYPES } from '@/constants/categories';
import { TruckProfile } from '@/types';
import { cachedStyles } from '@/utils/styleCache';
import { platformShadow } from '@/utils/shadows';

interface VehiclePickerProps {
  colors: ThemeColors;
  profile: TruckProfile;
  showPicker: boolean;
  truckTypeLabel: string;
  insetBottom: number;
  onTogglePicker: () => void;
  onSelectType: (type: TruckProfile['type'], defaultHeight: number) => void;
}

function VehiclePickerComponent({
  colors,
  profile,
  showPicker,
  truckTypeLabel,
  insetBottom,
  onTogglePicker,
  onSelectType,
}: VehiclePickerProps) {
  const styles = cachedStyles(makeStyles, colors);

  const handleSelect = useCallback((t: typeof TRUCK_TYPES[number]) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectType(t.value, t.defaultHeight);
  }, [onSelectType]);

  return (
    <>
      <TouchableOpacity
        style={[styles.vehicleSelector, { bottom: insetBottom + 76 }]}
        onPress={onTogglePicker}
        activeOpacity={0.85}
      >
        <Text style={styles.vehicleSelectorText}>{truckTypeLabel} · {profile.height.toFixed(1)}m · {profile.weight.toFixed(0)}t</Text>
        <ChevronRight size={12} color={colors.white} style={{ transform: [{ rotate: showPicker ? '-90deg' : '90deg' }] }} />
      </TouchableOpacity>

      {showPicker && (
        <View style={[styles.vehiclePickerInline, { bottom: insetBottom + 110 }]}>
          <Text style={styles.vehiclePickerTitle}>Select vehicle type</Text>
          {TRUCK_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[
                styles.vehiclePickerItem,
                profile.type === t.value && styles.vehiclePickerItemActive,
              ]}
              onPress={() => handleSelect(t)}
            >
              <Truck size={16} color={profile.type === t.value ? colors.primary : colors.textMuted} />
              <Text style={[
                styles.vehiclePickerItemText,
                profile.type === t.value && styles.vehiclePickerItemTextActive,
              ]}>
                {t.label}
              </Text>
              <Text style={styles.vehiclePickerItemHeight}>{t.defaultHeight}m · {t.defaultWeight}t · {t.defaultWidth}m W</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
}

export default React.memo(VehiclePickerComponent);

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  vehicleSelector: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    ...platformShadow({ offsetY: 2, radius: 6, opacity: 0.2, elevation: 3 }),
  },
  vehicleSelectorText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  vehiclePickerInline: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    ...platformShadow({ offsetY: -4, radius: 12, opacity: 0.15, elevation: 8 }),
  },
  vehiclePickerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  vehiclePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  vehiclePickerItemActive: {
    backgroundColor: colors.primary + '15',
  },
  vehiclePickerItemText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500' as const,
    flex: 1,
  },
  vehiclePickerItemTextActive: {
    color: colors.primary,
    fontWeight: '700' as const,
  },
  vehiclePickerItemHeight: {
    color: colors.textMuted,
    fontSize: 13,
  },
});

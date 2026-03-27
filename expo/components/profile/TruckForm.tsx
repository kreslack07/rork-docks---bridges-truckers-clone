import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Truck,
  Ruler,
  Hash,
  Save,
  CircleCheck as CheckCircle2,
  Settings,
  Weight,
  MoveHorizontal,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ThemeColors } from '@/constants/colors';
import { TRUCK_TYPES } from '@/constants/categories';
import { TruckProfile } from '@/types';

interface TruckFormProps {
  colors: ThemeColors;
  profile: TruckProfile;
  onSave: (updates: Partial<TruckProfile>) => void;
}

function TruckForm({ colors, profile, onSave }: TruckFormProps) {
  const [name, setName] = useState<string>(profile.name);
  const [heightStr, setHeightStr] = useState<string>(profile.height.toString());
  const [weightStr, setWeightStr] = useState<string>(profile.weight.toString());
  const [widthStr, setWidthStr] = useState<string>(profile.width.toString());
  const [plateNumber, setPlateNumber] = useState<string>(profile.plateNumber);
  const [selectedType, setSelectedType] = useState<TruckProfile['type']>(profile.type);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    setName(profile.name);
    setHeightStr(profile.height.toString());
    setWeightStr(profile.weight.toString());
    setWidthStr(profile.width.toString());
    setPlateNumber(profile.plateNumber);
    setSelectedType(profile.type);
  }, [profile]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [saved]);

  const handleSelectType = useCallback((type: TruckProfile['type']) => {
    setSelectedType(type);
    const truckType = TRUCK_TYPES.find((t) => t.value === type);
    if (truckType) {
      setHeightStr(truckType.defaultHeight.toString());
      setWeightStr(truckType.defaultWeight.toString());
      setWidthStr(truckType.defaultWidth.toString());
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSave = useCallback(() => {
    const height = parseFloat(heightStr);
    if (isNaN(height) || height < 1 || height > 10) {
      Alert.alert('Invalid Height', 'Please enter a valid truck height between 1.0m and 10.0m');
      return;
    }
    const weight = parseFloat(weightStr);
    if (isNaN(weight) || weight < 0.5 || weight > 200) {
      Alert.alert('Invalid Weight', 'Please enter a valid GVM between 0.5t and 200t');
      return;
    }
    const width = parseFloat(widthStr);
    if (isNaN(width) || width < 1 || width > 5) {
      Alert.alert('Invalid Width', 'Please enter a valid width between 1.0m and 5.0m');
      return;
    }

    onSave({ name, height, weight, width, type: selectedType, plateNumber });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
  }, [name, heightStr, weightStr, widthStr, selectedType, plateNumber, onSave]);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Settings size={16} color={colors.textSecondary} />
          <Text style={styles.sectionTitle}>Truck Type</Text>
        </View>
        <View style={styles.typeGrid}>
          {TRUCK_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[styles.typeCard, selectedType === type.value && styles.typeCardActive]}
              onPress={() => handleSelectType(type.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.typeCardLabel, selectedType === type.value && styles.typeCardLabelActive]}>
                {type.label}
              </Text>
              <Text style={[styles.typeCardHeight, selectedType === type.value && styles.typeCardHeightActive]}>
                ~{type.defaultHeight}m
              </Text>
              {selectedType === type.value && (
                <View style={styles.typeCardCheck}>
                  <CheckCircle2 size={16} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Truck size={16} color={colors.textSecondary} />
          <Text style={styles.sectionTitle}>Truck Details</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Truck Name</Text>
          <View style={styles.inputWrapper}>
            <Truck size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Big Red"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Truck Height (metres)</Text>
          <View style={styles.inputWrapper}>
            <Ruler size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="4.3"
              placeholderTextColor={colors.textMuted}
              value={heightStr}
              onChangeText={setHeightStr}
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputSuffix}>m</Text>
          </View>
          <Text style={styles.inputHint}>
            Height determines which bridges and wires are safe for you
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Gross Vehicle Mass (tonnes)</Text>
          <View style={styles.inputWrapper}>
            <Weight size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="42.5"
              placeholderTextColor={colors.textMuted}
              value={weightStr}
              onChangeText={setWeightStr}
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputSuffix}>t</Text>
          </View>
          <Text style={styles.inputHint}>
            GVM is used to check weight-restricted roads and bridges on your route
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Vehicle Width (metres)</Text>
          <View style={styles.inputWrapper}>
            <MoveHorizontal size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="2.5"
              placeholderTextColor={colors.textMuted}
              value={widthStr}
              onChangeText={setWidthStr}
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputSuffix}>m</Text>
          </View>
          <Text style={styles.inputHint}>
            Width helps identify narrow roads and lane restrictions
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Plate Number</Text>
          <View style={styles.inputWrapper}>
            <Hash size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="ABC 123"
              placeholderTextColor={colors.textMuted}
              value={plateNumber}
              onChangeText={setPlateNumber}
              autoCapitalize="characters"
            />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saved && styles.saveBtnSaved]}
        onPress={handleSave}
        activeOpacity={0.7}
      >
        {saved ? (
          <>
            <CheckCircle2 size={20} color={colors.white} />
            <Text style={styles.saveBtnText}>Saved!</Text>
          </>
        ) : (
          <>
            <Save size={20} color={colors.background} />
            <Text style={styles.saveBtnText}>Save Profile</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.dimensionsPreview}>
        <Text style={styles.heightPreviewTitle}>Vehicle Dimensions</Text>
        <View style={styles.dimensionsGrid}>
          <View style={styles.dimensionItem}>
            <Ruler size={14} color={colors.primary} />
            <Text style={styles.dimensionLabel}>Height</Text>
            <Text style={styles.dimensionValue}>
              {parseFloat(heightStr) ? parseFloat(heightStr).toFixed(1) : '0.0'}m
            </Text>
          </View>
          <View style={[styles.dimensionDivider, { backgroundColor: colors.border }]} />
          <View style={styles.dimensionItem}>
            <Weight size={14} color={colors.warning} />
            <Text style={styles.dimensionLabel}>Weight</Text>
            <Text style={styles.dimensionValue}>
              {parseFloat(weightStr) ? parseFloat(weightStr).toFixed(1) : '0.0'}t
            </Text>
          </View>
          <View style={[styles.dimensionDivider, { backgroundColor: colors.border }]} />
          <View style={styles.dimensionItem}>
            <MoveHorizontal size={14} color={colors.success} />
            <Text style={styles.dimensionLabel}>Width</Text>
            <Text style={styles.dimensionValue}>
              {parseFloat(widthStr) ? parseFloat(widthStr).toFixed(1) : '0.0'}m
            </Text>
          </View>
        </View>
        <View style={styles.heightBar}>
          <View style={styles.heightBarTrack}>
            <View
              style={[
                styles.heightBarFill,
                {
                  width: `${Math.min((parseFloat(heightStr) || 0) / 6 * 100, 100)}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.heightBarValue}>
            {parseFloat(heightStr) ? parseFloat(heightStr).toFixed(1) : '0.0'}m
          </Text>
        </View>
        <View style={styles.heightScale}>
          <Text style={styles.heightScaleLabel}>1m</Text>
          <Text style={styles.heightScaleLabel}>3m</Text>
          <Text style={styles.heightScaleLabel}>5m</Text>
          <Text style={styles.heightScaleLabel}>6m+</Text>
        </View>
      </View>
    </>
  );
}

export default React.memo(TruckForm);

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    flex: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    position: 'relative' as const,
    flexGrow: 1,
    flexBasis: '45%',
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  typeCardLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  typeCardLabelActive: {
    color: colors.primary,
  },
  typeCardHeight: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  typeCardHeightActive: {
    color: colors.primaryLight,
  },
  typeCardCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 13,
  },
  inputSuffix: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  inputHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 20,
  },
  saveBtnSaved: {
    backgroundColor: colors.success,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  dimensionsPreview: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  dimensionsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dimensionItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  dimensionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  dimensionValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800' as const,
  },
  dimensionDivider: {
    width: 1,
    height: 36,
  },
  heightPreviewTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  heightBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heightBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.elevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  heightBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  heightBarValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800' as const,
    minWidth: 50,
    textAlign: 'right' as const,
  },
  heightScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  heightScaleLabel: {
    color: colors.textMuted,
    fontSize: 10,
  },
});

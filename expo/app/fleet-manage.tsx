import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import ScreenErrorBoundary from '@/components/ScreenErrorBoundary';
import {
  Truck,
  Plus,
  Trash2,
  CircleCheck as CheckCircle2,
  Ruler,
  Hash,
  User,
  StickyNote,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useFleet, useTruckProfile, FleetTruck } from '@/context/UserPreferencesContext';
import { TRUCK_TYPES } from '@/constants/categories';
import { TruckProfile } from '@/types';
import { cachedStyles } from '@/utils/styleCache';

function FleetManageScreenContent() {
  const { colors } = useTheme();
  const { trucks, activeTruckId, addTruck, updateTruck, removeTruck, setActiveTruck } = useFleet();
  const { updateProfile } = useTruckProfile();
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState<string>('');
  const [formHeight, setFormHeight] = useState<string>('4.3');
  const [formWeight, setFormWeight] = useState<string>('42.5');
  const [formWidth, setFormWidth] = useState<string>('2.5');
  const [formType, setFormType] = useState<TruckProfile['type']>('semi_trailer');
  const [formPlate, setFormPlate] = useState<string>('');
  const [formDriver, setFormDriver] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  const resetForm = useCallback(() => {
    setFormName('');
    setFormHeight('4.3');
    setFormWeight('42.5');
    setFormWidth('2.5');
    setFormType('semi_trailer');
    setFormPlate('');
    setFormDriver('');
    setFormNotes('');
    setShowAddForm(false);
    setEditingId(null);
  }, []);

  const handleAddTruck = useCallback(() => {
    const height = parseFloat(formHeight);
    if (!formName.trim()) {
      Alert.alert('Required', 'Please enter a truck name.');
      return;
    }
    if (isNaN(height) || height < 1 || height > 10) {
      Alert.alert('Invalid Height', 'Enter a height between 1.0m and 10.0m');
      return;
    }

    const weight = parseFloat(formWeight) || 42.5;
    const width = parseFloat(formWidth) || 2.5;

    if (editingId) {
      updateTruck(editingId, {
        name: formName,
        height,
        weight,
        width,
        type: formType,
        plateNumber: formPlate,
        driver: formDriver,
        notes: formNotes,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      addTruck({
        name: formName,
        height,
        weight,
        width,
        type: formType,
        plateNumber: formPlate,
        driver: formDriver,
        notes: formNotes,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    resetForm();
  }, [formName, formHeight, formWeight, formWidth, formType, formPlate, formDriver, formNotes, editingId, addTruck, updateTruck, resetForm]);

  const handleEditTruck = useCallback((truck: FleetTruck) => {
    setFormName(truck.name);
    setFormHeight(truck.height.toString());
    setFormWeight(truck.weight.toString());
    setFormWidth(truck.width.toString());
    setFormType(truck.type);
    setFormPlate(truck.plateNumber);
    setFormDriver(truck.driver ?? '');
    setFormNotes(truck.notes ?? '');
    setEditingId(truck.id);
    setShowAddForm(true);
  }, []);

  const handleRemoveTruck = useCallback((truck: FleetTruck) => {
    Alert.alert('Remove Truck', `Remove "${truck.name}" from your fleet?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeTruck(truck.id);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }, [removeTruck]);

  const handleSetActive = useCallback((truck: FleetTruck) => {
    setActiveTruck(truck.id);
    updateProfile({
      name: truck.name,
      height: truck.height,
      type: truck.type,
      plateNumber: truck.plateNumber,
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [setActiveTruck, updateProfile]);

  const styles = cachedStyles(makeStyles, colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Fleet Management', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />

      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Truck size={28} color={colors.primary} />
        </View>
        <Text style={styles.headerTitle}>Your Fleet</Text>
        <Text style={styles.headerSub}>
          {trucks.length === 0 ? 'Add trucks to manage your fleet' : `${trucks.length} truck${trucks.length !== 1 ? 's' : ''} in fleet`}
        </Text>
      </View>

      {trucks.map((truck) => {
        const isActive = truck.id === activeTruckId;
        return (
          <TouchableOpacity
            key={truck.id}
            style={[styles.truckCard, isActive && { borderColor: colors.primary }]}
            onPress={() => handleSetActive(truck)}
            onLongPress={() => handleEditTruck(truck)}
            activeOpacity={0.7}
          >
            <View style={[styles.truckColorDot, { backgroundColor: truck.color }]} />
            <View style={styles.truckInfo}>
              <View style={styles.truckNameRow}>
                <Text style={styles.truckName}>{truck.name}</Text>
                {isActive && (
                  <View style={styles.activeBadge}>
                    <CheckCircle2 size={10} color={colors.primary} />
                    <Text style={styles.activeBadgeText}>ACTIVE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.truckMeta}>
                {truck.height.toFixed(1)}m  ·  {truck.type.replace(/_/g, ' ')}
                {truck.plateNumber ? `  ·  ${truck.plateNumber}` : ''}
              </Text>
              {truck.driver && (
                <Text style={styles.truckDriver}>Driver: {truck.driver}</Text>
              )}
            </View>
            <View style={styles.truckActions}>
              <TouchableOpacity onPress={() => handleEditTruck(truck)} style={styles.truckActionBtn}>
                <StickyNote size={14} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleRemoveTruck(truck)} style={styles.truckActionBtn}>
                <Trash2 size={14} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      })}

      {!showAddForm ? (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddForm(true)}
          activeOpacity={0.7}
        >
          <Plus size={18} color={colors.primary} />
          <Text style={styles.addBtnText}>Add Truck</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{editingId ? 'Edit Truck' : 'Add New Truck'}</Text>
            <TouchableOpacity onPress={resetForm}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Truck Name *</Text>
            <View style={styles.formInputWrap}>
              <Truck size={14} color={colors.textMuted} />
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Big Red"
                placeholderTextColor={colors.textMuted}
                value={formName}
                onChangeText={setFormName}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Height (metres) *</Text>
            <View style={styles.formInputWrap}>
              <Ruler size={14} color={colors.textMuted} />
              <TextInput
                style={styles.formInput}
                placeholder="4.3"
                placeholderTextColor={colors.textMuted}
                value={formHeight}
                onChangeText={setFormHeight}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Truck Type</Text>
            <View style={styles.typeRow}>
              {TRUCK_TYPES.slice(0, 4).map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeChip, formType === t.value && styles.typeChipActive]}
                  onPress={() => {
                    setFormType(t.value);
                    setFormHeight(t.defaultHeight.toString());
                  }}
                >
                  <Text style={[styles.typeChipText, formType === t.value && styles.typeChipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.typeRow}>
              {TRUCK_TYPES.slice(4).map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeChip, formType === t.value && styles.typeChipActive]}
                  onPress={() => {
                    setFormType(t.value);
                    setFormHeight(t.defaultHeight.toString());
                  }}
                >
                  <Text style={[styles.typeChipText, formType === t.value && styles.typeChipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Plate Number</Text>
            <View style={styles.formInputWrap}>
              <Hash size={14} color={colors.textMuted} />
              <TextInput
                style={styles.formInput}
                placeholder="ABC 123"
                placeholderTextColor={colors.textMuted}
                value={formPlate}
                onChangeText={setFormPlate}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Driver Name</Text>
            <View style={styles.formInputWrap}>
              <User size={14} color={colors.textMuted} />
              <TextInput
                style={styles.formInput}
                placeholder="Optional"
                placeholderTextColor={colors.textMuted}
                value={formDriver}
                onChangeText={setFormDriver}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Notes</Text>
            <View style={styles.formInputWrap}>
              <StickyNote size={14} color={colors.textMuted} />
              <TextInput
                style={styles.formInput}
                placeholder="Optional notes"
                placeholderTextColor={colors.textMuted}
                value={formNotes}
                onChangeText={setFormNotes}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleAddTruck} activeOpacity={0.7}>
            <Text style={styles.saveBtnText}>{editingId ? 'Update Truck' : 'Add to Fleet'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {trucks.length > 0 && (
        <View style={styles.tipCard}>
          <Text style={styles.tipText}>
            Tap a truck to set it as active. Long press to edit. The active truck&apos;s height is used for route planning.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

export default function FleetManageScreen() {
  return (
    <ScreenErrorBoundary screenName="Fleet Management">
      <FleetManageScreenContent />
    </ScreenErrorBoundary>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
  },
  headerIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800' as const,
    marginBottom: 4,
  },
  headerSub: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  truckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 12,
  },
  truckColorDot: {
    width: 10,
    height: 40,
    borderRadius: 5,
  },
  truckInfo: {
    flex: 1,
  },
  truckNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  truckName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  truckMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  truckDriver: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  truckActions: {
    flexDirection: 'row',
    gap: 6,
  },
  truckActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary + '12',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed' as const,
    marginBottom: 16,
  },
  addBtnText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  formTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  formInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 11,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  typeChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  typeChipTextActive: {
    color: colors.primary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  tipCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});

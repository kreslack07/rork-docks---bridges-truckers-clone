import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';

import ScreenErrorBoundary from '@/components/ScreenErrorBoundary';
import { trpc } from '@/lib/trpc';
import {
  AlertTriangle,
  Zap,
  MapPin,
  Ruler,
  FileText,
  Send,
  Locate,
  ShieldAlert,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

let Location: typeof import('expo-location') | null = null;
if (Platform.OS !== 'web') {
  Location = require('expo-location');
}
import { useTheme } from '@/context/ThemeContext';
import { useRateLimit } from '@/hooks/useRateLimit';
import { useNotifications } from '@/context/NotificationsContext';
import { ThemeColors } from '@/constants/colors';

type HazardType = 'bridge' | 'wire' | 'weight_limit';

function ReportHazardScreenContent() {
  const router = useRouter();
  const { colors } = useTheme();
  const { addLocalNotification } = useNotifications();
  const rateLimit = useRateLimit({
    key: 'report_hazard',
    maxAttempts: 3,
    windowMs: 10 * 60 * 1000,
    cooldownMs: 5 * 60 * 1000,
  });
  const [type, setType] = useState<HazardType>('bridge');
  const [name, setName] = useState<string>('');
  const [road, setRoad] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [heightStr, setHeightStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [latStr, setLatStr] = useState<string>('');
  const [lonStr, setLonStr] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const handleUseCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      if (Platform.OS === 'web') {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setLatStr(pos.coords.latitude.toFixed(6));
              setLonStr(pos.coords.longitude.toFixed(6));
              setIsLocating(false);
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            },
            () => {
              Alert.alert('Error', 'Could not get your location');
              setIsLocating(false);
            },
          );
        }
        return;
      }
      if (!Location) {
        Alert.alert('Error', 'Location not available on this platform.');
        setIsLocating(false);
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed to pin hazard location.');
        setIsLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatStr(loc.coords.latitude.toFixed(6));
      setLonStr(loc.coords.longitude.toFixed(6));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert('Error', 'Could not get your location. Please enter manually.');
    } finally {
      setIsLocating(false);
    }
  }, []);

  const reportMutation = trpc.hazards.report.useMutation({
    onSuccess: (_data) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addLocalNotification(
        'Hazard Report Submitted',
        `Your report for "${name.trim()}" on ${road.trim()} is being reviewed.`,
        'hazard',
      );
      Alert.alert(
        'Report Submitted',
        'Thank you! Your hazard report will be reviewed and added to the database.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    },
    onError: (error) => {
      console.log('[ReportHazard] Submit error:', error);
      Alert.alert('Submission Failed', 'Could not submit your report. Please check your connection and try again.');
    },
  });

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Missing Info', 'Please enter a name for this hazard.');
      return;
    }
    if (name.trim().length < 3) {
      Alert.alert('Invalid Name', 'Hazard name must be at least 3 characters.');
      return;
    }
    if (!road.trim()) {
      Alert.alert('Missing Info', 'Please enter the road name.');
      return;
    }
    if (road.trim().length < 2) {
      Alert.alert('Invalid Road', 'Road name must be at least 2 characters.');
      return;
    }
    const height = parseFloat(heightStr);
    if (isNaN(height) || height <= 0 || height > 20) {
      Alert.alert('Invalid Height', 'Please enter a valid clearance height between 0.1m and 20m.');
      return;
    }
    if (!latStr || !lonStr) {
      Alert.alert('Missing Location', 'Please use your current location or enter coordinates.');
      return;
    }
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      Alert.alert('Invalid Coordinates', 'Please enter valid latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }

    const allowed = await rateLimit.checkAndRecord();
    if (!allowed) {
      Alert.alert('Too Many Reports', `You've submitted too many reports recently. Please wait ${rateLimit.secondsRemaining} seconds before trying again.`);
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const payload = {
      type,
      name: name.trim(),
      road: road.trim(),
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      clearanceHeight: parseFloat(heightStr),
      latitude: parseFloat(latStr),
      longitude: parseFloat(lonStr),
      description: description.trim() || undefined,
    };
    console.log('[ReportHazard] Submitting to backend:', payload);
    reportMutation.mutate(payload);
  }, [name, road, city, state, type, heightStr, latStr, lonStr, description, rateLimit, reportMutation]);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'Report Hazard' }} />

      <View style={styles.headerCard}>
        <AlertTriangle size={24} color={colors.warning} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Report a New Hazard</Text>
          <Text style={styles.headerSubtitle}>
            Help other drivers by reporting low bridges, wires, or clearance restrictions you encounter.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Hazard Type</Text>
      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[styles.typeCard, type === 'bridge' && styles.typeCardActive]}
          onPress={() => setType('bridge')}
          activeOpacity={0.7}
        >
          <AlertTriangle size={24} color={type === 'bridge' ? colors.primary : colors.textMuted} />
          <Text style={[styles.typeLabel, type === 'bridge' && styles.typeLabelActive]}>
            Low Bridge
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeCard, type === 'wire' && styles.typeCardActive]}
          onPress={() => setType('wire')}
          activeOpacity={0.7}
        >
          <Zap size={24} color={type === 'wire' ? colors.primary : colors.textMuted} />
          <Text style={[styles.typeLabel, type === 'wire' && styles.typeLabelActive]}>
            Low Wires
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeCard, type === 'weight_limit' && styles.typeCardActive]}
          onPress={() => setType('weight_limit')}
          activeOpacity={0.7}
        >
          <Ruler size={24} color={type === 'weight_limit' ? colors.primary : colors.textMuted} />
          <Text style={[styles.typeLabel, type === 'weight_limit' && styles.typeLabelActive]}>
            Weight Limit
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Details</Text>
      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Hazard Name *</Text>
          <View style={styles.inputWrapper}>
            <FileText size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Parramatta Rd Bridge"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Road / Street *</Text>
          <View style={styles.inputWrapper}>
            <MapPin size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Parramatta Road"
              placeholderTextColor={colors.textMuted}
              value={road}
              onChangeText={setRoad}
            />
          </View>
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>City / Suburb</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Granville"
                placeholderTextColor={colors.textMuted}
                value={city}
                onChangeText={setCity}
              />
            </View>
          </View>
          <View style={[styles.inputGroup, { width: 100 }]}>
            <Text style={styles.inputLabel}>State</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="NSW"
                placeholderTextColor={colors.textMuted}
                value={state}
                onChangeText={setState}
                autoCapitalize="characters"
              />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Clearance Height (metres) *</Text>
          <View style={styles.inputWrapper}>
            <Ruler size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. 3.8"
              placeholderTextColor={colors.textMuted}
              value={heightStr}
              onChangeText={setHeightStr}
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputSuffix}>m</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Additional Notes</Text>
          <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any additional details about this hazard..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Location</Text>
      <View style={styles.formCard}>
        <TouchableOpacity
          style={styles.locationBtn}
          onPress={handleUseCurrentLocation}
          disabled={isLocating}
          activeOpacity={0.7}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Locate size={18} color={colors.primary} />
          )}
          <Text style={styles.locationBtnText}>
            {isLocating ? 'Getting location...' : 'Use My Current Location'}
          </Text>
        </TouchableOpacity>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Latitude</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="-33.8688"
                placeholderTextColor={colors.textMuted}
                value={latStr}
                onChangeText={setLatStr}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Longitude</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="151.2093"
                placeholderTextColor={colors.textMuted}
                value={lonStr}
                onChangeText={setLonStr}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>
      </View>

      {rateLimit.isLimited && (
        <View style={styles.rateLimitBanner}>
          <ShieldAlert size={16} color={colors.warning} />
          <Text style={styles.rateLimitText}>
            Rate limited. Try again in {rateLimit.secondsRemaining}s
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, (reportMutation.isPending || rateLimit.isLimited) && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={reportMutation.isPending || rateLimit.isLimited}
        activeOpacity={0.8}
      >
        {reportMutation.isPending ? (
          <ActivityIndicator size="small" color={colors.background} />
        ) : (
          <>
            <Send size={18} color={colors.background} />
            <Text style={styles.submitBtnText}>Submit Report</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

export default function ReportHazardScreen() {
  return (
    <ScreenErrorBoundary screenName="Report Hazard">
      <ReportHazardScreenContent />
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
  headerCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.warning + '10',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.warning + '25',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  typeLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  typeLabelActive: {
    color: colors.primary,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 11,
  },
  inputSuffix: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
  textArea: {
    minHeight: 70,
    paddingTop: 11,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary + '12',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  locationBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  rateLimitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warning + '15',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  rateLimitText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 1,
  },
});

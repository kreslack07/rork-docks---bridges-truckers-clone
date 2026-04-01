import React, { useState, useCallback } from 'react';
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
  MapPin,
  Building2,
  Send,
  Locate,
  Clock,
  Phone,
  Truck,
  ShieldAlert,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

let Location: typeof import('expo-location') | null = null;
if (Platform.OS !== 'web') {
  Location = require('expo-location');
}
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { cachedStyles } from '@/utils/styleCache';
import { BUSINESS_CATEGORY_LABELS } from '@/constants/categories';
import { BusinessCategory } from '@/types';
import { useRateLimit } from '@/hooks/useRateLimit';
import { useNotifications } from '@/context/NotificationsContext';

const DOCK_TYPES = [
  { value: 'loading' as const, label: 'Loading Only' },
  { value: 'unloading' as const, label: 'Unloading Only' },
  { value: 'both' as const, label: 'Both' },
];

const CATEGORIES: { value: BusinessCategory; label: string }[] = Object.entries(
  BUSINESS_CATEGORY_LABELS,
).map(([value, label]) => ({ value: value as BusinessCategory, label }));

function ReportDockScreenContent() {
  const router = useRouter();
  const { colors } = useTheme();
  const { addLocalNotification } = useNotifications();
  const rateLimit = useRateLimit({
    key: 'report_dock',
    maxAttempts: 3,
    windowMs: 10 * 60 * 1000,
    cooldownMs: 5 * 60 * 1000,
  });
  const [businessName, setBusinessName] = useState<string>('');
  const [dockName, setDockName] = useState<string>('');
  const [category, setCategory] = useState<BusinessCategory>('warehouse');
  const [dockType, setDockType] = useState<'loading' | 'unloading' | 'both'>('both');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [operatingHours, setOperatingHours] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [accessNotes, setAccessNotes] = useState<string>('');
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
        Alert.alert('Permission Denied', 'Location permission is required.');
        setIsLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatStr(loc.coords.latitude.toFixed(6));
      setLonStr(loc.coords.longitude.toFixed(6));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert('Error', 'Could not get your location.');
    } finally {
      setIsLocating(false);
    }
  }, []);

  const reportMutation = trpc.docks.report.useMutation({
    onSuccess: (data) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const persisted = (data as { persisted?: boolean }).persisted;
      addLocalNotification(
        'Dock Report Submitted',
        `Your report for "${businessName.trim()}" at ${address.trim()} is being reviewed.`,
        'dock',
      );
      Alert.alert(
        'Dock Submitted',
        persisted
          ? 'Thank you! Your dock report has been saved and will be reviewed.'
          : 'Thank you! Your report was recorded locally. It will sync when the server is available.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    },
    onError: (error) => {
      console.log('[ReportDock] Submit error:', error);
      Alert.alert('Submission Failed', 'Could not submit your report. Please check your connection and try again.');
    },
  });

  const handleSubmit = useCallback(async () => {
    if (!businessName.trim()) {
      Alert.alert('Missing Info', 'Please enter the business name.');
      return;
    }
    if (businessName.trim().length < 2) {
      Alert.alert('Invalid Name', 'Business name must be at least 2 characters.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Missing Info', 'Please enter the address.');
      return;
    }
    if (address.trim().length < 5) {
      Alert.alert('Invalid Address', 'Please enter a more complete address.');
      return;
    }
    if (!latStr || !lonStr) {
      Alert.alert('Missing Location', 'Please use your location or enter coordinates.');
      return;
    }
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      Alert.alert('Invalid Coordinates', 'Please enter valid latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }
    if (phone && !/^[\d\s()+-]+$/.test(phone)) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number.');
      return;
    }

    const allowed = await rateLimit.checkAndRecord();
    if (!allowed) {
      Alert.alert('Too Many Reports', `You've submitted too many reports recently. Please wait ${rateLimit.secondsRemaining} seconds before trying again.`);
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const payload = {
      businessName: businessName.trim(),
      dockName: dockName.trim() || undefined,
      category,
      dockType,
      address: address.trim(),
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      operatingHours: operatingHours.trim() || undefined,
      phone: phone.trim() || undefined,
      accessNotes: accessNotes.trim() || undefined,
      latitude: parseFloat(latStr),
      longitude: parseFloat(lonStr),
    };
    console.log('[ReportDock] Submitting to backend:', payload);
    reportMutation.mutate(payload);
  }, [businessName, dockName, category, dockType, address, city, state, operatingHours, phone, accessNotes, latStr, lonStr, rateLimit, reportMutation]);

  const styles = cachedStyles(makeStyles, colors);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'Report Dock' }} />

      <View style={styles.headerCard}>
        <MapPin size={24} color={colors.primary} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Report a New Dock</Text>
          <Text style={styles.headerSubtitle}>
            Help other drivers find docks by sharing locations you deliver to.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Business Info</Text>
      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Business Name *</Text>
          <View style={styles.inputWrapper}>
            <Building2 size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Woolworths DC"
              placeholderTextColor={colors.textMuted}
              value={businessName}
              onChangeText={setBusinessName}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Dock Name</Text>
          <View style={styles.inputWrapper}>
            <Truck size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Dock A - Receiving"
              placeholderTextColor={colors.textMuted}
              value={dockName}
              onChangeText={setDockName}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.chip, category === cat.value && styles.chipActive]}
                  onPress={() => setCategory(cat.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, category === cat.value && styles.chipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Dock Type</Text>
          <View style={styles.dockTypeRow}>
            {DOCK_TYPES.map((dt) => (
              <TouchableOpacity
                key={dt.value}
                style={[styles.dockTypeBtn, dockType === dt.value && styles.dockTypeBtnActive]}
                onPress={() => setDockType(dt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dockTypeText, dockType === dt.value && styles.dockTypeTextActive]}>
                  {dt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Address</Text>
      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Street Address *</Text>
          <View style={styles.inputWrapper}>
            <MapPin size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. 123 Industrial Ave"
              placeholderTextColor={colors.textMuted}
              value={address}
              onChangeText={setAddress}
            />
          </View>
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>City / Suburb</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Minchinbury"
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
          <Text style={styles.inputLabel}>Operating Hours</Text>
          <View style={styles.inputWrapper}>
            <Clock size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Mon-Fri 6AM-6PM"
              placeholderTextColor={colors.textMuted}
              value={operatingHours}
              onChangeText={setOperatingHours}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone</Text>
          <View style={styles.inputWrapper}>
            <Phone size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="(02) 1234 5678"
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Access Notes</Text>
          <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="How to access the dock, security requirements, etc..."
              placeholderTextColor={colors.textMuted}
              value={accessNotes}
              onChangeText={setAccessNotes}
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
            <Text style={styles.submitBtnText}>Submit Dock</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

export default function ReportDockScreen() {
  return (
    <ScreenErrorBoundary screenName="Report Dock">
      <ReportDockScreenContent />
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
    backgroundColor: colors.primary + '10',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary + '25',
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
  chipScroll: {
    marginHorizontal: -4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 4,
  },
  chip: {
    backgroundColor: colors.elevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  chipTextActive: {
    color: colors.primary,
  },
  dockTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dockTypeBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dockTypeBtnActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  dockTypeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  dockTypeTextActive: {
    color: colors.primary,
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

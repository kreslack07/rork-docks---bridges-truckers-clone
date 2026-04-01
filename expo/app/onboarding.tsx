import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Truck,
  MapPin,
  AlertTriangle,
  Navigation,
  ChevronRight,
  Ruler,
  Shield,
  CircleCheck as CheckCircle2,
  Weight,
  MoveHorizontal,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { cachedStyles } from '@/utils/styleCache';
import { TRUCK_TYPES } from '@/constants/categories';
import { useTruckProfile } from '@/context/UserPreferencesContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { TruckProfile } from '@/types';

const STEPS = [
  {
    icon: Truck,
    title: 'Welcome, Driver',
    subtitle: 'Australia\'s smartest dock finder & route planner for trucks and delivery vehicles.',
    highlight: 'Find any dock. Avoid every hazard.',
    features: [
      { icon: MapPin, text: 'Thousands of business docks across Australia', color: 'primary' },
      { icon: AlertTriangle, text: 'Live clearance data updated daily', color: 'warning' },
      { icon: Shield, text: 'Community-verified hazard reports', color: 'success' },
    ],
  },
  {
    icon: AlertTriangle,
    title: 'Real-Time Hazards',
    subtitle: 'Live data on low bridges, low-hanging wires, and clearance restrictions across Australia.',
    highlight: 'Never hit a bridge again.',
    features: [
      { icon: AlertTriangle, text: 'Low bridge & overpass alerts', color: 'danger' },
      { icon: Ruler, text: 'Exact clearance heights from OpenStreetMap', color: 'warning' },
      { icon: MapPin, text: 'Low-hanging wire detection along routes', color: 'primary' },
    ],
  },
  {
    icon: Navigation,
    title: 'Smart Routing',
    subtitle: 'Get turn-by-turn directions that avoid hazards based on your truck\'s height.',
    highlight: 'Routes built for your truck.',
    features: [
      { icon: Truck, text: 'Routes customised to your truck height', color: 'primary' },
      { icon: Navigation, text: 'Turn-by-turn voice navigation', color: 'success' },
      { icon: Shield, text: 'Automatic rerouting around hazards', color: 'warning' },
    ],
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { updateProfile } = useTruckProfile();
  const { completeOnboarding } = useOnboarding();
  const [step, setStep] = useState<number>(0);
  const [selectedType, setSelectedType] = useState<TruckProfile['type']>('semi_trailer');
  const [heightStr, setHeightStr] = useState<string>('4.3');
  const [weightStr, setWeightStr] = useState<string>('42.5');
  const [widthStr, setWidthStr] = useState<string>('2.5');
  const [truckName, setTruckName] = useState<string>('');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const isSetupStep = step >= STEPS.length;

  const animateTransition = useCallback((nextStep: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const handleNext = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < STEPS.length) {
      animateTransition(step + 1);
    }
  }, [step, animateTransition]);

  const handleSelectType = useCallback((type: TruckProfile['type']) => {
    setSelectedType(type);
    const truckType = TRUCK_TYPES.find((t) => t.value === type);
    if (truckType) {
      setHeightStr(truckType.defaultHeight.toString());
      setWeightStr(truckType.defaultWeight.toString());
      setWidthStr(truckType.defaultWidth.toString());
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const finishMutation = useMutation({
    mutationFn: async () => {
      const height = parseFloat(heightStr);
      if (isNaN(height) || height < 1 || height > 10) {
        throw new Error('INVALID_HEIGHT');
      }

      const weight = parseFloat(weightStr);
      const width = parseFloat(widthStr);

      updateProfile({
        name: truckName || 'My Truck',
        height,
        weight: isNaN(weight) ? 42.5 : weight,
        width: isNaN(width) ? 2.5 : width,
        type: selectedType,
        plateNumber: '',
      });

      completeOnboarding();
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/(map)');
    },
    onError: (error) => {
      console.log('[Onboarding] Finish error:', error);
      if (error instanceof Error && error.message === 'INVALID_HEIGHT') {
        Alert.alert('Invalid Height', 'Please enter a height between 1.0m and 10.0m');
      } else {
        Alert.alert('Setup Error', 'Something went wrong saving your profile. Please try again.');
      }
    },
  });

  const finishMutateRef = useRef(finishMutation.mutate);
  finishMutateRef.current = finishMutation.mutate;

  const handleFinish = useCallback(() => {
    finishMutateRef.current();
  }, []);

  const handleSkip = useCallback(() => {
    try {
      completeOnboarding();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.replace('/(tabs)/(map)');
    } catch (error) {
      console.log('[Onboarding] Skip error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  }, [completeOnboarding, router]);

  const totalSteps = STEPS.length + 1;
  const styles = cachedStyles(makeStyles, colors);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.progressRow}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= step && styles.progressDotActive,
              i === step && styles.progressDotCurrent,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity testID="onboarding-skip-btn" style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {!isSetupStep ? (
          <View style={styles.infoStep}>
            {step === 0 ? (
              <View style={styles.appIconWrap}>
                {(() => {
                  let iconSource: any = null;
                  try { iconSource = require('@/assets/images/icon.png'); } catch { iconSource = null; }
                  return iconSource ? (
                    <Image
                      source={iconSource}
                      style={styles.appIconImage}
                      accessibilityLabel="App icon"
                    />
                  ) : (
                    <View style={[styles.appIconImage, { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                      <Truck size={48} color={colors.background} />
                    </View>
                  );
                })()
              </View>
            ) : (
              <View style={styles.iconCircle}>
                {React.createElement(STEPS[step].icon, {
                  size: 48,
                  color: colors.primary,
                })}
              </View>
            )}
            <Text style={styles.stepTitle}>{STEPS[step].title}</Text>
            <Text style={styles.stepSubtitle}>{STEPS[step].subtitle}</Text>
            <View style={styles.highlightBadge}>
              <Shield size={14} color={colors.primary} />
              <Text style={styles.highlightText}>{STEPS[step].highlight}</Text>
            </View>

            <View style={styles.featureList}>
              {STEPS[step].features.map((feat, idx) => {
                const FeatureIcon = feat.icon;
                const featureColor = feat.color === 'primary' ? colors.primary
                  : feat.color === 'warning' ? colors.warning
                  : feat.color === 'success' ? colors.success
                  : colors.danger;
                return (
                  <View key={idx} style={styles.featureItem}>
                    <FeatureIcon size={16} color={featureColor} />
                    <Text style={styles.featureText}>{feat.text}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.setupStep}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={insets.top + 80}
          >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.setupScrollContent}
          >
            <View style={styles.setupHeader}>
              <Truck size={32} color={colors.primary} />
              <Text style={styles.setupTitle}>Set Up Your Truck</Text>
              <Text style={styles.setupSubtitle}>
                This helps us calculate safe routes for you
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Truck Name (optional)</Text>
              <View style={styles.inputWrapper}>
                <Truck size={16} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Big Red"
                  placeholderTextColor={colors.textMuted}
                  value={truckName}
                  onChangeText={setTruckName}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Truck Type</Text>
            <View style={styles.typeGrid}>
              {TRUCK_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  testID={`onboarding-truck-type-${type.value}`}
                  style={[
                    styles.typeChip,
                    selectedType === type.value && styles.typeChipActive,
                  ]}
                  onPress={() => handleSelectType(type.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.typeChipLabel,
                      selectedType === type.value && styles.typeChipLabelActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                  <Text
                    style={[
                      styles.typeChipHeight,
                      selectedType === type.value && styles.typeChipHeightActive,
                    ]}
                  >
                    ~{type.defaultHeight}m
                  </Text>
                  {selectedType === type.value && (
                    <CheckCircle2 size={14} color={colors.primary} style={styles.typeCheckIcon} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Exact Height (metres)</Text>
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
                This determines which bridges and wires you can safely pass under
              </Text>
            </View>

            <View style={styles.dimensionsRow}>
              <View style={styles.dimensionField}>
                <Text style={styles.inputLabel}>Weight (tonnes)</Text>
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
              </View>
              <View style={styles.dimensionField}>
                <Text style={styles.inputLabel}>Width (metres)</Text>
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
              </View>
            </View>
          </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Animated.View>

      <View style={styles.bottomActions}>
        {!isSetupStep ? (
          <TouchableOpacity testID="onboarding-next-btn" style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>Continue</Text>
            <ChevronRight size={20} color={colors.background} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity testID="onboarding-finish-btn" style={[styles.finishBtn, finishMutation.isPending && styles.finishBtnPending]} onPress={handleFinish} activeOpacity={0.8} disabled={finishMutation.isPending}>
            {finishMutation.isPending ? (
              <>
                <ActivityIndicator size="small" color={colors.background} />
                <Text style={styles.finishBtnText}>Setting up...</Text>
              </>
            ) : (
              <>
                <Text style={styles.finishBtnText}>Start Using App</Text>
                <Navigation size={18} color={colors.background} />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  progressDot: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.elevated,
    width: 20,
  },
  progressDotActive: {
    backgroundColor: colors.primary + '50',
  },
  progressDotCurrent: {
    backgroundColor: colors.primary,
    width: 36,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: colors.elevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  infoStep: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 2,
    borderColor: colors.primary + '25',
  },
  appIconWrap: {
    width: 110,
    height: 110,
    borderRadius: 28,
    overflow: 'hidden' as const,
    marginBottom: 28,
  },
  appIconImage: {
    width: 110,
    height: 110,
    borderRadius: 28,
  },
  stepTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800' as const,
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  highlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary + '12',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '25',
    marginBottom: 32,
  },
  highlightText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  featureList: {
    width: '100%',
    gap: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
  },
  setupStep: {
    flex: 1,
  },
  setupScrollContent: {
    paddingBottom: 20,
  },
  setupHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  setupTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800' as const,
    marginTop: 12,
    marginBottom: 4,
  },
  setupSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
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
  dimensionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  dimensionField: {
    flex: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  typeChip: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    position: 'relative' as const,
  },
  typeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  typeChipLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  typeChipLabelActive: {
    color: colors.primary,
  },
  typeChipHeight: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  typeChipHeightActive: {
    color: colors.primaryLight,
  },
  typeCheckIcon: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
  },
  bottomActions: {
    paddingTop: 16,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
  },
  nextBtnText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
  },
  finishBtnText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  finishBtnPending: {
    opacity: 0.8,
  },
});

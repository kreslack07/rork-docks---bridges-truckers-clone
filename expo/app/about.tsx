import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Info,
  Shield,
  MapPin,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react-native';
import { Image } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import ScreenErrorBoundary from '@/components/ScreenErrorBoundary';
import { cachedStyles } from '@/utils/styleCache';

const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '1';

const CHANGELOG = [
  {
    version: '1.0.0',
    date: '2026-03-28',
    changes: [
      'Initial release',
      'Live hazard data from OpenStreetMap',
      'Low bridge, wire, and weight limit detection',
      'Truck-aware route planning with OSRM',
      'Dock finder with business categories',
      'Community verification system',
      'Voice navigation alerts',
      'Dark and light theme support',
      'Fleet management for multiple trucks',
      'Favourite docks and hazard reporting',
    ],
  },
];

function AboutScreenContent() {
  const { colors } = useTheme();
  const styles = cachedStyles(makeStyles, colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Stack.Screen options={{ title: 'About' }} />

      <View style={styles.heroSection}>
        <View style={styles.appIconContainer}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.appIconImage}
            accessibilityLabel="App icon"
          />
        </View>
        <Text style={styles.appName}>Docks & Bridges Truckers</Text>
        <Text style={styles.versionText}>Version {APP_VERSION} ({BUILD_NUMBER})</Text>
        <Text style={styles.tagline}>
          Australia's trusted clearance & dock companion for professional drivers
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Features</Text>
      <View style={styles.featuresCard}>
        {[
          { icon: AlertTriangle, label: 'Live hazard detection', desc: 'Real-time low bridge and wire data' },
          { icon: MapPin, label: 'Dock finder', desc: 'Find loading docks near your destination' },
          { icon: Shield, label: 'Community verified', desc: 'Driver-verified hazard accuracy' },
          { icon: Clock, label: 'Route planning', desc: 'Truck-aware navigation with hazard alerts' },
        ].map((feat, i) => (
          <View key={i}>
            {i > 0 && <View style={styles.featureDivider} />}
            <View style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <feat.icon size={18} color={colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureLabel}>{feat.label}</Text>
                <Text style={styles.featureDesc}>{feat.desc}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Changelog</Text>
      {CHANGELOG.map((release) => (
        <View key={release.version} style={styles.changelogCard}>
          <View style={styles.changelogHeader}>
            <Text style={styles.changelogVersion}>v{release.version}</Text>
            <Text style={styles.changelogDate}>{release.date}</Text>
          </View>
          {release.changes.map((change, i) => (
            <View key={i} style={styles.changeItem}>
              <View style={styles.changeBullet} />
              <Text style={styles.changeText}>{change}</Text>
            </View>
          ))}
        </View>
      ))}

      <Text style={styles.sectionTitle}>Data Sources</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL('https://www.openstreetmap.org')}
          activeOpacity={0.7}
          accessibilityLabel="Open OpenStreetMap website"
          accessibilityRole="link"
        >
          <View style={styles.linkContent}>
            <Text style={styles.linkTitle}>OpenStreetMap</Text>
            <Text style={styles.linkDesc}>Hazard and dock location data</Text>
          </View>
          <ExternalLink size={14} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.featureDivider} />
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL('https://project-osrm.org')}
          activeOpacity={0.7}
          accessibilityLabel="Open OSRM project website"
          accessibilityRole="link"
        >
          <View style={styles.linkContent}>
            <Text style={styles.linkTitle}>OSRM</Text>
            <Text style={styles.linkDesc}>Routing and navigation engine</Text>
          </View>
          <ExternalLink size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.disclaimerCard}>
        <Info size={16} color={colors.warning} />
        <Text style={styles.disclaimerText}>
          Clearance data is sourced from OpenStreetMap and community reports.
          Always verify physical signage on approach. This app is an aid, not a
          substitute for driver judgement.
        </Text>
      </View>

      <Text style={styles.copyrightText}>
        Made for Australian truck drivers{'\n'}
        {'\u00A9'} 2026 Docks & Bridges Truckers
      </Text>
    </ScrollView>
  );
}

export default function AboutScreen() {
  return (
    <ScreenErrorBoundary screenName="About">
      <AboutScreenContent />
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
  heroSection: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  appIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 22,
    overflow: 'hidden' as const,
    marginBottom: 16,
  },
  appIconImage: {
    width: 88,
    height: 88,
    borderRadius: 22,
  },
  appName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800' as const,
    marginBottom: 4,
  },
  versionText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 10,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 10,
    marginTop: 4,
  },
  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  featureDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  featureDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  changelogCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  changelogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  changelogVersion: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  changelogDate: {
    color: colors.textMuted,
    fontSize: 12,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 6,
  },
  changeBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  changeText: {
    color: colors.text,
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  linkDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.warning + '10',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.warning + '25',
  },
  disclaimerText: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  copyrightText: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
});

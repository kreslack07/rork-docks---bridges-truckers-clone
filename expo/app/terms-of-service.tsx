import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { cachedStyles } from '@/utils/styleCache';
import { useCountry } from '@/context/UserPreferencesContext';

export default function TermsOfServiceScreen() {
  const { colors } = useTheme();
  const { countryConfig } = useCountry();
  const styles = cachedStyles(makeStyles, colors);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Terms of Service' }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: 1 March 2026</Text>

        <Text style={styles.heading}>1. Acceptance of Terms</Text>
        <Text style={styles.body}>
          By downloading, installing, or using DOCKS & BRIDGES, you agree to be bound by these Terms of Service. If you do not agree, do not use the app.
        </Text>

        <Text style={styles.heading}>2. Description of Service</Text>
        <Text style={styles.body}>
          This app provides truck and delivery vehicle drivers with route planning, dock finding, and height hazard awareness tools. The app uses publicly available data sources and user-contributed reports.
        </Text>

        <Text style={styles.heading}>3. Disclaimer of Accuracy</Text>
        <Text style={styles.body}>
          IMPORTANT: While we strive to provide accurate data, clearance heights, dock locations, and route information may not always be up to date. Road conditions, construction, and temporary changes may affect accuracy.
        </Text>
        <Text style={styles.bodyBold}>
          Always verify clearance signs and conditions on approach. Never rely solely on this app for height clearance decisions. The driver is responsible for ensuring safe passage at all times.
        </Text>

        <Text style={styles.heading}>4. User Responsibilities</Text>
        <Text style={styles.bullet}>
          {'\u2022'} You must comply with all applicable traffic laws and regulations
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} You must not use the app in a way that distracts from safe driving
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} You are responsible for verifying all clearance heights before proceeding
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} You must enter accurate truck height information in your profile
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} You must not submit false or misleading hazard/dock reports
        </Text>

        <Text style={styles.heading}>5. Limitation of Liability</Text>
        <Text style={styles.body}>
          To the maximum extent permitted by law, the app developers and operators shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from your use of the app, including but not limited to:
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Damage to vehicles from bridge strikes or other clearance incidents
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Losses from inaccurate route or hazard information
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Service interruptions or data unavailability
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Any reliance on information provided by the app
        </Text>

        <Text style={styles.heading}>6. Data Sources</Text>
        <Text style={styles.body}>
          This app uses data from OpenStreetMap contributors, licensed under the Open Database License (ODbL). Route calculations are provided by OSRM. Hazard data is sourced from public records and user reports.
        </Text>

        <Text style={styles.heading}>7. User-Contributed Content</Text>
        <Text style={styles.body}>
          By submitting hazard reports or dock information, you grant us a non-exclusive, royalty-free license to use, modify, and distribute that content to improve the service for all users.
        </Text>

        <Text style={styles.heading}>8. Service Availability</Text>
        <Text style={styles.body}>
          The app requires an internet connection for full functionality. Some features may be limited in areas with poor connectivity. We do not guarantee uninterrupted service and may modify or discontinue features at any time.
        </Text>

        <Text style={styles.heading}>9. Intellectual Property</Text>
        <Text style={styles.body}>
          The app{"'"}s design, code, and branding are protected by intellectual property laws. You may not copy, modify, distribute, or reverse-engineer any part of the app.
        </Text>

        <Text style={styles.heading}>10. Governing Law</Text>
        <Text style={styles.body}>
          These terms are governed by the laws of {countryConfig.name}. Any disputes arising from the use of this app shall be subject to the jurisdiction of {countryConfig.demonym} courts.
        </Text>

        <Text style={styles.heading}>11. Changes to Terms</Text>
        <Text style={styles.body}>
          We reserve the right to modify these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms.
        </Text>

        <Text style={styles.heading}>12. Contact</Text>
        <Text style={styles.body}>
          For questions about these terms, please contact us at support@docksandbridges.app.
        </Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 20,
  },
  heading: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    marginTop: 20,
    marginBottom: 8,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  bodyBold: {
    color: colors.warning,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  bullet: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    paddingLeft: 12,
    marginBottom: 4,
  },
});

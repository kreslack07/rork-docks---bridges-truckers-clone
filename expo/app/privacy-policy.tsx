import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Privacy Policy' }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: 1 March 2026</Text>

        <Text style={styles.heading}>1. Information We Collect</Text>
        <Text style={styles.body}>
          We collect the following information to provide our truck routing and dock-finding services:
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Location data (GPS coordinates) when you use navigation features
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Truck profile information (vehicle height, type, name) stored locally on your device
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Route history and favourite docks stored locally on your device
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Hazard and dock reports you voluntarily submit
        </Text>

        <Text style={styles.heading}>2. How We Use Your Information</Text>
        <Text style={styles.body}>
          Your information is used exclusively to:
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Provide turn-by-turn navigation and route planning
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Show nearby docks and height hazards relevant to your vehicle
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Calculate safe routes based on your truck{"'"}s height profile
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Improve hazard and dock data for all users
        </Text>

        <Text style={styles.heading}>3. Data Storage</Text>
        <Text style={styles.body}>
          Your truck profile, favourites, and route history are stored locally on your device using secure storage. We do not transmit personal data to external servers. Map and routing data is fetched from third-party services (OpenStreetMap, OSRM) which have their own privacy policies.
        </Text>

        <Text style={styles.heading}>4. Location Data</Text>
        <Text style={styles.body}>
          Location data is used in real-time for navigation and is not stored on any server. When you enable live navigation, your device{"'"}s GPS is accessed to provide turn-by-turn directions and off-route detection. You can disable location access at any time through your device settings.
        </Text>

        <Text style={styles.heading}>5. Third-Party Services</Text>
        <Text style={styles.body}>
          This app uses the following third-party services:
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} OpenStreetMap / Nominatim for geocoding and place search
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} OSRM (Open Source Routing Machine) for route calculations
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Overpass API for hazard and dock point-of-interest data
        </Text>
        <Text style={styles.body}>
          These services may log IP addresses per their own policies. We encourage you to review their privacy policies.
        </Text>

        <Text style={styles.heading}>6. Data Sharing</Text>
        <Text style={styles.body}>
          We do not sell, trade, or rent your personal information to third parties. Hazard and dock reports you submit may be shared with the community to improve data accuracy for all drivers.
        </Text>

        <Text style={styles.heading}>7. Your Rights</Text>
        <Text style={styles.body}>
          You can delete all locally stored data at any time by clearing the app{"'"}s data or uninstalling the app. You can revoke location permissions through your device settings at any time.
        </Text>

        <Text style={styles.heading}>8. Children{"'"}s Privacy</Text>
        <Text style={styles.body}>
          This app is not intended for use by children under 16. We do not knowingly collect information from children.
        </Text>

        <Text style={styles.heading}>9. Changes to This Policy</Text>
        <Text style={styles.body}>
          We may update this privacy policy from time to time. Changes will be reflected within the app with an updated date.
        </Text>

        <Text style={styles.heading}>10. Contact Us</Text>
        <Text style={styles.body}>
          If you have questions about this privacy policy, please contact us at support@docksandbridges.app.
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
  bullet: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    paddingLeft: 12,
    marginBottom: 4,
  },
});

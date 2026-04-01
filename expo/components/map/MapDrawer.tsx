import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import {
  Truck,
  AlertTriangle,
  MapPin,
  Plus,
  Users,
  Settings,
  Shield,
  FileText,
  LogIn,
  Compass,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ThemeColors } from '@/constants/colors';
import { cachedStyles } from '@/utils/styleCache';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

interface MapDrawerProps {
  colors: ThemeColors;
  drawerOpen: boolean;
  drawerAnim: Animated.Value;
  insetTop: number;
  userName: string;
  truckTypeLabel: string;
  truckHeight: number;
  hazardCount: number;
  isAuthenticated: boolean;
  onClose: () => void;
}

function MapDrawerComponent({
  colors,
  drawerOpen,
  drawerAnim,
  insetTop,
  userName,
  truckTypeLabel,
  truckHeight,
  hazardCount,
  isAuthenticated,
  onClose,
}: MapDrawerProps) {
  const router = useRouter();

  const navTo = useCallback((path: string) => {
    onClose();
    setTimeout(() => {
      router.push(path as any);
    }, 280);
  }, [onClose, router]);

  const styles = cachedStyles(makeStyles, colors);

  if (!drawerOpen) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.drawerOverlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.drawer,
          { paddingTop: insetTop + 16, transform: [{ translateX: drawerAnim }] },
        ]}
      >
        <View style={styles.drawerProfile}>
          <View style={styles.drawerAvatar}>
            <Truck size={22} color={colors.primary} />
          </View>
          <View style={styles.drawerProfileInfo}>
            <Text style={styles.drawerProfileName}>{userName}</Text>
            <Text style={styles.drawerProfileSub}>
              {truckTypeLabel} · {truckHeight.toFixed(1)}m
            </Text>
          </View>
          <TouchableOpacity
            style={styles.drawerProfileBtn}
            onPress={() => navTo('/(tabs)/profile')}
          >
            <Text style={styles.drawerProfileBtnText}>View profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.drawerDivider} />

        <TouchableOpacity style={styles.drawerItem} onPress={() => navTo('/(tabs)/route')} accessibilityLabel="Plan a drive" accessibilityRole="button">
          <Compass size={20} color={colors.textSecondary} />
          <Text style={styles.drawerItemText}>Plan a drive</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={() => navTo('/(tabs)/hazards')} accessibilityLabel={`Hazards, ${hazardCount} total`} accessibilityRole="button">
          <AlertTriangle size={20} color={colors.textSecondary} />
          <Text style={styles.drawerItemText}>Hazards</Text>
          {hazardCount > 0 && (
            <View style={styles.drawerBadge}>
              <Text style={styles.drawerBadgeText}>{hazardCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={() => navTo('/report-hazard')} accessibilityLabel="Report hazard" accessibilityRole="button">
          <Plus size={20} color={colors.textSecondary} />
          <Text style={styles.drawerItemText}>Report hazard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={() => navTo('/report-dock')} accessibilityLabel="Report dock" accessibilityRole="button">
          <MapPin size={20} color={colors.textSecondary} />
          <Text style={styles.drawerItemText}>Report dock</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={() => navTo('/fleet-manage')} accessibilityLabel="Fleet management" accessibilityRole="button">
          <Users size={20} color={colors.textSecondary} />
          <Text style={styles.drawerItemText}>Fleet</Text>
        </TouchableOpacity>

        <View style={styles.drawerDivider} />

        <TouchableOpacity style={styles.drawerItem} onPress={() => navTo('/(tabs)/profile')} accessibilityLabel="Settings" accessibilityRole="button">
          <Settings size={20} color={colors.textSecondary} />
          <Text style={styles.drawerItemText}>Settings</Text>
        </TouchableOpacity>

        {!isAuthenticated && (
          <TouchableOpacity style={styles.drawerItem} onPress={() => navTo('/auth')}>
            <LogIn size={20} color={colors.textSecondary} />
            <Text style={styles.drawerItemText}>Sign in</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.drawerItem} onPress={() => navTo('/privacy-policy')}>
          <Shield size={20} color={colors.textSecondary} />
          <Text style={styles.drawerItemText}>Privacy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={() => navTo('/terms-of-service')}>
          <FileText size={20} color={colors.textSecondary} />
          <Text style={styles.drawerItemText}>Terms</Text>
        </TouchableOpacity>

        <View style={styles.drawerFooter}>
          <Text style={styles.drawerFooterText}>Docks & Bridges Trucker v1.0.0</Text>
        </View>
      </Animated.View>
    </>
  );
}

export default React.memo(MapDrawerComponent);

export { DRAWER_WIDTH };

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    zIndex: 98,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.surface,
    zIndex: 99,
    paddingHorizontal: 20,
  },
  drawerProfile: {
    marginBottom: 16,
  },
  drawerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  drawerProfileInfo: {
    marginBottom: 8,
  },
  drawerProfileName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  drawerProfileSub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  drawerProfileBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  drawerProfileBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  drawerItemText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500' as const,
    flex: 1,
  },
  drawerBadge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  drawerBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700' as const,
  },
  drawerFooter: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  drawerFooterText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});

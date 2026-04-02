import { Platform, Linking, Alert } from 'react-native';
import { logger } from '@/utils/logger';

const WAZE_DEEPLINK_BASE = 'https://waze.com/ul';

export interface WazeNavigationParams {
  latitude: number;
  longitude: number;
  label?: string;
}

export function buildWazeUrl(params: WazeNavigationParams): string {
  const { latitude, longitude, label } = params;
  let url = `${WAZE_DEEPLINK_BASE}?ll=${latitude},${longitude}&navigate=yes`;
  if (label) {
    url += `&q=${encodeURIComponent(label)}`;
  }
  return url;
}

export async function openInWaze(params: WazeNavigationParams): Promise<boolean> {
  const url = buildWazeUrl(params);
  logger.log('[Waze] Opening:', url);

  try {
    if (Platform.OS === 'web') {
      await Linking.openURL(url);
      return true;
    }

    const wazeAppUrl = `waze://?ll=${params.latitude},${params.longitude}&navigate=yes`;
    const canOpenWaze = await Linking.canOpenURL(wazeAppUrl);

    if (canOpenWaze) {
      await Linking.openURL(wazeAppUrl);
      logger.log('[Waze] Opened native app');
      return true;
    }

    await Linking.openURL(url);
    logger.log('[Waze] Opened web fallback');
    return true;
  } catch (error) {
    logger.error('[Waze] Open error:', error);
    Alert.alert(
      'Cannot Open Waze',
      'Waze could not be opened. Make sure Waze is installed or try opening it manually.',
      [{ text: 'OK' }],
    );
    return false;
  }
}

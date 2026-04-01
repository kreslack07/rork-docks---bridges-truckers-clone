import { Platform, ViewStyle } from 'react-native';

interface ShadowParams {
  offsetX?: number;
  offsetY: number;
  radius: number;
  opacity: number;
  color?: string;
  elevation?: number;
}

export function platformShadow({
  offsetX = 0,
  offsetY,
  radius,
  opacity,
  color = '#000',
  elevation,
}: ShadowParams): ViewStyle {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: color,
      shadowOffset: { width: offsetX, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    };
  }

  if (Platform.OS === 'android') {
    return {
      elevation: elevation ?? Math.round(radius / 2),
    };
  }

  return {};
}

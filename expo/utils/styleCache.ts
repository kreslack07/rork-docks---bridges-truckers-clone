import { StyleSheet } from 'react-native';
import { ThemeColors } from '@/constants/colors';

type StyleFactory<T> = (colors: ThemeColors) => T;

const cache = new WeakMap<StyleFactory<any>, Map<ThemeColors, any>>();

export function cachedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: StyleFactory<T>,
  colors: ThemeColors,
): T {
  let innerMap = cache.get(factory);
  if (!innerMap) {
    innerMap = new Map();
    cache.set(factory, innerMap);
  }
  let styles = innerMap.get(colors);
  if (!styles) {
    styles = factory(colors);
    innerMap.set(colors, styles);
  }
  return styles as T;
}

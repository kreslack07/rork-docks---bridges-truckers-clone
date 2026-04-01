import { StyleSheet } from 'react-native';
import { ThemeColors } from '@/constants/colors';

type StyleFactory<T> = (colors: ThemeColors) => T;

const cache = new WeakMap<StyleFactory<any>, Map<ThemeColors, any>>();

const MAX_THEME_ENTRIES = 3;

export function cachedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: StyleFactory<T>,
  colors: ThemeColors,
): T {
  let innerMap = cache.get(factory);
  if (!innerMap) {
    innerMap = new Map();
    cache.set(factory, innerMap);
    trackFactory(factory);
  }
  let styles = innerMap.get(colors);
  if (!styles) {
    if (innerMap.size >= MAX_THEME_ENTRIES) {
      const firstKey = innerMap.keys().next().value;
      if (firstKey) innerMap.delete(firstKey);
    }
    styles = factory(colors);
    innerMap.set(colors, styles);
  }
  return styles as T;
}

const factoryRefs: WeakRef<StyleFactory<any>>[] = [];

export function trackFactory(factory: StyleFactory<any>): void {
  factoryRefs.push(new WeakRef(factory));
}

export function clearStyleCache(): void {
  for (const ref of factoryRefs) {
    const factory = ref.deref();
    if (factory) {
      const innerMap = cache.get(factory);
      if (innerMap) innerMap.clear();
    }
  }
  factoryRefs.length = 0;
  console.log('[StyleCache] Cache cleared — all theme entries evicted');
}

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const DEBOUNCE_MS = 300;

interface UsePersistedQueryOptions<T> {
  key: string;
  queryKey: string[];
  defaultValue: T;
  serialize?: (value: T) => string;
  deserialize?: (stored: string) => T;
}

interface UsePersistedQueryResult<T> {
  value: T;
  setValue: (value: T) => void;
  updateValue: (updater: (prev: T) => T) => void;
  isLoading: boolean;
  mutate: (value: T) => void;
}

export function usePersistedQuery<T>(options: UsePersistedQueryOptions<T>): UsePersistedQueryResult<T> {
  const {
    key,
    queryKey,
    defaultValue,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options;

  const queryClient = useQueryClient();
  const fullQueryKey = [...queryKey, key];
  const [value, setValue] = useState<T>(defaultValue);

  const query = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [...queryKey, key],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(key);
      if (stored !== null) {
        try {
          return deserialize(stored) as T;
        } catch {
          console.log(`[usePersistedQuery] Failed to deserialize key: ${key}`);
          return defaultValue;
        }
      }
      return defaultValue;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (query.data !== undefined) {
      setValue(query.data);
    }
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: async (newValue: T) => {
      await AsyncStorage.setItem(key, serialize(newValue));
      return newValue;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(fullQueryKey, data);
    },
  });

  const { mutate } = saveMutation;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValueRef = useRef<T | null>(null);

  const serializeRef = useRef(serialize);
  serializeRef.current = serialize;
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (pendingValueRef.current !== null) {
        const pendingValue = pendingValueRef.current;
        const currentKey = keyRef.current;
        const currentSerialize = serializeRef.current;
        pendingValueRef.current = null;
        try {
          const serialized = currentSerialize(pendingValue);
          void AsyncStorage.setItem(currentKey, serialized).catch((e) => {
            console.log('[usePersistedQuery] Flush on unmount failed:', e);
          });
          queryClient.setQueryData(fullQueryKey, pendingValue);
        } catch (e) {
          console.log('[usePersistedQuery] Flush serialize error:', e);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const debouncedPersist = useCallback((newValue: T) => {
    pendingValueRef.current = newValue;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      pendingValueRef.current = null;
      mutate(newValue);
    }, DEBOUNCE_MS);
  }, [mutate]);

  const updateValue = useCallback((updater: (prev: T) => T) => {
    setValue(prev => {
      const updated = updater(prev);
      debouncedPersist(updated);
      return updated;
    });
  }, [debouncedPersist]);

  const setAndPersist = useCallback((newValue: T) => {
    setValue(newValue);
    debouncedPersist(newValue);
  }, [debouncedPersist]);

  return {
    value,
    setValue: setAndPersist,
    updateValue,
    isLoading: query.isLoading,
    mutate,
  };
}

interface UsePersistedStringQueryOptions {
  key: string;
  queryKey: string[];
  defaultValue: string | null;
}

export function usePersistedStringQuery(options: UsePersistedStringQueryOptions) {
  const { key, queryKey, defaultValue } = options;

  const queryClient = useQueryClient();
  const fullQueryKey = [...queryKey, key];
  const [value, setValue] = useState<string | null>(defaultValue);

  const query = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [...queryKey, key],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(key);
      return stored ?? defaultValue;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (query.data !== undefined) {
      setValue(query.data);
    }
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: async (newValue: string | null) => {
      if (newValue !== null) {
        await AsyncStorage.setItem(key, newValue);
      } else {
        await AsyncStorage.removeItem(key);
      }
      return newValue;
    },
    onSuccess: (data) => {
      setValue(data);
      queryClient.setQueryData(fullQueryKey, data);
    },
  });

  const { mutate } = saveMutation;

  const setAndPersist = useCallback((v: string | null) => {
    setValue(v);
    mutate(v);
  }, [mutate]);

  return {
    value,
    setValue: setAndPersist,
    isLoading: query.isLoading,
    mutate,
  };
}

export function usePersistedBoolQuery(options: {
  key: string;
  queryKey: string[];
  defaultValue: boolean;
}) {
  const { key, queryKey, defaultValue } = options;

  const queryClient = useQueryClient();
  const fullQueryKey = [...queryKey, key];
  const [value, setValue] = useState<boolean>(defaultValue);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const query = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [...queryKey, key],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(key);
      if (stored !== null) return stored === 'true';
      return defaultValue;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (query.data !== undefined) {
      setValue(query.data);
      setIsLoaded(true);
    }
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: async (newValue: boolean) => {
      await AsyncStorage.setItem(key, String(newValue));
      return newValue;
    },
    onSuccess: (data) => {
      setValue(data);
      queryClient.setQueryData(fullQueryKey, data);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(key);
      return defaultValue;
    },
    onSuccess: (data) => {
      setValue(data);
      queryClient.setQueryData(fullQueryKey, data);
    },
  });

  const { mutate } = saveMutation;
  const { mutate: mutateRemove } = removeMutation;

  const setAndPersist = useCallback((v: boolean) => {
    setValue(v);
    mutate(v);
  }, [mutate]);

  const remove = useCallback(() => {
    setValue(defaultValue);
    mutateRemove();
  }, [defaultValue, mutateRemove]);

  return {
    value,
    isLoaded,
    isLoading: query.isLoading,
    setValue: setAndPersist,
    remove,
    mutate,
  };
}

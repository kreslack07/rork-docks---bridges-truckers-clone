import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';

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
    onSuccess: (data) => setValue(data),
  });

  const { mutate } = saveMutation;

  const updateValue = useCallback((updater: (prev: T) => T) => {
    setValue(prev => {
      const updated = updater(prev);
      mutate(updated);
      return updated;
    });
  }, [mutate]);

  const setAndPersist = useCallback((newValue: T) => {
    setValue(newValue);
    mutate(newValue);
  }, [mutate]);

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
    onSuccess: (data) => setValue(data),
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
    onSuccess: (data) => setValue(data),
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(key);
      return defaultValue;
    },
    onSuccess: (data) => setValue(data),
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

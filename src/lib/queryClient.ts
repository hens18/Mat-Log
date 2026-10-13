// The app's TanStack Query client, set up to work offline:
// - the query cache is saved to AsyncStorage, so the app opens with your data
//   even with no signal (gyms!)
// - weigh-ins logged offline are queued and sent when the connection returns,
//   even if the app was closed in between.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState, Platform } from 'react-native';

import { createWeighIn, type NewWeighIn } from '@/features/weigh-ins/api';

/** Mutation key for logging a weigh-in; queued offline and resumed later. */
export const CREATE_WEIGH_IN_KEY = ['weigh-ins', 'create'] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export function createQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: {
      // Keep cached data at least as long as the persisted copy is valid.
      queries: { gcTime: DAY_MS * 7 },
    },
  });
  // Queued mutations are saved without their functions, so the function has to
  // be registered by key for them to resume after a restart.
  queryClient.setMutationDefaults(CREATE_WEIGH_IN_KEY, {
    mutationFn: (input: NewWeighIn) => createWeighIn(input),
    // Send queued weigh-ins one at a time, in the order they were logged.
    scope: { id: 'weigh-ins' },
  });
  return queryClient;
}

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'mat-log-query-cache',
});

/** Bump to throw away caches saved by an older, incompatible version of the app. */
export const CACHE_BUSTER = 'v1';
export const CACHE_MAX_AGE = DAY_MS * 7;

let wired = false;

/** Tells TanStack Query when the device goes on or offline and when the app is in front. */
export function wireNetworkAndFocus() {
  // Browsers already report online status and focus to TanStack Query.
  if (wired || Platform.OS === 'web') return;
  wired = true;

  onlineManager.setEventListener((setOnline) => {
    let initialised = false;
    const subscription = Network.addNetworkStateListener((state) => {
      initialised = true;
      setOnline(!!state.isConnected);
    });
    Network.getNetworkStateAsync()
      .then((state) => {
        if (!initialised) setOnline(!!state.isConnected);
      })
      .catch(() => {});
    return () => subscription.remove();
  });

  AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });
}

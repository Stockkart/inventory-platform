import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createAppDeps } from './src/app/deps';
import { RootNavigator } from './src/navigation/RootNavigator';

/**
 * Root component: builds the app's dependencies once (`src/app/deps.ts`) and mounts the one stack
 * (`src/navigation/RootNavigator.tsx`: pair → home → history → settings, R4.11).
 */
export function App() {
  const deps = useMemo(() => createAppDeps(), []);
  return (
    <SafeAreaProvider>
      <RootNavigator deps={deps} />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { C } from '@/components/ui';
import { ProgressProvider } from '@/lib/progress';

export default function RootLayout() {
  return (
    <ProgressProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
    </ProgressProvider>
  );
}

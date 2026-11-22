import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { C } from '@/components/ui';
import { ProfilesProvider } from '@/lib/profiles';
import { ProgressProvider } from '@/lib/progress';

export default function RootLayout() {
  return (
    <ProfilesProvider>
      <ProgressProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
      </ProgressProvider>
    </ProfilesProvider>
  );
}

import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen name="basic-info" options={{ title: 'Basic Info' }} />
      <Stack.Screen name="photos" options={{ title: 'Photos' }} />
      <Stack.Screen name="intents" options={{ title: 'Looking For' }} />
      <Stack.Screen name="location" options={{ title: 'Location' }} />
    </Stack>
  );
}

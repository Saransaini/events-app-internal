import 'react-native-gesture-handler';
import { Redirect, Stack, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Rubik_700Bold } from '@expo-google-fonts/rubik';
import { useAuth } from '../src/hooks/useAuth';

const queryClient = new QueryClient();

function AuthGate() {
  const { user, initializing } = useAuth();
  const pathname = usePathname();
  const inAuthGroup = pathname.startsWith('/login') || pathname.startsWith('/signup');

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user && !inAuthGroup) {
    return <Redirect href="/login" />;
  }
  if (user && inAuthGroup) {
    return <Redirect href="/discover" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="match/[id]" options={{ title: 'Match' }} />
    </Stack>
  );
}

export default function RootLayout() {
  // The wordmark is drawn as SVG text, which has no fallback rendering while
  // a webfont is still loading — it would paint in the default serif and then
  // snap. Holding the first frame until the face is ready avoids that flash.
  const [fontsLoaded] = useFonts({ Rubik_700Bold });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {fontsLoaded ? (
            <AuthGate />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator />
            </View>
          )}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

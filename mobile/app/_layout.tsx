import 'react-native-gesture-handler';
import { Redirect, Slot, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityIndicator, View } from 'react-native';
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

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthGate />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

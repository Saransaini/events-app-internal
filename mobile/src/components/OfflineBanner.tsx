import { Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

// Shown app-wide whenever there's no connection, so "why isn't this
// updating" has an obvious answer instead of a silent stale screen.
export function OfflineBanner() {
  const isOnline = useNetworkStatus();
  if (isOnline) return null;

  return (
    <Text style={styles.banner}>
      You're offline — showing saved data. Likes and messages will send once you're back online.
    </Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#4a4a4a',
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
});

import { Platform, Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useGoogleSignIn, isGoogleSignInConfigured } from '../hooks/useGoogleSignIn';

// Renders nothing if Google sign-in hasn't been configured (no client ID env
// vars set) rather than showing a button that can only ever fail.
export function GoogleSignInButton() {
  const { promptAsync, ready, signingIn, error, debugStatus } = useGoogleSignIn();

  if (!isGoogleSignInConfigured) return null;

  return (
    <>
      <Pressable
        style={[styles.button, (!ready || signingIn) && styles.buttonDisabled]}
        onPress={() => promptAsync()}
        disabled={!ready || signingIn}
      >
        {signingIn ? (
          <ActivityIndicator color="#333" />
        ) : (
          <Text style={styles.buttonText}>Continue with Google</Text>
        )}
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
      {/* TEMPORARY debug line — remove once the redirect flow is confirmed working. */}
      {debugStatus && (
        <Text style={styles.debug}>
          {debugStatus}
          {Platform.OS === 'web' && typeof window !== 'undefined' ? ` (on ${window.location.href})` : ''}
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  button: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#333', fontWeight: '600', fontSize: 16 },
  error: { color: '#c0392b' },
  debug: { color: '#666', fontSize: 12 },
});

import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import {
  useGoogleSignIn,
  isGoogleSignInConfigured,
  __DEBUG_REDIRECT_URI,
  __DEBUG_BASE_PATH,
} from '../hooks/useGoogleSignIn';

// Renders nothing if Google sign-in hasn't been configured (no client ID env
// vars set) rather than showing a button that can only ever fail.
export function GoogleSignInButton() {
  const { promptAsync, ready, signingIn, error } = useGoogleSignIn();

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
      <Text selectable style={styles.debug}>
        DEBUG basePath={JSON.stringify(__DEBUG_BASE_PATH)} redirectUri=
        {JSON.stringify(__DEBUG_REDIRECT_URI)}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  button: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#333', fontWeight: '600', fontSize: 16 },
  error: { color: '#c0392b' },
  debug: { color: '#999', fontSize: 10 },
});

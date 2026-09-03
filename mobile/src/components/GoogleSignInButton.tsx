import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useGoogleSignIn, isGoogleSignInConfigured } from '../hooks/useGoogleSignIn';

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
    </>
  );
}

const styles = StyleSheet.create({
  button: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#333', fontWeight: '600', fontSize: 16 },
  error: { color: '#c0392b' },
});

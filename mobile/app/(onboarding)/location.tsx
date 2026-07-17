import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useOnboardingStore } from '../../src/store/onboardingStore';
import { requestCurrentLocation } from '../../src/lib/geolocation';
import { api } from '../../src/lib/api';

export default function LocationStep() {
  const { name, breed, age, sex, bio, photos, intents, location, setLocation, reset } = useOnboardingStore();
  const [requesting, setRequesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequestLocation() {
    setRequesting(true);
    setError(null);
    try {
      const result = await requestCurrentLocation();
      if (!result) {
        setError('Location permission is required to find people nearby.');
        return;
      }
      setLocation(result);
    } finally {
      setRequesting(false);
    }
  }

  async function handleFinish() {
    if (!location) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.updateMyProfile({
        dog: {
          name: name.trim(),
          breed: breed.trim(),
          age: age ? Number(age) : null,
          sex,
          bio: bio.trim(),
          photos,
        },
        intents,
        location,
      });
      reset();
      router.replace('/discover');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create your profile');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where are you?</Text>
      <Text style={styles.subtitle}>We use this to show you nearby people</Text>

      {location ? (
        <Text style={styles.locationText}>
          Location captured: {location.lat.toFixed(3)}, {location.lng.toFixed(3)}
        </Text>
      ) : (
        <Pressable style={styles.secondaryButton} onPress={handleRequestLocation} disabled={requesting}>
          {requesting ? <ActivityIndicator /> : <Text style={styles.secondaryButtonText}>Share my location</Text>}
        </Pressable>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, (!location || submitting) && styles.buttonDisabled]}
        disabled={!location || submitting}
        onPress={handleFinish}
      >
        <Text style={styles.buttonText}>{submitting ? 'Creating profile…' : 'Finish'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#666' },
  locationText: { fontSize: 16 },
  secondaryButton: { borderWidth: 1, borderColor: '#fe3c72', borderRadius: 8, padding: 14, alignItems: 'center' },
  secondaryButtonText: { color: '#fe3c72', fontWeight: '600' },
  button: { backgroundColor: '#fe3c72', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: '#c0392b' },
});

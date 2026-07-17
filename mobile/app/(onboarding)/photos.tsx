import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useOnboardingStore } from '../../src/store/onboardingStore';
import { PhotoUploader } from '../../src/components/PhotoUploader';

export default function Photos() {
  const { photos, addPhoto, removePhoto } = useOnboardingStore();
  const canContinue = photos.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add some photos</Text>
      <PhotoUploader photos={photos} onAdd={addPhoto} onRemove={removePhoto} />
      <Pressable
        style={[styles.button, !canContinue && styles.buttonDisabled]}
        disabled={!canContinue}
        onPress={() => router.push('/intents')}
      >
        <Text style={styles.buttonText}>Next</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  button: { backgroundColor: '#fe3c72', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

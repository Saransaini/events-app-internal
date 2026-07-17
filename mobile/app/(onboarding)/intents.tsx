import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useOnboardingStore } from '../../src/store/onboardingStore';
import type { Intent } from '../../src/types/models';

const OPTIONS: { value: Intent; label: string; description: string }[] = [
  { value: 'playdate', label: 'Playdates', description: 'Find nearby dogs to hang out and play with' },
  { value: 'breeding', label: 'Breeding', description: 'Find a breeding match' },
  { value: 'adoption', label: 'Adoption', description: 'List this dog for adoption' },
];

export default function Intents() {
  const { intents, toggleIntent } = useOnboardingStore();
  const canContinue = intents.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What are you looking for?</Text>
      <Text style={styles.subtitle}>Select all that apply</Text>
      {OPTIONS.map((option) => {
        const selected = intents.includes(option.value);
        return (
          <Pressable
            key={option.value}
            style={[styles.option, selected && styles.optionSelected]}
            onPress={() => toggleIntent(option.value)}
          >
            <Text style={styles.optionLabel}>{option.label}</Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
          </Pressable>
        );
      })}
      <Pressable
        style={[styles.button, !canContinue && styles.buttonDisabled]}
        disabled={!canContinue}
        onPress={() => router.push('/location')}
      >
        <Text style={styles.buttonText}>Next</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#666', marginBottom: 8 },
  option: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 14 },
  optionSelected: { borderColor: '#fe3c72', backgroundColor: '#ffe4ec' },
  optionLabel: { fontWeight: '600', fontSize: 16 },
  optionDescription: { color: '#666', marginTop: 4 },
  button: { backgroundColor: '#fe3c72', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

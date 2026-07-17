import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useOnboardingStore } from '../../src/store/onboardingStore';

export default function BasicInfo() {
  const { name, breed, age, sex, bio, setBasicInfo } = useOnboardingStore();

  const canContinue = name.trim().length > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tell us about your dog</Text>
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={(value) => setBasicInfo({ name: value })}
      />
      <TextInput
        style={styles.input}
        placeholder="Breed"
        value={breed}
        onChangeText={(value) => setBasicInfo({ breed: value })}
      />
      <TextInput
        style={styles.input}
        placeholder="Age (years)"
        keyboardType="numeric"
        value={age}
        onChangeText={(value) => setBasicInfo({ age: value })}
      />
      <View style={styles.sexRow}>
        {(['male', 'female'] as const).map((option) => (
          <Pressable
            key={option}
            style={[styles.sexOption, sex === option && styles.sexOptionSelected]}
            onPress={() => setBasicInfo({ sex: option })}
          >
            <Text>{option === 'male' ? 'Male' : 'Female'}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={[styles.input, styles.bioInput]}
        placeholder="A little bio..."
        multiline
        value={bio}
        onChangeText={(value) => setBasicInfo({ bio: value })}
      />
      <Pressable
        style={[styles.button, !canContinue && styles.buttonDisabled]}
        disabled={!canContinue}
        onPress={() => router.push('/photos')}
      >
        <Text style={styles.buttonText}>Next</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },
  sexRow: { flexDirection: 'row', gap: 8 },
  sexOption: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, alignItems: 'center' },
  sexOptionSelected: { borderColor: '#fe3c72', backgroundColor: '#ffe4ec' },
  button: { backgroundColor: '#fe3c72', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

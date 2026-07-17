import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useMyDogs } from '../../src/hooks/useMyDogs';
import { useDiscoverDeck } from '../../src/hooks/useDiscoverDeck';
import { useSwipe } from '../../src/hooks/useSwipe';
import { requestCurrentLocation } from '../../src/lib/geolocation';
import { SwipeDeck } from '../../src/components/SwipeDeck';
import type { Dog, Intent, LatLng } from '../../src/types/models';

const INTENT_LABELS: Record<Intent, string> = {
  playdate: 'Playdate',
  breeding: 'Breeding',
  adoption: 'Adoption',
};

export default function Discover() {
  const { data: myDogs, isLoading: loadingDogs } = useMyDogs();
  const [location, setLocation] = useState<LatLng | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<Intent | null>(null);
  const swipeMutation = useSwipe();

  const myDog = myDogs?.[0];

  useEffect(() => {
    requestCurrentLocation().then(setLocation);
  }, []);

  useEffect(() => {
    if (myDog && !selectedIntent) {
      setSelectedIntent(myDog.intents[0]);
    }
  }, [myDog, selectedIntent]);

  const deckParams = myDog && selectedIntent && location ? { dogId: myDog._id, intent: selectedIntent, location } : null;
  const { data: dogs, isLoading: loadingDeck, refetch } = useDiscoverDeck(deckParams);

  if (loadingDogs) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!myDog) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>You haven't created a dog profile yet.</Text>
        <Pressable style={styles.button} onPress={() => router.push('/basic-info')}>
          <Text style={styles.buttonText}>Create a profile</Text>
        </Pressable>
      </View>
    );
  }

  function handleSwipe(dog: Dog, direction: 'like' | 'pass') {
    if (!myDog || !selectedIntent) return;
    swipeMutation.mutate({ swiperDogId: myDog._id, targetDogId: dog._id, intent: selectedIntent, direction });
  }

  return (
    <View style={styles.container}>
      <View style={styles.intentRow}>
        {myDog.intents.map((intent) => (
          <Pressable
            key={intent}
            style={[styles.intentChip, selectedIntent === intent && styles.intentChipSelected]}
            onPress={() => setSelectedIntent(intent)}
          >
            <Text style={selectedIntent === intent ? styles.intentTextSelected : styles.intentText}>
              {INTENT_LABELS[intent]}
            </Text>
          </Pressable>
        ))}
      </View>

      {!location || loadingDeck ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <SwipeDeck dogs={dogs || []} onSwipe={handleSwipe} onEmpty={() => refetch()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center' },
  button: { backgroundColor: '#fe3c72', borderRadius: 8, padding: 14, paddingHorizontal: 24 },
  buttonText: { color: '#fff', fontWeight: '600' },
  intentRow: { flexDirection: 'row', gap: 8, padding: 16 },
  intentChip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  intentChipSelected: { backgroundColor: '#fe3c72', borderColor: '#fe3c72' },
  intentText: { color: '#333' },
  intentTextSelected: { color: '#fff', fontWeight: '600' },
});

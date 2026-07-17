import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useMyProfile } from '../../src/hooks/useMyProfile';
import { useDiscoverPeople } from '../../src/hooks/useDiscoverPeople';
import { useSwipe } from '../../src/hooks/useSwipe';
import { requestCurrentLocation } from '../../src/lib/geolocation';
import { SwipeDeck } from '../../src/components/SwipeDeck';
import type { LatLng, UserProfile } from '../../src/types/models';

export default function Discover() {
  const { data: myProfile, isLoading: loadingProfile } = useMyProfile();
  const [location, setLocation] = useState<LatLng | null>(null);
  const swipeMutation = useSwipe();

  useEffect(() => {
    requestCurrentLocation().then(setLocation);
  }, []);

  const { data: people, isLoading: loadingDeck, refetch } = useDiscoverPeople(myProfile?.dog ? location : null);

  if (loadingProfile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!myProfile?.dog) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>You haven't created your profile yet.</Text>
        <Pressable style={styles.button} onPress={() => router.push('/basic-info')}>
          <Text style={styles.buttonText}>Create a profile</Text>
        </Pressable>
      </View>
    );
  }

  function handleSwipe(person: UserProfile, direction: 'like' | 'pass') {
    swipeMutation.mutate({ targetUid: person._id, direction });
  }

  return (
    <View style={styles.container}>
      {!location || loadingDeck ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <SwipeDeck people={people || []} onSwipe={handleSwipe} onEmpty={() => refetch()} />
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
});

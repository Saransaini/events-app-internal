import { View, Text, Image, StyleSheet } from 'react-native';
import type { UserProfile } from '../types/models';
import { IntentBadge } from './IntentBadge';

export function SwipeCard({ person }: { person: UserProfile }) {
  const dog = person.dog;
  const photo = dog?.photos[0];

  return (
    <View style={styles.card}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Text style={styles.placeholderText}>🐾</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{person.displayName}</Text>
        {dog && (
          <Text style={styles.dogLine}>
            with {dog.name}
            {dog.breed ? ` (${dog.breed})` : ''}
          </Text>
        )}
        {person.distanceKm !== undefined && (
          <Text style={styles.distance}>{person.distanceKm.toFixed(1)} km away</Text>
        )}
        {dog?.bio ? <Text style={styles.bio}>{dog.bio}</Text> : null}
        <View style={styles.badgeRow}>
          {person.intents.map((intent) => (
            <IntentBadge key={intent} intent={intent} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '65%' },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffe4ec' },
  placeholderText: { fontSize: 64 },
  info: { padding: 16, gap: 4 },
  name: { fontSize: 22, fontWeight: '700' },
  dogLine: { fontSize: 16, color: '#666' },
  distance: { fontSize: 14, color: '#999' },
  bio: { fontSize: 14, color: '#333', marginTop: 4 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
});

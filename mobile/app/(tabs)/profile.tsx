import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../../src/lib/firebase';
import { useMyProfile } from '../../src/hooks/useMyProfile';
import { IntentBadge } from '../../src/components/IntentBadge';

export default function Profile() {
  const { data: profile, isLoading } = useMyProfile();
  const dog = profile?.dog;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {profile ? (
        <View style={styles.card}>
          {dog?.photos[0] && <Image source={{ uri: dog.photos[0] }} style={styles.photo} />}
          <Text style={styles.name}>{profile.displayName}</Text>
          {dog && (
            <Text style={styles.dogLine}>
              with {dog.name}
              {dog.breed ? ` (${dog.breed})` : ''}
            </Text>
          )}
          <View style={styles.badgeRow}>
            {profile.intents.map((intent) => (
              <IntentBadge key={intent} intent={intent} />
            ))}
          </View>
          {dog?.bio ? <Text style={styles.bio}>{dog.bio}</Text> : null}
        </View>
      ) : (
        <Text style={styles.emptyText}>No profile yet.</Text>
      )}

      <Pressable style={styles.signOutButton} onPress={() => signOut(auth)}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { gap: 8 },
  photo: { width: '100%', height: 240, borderRadius: 12 },
  name: { fontSize: 24, fontWeight: '700' },
  dogLine: { fontSize: 16, color: '#666' },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  bio: { fontSize: 15, color: '#333' },
  emptyText: { fontSize: 16, color: '#666' },
  signOutButton: { borderWidth: 1, borderColor: '#c0392b', borderRadius: 8, padding: 14, alignItems: 'center' },
  signOutText: { color: '#c0392b', fontWeight: '600' },
});

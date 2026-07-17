import { View, Text, Image, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useMatches } from '../../src/hooks/useMatches';
import { useUser } from '../../src/hooks/useUser';
import { auth } from '../../src/lib/firebase';
import type { Match } from '../../src/types/models';

function MatchRow({ match }: { match: Match }) {
  const myUid = auth.currentUser?.uid;
  const otherUid = match.uids.find((uid) => uid !== myUid);
  const { data: other } = useUser(otherUid);

  return (
    <Pressable style={styles.row} onPress={() => router.push(`/match/${match._id}`)}>
      {other?.dog?.photos[0] && <Image source={{ uri: other.dog.photos[0] }} style={styles.thumb} />}
      <View style={styles.rowText}>
        <Text style={styles.title}>{other ? other.displayName : 'It’s a match!'}</Text>
        {other?.dog && <Text style={styles.subtitle}>with {other.dog.name}</Text>}
      </View>
    </Pressable>
  );
}

export default function Matches() {
  const { data: matches, isLoading } = useMatches();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No matches yet. Keep swiping!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={matches}
      keyExtractor={(match) => match._id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <MatchRow match={item} />}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#666' },
  list: { padding: 16, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 12,
  },
  thumb: { width: 48, height: 48, borderRadius: 24 },
  rowText: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
});

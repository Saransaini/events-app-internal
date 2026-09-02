import { useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMatches } from '../../src/hooks/useMatches';
import { useUsers } from '../../src/hooks/useUsers';
import { auth } from '../../src/lib/firebase';
import type { Match, UserProfile } from '../../src/types/models';

function MatchRow({ match, other }: { match: Match; other: UserProfile | undefined }) {
  return (
    <Pressable style={styles.row} onPress={() => router.push(`/match/${match._id}`)}>
      {other?.dog?.photos[0] && (
        <Image source={{ uri: other.dog.photos[0] }} style={styles.thumb} contentFit="cover" />
      )}
      <View style={styles.rowText}>
        <Text style={styles.title}>{other ? other.displayName : 'It’s a match!'}</Text>
        {other?.dog && <Text style={styles.subtitle}>with {other.dog.name}</Text>}
      </View>
    </Pressable>
  );
}

export default function Matches() {
  const { data: matches, isLoading } = useMatches();
  const myUid = auth.currentUser?.uid;

  // One batched read for every match's other-person profile, instead of a
  // separate Firestore round-trip per row (that's what a useUser-per-row
  // version of this screen used to do — noticeably slower to populate with
  // more than a couple of matches, and needlessly more reads).
  const otherUids = useMemo(
    () => (matches || []).map((m) => m.uids.find((uid) => uid !== myUid)).filter((uid): uid is string => !!uid),
    [matches, myUid]
  );
  const { data: others } = useUsers(otherUids);
  const othersByUid = useMemo(() => new Map((others || []).map((u) => [u._id, u])), [others]);

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
      renderItem={({ item }) => (
        <MatchRow match={item} other={othersByUid.get(item.uids.find((uid) => uid !== myUid) || '')} />
      )}
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

import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useMatches } from '../../src/hooks/useMatches';
import { IntentBadge } from '../../src/components/IntentBadge';

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
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => router.push(`/match/${item._id}`)}>
          <Text style={styles.title}>
            {item.type === 'asymmetric' ? 'New adoption inquiry' : "It's a match!"}
          </Text>
          <IntentBadge intent={item.intent} />
        </Pressable>
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
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: '600' },
});

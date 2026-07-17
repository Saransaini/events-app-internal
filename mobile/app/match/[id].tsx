import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../src/lib/api';
import { IntentBadge } from '../../src/components/IntentBadge';
import type { Match } from '../../src/types/models';

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .getMatch(id)
      .then(setMatch)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.center}>
        <Text>Match not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>{match.type === 'asymmetric' ? 'Adoption inquiry sent!' : "It's a match!"}</Text>
      <IntentBadge intent={match.intent} />
      <Text style={styles.subtitle}>
        Chat isn't available yet — this is a placeholder for a future messaging feature.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 64 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { textAlign: 'center', color: '#666' },
});

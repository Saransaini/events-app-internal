import { View, Text, StyleSheet } from 'react-native';
import type { Intent } from '../types/models';

const LABELS: Record<Intent, string> = {
  playdate: 'Playdate',
  breeding: 'Breeding',
  adoption: 'Adoption',
};

export function IntentBadge({ intent }: { intent: Intent }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{LABELS[intent]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { backgroundColor: '#ffe4ec', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  text: { color: '#fe3c72', fontSize: 12, fontWeight: '600' },
});

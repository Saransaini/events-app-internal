import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { api } from '../../src/lib/api';
import { useChat } from '../../src/hooks/useChat';
import { useUser } from '../../src/hooks/useUser';
import { auth } from '../../src/lib/firebase';
import type { Match } from '../../src/types/models';

export default function MatchChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(true);
  const [draft, setDraft] = useState('');

  const myUid = auth.currentUser?.uid;
  const otherUid = match?.uids.find((uid) => uid !== myUid);
  const { data: other } = useUser(otherUid);
  const { messages, send } = useChat(id);

  useEffect(() => {
    if (!id) return;
    api
      .getMatch(id)
      .then(setMatch)
      .finally(() => setLoadingMatch(false));
  }, [id]);

  async function handleSend() {
    const text = draft;
    setDraft('');
    await send(text);
  }

  if (loadingMatch) {
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ title: other?.displayName || 'Match' }} />
      <FlatList
        data={messages}
        keyExtractor={(message) => message._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.senderId === myUid ? styles.myBubble : styles.theirBubble]}>
            <Text style={item.senderId === myUid ? styles.myText : styles.theirText}>{item.text}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBanner}>
            <Text style={styles.emptyText}>
              You matched with {other?.displayName || 'someone'}! Say hi and plan your date{' '}
              {other?.dog ? `(bring ${other.dog.name}!)` : ''}
            </Text>
          </View>
        }
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message…"
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable style={styles.sendButton} onPress={handleSend} disabled={!draft.trim()}>
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 8, flexGrow: 1 },
  emptyBanner: { padding: 16, backgroundColor: '#ffe4ec', borderRadius: 12 },
  emptyText: { color: '#333', textAlign: 'center' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  myBubble: { backgroundColor: '#fe3c72', alignSelf: 'flex-end' },
  theirBubble: { backgroundColor: '#f1f1f1', alignSelf: 'flex-start' },
  myText: { color: '#fff' },
  theirText: { color: '#333' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendButton: { backgroundColor: '#fe3c72', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
  sendButtonText: { color: '#fff', fontWeight: '600' },
});

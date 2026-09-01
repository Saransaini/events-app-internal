// Imported from @firebase/firestore (not the firebase/firestore facade) to
// stay on the same build as the Firestore instance created in firebase.ts —
// see the comment there for why the facade can't be used on React Native.
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, type Unsubscribe } from '@firebase/firestore';
import { auth, firestore } from './firebase';
import type { Message } from '../types/models';

function messagesCollection(matchId: string) {
  return collection(firestore, 'matches', matchId, 'messages');
}

export function subscribeToMessages(matchId: string, onChange: (messages: Message[]) => void): Unsubscribe {
  const q = query(messagesCollection(matchId), orderBy('createdAt', 'asc'));
  // includeMetadataChanges makes the listener fire again once a pending
  // local write is confirmed by the server, purely so `pending` can flip
  // from true to false in the UI — the write itself already happened
  // locally the moment sendMessage() was called, offline or not.
  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    onChange(
      snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...(doc.data() as Omit<Message, '_id' | 'pending'>),
        pending: doc.metadata.hasPendingWrites,
      }))
    );
  });
}

export async function sendMessage(matchId: string, text: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Must be signed in to send a message');
  await addDoc(messagesCollection(matchId), {
    senderId: uid,
    text,
    createdAt: serverTimestamp(),
  });
}

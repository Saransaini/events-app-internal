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
  return onSnapshot(q, (snapshot) => {
    onChange(
      snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...(doc.data() as Omit<Message, '_id'>),
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

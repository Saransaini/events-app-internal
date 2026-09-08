// Data layer. This used to be a fetch client against the Express backend in
// /src; it now talks to Firestore directly so the app can be hosted as a
// static site with no server to run. The exported `api` object keeps the same
// shape it had then, so the hooks and screens above it are unchanged.
//
// Everything the backend used to enforce is now enforced by firestore.rules
// instead — see that file. The important consequence for this module: a
// profile is stored as TWO documents, because Firestore rules grant access
// per-document and cannot hide individual fields. users/{uid} holds the
// private copy (email, exact coordinates) and is readable only by its owner;
// publicProfiles/{uid} holds the subset other people are allowed to see, with
// location coarsened to roughly a 1km grid.
//
// Imported from @firebase/firestore rather than the firebase/firestore facade
// to stay on the same build as the Firestore instance in firebase.ts — see
// the comment there for why the facade can't be used on React Native.
import {
  GeoPoint,
  collection,
  deleteDoc,
  doc,
  documentId,
  enableNetwork,
  getDoc as getDocRaw,
  getDocs as getDocsRaw,
  limit as fsLimit,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QuerySnapshot,
} from '@firebase/firestore';
import { auth, firestore } from './firebase';
import { coarsenLocation, haversineDistanceKm } from './geo';
import type { Dog, Intent, LatLng, Match, SwipeResult, UserProfile } from '../types/models';

const VALID_INTENTS: Intent[] = ['dating', 'playdate'];
const DEFAULT_RADIUS_KM = 25;
const DEFAULT_LIMIT = 25;
// Read cap on the discovery scan. Matches the old backend's behaviour: it's a
// cheap ceiling on reads, not a real geo query, which is fine at v1 scale.
const DISCOVER_SCAN_LIMIT = 200;

interface ProfileUpdate {
  displayName?: string;
  email?: string;
  dog?: Partial<Dog>;
  intents?: Intent[];
  location?: LatLng;
}

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Must be signed in');
  return uid;
}

function isPermissionDenied(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'permission-denied';
}

// getDoc/getDocs reject immediately with a FirestoreError whose code is
// 'unavailable' ("Failed to get document because the client is offline")
// whenever Firestore currently believes it's offline — including a stale
// belief left over from a connectivity blip that has since cleared (see
// connectivity.ts and offlineQuery.ts for how that belief is tracked and
// resynced). Retrying once after nudging Firestore back online covers
// that gap without needing the underlying online/offline signal to be
// perfectly race-free.
function isUnavailable(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'unavailable';
}

async function getDoc<T = DocumentData>(reference: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
  try {
    return await getDocRaw(reference);
  } catch (err) {
    if (!isUnavailable(err)) throw err;
    await enableNetwork(firestore).catch(() => {});
    return await getDocRaw(reference);
  }
}

async function getDocs<T = DocumentData>(q: Query<T>): Promise<QuerySnapshot<T>> {
  try {
    return await getDocsRaw(q);
  } catch (err) {
    if (!isUnavailable(err)) throw err;
    await enableNetwork(firestore).catch(() => {});
    return await getDocsRaw(q);
  }
}

function buildDog(input: Partial<Dog> | undefined, existing?: Dog): Dog | undefined {
  if (input === undefined) return existing;
  if (!input.name) throw new Error('Your dog needs a name');
  return {
    name: input.name,
    breed: input.breed || '',
    age: typeof input.age === 'number' ? input.age : null,
    sex: input.sex || null,
    bio: input.bio || '',
    photos: Array.isArray(input.photos) ? input.photos : [],
  };
}

function assertIntents(intents: Intent[]): void {
  if (!Array.isArray(intents) || !intents.every((i) => VALID_INTENTS.includes(i))) {
    throw new Error(`intents must be a subset of ${VALID_INTENTS.join(', ')}`);
  }
}

// The signed-in user's own record, including the fields nobody else may see.
function toOwnProfile(snapshot: DocumentSnapshot<DocumentData>): UserProfile {
  const data = snapshot.data() || {};
  const location = data.location as GeoPoint | undefined;
  return {
    _id: snapshot.id,
    displayName: data.displayName || '',
    email: data.email || '',
    dog: data.dog,
    intents: data.intents || [],
    active: !!data.active,
    ...(location ? { location: { lat: location.latitude, lng: location.longitude } } : {}),
  };
}

// Anyone else's record. Sourced from publicProfiles, so there is no email or
// exact location here to leak in the first place.
function toPublicProfile(snapshot: DocumentSnapshot<DocumentData>): UserProfile {
  const data = snapshot.data() || {};
  return {
    _id: snapshot.id,
    displayName: data.displayName || '',
    email: '',
    dog: data.dog,
    intents: data.intents || [],
    active: !!data.active,
  };
}

// Writes the private and public copies together so they can never drift apart.
async function writeProfile(uid: string, update: ProfileUpdate, existing?: UserProfile): Promise<void> {
  const dog = buildDog(update.dog, existing?.dog);
  if (update.intents !== undefined) assertIntents(update.intents);

  const isNew = !existing;
  const intents = update.intents ?? existing?.intents ?? [];
  const displayName = update.displayName ?? existing?.displayName ?? '';
  // A profile becomes discoverable as soon as it has a dog, matching the old
  // backend rule that a person without a dog can't be swiped on.
  const active = dog ? true : existing?.active ?? false;

  const batch = writeBatch(firestore);

  const privateDoc: DocumentData = {
    displayName,
    email: update.email ?? existing?.email ?? '',
    intents,
    active,
    updatedAt: serverTimestamp(),
    ...(dog ? { dog } : {}),
    ...(update.location ? { location: new GeoPoint(update.location.lat, update.location.lng) } : {}),
    ...(isNew ? { createdAt: serverTimestamp() } : {}),
  };
  batch.set(doc(firestore, 'users', uid), privateDoc, { merge: true });

  const coarse = update.location ? coarsenLocation(update.location) : undefined;
  const publicDoc: DocumentData = {
    displayName,
    intents,
    active,
    updatedAt: serverTimestamp(),
    ...(dog ? { dog } : {}),
    ...(coarse ? { location: coarse } : {}),
  };
  batch.set(doc(firestore, 'publicProfiles', uid), publicDoc, { merge: true });

  await batch.commit();
}

async function readOwnProfile(uid: string): Promise<UserProfile | undefined> {
  const snapshot = await getDoc(doc(firestore, 'users', uid));
  return snapshot.exists() ? toOwnProfile(snapshot) : undefined;
}

export const api = {
  upsertMe: async (body: ProfileUpdate): Promise<UserProfile> => {
    const uid = requireUid();
    const existing = await readOwnProfile(uid);
    await writeProfile(uid, body, existing);
    const saved = await readOwnProfile(uid);
    if (!saved) throw new Error('Failed to save profile');
    return saved;
  },

  getMe: async (): Promise<UserProfile> => {
    const uid = requireUid();
    const profile = await readOwnProfile(uid);
    if (!profile) throw new Error('User profile not found');
    return profile;
  },

  updateMyProfile: async (body: ProfileUpdate): Promise<UserProfile> => {
    const uid = requireUid();
    const existing = await readOwnProfile(uid);
    if (!existing) throw new Error('User profile not found');
    await writeProfile(uid, body, existing);
    const saved = await readOwnProfile(uid);
    if (!saved) throw new Error('Failed to save profile');
    return saved;
  },

  discoverPeople: async (params: {
    lat: number;
    lng: number;
    radiusKm?: number;
    limit?: number;
  }): Promise<{ users: UserProfile[] }> => {
    const uid = requireUid();
    const radius = params.radiusKm ?? DEFAULT_RADIUS_KM;
    const cap = params.limit ?? DEFAULT_LIMIT;

    // Already-swiped people are filtered out client-side. Firestore has no
    // efficient server-side "not in this set" for a growing set, and the
    // reads are our own swipe docs either way.
    const swipes = await getDocs(query(collection(firestore, 'swipes'), where('swiperUid', '==', uid)));
    const alreadySwiped = new Set(swipes.docs.map((d) => d.data().targetUid as string));

    const candidates = await getDocs(
      query(collection(firestore, 'publicProfiles'), where('active', '==', true), fsLimit(DISCOVER_SCAN_LIMIT))
    );

    const origin = { lat: params.lat, lng: params.lng };
    const users = candidates.docs
      .filter((d) => d.id !== uid && !alreadySwiped.has(d.id))
      .map((d) => {
        const profile = toPublicProfile(d);
        const location = d.data().location as LatLng | undefined;
        if (location) {
          profile.distanceKm = haversineDistanceKm(origin, location);
        }
        return profile;
      })
      .filter((u) => u.distanceKm === undefined || u.distanceKm <= radius)
      .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
      .slice(0, cap);

    return { users };
  },

  swipe: async (body: { targetUid: string; direction: 'like' | 'pass' }): Promise<SwipeResult> => {
    const uid = requireUid();
    if (body.targetUid === uid) throw new Error('Cannot swipe on yourself');

    await setDoc(
      doc(firestore, 'swipes', `${uid}_${body.targetUid}`),
      { swiperUid: uid, targetUid: body.targetUid, direction: body.direction, createdAt: serverTimestamp() },
      { merge: true }
    );

    if (body.direction !== 'like') return { matched: false };

    const uids = [uid, body.targetUid].sort();
    const matchRef = doc(firestore, 'matches', `${uids[0]}_${uids[1]}`);

    const existing = await getDoc(matchRef);
    if (existing.exists()) {
      return { matched: true, match: { _id: existing.id, ...(existing.data() as Omit<Match, '_id'>) } };
    }

    // Whether this like completes a match is decided by the security rules,
    // not here: creating the match doc is only permitted when the other
    // person's "like" already exists. That keeps the check server-side (a
    // client can't fake a match) without letting anyone read other people's
    // swipes to find out who liked them. A denial is the normal "not mutual
    // yet" answer, so it's translated back into matched:false rather than
    // surfaced as an error.
    try {
      await setDoc(matchRef, { uids, createdAt: serverTimestamp() });
    } catch (err) {
      if (isPermissionDenied(err)) return { matched: false };
      throw err;
    }

    const created = await getDoc(matchRef);
    return { matched: true, match: { _id: created.id, ...(created.data() as Omit<Match, '_id'>) } };
  },

  getMyMatches: async (): Promise<{ matches: Match[] }> => {
    const uid = requireUid();
    const snapshot = await getDocs(
      query(collection(firestore, 'matches'), where('uids', 'array-contains', uid))
    );
    // Sorted here rather than with orderBy so this query needs no composite
    // index, which would otherwise have to be deployed separately.
    const matches = snapshot.docs
      .map((d) => ({ _id: d.id, ...(d.data() as Omit<Match, '_id'>) }))
      .sort((a, b) => Number(toMillis(b.createdAt)) - Number(toMillis(a.createdAt)));
    return { matches };
  },

  getMatch: async (id: string): Promise<Match> => {
    requireUid();
    const snapshot = await getDoc(doc(firestore, 'matches', id));
    if (!snapshot.exists()) throw new Error('Match not found');
    return { _id: snapshot.id, ...(snapshot.data() as Omit<Match, '_id'>) };
  },

  // Unmatching is permanent and total, same as before: the match and every
  // message in it are deleted outright, with nothing retained anywhere.
  unmatch: async (id: string): Promise<void> => {
    requireUid();
    // Messages must go BEFORE the match document. The rule authorising a
    // message delete looks up its parent match to check participation, so
    // deleting the match first would strand the messages permanently
    // undeletable. Failing partway is safe for the same reason: the match
    // still exists, so a retry can finish the job.
    const messagesRef = collection(firestore, 'matches', id, 'messages');
    for (;;) {
      const page = await getDocs(query(messagesRef, fsLimit(400)));
      if (page.empty) break;
      const batch = writeBatch(firestore);
      page.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    await deleteDoc(doc(firestore, 'matches', id));
  },

  getUser: async (id: string): Promise<UserProfile> => {
    requireUid();
    const snapshot = await getDoc(doc(firestore, 'publicProfiles', id));
    if (!snapshot.exists()) throw new Error('User not found');
    return toPublicProfile(snapshot);
  },

  // Batches the "other person in this match" lookup for the whole matches
  // list into one query instead of one per row. Firestore's documentId()
  // 'in' filter caps at 30 ids — comfortably beyond how many matches this
  // app expects someone to have — so callers with more would need to chunk;
  // not done here since that's out of range for v1.
  getUsers: async (ids: string[]): Promise<UserProfile[]> => {
    requireUid();
    if (ids.length === 0) return [];
    const snapshot = await getDocs(
      query(collection(firestore, 'publicProfiles'), where(documentId(), 'in', ids))
    );
    return snapshot.docs.map(toPublicProfile);
  },
};

// createdAt is a Firestore Timestamp once written, but is briefly null on a
// locally-echoed document before the server value lands.
function toMillis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value) {
    return (value as { toMillis(): number }).toMillis();
  }
  return 0;
}

// Web implementation. Metro picks photoUpload.native.ts on iOS/Android
// instead, so nothing here ships in the phone build (and expo-file-system,
// which the native version needs, never ships in the web bundle).
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from './firebase';
import { dogPhotoPath, PHOTO_CONTENT_TYPE } from './photoPath';

/**
 * Uploads a local, already-resized JPEG to the signed-in user's photo
 * folder and returns its public download URL.
 */
export async function uploadDogPhoto(localUri: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to be signed in to add photos.');

  const blob = await (await fetch(localUri)).blob();
  const storageRef = ref(storage, dogPhotoPath(user.uid));
  // storage.rules only accepts image/* uploads, and blob.type isn't
  // guaranteed to be set, so the type is always passed explicitly.
  await uploadBytes(storageRef, blob, { contentType: PHOTO_CONTENT_TYPE });
  return getDownloadURL(storageRef);
}

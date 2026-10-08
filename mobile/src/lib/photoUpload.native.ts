// iOS/Android implementation (Metro prefers this file over photoUpload.ts on
// native platforms).
//
// Why this doesn't use the Firebase Storage SDK's uploadBytes like the web
// version does: on the native iOS build that call kept failing with
// storage/unauthorized even after the content type was fixed, while the same
// rules accepted the same upload from the web build. The SDK's native path
// has two React Native-specific links that the web path doesn't:
//   1. it rebuilds the photo as a JS Blob (fetch(file://) -> Blob) and
//      stitches it into a multipart body with `new Blob([...])`, which goes
//      through React Native's own Blob implementation, not a browser's; and
//   2. it attaches the sign-in token through Firebase's internal
//      component wiring rather than anything this app controls.
// Either one going wrong produces exactly a 403 from the server. Rather than
// keep guessing which, this path removes both: the photo is streamed from
// disk by the OS's own HTTP stack (expo-file-system), and the ID token is
// fetched and attached here, explicitly. If the server still refuses, its
// actual error message is surfaced instead of a generic code.
import { File, UploadType } from 'expo-file-system';
import { auth, emulatorHost } from './firebase';
import { dogPhotoPath, PHOTO_CONTENT_TYPE } from './photoPath';

const bucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;

function storageBaseUrl(): string {
  // Matches connectStorageEmulator() in firebase.ts so a dev build pointed at
  // the local emulators uploads there too, not to the real project.
  return emulatorHost
    ? `http://${emulatorHost}:9199/v0/b/${bucket}/o`
    : `https://firebasestorage.googleapis.com/v0/b/${bucket}/o`;
}

/**
 * Uploads a local, already-resized JPEG to the signed-in user's photo
 * folder and returns its public download URL.
 */
export async function uploadDogPhoto(localUri: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to be signed in to add photos.');
  if (!bucket) throw new Error('Photo storage is not configured for this build.');

  const path = dogPhotoPath(user.uid);
  const idToken = await user.getIdToken();

  // Firebase Storage's REST endpoint: a POST with no upload-protocol header
  // is a plain "media" upload — the request body is the file itself, and
  // Content-Type is the object's content type (which storage.rules checks).
  const result = await new File(localUri).upload(
    `${storageBaseUrl()}?name=${encodeURIComponent(path)}`,
    {
      httpMethod: 'POST',
      uploadType: UploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Firebase ${idToken}`,
        'Content-Type': PHOTO_CONTENT_TYPE,
      },
    }
  );

  if (result.status < 200 || result.status >= 300) {
    throw new Error(describeFailure(result.status, result.body));
  }

  // The upload response carries the object's download token, so the public
  // URL can be built directly, without a second authenticated request.
  const metadata = JSON.parse(result.body) as { downloadTokens?: string };
  const token = metadata.downloadTokens?.split(',')[0];
  if (!token) throw new Error('Photo uploaded, but no download link came back.');
  return `${storageBaseUrl()}/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

function describeFailure(status: number, body: string): string {
  let serverMessage = '';
  try {
    serverMessage = JSON.parse(body)?.error?.message ?? '';
  } catch {
    serverMessage = body.slice(0, 200);
  }
  if (status === 401 || status === 403) {
    return `Photo upload was refused (${status})${serverMessage ? `: ${serverMessage}` : ''}. Try signing out and back in.`;
  }
  return `Photo upload failed (${status})${serverMessage ? `: ${serverMessage}` : ''}`;
}

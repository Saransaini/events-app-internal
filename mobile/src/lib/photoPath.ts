// Shared by the web and native upload paths so both write to exactly the
// location storage.rules authorises: dog-photos/{uid}/{fileName}.
export const PHOTO_CONTENT_TYPE = 'image/jpeg';

export function dogPhotoPath(uid: string): string {
  return `dog-photos/${uid}/${Date.now()}.jpg`;
}

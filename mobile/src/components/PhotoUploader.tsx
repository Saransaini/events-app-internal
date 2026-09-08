import { useState } from 'react';
import { View, Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { auth } from '../lib/firebase';

interface Props {
  photos: string[];
  onAdd: (url: string) => void;
  onRemove: (url: string) => void;
}

// A modern phone photo is commonly 3000-4000px wide and several MB — this is
// the biggest single lever on how this app feels, since that same file gets
// re-downloaded by every discover-card view, every match's profile look, and
// the owner's own profile screen. Resizing to what a card can actually show
// before it ever leaves the device cuts upload time, storage cost, and every
// later view's load time at once. 1080px is generous headroom for a phone
// screen; nothing in this app displays photos anywhere near that large.
const MAX_DIMENSION = 1080;

export function PhotoUploader({ photos, onAdd, onRemove }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickAndUpload() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    setError(null);
    try {
      const asset = result.assets[0];
      const longEdge = Math.max(asset.width, asset.height);
      const resized = await manipulateAsync(
        asset.uri,
        // Only resize if it's actually larger than the cap — manipulateAsync
        // always re-encodes, and there's no reason to pay that cost, or risk
        // upscaling, on an image that's already small.
        longEdge > MAX_DIMENSION
          ? [
              {
                resize:
                  asset.width >= asset.height
                    ? { width: MAX_DIMENSION }
                    : { height: MAX_DIMENSION },
              },
            ]
          : [],
        { compress: 0.7, format: SaveFormat.JPEG }
      );

      const response = await fetch(resized.uri);
      const blob = await response.blob();
      const uid = auth.currentUser?.uid || 'anonymous';
      const path = `dog-photos/${uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      onAdd(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <View>
      <View style={styles.row}>
        {photos.map((url) => (
          <Pressable key={url} onLongPress={() => onRemove(url)} style={styles.photoWrap}>
            <Image source={{ uri: url }} style={styles.photo} contentFit="cover" />
          </Pressable>
        ))}
        <Pressable style={styles.addButton} onPress={pickAndUpload} disabled={uploading}>
          {uploading ? <ActivityIndicator /> : <Text style={styles.addButtonText}>+</Text>}
        </Pressable>
      </View>
      <Text style={styles.hint}>Long-press a photo to remove it</Text>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrap: { width: 90, height: 90, borderRadius: 8, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  addButton: {
    width: 90,
    height: 90,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { fontSize: 32, color: '#999' },
  hint: { color: '#999', fontSize: 12, marginTop: 6 },
  error: { color: '#c0392b', fontSize: 12, marginTop: 6 },
});

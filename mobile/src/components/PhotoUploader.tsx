import { useState } from 'react';
import { View, Image, Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { auth } from '../lib/firebase';

interface Props {
  photos: string[];
  onAdd: (url: string) => void;
  onRemove: (url: string) => void;
}

export function PhotoUploader({ photos, onAdd, onRemove }: Props) {
  const [uploading, setUploading] = useState(false);

  async function pickAndUpload() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const uid = auth.currentUser?.uid || 'anonymous';
      const path = `dog-photos/${uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      onAdd(url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <View>
      <View style={styles.row}>
        {photos.map((url) => (
          <Pressable key={url} onLongPress={() => onRemove(url)} style={styles.photoWrap}>
            <Image source={{ uri: url }} style={styles.photo} />
          </Pressable>
        ))}
        <Pressable style={styles.addButton} onPress={pickAndUpload} disabled={uploading}>
          {uploading ? <ActivityIndicator /> : <Text style={styles.addButtonText}>+</Text>}
        </Pressable>
      </View>
      <Text style={styles.hint}>Long-press a photo to remove it</Text>
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
});

import * as Location from 'expo-location';
import type { LatLng } from '../types/models';

export async function requestCurrentLocation(): Promise<LatLng | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }
  const position = await Location.getCurrentPositionAsync({});
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}

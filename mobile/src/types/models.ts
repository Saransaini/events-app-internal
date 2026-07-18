export type Intent = 'dating' | 'playdate';
export type Sex = 'male' | 'female';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Dog {
  name: string;
  breed: string;
  age: number | null;
  sex: Sex | null;
  bio: string;
  photos: string[];
}

export interface UserProfile {
  _id: string;
  displayName: string;
  email: string;
  dog?: Dog;
  intents: Intent[];
  active: boolean;
  location?: LatLng;
  distanceKm?: number;
}

export interface SwipeResult {
  matched: boolean;
  match?: Match;
}

export interface Match {
  _id: string;
  uids: string[];
  createdAt: unknown;
}

export interface Message {
  _id: string;
  senderId: string;
  text: string;
  createdAt: unknown;
}

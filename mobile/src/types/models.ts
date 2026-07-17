export type Intent = 'playdate' | 'breeding' | 'adoption';
export type Sex = 'male' | 'female';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface UserProfile {
  _id: string;
  displayName: string;
  email: string;
  location?: LatLng;
}

export interface Dog {
  _id: string;
  ownerId: string;
  name: string;
  bio: string;
  breed: string;
  age: number | null;
  sex: Sex | null;
  photos: string[];
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
  dogAId: string;
  dogBId: string;
  ownerAId: string;
  ownerBId: string;
  ownerIds: string[];
  intent: Intent;
  type: 'reciprocal' | 'asymmetric';
  status: 'active' | 'unmatched';
  createdAt: unknown;
}

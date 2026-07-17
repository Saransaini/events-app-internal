import { create } from 'zustand';
import type { Intent, LatLng, Sex } from '../types/models';

interface OnboardingState {
  name: string;
  breed: string;
  age: string;
  sex: Sex | null;
  bio: string;
  photos: string[];
  intents: Intent[];
  location: LatLng | null;
  setBasicInfo: (fields: Partial<Pick<OnboardingState, 'name' | 'breed' | 'age' | 'sex' | 'bio'>>) => void;
  addPhoto: (uri: string) => void;
  removePhoto: (uri: string) => void;
  toggleIntent: (intent: Intent) => void;
  setLocation: (location: LatLng) => void;
  reset: () => void;
}

const initialState = {
  name: '',
  breed: '',
  age: '',
  sex: null as Sex | null,
  bio: '',
  photos: [] as string[],
  intents: [] as Intent[],
  location: null as LatLng | null,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setBasicInfo: (fields) => set(fields),
  addPhoto: (uri) => set((state) => ({ photos: [...state.photos, uri] })),
  removePhoto: (uri) => set((state) => ({ photos: state.photos.filter((p) => p !== uri) })),
  toggleIntent: (intent) =>
    set((state) => ({
      intents: state.intents.includes(intent)
        ? state.intents.filter((i) => i !== intent)
        : [...state.intents, intent],
    })),
  setLocation: (location) => set({ location }),
  reset: () => set(initialState),
}));

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });
  }, []);

  return { user, initializing };
}

import { useEffect, useState } from 'react';
import { subscribeToConnectivity } from '../lib/connectivity';

export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => subscribeToConnectivity(setIsOnline), []);
  return isOnline;
}

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { syncAlarmsToNative, isNativePlatform } from '@/lib/capacitor';
import {
  cacheAlarms,
  cacheMedicines,
  cacheMeetings,
  getCachedAlarms,
  getCachedMedicines,
  getCachedMeetings,
} from '@/lib/offlineStorage';

export function useNativeSync() {
  const { data: alarms } = useQuery<any[]>({
    queryKey: ['/api/alarms'],
    enabled: isNativePlatform()
  });

  const { data: medicines } = useQuery<any[]>({
    queryKey: ['/api/medicines'],
    enabled: isNativePlatform()
  });

  const { data: meetings } = useQuery<any[]>({
    queryKey: ['/api/meetings'],
    enabled: isNativePlatform()
  });

  // When API data is available, cache it and sync to native
  useEffect(() => {
    if (!isNativePlatform()) return;

    if (alarms && medicines && meetings) {
      // Cache to IndexedDB for offline use
      cacheAlarms(alarms);
      cacheMedicines(medicines);
      cacheMeetings(meetings);
      // Sync to native AlarmManager
      syncAlarmsToNative(alarms, medicines, meetings);
    }
  }, [alarms, medicines, meetings]);

  // Fallback: when API data is unavailable (offline), load from IndexedDB cache
  useEffect(() => {
    if (!isNativePlatform()) return;
    // Only use fallback if API queries haven't returned data yet
    if (alarms || medicines || meetings) return;

    (async () => {
      try {
        const [cachedA, cachedM, cachedMt] = await Promise.all([
          getCachedAlarms(),
          getCachedMedicines(),
          getCachedMeetings(),
        ]);

        if (cachedA.length > 0 || cachedM.length > 0 || cachedMt.length > 0) {
          console.log('[NativeSync] Using cached data for offline sync');
          syncAlarmsToNative(cachedA, cachedM, cachedMt);
        }
      } catch (e) {
        console.warn('[NativeSync] Failed to load cached data:', e);
      }
    })();
  }, [alarms, medicines, meetings]);
}

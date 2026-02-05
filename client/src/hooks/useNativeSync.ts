import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { syncAlarmsToNative, isNativePlatform } from '@/lib/capacitor';

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

  useEffect(() => {
    if (isNativePlatform() && alarms && medicines && meetings) {
      syncAlarmsToNative(alarms, medicines, meetings);
    }
  }, [alarms, medicines, meetings]);
}

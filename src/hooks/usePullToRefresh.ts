// hooks/usePullToRefresh.ts
import { useCallback, useState } from 'react';

export function usePullToRefresh(loadData: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  return { refreshing, handleRefresh };
}
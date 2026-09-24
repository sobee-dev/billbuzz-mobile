// components/ThrottleBanner.tsx
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

export function ThrottleBanner() {
  const { throttledUntil } = useAuth();
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!throttledUntil) return;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [throttledUntil]);

  if (!throttledUntil) return null;
  const remaining = Math.max(0, Math.ceil((throttledUntil - Date.now()) / 1000));
  if (remaining <= 0) return null;

  return (
    <View style={{
      backgroundColor: '#fff3cd', borderRadius: 10, padding: 12,
      marginHorizontal: 16, marginTop: 8,
    }}>
      <Text style={{ fontFamily: 'Inter', fontWeight: '700', color: '#755700' }}>
        Too many requests
      </Text>
      <Text style={{ fontFamily: 'Inter', color: '#755700', marginTop: 2 }}>
        Please wait {remaining}s before trying again.
      </Text>
    </View>
  );
}
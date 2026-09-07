// components/AppRefreshControl.tsx
import { RefreshControl, RefreshControlProps } from 'react-native';
import { colors } from '../styles/globals';

export function AppRefreshControl(props: Omit<RefreshControlProps, 'colors' | 'tintColor'>) {
  return (
    <RefreshControl
      {...props}
      colors={[colors.primaryContainer]}
      tintColor={colors.primaryContainer}
    />
  );
}
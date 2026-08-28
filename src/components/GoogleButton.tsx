import { AntDesign } from '@expo/vector-icons';
import { Text, TouchableOpacity } from 'react-native';

export function GoogleButton({ onPress, disabled }: { onPress?: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
      className="h-14 bg-white border border-gray rounded-2xl items-center justify-center flex-row gap-3 mb-6"
      activeOpacity={0.85}
    >
      <AntDesign name="google" size={20} color="#4285F4" />
      <Text className="font-inter text-body-lg font-bold text-on-surface">Continue with Google</Text>
    </TouchableOpacity>
  );
}
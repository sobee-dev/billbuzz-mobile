import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MoreScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center">
        <Text className="font-inter text-headline-sm font-bold text-primary-container">More</Text>
        <Text className="font-inter text-body-md text-on-surface-variant mt-1">Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

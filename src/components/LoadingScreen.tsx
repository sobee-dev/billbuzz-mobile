import { ActivityIndicator, Text, View } from "react-native";

interface LoadingScreenProps {
  text?: string;
}

const LoadingScreen = ({ text = "Loading..." }: LoadingScreenProps) => {
  return (
    // 'flex-1' makes it fill the screen, 'items-center' and 'justify-center' center the content
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#000000" />
      <Text className="mt-4 text-base text-gray-700 font-medium">
        {text}
      </Text>
    </View>
  );
};

export default LoadingScreen;
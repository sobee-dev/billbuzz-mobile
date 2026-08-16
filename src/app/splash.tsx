import { GoogleButton } from '@/components/GoogleButton';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, ImageBackground, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BG_IMAGE = require('../../assets/images/splash-bg.png');
const LOGO = require('../../assets/images/icon.png');

export default function SplashScreen() {
  const router = useRouter();

  return (
    <View className="flex-1">
      <StatusBar style="light" />
      
      <ImageBackground source={BG_IMAGE} className="flex-1" resizeMode="cover">
        
        {/* Replaced LinearGradient with a solid dark overlay */}
        <View className="absolute inset-0 bg-blue-950/80" />

        {/* Hero Section */}
        <View className="flex-1 justify-center items-center px-6">
          <Image source={LOGO} className="w-24 h-24 mb-4" resizeMode="contain" />
          <Text className="text-4xl font-bold text-white mb-2">BillBuzz</Text>
          <Text className="text-center text-blue-100 text-lg">
            Smart management app for growing{'\n'}businesses
          </Text>
        </View>

        {/* Action Card */}
        <View className="bg-white/10 p-6 rounded-t-3xl">
          <SafeAreaView edges={['bottom']}>
            <TouchableOpacity 
              className="bg-blue-600 py-4 rounded-xl mb-4" 
              onPress={() => router.replace('/login')}
            >
              <Text className="text-white text-center font-bold text-lg">Sign In</Text>
            </TouchableOpacity>

            {/* Replaced BlurView with a semi-transparent border box */}
            <TouchableOpacity 
              className="py-4 items-center rounded-xl border border-white/30 bg-white/5" 
              onPress={() => router.replace('/register')}
            >
              <Text className="text-white font-bold text-lg">Create Account</Text>
            </TouchableOpacity>

            {/* OR Divider */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-white/20" />
              <Text className="text-white/60 mx-4">OR</Text>
              <View className="flex-1 h-px bg-white/20" />
            </View>

            <GoogleButton />

            <Text className="text-white/70 text-center text-xs mt-6">
              By continuing, you agree to BillBuzz's{' '}
              <Text className="underline">Terms of Service</Text>
              {'\n'}and <Text className="underline">Privacy Policy</Text>.
            </Text>
          </SafeAreaView>
        </View>
      </ImageBackground>
    </View>
  );
}
// import AsyncStorage from '@react-native-async-storage/async-storage'; // UNCOMMENT FOR STORAGE
import { GoogleButton } from '@/components/GoogleButton';
import { useAuth } from '@/context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../styles/globals';






// Exported so other pages can reference the session shape
export interface StaffSession {
  name:        string;
  email:       string;
  role:        string;   
  initials:    string;
  avatarColor: string;
  
}

// ─── Assets ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../assets/images/logo.png') as number;

const DECO = require('../../assets/images/tutorial-web.png') as number;



export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError,   setLoginError]   = useState('');

  const shakeX = useRef(new Animated.Value(0)).current;

  const shake = () =>
    Animated.sequence([
      Animated.timing(shakeX, { toValue:  10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:   8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:   0, duration: 50, useNativeDriver: true }),
    ]).start();

  const isValidPassword = /^\d{6}$/.test(password);
  const canSubmit = email.trim().length > 0 && isValidPassword && !loginLoading;

  const handleLogin = async () => {
    if (!email.trim()) { setLoginError('Please enter your email address.'); return; }
    if (!isValidPassword) {
      setLoginError('Password must be exactly 6 digits.');
      shake();
      return;
    }

    setLoginError('');
    setLoginLoading(true);

    try {
      const user = await login({ email: email.trim().toLowerCase(), password });
      if (user.role === 'owner') {
        router.replace('/(owner-tabs)/dashboard');
      } else {
        router.replace('/(staff-tabs)/dashboard');
      }
    } catch (err: any) {
      if (err.message === "Network Error") {
        setLoginError("Cannot connect to server. Check your URL/Wi-Fi.");
      } else {
        const msg = err?.response?.data?.detail
                ?? err?.response?.data?.nonFieldErrors?.[0]
                ?? err?.response?.data?.error
                ?? "An unexpected error occurred.";
        setLoginError(msg);
      }
      shake();
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-8"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View className="flex-row items-center gap-3 mb-8">
            <Image source={LOGO} className="w-11 h-11 rounded-xl" resizeMode="contain" />
            <Text className="font-inter text-headline-md font-bold text-primary-container">BillBuzz</Text>
          </View>

          {/* Title */}
          <View className="mb-8">
            <Text className="font-inter text-headline-lg font-bold text-on-surface mb-2">Welcome Back</Text>
            <Text className="font-inter text-body-lg text-on-surface-variant leading-6">
              Sign in to continue managing your business.
            </Text>
          </View>

          {/* Email */}
          <View className="mb-5">
            <Text className="font-inter text-label-md font-semibold uppercase text-on-surface-variant mb-2">
              Email Address
            </Text>
            <View className="flex-row items-center h-12 bg-white border border-gray rounded-xl px-3 gap-2">
              <MaterialIcons name="mail-outline" size={20} color={colors.onSurfaceVariant} />
              <TextInput
                className="flex-1 font-inter text-body-md text-on-surface"
                placeholder="name@company.com"
                placeholderTextColor={colors.gray}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={t => { setEmail(t); setLoginError(''); }}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password */}
          <View className="mb-2">
            <Text className="font-inter text-label-md font-semibold uppercase text-on-surface-variant mb-2">
              Password
            </Text>
            <View className="flex-row items-center h-12 bg-white border border-gray rounded-xl px-3 gap-2">
              <MaterialIcons name="lock-outline" size={20} color={colors.onSurfaceVariant} />
              <TextInput
                className="flex-1 font-inter text-body-md text-on-surface"
                placeholder="6-digit passcode"
                placeholderTextColor={colors.gray}
                secureTextEntry={!showPassword}
                keyboardType="number-pad"
                maxLength={6}
                value={password}
                onChangeText={t => { setPassword(t.replace(/[^0-9]/g, '')); setLoginError(''); }}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(p => !p)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot */}
          <TouchableOpacity className="self-end mb-5" activeOpacity={0.7}>
            <Text className="font-inter text-body-md font-semibold text-primary-container">
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Error */}
          {loginError !== '' && (
            <View className="flex-row items-center gap-2 mb-4 px-3 py-2 bg-error-container rounded-xl">
              <MaterialIcons name="error-outline" size={16} color={colors.error} />
              <Text className="font-inter text-body-md text-error flex-1">{loginError}</Text>
            </View>
          )}

          {/* Sign In */}
          <TouchableOpacity
            className="h-14 bg-primary-container rounded-2xl items-center justify-center flex-row gap-2 mb-4"
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={!canSubmit}
            style={{ opacity: canSubmit ? 1 : 0.5 }}
          >
            {loginLoading
              ? <ActivityIndicator color={colors.white} />
              : <>
                  <Text className="font-inter text-body-lg font-bold text-white">Sign In</Text>
                  <MaterialIcons name="arrow-forward" size={20} color={colors.white} />
                </>
            }
          </TouchableOpacity>

          {/* OR */}
          <View className="flex-row items-center gap-4 mb-5">
            <View className="flex-1 h-px bg-gray" />
            <Text className="font-inter text-label-md font-semibold text-on-surface-variant">OR</Text>
            <View className="flex-1 h-px bg-gray" />
          </View>

          {/* Google */}
          <GoogleButton />

          {/* Register */}
          <Text className="font-inter text-body-md text-on-surface-variant text-center mb-4">
            Don't have an account?{' '}
            <Text className="font-bold text-primary-container" onPress={() => router.push('/register')}>
              Create Account
            </Text>
          </Text>

          <Image
            source={DECO}
            className="w-full"
            style={{ aspectRatio: 4 / 3, opacity: 0.2 }}
            resizeMode="contain"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

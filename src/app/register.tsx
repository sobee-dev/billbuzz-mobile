import { GoogleButton } from '@/components/GoogleButton';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../services/auth';
import { colors } from '../styles/globals';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../assets/images/logo.png') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const DECO = require('../../assets/images/tutorial-web.png') as number;

export default function RegisterScreen() {
  const router = useRouter();
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');


  const isValidPassword = /^\d{6}$/.test(password);
  const canSubmit = email.trim().length > 0 && isValidPassword && !loading;
 
   const handleRegister = async () => {
    if (!email.trim())     { setError('Please enter your email address.'); return; }
    if (!isValidPassword)  { setError('Password must be exactly 6 digits.'); return; }
    setError('');
    setLoading(true);
    try {
      await authService.register({ email: email.trim(), password });
      router.replace('/(onboarding-tabs)/step-1' as never);
    } catch (err: any) {
      const msg = err?.response?.data?.email?.[0]
        ?? err?.response?.data?.password?.[0]
        ?? err?.response?.data?.detail
        ?? err?.response?.data?.error
        ?? 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-8"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Logo / Brand ─────────────────────────────────────── */}
          <View className="flex-row items-center gap-3 mb-8">
            <Image
              source={LOGO}
              className="w-11 h-11 rounded-xl"
              resizeMode="contain"
            />
            <Text className="font-inter text-headline-md font-bold text-primary-container">
              BillBuzz
            </Text>
          </View>

          {/* ── Page title ───────────────────────────────────────── */}
          <View className="mb-8">
            <Text className="font-inter text-headline-lg font-bold text-on-surface mb-2">
              Create Account
            </Text>
            <Text className="font-inter text-body-lg text-on-surface-variant leading-6">
              Start managing your business finances with ease and efficiency.
            </Text>
          </View>

          {/* ── Email ────────────────────────────────────────────── */}
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
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* ── Password ─────────────────────────────────────────── */}
          <View className="mb-8">
            <Text className="font-inter text-label-md font-semibold uppercase text-on-surface-variant mb-2">
              Password
            </Text>
            <View className="flex-row items-center h-12 bg-white border border-gray rounded-xl px-3 gap-2">
              <MaterialIcons name="lock-outline" size={20} color={colors.onSurfaceVariant} />
              <TextInput
                className="flex-1 font-inter text-body-md text-on-surface"
                placeholder="enter a 6-digit passcode"
                placeholderTextColor={colors.gray}
                secureTextEntry={!showPassword}
                keyboardType="number-pad"
                maxLength={6}
                value={password}
                onChangeText={(v) => setPassword(v.replace(/[^0-9]/g, ''))}
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

          {/* ── Error message ────────────────────────────────────── */}
          {!!error && (
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: '#c62828', marginBottom: 12, textAlign: 'center' }}>
              {error}
            </Text>
          )}

          {/* ── Register button ──────────────────────────────────── */}
          <TouchableOpacity
            className="h-14 bg-primary-container rounded-2xl items-center justify-center flex-row gap-2 mb-5"
            activeOpacity={0.85}
            onPress={handleRegister}
            disabled={!canSubmit}
            style={{ opacity: canSubmit ? 1 : 0.5 }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text className="font-inter text-body-lg font-bold text-white">Register</Text>
                  <MaterialIcons name="arrow-forward" size={20} color={colors.white} />
                </>
            }
          </TouchableOpacity>

          {/* ── OR divider ───────────────────────────────────────── */}
          <View className="flex-row items-center gap-4 mb-5">
            <View className="flex-1 h-px bg-gray" />
            <Text className="font-inter text-label-md font-semibold text-on-surface-variant">
              OR
            </Text>
            <View className="flex-1 h-px bg-gray" />
          </View>

          {/* ── Continue with Google ─────────────────────────────── */}
          
          
          <GoogleButton />
          
          
          {/* ── Sign in link ─────────────────────────────────────── */}
          <Text className="font-inter text-body-md text-on-surface-variant text-center mb-4">
            Already have an account?{' '}
            <Text
              className="font-bold text-primary-container"
              onPress={() => router.push('/login')}
            >
              Sign In
            </Text>
          </Text>

          {/* ── Decorative bottom image ──────────────────────────── */}
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

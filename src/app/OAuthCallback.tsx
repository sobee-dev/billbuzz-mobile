import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { authService } from '../services/auth';
import { businessService } from '../services/business';
import { Animated, Easing, Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../styles/globals';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../assets/images/logo.png') as number;

const STEPS = [
  'VERIFYING PERMISSIONS',
  'LOADING YOUR DATA',
  'PREPARING WORKSPACE',
] as const;

export default function OAuthCallbackScreen() {
  const router   = useRouter();
  const params   = useLocalSearchParams<{ token?: string }>();
  const rotation = useRef(new Animated.Value(0)).current;
  const dotScale = useRef(new Animated.Value(1)).current;
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // ── Spin the arc ──────────────────────────────────────────────────────────
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true,
      })
    ).start();

    // ── Pulse the status dot ──────────────────────────────────────────────────
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotScale, { toValue: 1.5, duration: 500, useNativeDriver: true }),
        Animated.timing(dotScale, { toValue: 1,   duration: 500, useNativeDriver: true }),
      ])
    ).start();

    // ── Cycle through step labels then verify session ─────────────────────────
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, i) => {
      if (i > 0) timers.push(setTimeout(() => setStepIndex(i), i * 1300));
    });

    timers.push(
      setTimeout(async () => {
        try {
          // After OAuth the backend has already issued tokens (stored via redirect/deep-link).
          // Check if this owner has an existing business to decide where to send them.
          await businessService.getMyBusiness();
          router.replace('/(owner-tabs)/dashboard');
        } catch {
          // No business yet → send to onboarding
          router.replace('/(onboarding-tabs)/step-1' as never);
        }
      }, STEPS.length * 1300 + 400),
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  const spin = rotation.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView className="flex-1 bg-surface">

      {/* ── Brand ──────────────────────────────────────────────────────────── */}
      <View className="flex-1 items-center justify-center gap-4">
        <View
          style={{
            shadowColor:   colors.primaryContainer,
            shadowOffset:  { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius:  16,
            elevation:     8,
          }}
        >
          <Image source={LOGO} style={{ width: 80, height: 80, borderRadius: 20 }} resizeMode="contain" />
        </View>
        <Text style={{ fontFamily: 'Inter', fontSize: 26, fontWeight: '700', color: colors.primaryContainer }}>
          BillBuzz
        </Text>
      </View>

      {/* ── Spinner + status ───────────────────────────────────────────────── */}
      <View className="flex-1 items-center justify-center gap-8">

        {/* Ring loader */}
        <View style={{ width: 130, height: 130, alignItems: 'center', justifyContent: 'center' }}>

          {/* Static gray track */}
          <View style={{
            position: 'absolute',
            width: 130, height: 130, borderRadius: 65,
            borderWidth: 7,
            borderColor: '#e4e2e6',
          }} />

          {/* Rotating navy arc (3/4 filled, 1/4 transparent gap) */}
          <Animated.View style={{
            position: 'absolute',
            width: 130, height: 130, borderRadius: 65,
            borderWidth: 7,
            borderTopColor:    colors.primaryContainer,
            borderRightColor:  colors.primaryContainer,
            borderBottomColor: colors.primaryContainer,
            borderLeftColor:   'transparent',
            transform: [{ rotate: spin }],
          }} />

          {/* Center white disc with key icon */}
          <View style={{
            width: 88, height: 88, borderRadius: 44,
            backgroundColor: colors.white,
            alignItems: 'center', justifyContent: 'center',
            shadowColor:   '#000',
            shadowOffset:  { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius:  6,
            elevation: 2,
          }}>
            <MaterialIcons name="vpn-key" size={28} color={colors.primaryContainer} />
          </View>
        </View>

        {/* Step label */}
        <View className="items-center gap-3">
          <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '700', color: colors.primaryContainer }}>
            Signing you in...
          </Text>
          <View className="flex-row items-center gap-2">
            <Animated.View style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: colors.secondaryContainer,
              transform: [{ scale: dotScale }],
            }} />
            <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.onSurfaceVariant }}>
              {STEPS[stepIndex]}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Security badge ─────────────────────────────────────────────────── */}
      <View className="items-center pb-10 gap-3">
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingVertical: 10, paddingHorizontal: 20,
          borderRadius: 999, borderWidth: 1.5, borderColor: colors.gray,
          backgroundColor: colors.white,
        }}>
          <MaterialIcons name="verified-user" size={16} color={colors.onSurfaceVariant} />
          <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.onSurfaceVariant }}>
            Secure Enterprise Login
          </Text>
        </View>
        <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant }}>
          This may take a few seconds
        </Text>
      </View>

    </SafeAreaView>
  );
}

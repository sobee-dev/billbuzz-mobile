// app/forgot-password.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator, KeyboardAvoidingView, Platform,
    Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../services/auth';
import { colors } from '../styles/globals';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async () => {
    if (!isValidEmail) return;
    setSubmitting(true);
    try {
      await authService.requestPasswordReset(email.trim().toLowerCase());
    } catch {
      // Deliberately silent — the backend always returns 200 regardless
      // of whether the account exists, so a network-level failure is the
      // only thing that would land here, and showing the same neutral
      // message either way avoids leaking anything about the account.
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: colors.secondaryContainer,
            alignItems: 'center', justifyContent: 'center', marginBottom: 20,
          }}>
            <MaterialIcons name="mark-email-read" size={30} color={colors.onSecondaryContainer} />
          </View>
          <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '800', color: colors.onSurface, marginBottom: 8, textAlign: 'center' }}>
            Check your email
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20, marginBottom: 32 }}>
            If an account exists for {email.trim()}, we've sent a link to reset your password.
            The link expires in 30 minutes.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/login' as never)}
            activeOpacity={0.85}
            style={{
              height: 50, borderRadius: 14, backgroundColor: colors.primaryContainer,
              alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
            }}
          >
            <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.white }}>
              Back to Login
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: '800', color: colors.onSurface, marginBottom: 8 }}>
            Forgot your password?
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant, lineHeight: 20, marginBottom: 28 }}>
            Enter the email associated with your account and we'll send you a link to reset your password.
          </Text>

          <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.onSurfaceVariant, marginBottom: 8 }}>
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.gray}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            style={{
              height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: '#dee2e6',
              backgroundColor: colors.white, paddingHorizontal: 14,
              fontFamily: 'Inter', fontSize: 15, color: colors.onSurface, marginBottom: 24,
            }}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isValidEmail || submitting}
            activeOpacity={0.85}
            style={{
              height: 52, borderRadius: 14,
              backgroundColor: colors.primaryContainer,
              alignItems: 'center', justifyContent: 'center',
              opacity: !isValidEmail || submitting ? 0.6 : 1,
            }}
          >
            {submitting
              ? <ActivityIndicator color={colors.white} />
              : <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.white }}>
                  Send Reset Link
                </Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
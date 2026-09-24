import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../services/auth';
import { colors } from '../styles/globals';

export default function ReactivateAccountScreen() {
  const router = useRouter();
  const { email: emailParam, scheduledFor } = useLocalSearchParams<{ email?: string; scheduledFor?: string }>();

  const [email, setEmail] = useState(emailParam ?? '');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const formattedDate = scheduledFor
    ? new Date(scheduledFor).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const handleReactivate = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await authService.cancelAccountDeletion(email, password);
      router.replace('/(owner-tabs)' as never);
    } catch (err: any) {
      const apiError = err?.response?.data?.error ?? 'Could not reactivate this account.';
      Alert.alert('Error', apiError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>

      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: colors.white,
        borderBottomWidth: 1, borderBottomColor: '#e9ecef',
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f8',
            alignItems: 'center', justifyContent: 'center', marginRight: 12,
          }}
        >
          <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 17, fontWeight: '800', color: colors.onSurface }}>
          Reactivate Account
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

          <View style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 10,
            backgroundColor: colors.primaryContainer + '0d',
            borderRadius: 12, borderWidth: 1, borderColor: colors.primaryContainer + '25',
            paddingVertical: 14, paddingHorizontal: 14, marginBottom: 24,
          }}>
            <MaterialIcons name="info-outline" size={18} color={colors.primaryContainer} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 13, color: colors.primaryContainer, lineHeight: 19 }}>
              This account is scheduled for deletion{formattedDate ? ` on ${formattedDate}` : ''}.
              Confirm your password to cancel the deletion and sign back in.
            </Text>
          </View>

          <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.onSurface, marginBottom: 8 }}>
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@business.com"
            placeholderTextColor={colors.onSurfaceVariant}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{
              backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef',
              paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Inter', fontSize: 14,
              color: colors.onSurface, marginBottom: 20,
            }}
          />

          <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.onSurface, marginBottom: 8 }}>
            Password
          </Text>
          <TextInput
            value={password}
            onChangeText={t => setPassword(t.replace(/[^0-9]/g, ''))}
            placeholder="6-digit passcode"
            placeholderTextColor={colors.onSurfaceVariant}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
            style={{
              backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef',
              paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Inter', fontSize: 14,
              color: colors.onSurface, marginBottom: 28,
            }}
          />

          <TouchableOpacity
            onPress={handleReactivate}
            disabled={!email || !password || submitting}
            activeOpacity={0.85}
            style={{
              backgroundColor: colors.primaryContainer, borderRadius: 14, paddingVertical: 16,
              alignItems: 'center', opacity: !email || !password || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '800', color: colors.white }}>
                Reactivate My Account
              </Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
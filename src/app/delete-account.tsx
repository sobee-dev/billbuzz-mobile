import { clearTokens } from '@/lib/axios';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../services/auth';
import { colors } from '../styles/globals';

const CONFIRM_WORD = 'DELETE';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValidPassword = /^\d{6}$/.test(password);
const canSubmit = isValidPassword && confirmText.trim().toUpperCase() === CONFIRM_WORD;

  const handleDelete = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { deletionScheduledFor } = await authService.requestAccountDeletion(password, reason);
      await clearTokens();
      const formatted = new Date(deletionScheduledFor).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      Alert.alert(
        'Deletion Scheduled',
        `Your account will be permanently deleted on ${formatted}. You've been signed out of all devices. You can cancel this any time before then by trying to log back in.`,
        [{ text: 'OK', onPress: () => router.replace('/login' as never) }],
      );
    } catch (err: any) {
      const apiError =
        err?.response?.data?.password?.[0] ??
        err?.response?.data?.error ??
        'Could not schedule account deletion. Please try again.';
      Alert.alert('Error', apiError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>

      {/* ── Nav bar ── */}
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
          Delete Account
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        >

          {/* ── Warning banner ── */}
          <View style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 10,
            backgroundColor: colors.error + '0d',
            borderRadius: 12, borderWidth: 1, borderColor: colors.error + '30',
            paddingVertical: 14, paddingHorizontal: 14, marginBottom: 20,
          }}>
            <MaterialIcons name="warning-amber" size={20} color={colors.error} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.error, marginBottom: 4 }}>
                This can't be undone after 1 year
              </Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurface, lineHeight: 19 }}>
                You'll be signed out immediately on every device. Your account has a 1-year grace
                period during which you can cancel this by attempting to log back in. After that,
                your account and business details are permanently anonymized. Invoice records are
                retained as required for financial recordkeeping, but you'll no longer be able to
                access them.
              </Text>
            </View>
          </View>

          {/* ── Reason (optional) ── */}
          <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.onSurface, marginBottom: 8 }}>
            Why are you leaving? (optional)
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Tell us what went wrong…"
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            numberOfLines={4}
            style={{
              backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef',
              padding: 14, fontFamily: 'Inter', fontSize: 14, color: colors.onSurface,
              textAlignVertical: 'top', minHeight: 90, marginBottom: 20,
            }}
          />

          {/* ── Password ── */}
          <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.onSurface, marginBottom: 8 }}>
            Confirm your password
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
              color: colors.onSurface, marginBottom: 20,
            }}
          />

          {/* ── Type DELETE to confirm ── */}
          <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.onSurface, marginBottom: 8 }}>
            Type "{CONFIRM_WORD}" to confirm
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={CONFIRM_WORD}
            placeholderTextColor={colors.onSurfaceVariant}
            autoCapitalize="characters"
            style={{
              backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef',
              paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Inter', fontSize: 14,
              color: colors.onSurface, marginBottom: 28,
            }}
          />

          <TouchableOpacity
            onPress={handleDelete}
            disabled={!canSubmit || submitting}
            activeOpacity={0.85}
            style={{
              backgroundColor: colors.error, borderRadius: 14, paddingVertical: 16,
              alignItems: 'center', opacity: !canSubmit || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '800', color: colors.white }}>
                Permanently Delete My Account
              </Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
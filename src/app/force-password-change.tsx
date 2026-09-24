// app/force-password-change.tsx
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../services/auth';
import { colors } from '../styles/globals';

function FieldLabel({ text }: { text: string }) {
  return (
    <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.onSurfaceVariant, marginBottom: 8 }}>
      {text}
    </Text>
  );
}

export default function ForcePasswordChangeScreen() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in both password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords Don\u2019t Match', 'New password and confirmation must match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      // requireOldPassword=false path — backend allows this specifically
      // because requires_password_change=true on the account.
      await authService.changePassword(undefined, newPassword);
      await refreshUser(); // pulls the now-cleared requiresPasswordChange flag

      router.replace(
        user?.role === 'owner' ? '/(owner-tabs)/dashboard' : '/(staff-tabs)/dashboard'
      );
    } catch (err: any) {
      const message = err?.response?.data?.newPassword?.[0]
        ?? 'Could not update your password. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: '800', color: colors.onSurface, marginBottom: 8 }}>
            Set a new password
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant, lineHeight: 20, marginBottom: 32 }}>
            For security, you need to set your own password before continuing.
          </Text>

          <FieldLabel text="New Password" />
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="New password"
            placeholderTextColor={colors.gray}
            style={{
              height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: '#dee2e6',
              backgroundColor: colors.white, paddingHorizontal: 14,
              fontFamily: 'Inter', fontSize: 15, color: colors.onSurface, marginBottom: 20,
            }}
          />

          <FieldLabel text="Confirm New Password" />
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Re-enter new password"
            placeholderTextColor={colors.gray}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            style={{
              height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: '#dee2e6',
              backgroundColor: colors.white, paddingHorizontal: 14,
              fontFamily: 'Inter', fontSize: 15, color: colors.onSurface, marginBottom: 28,
            }}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={saving}
            activeOpacity={0.85}
            style={{
              height: 52, borderRadius: 14, backgroundColor: colors.primaryContainer,
              alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? <ActivityIndicator color={colors.white} />
              : <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.white }}>
                  Continue
                </Text>
            }
          </TouchableOpacity>

          {/* Escape hatch — someone who genuinely can't complete this shouldn't be
              permanently locked out of the app with no way back to login. */}
          <TouchableOpacity
            onPress={() => logout()}
            style={{ marginTop: 20, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant }}>
              Log out instead
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
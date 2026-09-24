// components/ChangePasswordModal.tsx
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator, Alert,
    Modal,
    Pressable, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../services/auth';
import { colors } from '../styles/globals';

function PasswordField({
  label, value, onChangeText, placeholder, autoFocus, returnKeyType, onSubmitEditing, editable,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  editable: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, color: colors.onSurfaceVariant, marginBottom: 8 }}>
        {label}
      </Text>
      <View style={{ position: 'relative', marginBottom: 16 }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.gray}
          secureTextEntry={!visible}
          editable={editable}
          autoFocus={autoFocus}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          style={{
            height: 52, borderRadius: 12, borderWidth: 1.5,
            borderColor: '#dee2e6', backgroundColor: colors.white,
            paddingHorizontal: 14, paddingRight: 44,
            fontFamily: 'Inter', fontSize: 15, color: colors.onSurface,
          }}
        />
        <TouchableOpacity
          onPress={() => setVisible(v => !v)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}
        >
          <MaterialIcons name={visible ? 'visibility-off' : 'visibility'} size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
    </>
  );
}

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /**
   * Set false only for the forced first-login flow, where the backend
   * doesn't require old_password (requires_password_change=true).
   * Both owner and staff settings pages should leave this true.
   */
  requireOldPassword?: boolean;
}

export function ChangePasswordModal({
  visible, onClose, onSuccess, requireOldPassword = true,
}: ChangePasswordModalProps) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if ((requireOldPassword && !oldPassword) || !newPassword || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords Don\u2019t Match', 'New password and confirmation must match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Password Too Short', 'New password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      await authService.changePassword(requireOldPassword ? oldPassword : undefined, newPassword);
      reset();
      onSuccess?.();
      onClose();
      Alert.alert('Password Updated', 'Your password has been changed successfully.');
    } catch (err: any) {
      const message = err?.response?.data?.oldPassword?.[0]
        ?? err?.response?.data?.newPassword?.[0]
        ?? 'Could not change password. Please check your current password and try again.';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
        onPress={handleClose}
      >
        <View style={{ marginBottom: keyboardHeight }}>
          <Pressable>
            <View style={{
              backgroundColor: colors.white,
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 32,
            }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#dde1e7', alignSelf: 'center', marginBottom: 20 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '800', color: colors.primaryContainer }}>
                  Change Password
                </Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f4', alignItems: 'center', justifyContent: 'center' }}
                >
                  <MaterialIcons name="close" size={16} color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              {requireOldPassword && (
                <PasswordField
                  label="Current Password"
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  placeholder="Current password"
                  autoFocus
                  returnKeyType="next"
                  editable={!saving}
                />
              )}

              <PasswordField
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
                autoFocus={!requireOldPassword}
                returnKeyType="next"
                editable={!saving}
              />

              <PasswordField
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                editable={!saving}
              />

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={saving}
                activeOpacity={0.85}
                style={{
                  height: 52, borderRadius: 14, backgroundColor: colors.primaryContainer,
                  alignItems: 'center', justifyContent: 'center',
                  opacity: saving ? 0.7 : 1,
                  marginTop: 4,
                }}
              >
                {saving
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: colors.white }}>
                      Update Password
                    </Text>
                }
              </TouchableOpacity>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
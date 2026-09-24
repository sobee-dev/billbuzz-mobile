import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert,
    ScrollView,
    Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../../services/auth';
import { staffService } from '../../services/staff';
import { colors } from '../../styles/globals';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  fullName:        string;
  email:           string;
  department:      string;   // '' when not set
  permissionLevel: string;   // 'managerial_access' | 'limited_access'
  initials:        string;
}

function initialsFrom(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function roleLabel(permissionLevel: string): string {
  if (permissionLevel === 'managerial_access') return 'Managerial Access';
  if (permissionLevel === 'limited_access') return 'Limited Access';
  return 'Staff';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Text style={{
      fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.8,
      color: colors.onSurfaceVariant,
      marginBottom: 8, marginTop: 24,
    }}>
      {label}
    </Text>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: colors.white,
      borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
      overflow: 'hidden',
    }}>
      {children}
    </View>
  );
}


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

function NavRow({
  icon, label, sub, onPress, last = false, iconBg,
}: {
  icon:    React.ComponentProps<typeof MaterialIcons>['name'];
  label:   string;
  sub?:    string;
  onPress: () => void;
  last?:   boolean;
  iconBg?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 15, paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: '#e9ecef',
      }}
    >
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: iconBg ?? colors.primaryContainer + '15',
        alignItems: 'center', justifyContent: 'center', marginRight: 14,
      }}>
        <MaterialIcons name={icon} size={20} color={iconBg ? colors.white : colors.primaryContainer} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.onSurface }}>
          {label}
        </Text>
        {sub ? (
          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 1 }}>{sub}</Text>
        ) : null}
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StaffProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Change password modal
  const [pwModalVisible, setPwModalVisible] = useState(false);
  const [oldPassword,    setOldPassword]    = useState('');
  const [newPassword,    setNewPassword]    = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const keyboardHeight = useKeyboardHeight();

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [user, dashboard] = await Promise.all([
        authService.me(),
        staffService.getMyDashboard(),
      ]);

      const fullName = user?.fullName
        || [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
        || user?.email
        || '';
      const email = user?.email ?? '';
      const staffInfo = dashboard?.staffInfo;

      setProfile({
        fullName,
        email,
        department: staffInfo?.department ?? '',
        permissionLevel: staffInfo?.permissionLevel ?? '',
        initials: initialsFrom(fullName, email),
      });
    } catch {
      setLoadError(true);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  // ── Change password ──────────────────────────────────────────────────────────
  const openPasswordModal = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPwModalVisible(true);
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all password fields.'); return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords Don\u2019t Match', 'New password and confirmation must match.'); return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Password Too Short', 'New password must be at least 6 characters.'); return;
    }

    setSavingPassword(true);
    try {
      await authService.changePassword(oldPassword, newPassword);
      setPwModalVisible(false);
      Alert.alert('Password Updated', 'Your password has been changed successfully.');
    } catch (err: any) {
      const message = err?.response?.data?.oldPassword?.[0]
        ?? err?.response?.data?.newPassword?.[0]
        ?? 'Could not change password. Please check your current password and try again.';
      Alert.alert('Error', message);
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          try { await authService.logout(); } catch { /* ignore */ }
          router.replace('/login' as never);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primaryContainer} />
      </SafeAreaView>
    );
  }

  if (loadError || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <MaterialIcons name="error-outline" size={32} color={colors.onSurfaceVariant} style={{ marginBottom: 12 }} />
        <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 16 }}>
          Could not load your profile.
        </Text>
        <TouchableOpacity
          onPress={loadProfile}
          activeOpacity={0.8}
          style={{ backgroundColor: colors.primaryContainer, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20 }}
        >
          <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.white }}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>

      {/* Nav */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: colors.white,
        borderBottomWidth: 1, borderBottomColor: '#e9ecef',
      }}>
        <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 18, fontWeight: '800', color: colors.primaryContainer }}>
          My Profile
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>

        {/* Profile card */}
        <View style={{
          backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
          padding: 20, marginTop: 20, marginBottom: 4,
          alignItems: 'center',
          shadowColor: '#1b2e5e', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
        }}>
          <View style={{
            width: 80, height: 80, borderRadius: 22,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center', justifyContent: 'center', marginBottom: 14,
            shadowColor: colors.primaryContainer,
            shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
          }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 26, fontWeight: '800', color: colors.white }}>
              {profile.initials || '??'}
            </Text>
          </View>
          <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '800', color: colors.onSurface, marginBottom: 4, textAlign: 'center' }}>
            {profile.fullName || 'Staff Member'}
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant, marginBottom: 10, textAlign: 'center' }}>
            {profile.email}
          </Text>
          {profile.department ? (
            <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 10, textAlign: 'center' }}>
              {profile.department}
            </Text>
          ) : null}
          <View style={{
            backgroundColor: colors.secondaryContainer, borderRadius: 999,
            paddingVertical: 4, paddingHorizontal: 14,
          }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.onSecondaryContainer }}>
              {roleLabel(profile.permissionLevel)}
            </Text>
          </View>
        </View>

        {/* Account */}
        <SectionLabel label="Account" />
        <SettingsCard>
          <NavRow
            icon="lock-reset"
            label="Change Password"
            sub="Update your account password"
            onPress={() => setPwModalVisible(true)}
            last
          />
        </SettingsCard>

        {/* Logout */}
        <SectionLabel label="Session" />

        <SettingsCard>
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.75}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16 }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: colors.errorContainer,
              alignItems: 'center', justifyContent: 'center', marginRight: 14,
            }}>
              <MaterialIcons name="logout" size={20} color={colors.error} />
            </View>
            <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.error, flex: 1 }}>
              Log Out
            </Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.error} />
          </TouchableOpacity>
        </SettingsCard>

        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
            BillBuzz v2.4.1
          </Text>
        </View>
      </ScrollView>

      {/* ── Change Password Modal ── */}
      <ChangePasswordModal 
        visible={pwModalVisible} 
        onClose={() => setPwModalVisible(false)} 
      />

    </SafeAreaView>
  );
}
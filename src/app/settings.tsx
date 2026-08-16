
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView, Switch, Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../services/auth';

import { useAuth } from '@/context/AuthContext';
import { colors } from '../styles/globals';

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

function NavRow({
  icon, label, sub, onPress, last = false, badge,
}: {
  icon:    React.ComponentProps<typeof MaterialIcons>['name'];
  label:   string;
  sub?:    string;
  onPress: () => void;
  last?:   boolean;
  badge?:  string;
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
        backgroundColor: colors.primaryContainer + '15',
        alignItems: 'center', justifyContent: 'center', marginRight: 14,
      }}>
        <MaterialIcons name={icon} size={20} color={colors.primaryContainer} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.onSurface }}>
          {label}
        </Text>
        {sub ? (
          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 1 }}>
            {sub}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View style={{
          backgroundColor: colors.statusPaidBg, borderRadius: 999,
          paddingVertical: 2, paddingHorizontal: 8, marginRight: 6,
        }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: colors.statusPaidFg }}>
            {badge}
          </Text>
        </View>
      ) : null}
      <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}

function ToggleRow({
  icon, label, sub, value, onChange, last = false,
}: {
  icon:     React.ComponentProps<typeof MaterialIcons>['name'];
  label:    string;
  sub?:     string;
  value:    boolean;
  onChange: (v: boolean) => void;
  last?:    boolean;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 15, paddingHorizontal: 16,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: '#e9ecef',
    }}>
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: colors.primaryContainer + '15',
        alignItems: 'center', justifyContent: 'center', marginRight: 14,
      }}>
        <MaterialIcons name={icon} size={20} color={colors.primaryContainer} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.onSurface }}>
          {label}
        </Text>
        {sub ? (
          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 1 }}>{sub}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        thumbColor={colors.white}
        trackColor={{ false: '#c5c6d0', true: colors.primaryContainer }}
        ios_backgroundColor="#c5c6d0"
      />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushNotifs,  setPushNotifs]  = useState(false);

  // Safe fallback data if context user is loading or empty
  const displayName = user?.fullName || 'User';
  const displayEmail = user?.email || 'No email available';
  const displayRole = user?.role || 'Staff';
  
  // Compute initials dynamically
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleNotificationToggle = async (
    key: 'email' | 'push',
    value: boolean,
  ) => {
    const next = { email: emailAlerts, push: pushNotifs, [key]: value };
    if (key === 'email') setEmailAlerts(value);
    else setPushNotifs(value);
    try {
      await authService.updateNotifications(next.email, next.push);
    } catch {
      if (key === 'email') setEmailAlerts(!value);
      else setPushNotifs(!value);
      Alert.alert('Error', 'Could not update notification preferences.');
    }
  };

  useEffect(() => {
    
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>

      {/* Nav bar */}
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
        <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 18, fontWeight: '800', color: colors.primaryContainer }}>
          BillBuzz
        </Text>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
          <MaterialIcons name="search" size={22} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {/* Profile card */}
        <View style={{
          backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
          flexDirection: 'row', alignItems: 'center',
          padding: 16, gap: 14, marginTop: 20, marginBottom: 4,
          shadowColor: '#1b2e5e', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
        }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '800', color: colors.white }}>
              {initials}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '800', color: colors.onSurface, marginBottom: 2 }}>
              {displayName}
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant, marginBottom: 6 }}>
              {displayEmail}
            </Text>
            <View style={{
              alignSelf: 'flex-start',
              backgroundColor: colors.secondaryContainer,
              borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10,
            }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 10, fontWeight: '800',
                textTransform: 'uppercase', letterSpacing: 0.6,
                color: colors.onSecondaryContainer,
              }}>
                {displayRole}
              </Text>
            </View>
          </View>
          {/* <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => Alert.alert('Edit Profile', 'Profile editing coming soon.')}
          >
            <MaterialIcons name="edit" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity> */}
        </View>

        {/* Business Settings */}
        <SectionLabel label="Business Settings" />
        <SettingsCard>
          <NavRow
            icon="business"
            label="Business Settings"
            sub="Profile, tax, currency & templates"
            onPress={() => router.push('/business-settings' as never)}
            last
          />
        </SettingsCard>

        {/* Notifications */}
        <SectionLabel label="Notifications" />
        <SettingsCard>
          <ToggleRow
            icon="email"
            label="Email Alerts"
            sub="Invoices, payments & reminders"
            value={emailAlerts}
            onChange={(v) => handleNotificationToggle('email', v)}
          />
          <ToggleRow
            icon="notifications"
            label="Push Notifications"
            sub="Real-time activity alerts"
            value={pushNotifs}
            onChange={(v) => handleNotificationToggle('push', v)}
            last
          />
        </SettingsCard>

        {/* Account Security */}
        <SectionLabel label="Account Security" />
        <SettingsCard>
          <NavRow
            icon="lock-outline"
            label="Change Password"
            onPress={() => Alert.alert('Change Password', 'A password reset link will be sent to your email.')}
          />
          
          <NavRow
            icon="help-outline"
            label="Help & Support"
            onPress={() => Alert.alert('Help & Support', 'Visit billbuzz.io/help for documentation and support.')}
          />
          
          {/* Logout */}
          <TouchableOpacity
            onPress={() => {
              
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
            }}
            activeOpacity={0.75}
            style={{
              flexDirection: 'row', alignItems: 'center',
              paddingVertical: 15, paddingHorizontal: 16,
              borderTopWidth: 1, borderTopColor: '#e9ecef',
            }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: colors.errorContainer,
              alignItems: 'center', justifyContent: 'center', marginRight: 14,
            }}>
              <MaterialIcons name="logout" size={20} color={colors.error} />
            </View>
            <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.error }}>
              Logout
            </Text>
          </TouchableOpacity>
        </SettingsCard>

        {/* Footer */}
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
            BillBuzz v2.4.1 (Stable Build)
          </Text>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}
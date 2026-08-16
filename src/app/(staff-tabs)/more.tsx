// import AsyncStorage from '@react-native-async-storage/async-storage'; // UNCOMMENT FOR STORAGE
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Alert, Animated, Modal, Pressable, ScrollView,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { /* STAFF_SESSION_KEY, */ StaffSession } from '../login'; // STAFF_SESSION_KEY — UNCOMMENT FOR STORAGE
import { colors } from '../../styles/globals';
import { authService } from '../../services/auth';

// SIMULATION mock — replace with AsyncStorage read when storage is enabled
const MOCK_SESSION: StaffSession = {
  name:        'Marcus Thorne',
  email:       'm.thorne@billbuzz.com',
  role:        'Sales Manager',
  initials:    'MT',
  avatarColor: '#1b2e5e',
  passcode:    '1234',
};

const PASSCODE_LEN = 4;
const NUMPAD_KEYS  = ['1','2','3','4','5','6','7','8','9','','0','del'];

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

function NumKey({ value, onPress, onDelete }: { value: string; onPress: (d: string) => void; onDelete: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
    if (value === 'del') onDelete(); else onPress(value);
  };
  if (value === '') return <View style={{ width: 60, height: 60 }} />;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={press}
        style={{
          width: 60, height: 60, borderRadius: 30,
          borderWidth: value === 'del' ? 0 : 1.5, borderColor: colors.gray,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: value === 'del' ? 'transparent' : colors.white,
        }}
      >
        {value === 'del'
          ? <MaterialCommunityIcons name="backspace-outline" size={18} color={colors.onSurfaceVariant} />
          : <Text style={{ fontSize: 18, fontWeight: '500', color: colors.onSurface, fontFamily: 'Inter' }}>{value}</Text>
        }
      </Pressable>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StaffProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [session, setSession] = useState<StaffSession | null>(null);

  // Edit name modal
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [editName,         setEditName]         = useState('');

  // Change passcode modal
  const [pcModalVisible, setPcModalVisible] = useState(false);
  const [pcPhase,        setPcPhase]        = useState<'verify' | 'new' | 'confirm'>('verify');
  const [pcInput,        setPcInput]        = useState('');
  const [pcFirst,        setPcFirst]        = useState('');
  const [pcError,        setPcError]        = useState(false);

  const shakeX = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      /* UNCOMMENT FOR STORAGE — loads the staff session saved at first login:
      AsyncStorage.getItem(STAFF_SESSION_KEY)
        .then(v => { if (v) setSession(JSON.parse(v) as StaffSession); })
        .catch(() => {});
      */
      // Start with mock, then enrich from API
      setSession(MOCK_SESSION);
      authService.me()
        .then(user => {
          if (!user) return;
          setSession(prev => {
            if (!prev) return prev;          // keep null if session hasn't loaded yet
            return {
              ...prev,
              name:  user.name  ?? prev.name,
              email: user.email ?? prev.email,
              role:  user.role  ?? prev.role,
            };
          });
        })
        .catch(() => {});
    }, []),
  );

  const shake = () =>
    Animated.sequence([
      Animated.timing(shakeX, { toValue:  8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  0, duration: 50, useNativeDriver: true }),
    ]).start();

  // ── Save name ──────────────────────────────────────────────────────────────
  const handleSaveName = async () => {
    if (!editName.trim()) return;
    if (!session) return;
    const parts = editName.trim().split(/\s+/);
    const initials = parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : editName.slice(0, 2).toUpperCase();
    const updated: StaffSession = { ...session, name: editName.trim(), initials };
    // await AsyncStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(updated)); // UNCOMMENT FOR STORAGE
    setSession(updated);
    setNameModalVisible(false);
  };

  // ── Passcode change digit ──────────────────────────────────────────────────
  const handlePcDigit = (digit: string) => {
    if (pcInput.length >= PASSCODE_LEN) return;
    const next = pcInput + digit;
    setPcInput(next);
    setPcError(false);

    if (next.length === PASSCODE_LEN) {
      setTimeout(async () => {
        if (pcPhase === 'verify') {
          if (next === session?.passcode) {
            setPcPhase('new');
            setPcInput('');
          } else {
            setPcError(true); shake();
            setTimeout(() => { setPcInput(''); setPcError(false); }, 700);
          }
        } else if (pcPhase === 'new') {
          setPcFirst(next);
          setPcPhase('confirm');
          setPcInput('');
        } else {
          if (next === pcFirst) {
            const updated: StaffSession = { ...session!, passcode: next };
            // await AsyncStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(updated)); // UNCOMMENT FOR STORAGE
            setSession(updated);
            setPcModalVisible(false);
            Alert.alert('Passcode Updated', 'Your passcode has been changed successfully.');
          } else {
            setPcError(true); shake();
            setTimeout(() => {
              setPcInput('');
              setPcPhase('new');
              setPcFirst('');
              setPcError(false);
            }, 800);
          }
        }
      }, 200);
    }
  };

  const handlePcDelete = () => { setPcInput(p => p.slice(0, -1)); setPcError(false); };

  const openPcModal = () => {
    setPcPhase('verify');
    setPcInput('');
    setPcFirst('');
    setPcError(false);
    setPcModalVisible(true);
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          // await AsyncStorage.removeItem(STAFF_SESSION_KEY); // UNCOMMENT FOR STORAGE
          try { await authService.logout(); } catch { /* ignore */ }
          router.replace('/login' as never);
        },
      },
    ]);
  };

  const pcTitle = pcPhase === 'verify' ? 'Enter Current Passcode'
    : pcPhase === 'new'    ? 'Enter New Passcode'
    : 'Confirm New Passcode';

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
            backgroundColor: session?.avatarColor ?? colors.primaryContainer,
            alignItems: 'center', justifyContent: 'center', marginBottom: 14,
            shadowColor: session?.avatarColor ?? colors.primaryContainer,
            shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
          }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 26, fontWeight: '800', color: colors.white }}>
              {session?.initials ?? '??'}
            </Text>
          </View>
          <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '800', color: colors.onSurface, marginBottom: 4, textAlign: 'center' }}>
            {session?.name ?? 'Staff Member'}
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant, marginBottom: 10, textAlign: 'center' }}>
            {session?.email ?? ''}
          </Text>
          <View style={{
            backgroundColor: colors.secondaryContainer, borderRadius: 999,
            paddingVertical: 4, paddingHorizontal: 14,
          }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.onSecondaryContainer }}>
              {session?.role ?? 'Staff'}
            </Text>
          </View>
        </View>

        {/* Account */}
        <SectionLabel label="Account" />
        <SettingsCard>
          <NavRow
            icon="person-outline"
            label="Edit Display Name"
            sub={session?.name}
            onPress={() => { setEditName(session?.name ?? ''); setNameModalVisible(true); }}
          />
          <NavRow
            icon="lock-reset"
            label="Change Password"
            sub="Update your account password"
            onPress={() => Alert.alert('Change Password', 'A password reset link will be sent to your email.')}
            last
          />
        </SettingsCard>

        {/* Security */}
        <SectionLabel label="Security" />
        <SettingsCard>
          <NavRow
            icon="pin"
            label="Change Passcode"
            sub="Update your 4-digit quick-login passcode"
            onPress={openPcModal}
            last
          />
        </SettingsCard>

        {/* Support */}
        <SectionLabel label="Support" />
        <SettingsCard>
          <NavRow
            icon="help-outline"
            label="Help & Support"
            sub="Documentation and contact"
            onPress={() => Alert.alert('Help & Support', 'Visit billbuzz.io/help for documentation and support.')}
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

      {/* ── Edit Name Modal ── */}
      <Modal visible={nameModalVisible} transparent animationType="slide" onRequestClose={() => setNameModalVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setNameModalVisible(false)}
        >
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
                  Edit Display Name
                </Text>
                <TouchableOpacity
                  onPress={() => setNameModalVisible(false)}
                  style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f4', alignItems: 'center', justifyContent: 'center' }}
                >
                  <MaterialIcons name="close" size={16} color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, color: colors.onSurfaceVariant, marginBottom: 8 }}>
                Full Name
              </Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Your full name"
                placeholderTextColor={colors.gray}
                style={{
                  height: 52, borderRadius: 12, borderWidth: 1.5,
                  borderColor: '#dee2e6', backgroundColor: colors.white,
                  paddingHorizontal: 14, fontFamily: 'Inter', fontSize: 15,
                  color: colors.onSurface, marginBottom: 8,
                }}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 20 }}>
                Note: your email address cannot be changed here.
              </Text>

              <TouchableOpacity
                onPress={handleSaveName}
                activeOpacity={0.85}
                style={{
                  height: 52, borderRadius: 14, backgroundColor: colors.primaryContainer,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: colors.white }}>
                  Save Name
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Change Passcode Modal ── */}
      <Modal visible={pcModalVisible} transparent animationType="slide" onRequestClose={() => setPcModalVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setPcModalVisible(false)}
        >
          <Pressable>
            <View style={{
              backgroundColor: colors.white,
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              paddingTop: 8,
              paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 32,
            }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#dde1e7', alignSelf: 'center', marginBottom: 20 }} />

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 8 }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '800', color: colors.primaryContainer }}>
                  Change Passcode
                </Text>
                <TouchableOpacity
                  onPress={() => setPcModalVisible(false)}
                  style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f4', alignItems: 'center', justifyContent: 'center' }}
                >
                  <MaterialIcons name="close" size={16} color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              {/* Step dots */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
                {(['verify', 'new', 'confirm'] as const).map((phase, i) => (
                  <View key={phase} style={{
                    width: pcPhase === phase ? 20 : 8, height: 8, borderRadius: 4,
                    backgroundColor: (['verify', 'new', 'confirm'] as const).indexOf(pcPhase) >= i
                      ? colors.primaryContainer : colors.gray,
                  }} />
                ))}
              </View>

              <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 24 }}>
                {pcTitle}
              </Text>

              {/* Passcode dots */}
              <Animated.View style={{ transform: [{ translateX: shakeX }], flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 8 }}>
                {Array.from({ length: PASSCODE_LEN }).map((_, i) => (
                  <View key={i} style={{
                    width: 16, height: 16, borderRadius: 8, borderWidth: 2,
                    borderColor: pcError ? colors.error : i < pcInput.length ? colors.primaryContainer : colors.gray,
                    backgroundColor: i < pcInput.length ? (pcError ? colors.error : colors.primaryContainer) : 'transparent',
                  }} />
                ))}
              </Animated.View>

              {pcError && (
                <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.error, textAlign: 'center', marginBottom: 4 }}>
                  {pcPhase === 'verify' ? 'Incorrect current passcode.' : "Passcodes don't match."}
                </Text>
              )}

              <View style={{ height: 20 }} />

              {/* Numpad */}
              <View style={{ alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, maxWidth: 240 }}>
                  {NUMPAD_KEYS.map((key, i) => (
                    <NumKey key={i} value={key} onPress={handlePcDigit} onDelete={handlePcDelete} />
                  ))}
                </View>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

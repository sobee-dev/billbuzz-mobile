import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PermissionLevel, StaffMemberDetail, staffService } from '../services/staff';
import { colors } from '../styles/globals';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCESS_CONFIG: Record<PermissionLevel, {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string; description: string;
}> = {
  managerial_access: {
    icon: 'admin-panel-settings',
    title: 'Managerial Access',
    description: 'View reports, manage inventory & customers, broader visibility.',
  },
  limited_access: {
    icon: 'person-outline',
    title: 'Limited Access',
    description: 'Create and view own invoices only.',
  },
};

const AVATAR_COLORS = ['#1b2e5e', '#c47f17', '#2e7d32', '#0277bd', '#c62828', '#6a1b9a'];

function avatarColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(firstName: string, lastName: string): string {
  const f = firstName.trim();
  const l = lastName.trim();
  if (!f && !l) return '?';
  if (!l) return f.slice(0, 2).toUpperCase();
  return (f[0] + l[0]).toUpperCase();
}

// ─── Module-level sub-components ─────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <Text style={{
      fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.8,
      color: colors.onSurfaceVariant, marginBottom: 12,
    }}>
      {text}
    </Text>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <Text style={{
      fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.7,
      color: colors.onSurfaceVariant, marginBottom: 6,
    }}>
      {text}
    </Text>
  );
}

function StyledInput({
  value, onChangeText, placeholder, keyboardType, autoCapitalize, editable = true,
}: {
  value:            string;
  onChangeText:     (t: string) => void;
  placeholder?:     string;
  keyboardType?:    React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?:  React.ComponentProps<typeof TextInput>['autoCapitalize'];
  editable?:        boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.onSurfaceVariant + '88'}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize ?? 'sentences'}
      editable={editable}
      style={{
        height: 52,
        borderRadius: 12, borderWidth: 1, borderColor: '#dee2e6',
        backgroundColor: editable ? colors.white : '#f5f5f8',
        paddingHorizontal: 14,
        fontFamily: 'Inter', fontSize: 14,
        color: editable ? colors.onSurface : colors.onSurfaceVariant,
      }}
    />
  );
}

function RadioOption({
  accessKey, selected, onSelect,
}: {
  accessKey: PermissionLevel;
  selected:  boolean;
  onSelect:  () => void;
}) {
  const cfg = ACCESS_CONFIG[accessKey];
  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: selected ? colors.primaryContainer + '08' : colors.surface,
        borderRadius: 14, borderWidth: 1.5,
        borderColor: selected ? colors.primaryContainer + '40' : '#e9ecef',
        padding: 14, gap: 12,
      }}
    >
      <View style={{
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: selected ? colors.primaryContainer : '#9ca3af30',
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <MaterialIcons
          name={cfg.icon}
          size={22}
          color={selected ? colors.white : '#9ca3af'}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: 'Inter', fontSize: 15, fontWeight: '700',
          color: colors.onSurface, marginBottom: 2,
        }}>
          {cfg.title}
        </Text>
        <Text style={{
          fontFamily: 'Inter', fontSize: 12,
          color: colors.onSurfaceVariant, lineHeight: 17,
        }}>
          {cfg.description}
        </Text>
      </View>

      <View style={{
        width: 22, height: 22, borderRadius: 11,
        borderWidth: 2,
        borderColor: selected ? colors.primaryContainer : '#c5c6d0',
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {selected && (
          <View style={{
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: colors.primaryContainer,
          }} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NewStaffScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { id }  = useLocalSearchParams<{ id?: string }>();
  const isEdit  = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving,  setSaving]  = useState(false);
  const [existing, setExisting] = useState<StaffMemberDetail | null>(null);

  // ── Form state ──
  const [firstName,      setFirstName]      = useState('');
  const [lastName,       setLastName]       = useState('');
  const [email,          setEmail]          = useState('');
  const [department,     setDepartment]     = useState('');
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('limited_access');
  const [isActive,       setIsActive]       = useState(true);

  const [menuVisible, setMenuVisible] = useState(false);

  // ── Post-create result screen ──
  const [createResult, setCreateResult] = useState<{ emailSent: boolean; tempPassword?: string } | null>(null);
  const [showTempPassword, setShowTempPassword] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    staffService.get(id)
      .then(data => {
        setExisting(data);
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setEmail(data.email);
        setDepartment(data.department);
        setPermissionLevel(data.permissionLevel);
        setIsActive(data.status === 'active');
      })
      .catch(() => Alert.alert('Error', 'Could not load this staff member.'))
      .finally(() => setLoading(false));
  }, [id]);

  const displayName  = isEdit
    ? (existing ? `${existing.firstName} ${existing.lastName}`.trim() : '…')
    : (firstName.trim() || lastName.trim() ? `${firstName} ${lastName}`.trim() : 'New Team Member');
  const displaySub    = department.trim() || 'Staff Member';
  const avatarBg       = avatarColorFor(id ?? email ?? 'new');
  const statusLabel    = isActive ? 'Active' : 'Inactive';
  const statusChipBg   = isActive ? '#e6f4ea' : '#f0f0f4';
  const statusChipFg   = isActive ? '#1e7e34' : '#45464f';

  const handleSave = async () => {
    if (isEdit && existing) {
      setSaving(true);
      try {
        // Owner-editable fields: department + permissionLevel.
        const detailChanged = department !== existing.department || permissionLevel !== existing.permissionLevel;
        if (detailChanged) {
          await staffService.updateStaffMember(existing.id, { department: department.trim(), permissionLevel });
        }
        // Status is a separate action, not part of the PATCH payload.
        const wasActive = existing.status === 'active';
        if (isActive !== wasActive) {
          if (isActive) await staffService.activate(existing.id);
          else await staffService.deactivate(existing.id);
        }
        Alert.alert('Staff Updated', `${displayName} has been updated successfully.`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch {
        Alert.alert('Error', 'Could not update staff member.');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing Info', 'First and last name are required.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Missing Info', 'Email address is required.');
      return;
    }

    setSaving(true);
    try {
      const res = await staffService.createStaff({
        firstName:       firstName.trim(),
        lastName:        lastName.trim(),
        email:           email.trim(),
        department:      department.trim(),
        permissionLevel,
      });
      setCreateResult({ emailSent: res.emailSent, tempPassword: res.tempPassword });
    } catch (err: any) {
      const msg = err?.response?.data?.email?.[0]
        ?? err?.response?.data?.detail
        ?? 'Could not create staff account. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primaryContainer} />
      </SafeAreaView>
    );
  }

  // ── Post-create result screen ──
  if (createResult) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }} edges={['top', 'bottom']}>
        <View style={{
          width: 96, height: 96, borderRadius: 48,
          backgroundColor: createResult.emailSent ? colors.statusPaidBg : colors.errorContainer,
          alignItems: 'center', justifyContent: 'center', marginBottom: 24,
        }}>
          <MaterialIcons
            name={createResult.emailSent ? 'mark-email-read' : 'error-outline'}
            size={48}
            color={createResult.emailSent ? colors.statusPaidFg : colors.error}
          />
        </View>

        {createResult.emailSent ? (
          <>
            <Text style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: '800', color: colors.onSurface, textAlign: 'center', marginBottom: 12 }}>
              Mail Sent!
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22, marginBottom: 8 }}>
              An invitation with their temporary password has been sent to
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.primaryContainer, textAlign: 'center', marginBottom: 32 }}>
              {email}
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: '800', color: colors.onSurface, textAlign: 'center', marginBottom: 12 }}>
              Account Created
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22, marginBottom: 20 }}>
              The onboarding email failed to send. Share this temporary password with{'\n'}{email} directly.
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              height: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.error + '60',
              backgroundColor: colors.errorContainer, paddingHorizontal: 14, gap: 10, marginBottom: 32,
            }}>
              <MaterialIcons name="key" size={18} color={colors.error} />
              <Text style={{
                flex: 1, fontFamily: 'Inter', fontSize: 16, fontWeight: '700',
                color: colors.onSurface, letterSpacing: showTempPassword ? 3 : 2,
              }}>
                {showTempPassword ? createResult.tempPassword : '••••••'}
              </Text>
              <TouchableOpacity onPress={() => setShowTempPassword(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name={showTempPassword ? 'visibility-off' : 'visibility'} size={18} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </>
        )}

        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            height: 52, borderRadius: 16, backgroundColor: colors.primaryContainer,
            alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40,
          }}
        >
          <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: colors.white }}>
            Done
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >

        {/* ── Nav bar ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 13,
          backgroundColor: colors.white,
          borderBottomWidth: 1, borderBottomColor: '#e9ecef',
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f8',
              alignItems: 'center', justifyContent: 'center', marginRight: 10,
            }}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={{
            flex: 1, fontFamily: 'Inter', fontSize: 18, fontWeight: '800',
            color: colors.primaryContainer,
          }}>
            {isEdit ? 'Edit Staff' : 'Add Staff'}
          </Text>
          {isEdit && (
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ padding: 4 }}
            >
              <MaterialIcons name="more-vert" size={22} color={colors.onSurface} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Scrollable form ── */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
        >

          {/* ── Avatar + name hero ── */}
          <View style={{ alignItems: 'center', paddingTop: 28, paddingBottom: 24 }}>
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: avatarBg,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 3, borderColor: colors.white,
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
              marginBottom: 14,
            }}>
              {(firstName.trim() || lastName.trim()) ? (
                <Text style={{ fontFamily: 'Inter', fontSize: 34, fontWeight: '800', color: colors.white }}>
                  {initials(firstName, lastName)}
                </Text>
              ) : (
                <MaterialIcons name="person" size={44} color="rgba(255,255,255,0.7)" />
              )}
            </View>

            <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '800', color: colors.onSurface, marginBottom: 4 }}>
              {displayName}
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant }}>
              {displaySub}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 16 }}>

            {/* ── Contact Details card ── */}
            <View style={{
              backgroundColor: colors.white, borderRadius: 16,
              borderWidth: 1, borderColor: '#e9ecef',
              padding: 16, marginBottom: 14,
            }}>
              <SectionLabel text="Contact Details" />

              {isEdit ? (
                <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 14, lineHeight: 17 }}>
                  Name and email can't be changed after account creation.
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <FieldLabel text="First Name" />
                  <StyledInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Marcus"
                    editable={!isEdit}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FieldLabel text="Last Name" />
                  <StyledInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Thorne"
                    editable={!isEdit}
                  />
                </View>
              </View>

              <FieldLabel text="Email Address" />
              <StyledInput
                value={email}
                onChangeText={setEmail}
                placeholder="m.thorne@billbuzz.com"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isEdit}
              />

              {!isEdit && (
                <Text style={{ fontFamily: 'Inter', fontSize: 11, color: colors.onSurfaceVariant, marginTop: 10, lineHeight: 16 }}>
                  A temporary password is generated automatically and emailed to the staff member on creation.
                </Text>
              )}
            </View>

            {/* ── Department ── */}
            <View style={{
              backgroundColor: colors.white, borderRadius: 16,
              borderWidth: 1, borderColor: '#e9ecef',
              padding: 16, marginBottom: 14,
            }}>
              <FieldLabel text="Department" />
              <StyledInput
                value={department}
                onChangeText={setDepartment}
                placeholder="Sales, Support, Operations…"
              />
            </View>

            {/* ── Status (edit mode only — nothing to toggle before the account exists) ── */}
            {isEdit && (
              <View style={{
                backgroundColor: colors.white, borderRadius: 16,
                borderWidth: 1, borderColor: '#e9ecef', padding: 16, marginBottom: 14,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Text style={{
                    fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: 0.7,
                    color: colors.onSurfaceVariant,
                  }}>
                    STATUS
                  </Text>
                  <View style={{ backgroundColor: statusChipBg, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
                    <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: statusChipFg }}>
                      {statusLabel.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Switch
                    value={isActive}
                    onValueChange={setIsActive}
                    thumbColor={colors.white}
                    trackColor={{ false: '#c5c6d0', true: colors.primaryContainer }}
                    ios_backgroundColor="#c5c6d0"
                  />
                  <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.onSurface }}>
                    {statusLabel}
                  </Text>
                </View>
              </View>
            )}

            {/* ── Permission level ── */}
            <View style={{
              backgroundColor: colors.white, borderRadius: 16,
              borderWidth: 1, borderColor: '#e9ecef',
              padding: 16, marginBottom: 8,
            }}>
              <SectionLabel text="Access Level" />
              <View style={{ gap: 10 }}>
                <RadioOption
                  accessKey="managerial_access"
                  selected={permissionLevel === 'managerial_access'}
                  onSelect={() => setPermissionLevel('managerial_access')}
                />
                <RadioOption
                  accessKey="limited_access"
                  selected={permissionLevel === 'limited_access'}
                  onSelect={() => setPermissionLevel('limited_access')}
                />
              </View>
            </View>

          </View>
        </ScrollView>

        {/* ── Fixed footer ── */}
        <View style={{
          paddingHorizontal: 16, paddingTop: 14,
          paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 20,
          backgroundColor: colors.white,
          borderTopWidth: 1, borderTopColor: '#e9ecef',
        }}>
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
            style={{
              height: 56, borderRadius: 16,
              backgroundColor: colors.primaryContainer,
              flexDirection: 'row', alignItems: 'center',
              justifyContent: 'center', gap: 10,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <>
                <ActivityIndicator size="small" color={colors.white} />
                <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: colors.white }}>
                  {isEdit ? 'Saving…' : 'Creating…'}
                </Text>
              </>
            ) : (
              <>
                <MaterialIcons name={isEdit ? 'save' : 'send'} size={20} color={colors.white} />
                <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: colors.white }}>
                  {isEdit ? 'Save Changes' : 'Create Staff Account'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* ── Three-dot action sheet (edit mode) ──
          Reset Password / Archive / Delete all removed — no backend
          endpoint exists for any of them. Only real actions kept. */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
          onPress={() => setMenuVisible(false)}
        >
          <View style={{
            position: 'absolute', top: 60, right: 16,
            backgroundColor: colors.white,
            borderRadius: 14, borderWidth: 1, borderColor: '#e9ecef',
            minWidth: 200,
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12, shadowRadius: 10, elevation: 8,
            overflow: 'hidden',
          }}>
            <TouchableOpacity
              onPress={() => {
                setMenuVisible(false);
                if (!existing) return;
                setIsActive(prev => !prev);
              }}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 14, paddingHorizontal: 16, gap: 12,
              }}
            >
              <MaterialIcons
                name={isActive ? 'person-off' : 'person'}
                size={18}
                color={isActive ? colors.error : colors.onSurface}
              />
              <Text style={{
                fontFamily: 'Inter', fontSize: 14, fontWeight: '600',
                color: isActive ? colors.error : colors.onSurface,
              }}>
                {isActive ? 'Mark Inactive' : 'Mark Active'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { staffService } from '../services/staff';
import {
  Alert, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, Switch, Text,
  TextInput, TouchableOpacity, View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AccessLevel, ROLE_LABEL, StaffRole,
  STAFF_MEMBERS, staffInitials,
} from '../data/staff';
import { colors } from '../styles/globals';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES: StaffRole[] = ['owner', 'admin', 'manager', 'editor', 'viewer'];

const ROLE_CHIP_COLORS: Record<StaffRole, { bg: string; fg: string }> = {
  owner:   { bg: '#fece65', fg: '#755700' },
  admin:   { bg: '#e8ecf5', fg: '#1b2e5e' },
  manager: { bg: '#f0f0f4', fg: '#45464f' },
  editor:  { bg: '#f0f0f4', fg: '#45464f' },
  viewer:  { bg: '#f0f0f4', fg: '#45464f' },
};

const ACCESS_CONFIG: Record<AccessLevel, { icon: React.ComponentProps<typeof MaterialIcons>['name']; iconBg: string; title: string; description: string; level: string; levelSub: string }> = {
  full: {
    icon: 'admin-panel-settings', iconBg: colors.primaryContainer,
    title: 'Full Access',
    description: 'View reports, delete invoices, manage staff.',
    level: 'Full', levelSub: 'Admin-level capabilities',
  },
  limited: {
    icon: 'person-outline', iconBg: '#9ca3af',
    title: 'Limited Access',
    description: 'Create and view own invoices only.',
    level: 'Limited', levelSub: 'Basic capabilities',
  },
};

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
  value, onChangeText, placeholder, keyboardType, autoCapitalize,
}: {
  value:            string;
  onChangeText:     (t: string) => void;
  placeholder?:     string;
  keyboardType?:    React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?:  React.ComponentProps<typeof TextInput>['autoCapitalize'];
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.onSurfaceVariant + '88'}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize ?? 'sentences'}
      style={{
        height: 52,
        borderRadius: 12, borderWidth: 1, borderColor: '#dee2e6',
        backgroundColor: colors.white,
        paddingHorizontal: 14,
        fontFamily: 'Inter', fontSize: 14,
        color: colors.onSurface,
      }}
    />
  );
}

function RadioOption({
  accessKey,
  selected,
  onSelect,
}: {
  accessKey: AccessLevel;
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
      {/* Icon */}
      <View style={{
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: cfg.iconBg + (accessKey === 'full' ? '' : '30'),
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <MaterialIcons
          name={cfg.icon}
          size={22}
          color={accessKey === 'full' ? colors.white : '#9ca3af'}
        />
      </View>

      {/* Text */}
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

      {/* Radio dot */}
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

  const existing = id ? STAFF_MEMBERS.find(m => m.id === id) : null;
  const isEdit   = !!existing;

  // ── Form state ──
  const [name,        setName]        = useState(existing?.name        ?? '');
  const [email,       setEmail]       = useState(existing?.email       ?? '');
  const [jobTitle,    setJobTitle]    = useState(existing?.title       ?? '');
  const [role,        setRole]        = useState<StaffRole>(existing?.role ?? 'editor');
  const [isActive,    setIsActive]    = useState(existing ? existing.status === 'active' : true);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(existing?.accessLevel ?? 'limited');

  // ── Password generation ──
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [showGenPassword,   setShowGenPassword]   = useState(false);
  const [sendingInvite,     setSendingInvite]     = useState(false);
  const [mailSent,          setMailSent]          = useState(false);

  // ── Picker modals ──
  const [rolePickerVisible, setRolePickerVisible] = useState(false);
  const [menuVisible,       setMenuVisible]       = useState(false);

  // Derived
  const displayName    = name.trim() || (isEdit ? existing!.name : 'New Team Member');
  const displayTitle   = jobTitle.trim() || (isEdit ? existing!.title : 'Staff Member');
  const avatarBg       = existing?.avatarColor ?? colors.primaryContainer;
  const statusLabel    = isActive ? 'Active' : 'Inactive';
  const statusChipBg   = isActive ? '#e6f4ea' : '#f0f0f4';
  const statusChipFg   = isActive ? '#1e7e34' : '#45464f';
  const accessCfg      = ACCESS_CONFIG[accessLevel];

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pw = '';
    for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setGeneratedPassword(pw);
    setShowGenPassword(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Info', 'Full name is required.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Missing Info', 'Email address is required.');
      return;
    }
    if (isEdit && existing) {
      setSendingInvite(true);
      try {
        await staffService.update(existing.id, {
          name:        name.trim(),
          title:       jobTitle.trim(),
          role,
          accessLevel,
          isActive,
        });
        Alert.alert('Staff Updated', `${name} has been updated successfully.`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch {
        Alert.alert('Error', 'Could not update staff member.');
      } finally {
        setSendingInvite(false);
      }
      return;
    }
    if (!generatedPassword) {
      Alert.alert('No Password', 'Please generate a temporary password before sending the invite.');
      return;
    }
    setSendingInvite(true);
    try {
      await staffService.create({
        name:           name.trim(),
        email:          email.trim(),
        password:       generatedPassword,
        title:          jobTitle.trim(),
        role,
        accessLevel,
        isActive,
        notifyByEmail:  true,
      });
      setMailSent(true);
    } catch (err: any) {
      const msg = err?.response?.data?.email?.[0]
        ?? err?.response?.data?.detail
        ?? 'Could not send invite. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRevoke = () => {
    Alert.alert(
      'Revoke Access',
      `Remove ${existing?.name ?? name} from BillBuzz? They will no longer be able to log in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revoke', style: 'destructive', onPress: () => router.back() },
      ],
    );
  };

  if (mailSent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }} edges={['top', 'bottom']}>
        <View style={{
          width: 96, height: 96, borderRadius: 48,
          backgroundColor: colors.statusPaidBg,
          alignItems: 'center', justifyContent: 'center', marginBottom: 24,
        }}>
          <MaterialIcons name="mark-email-read" size={48} color={colors.statusPaidFg} />
        </View>
        <Text style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: '800', color: colors.onSurface, textAlign: 'center', marginBottom: 12 }}>
          Mail Sent!
        </Text>
        <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22, marginBottom: 8 }}>
          An invitation with their temporary password has been sent to
        </Text>
        <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.primaryContainer, textAlign: 'center', marginBottom: 32 }}>
          {email}
        </Text>
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
            <View style={{ position: 'relative', marginBottom: 14 }}>
              <View style={{
                width: 100, height: 100, borderRadius: 50,
                backgroundColor: avatarBg,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 3, borderColor: colors.white,
                shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
              }}>
                {name.trim() ? (
                  <Text style={{
                    fontFamily: 'Inter', fontSize: 34, fontWeight: '800',
                    color: colors.white,
                  }}>
                    {staffInitials({ name })}
                  </Text>
                ) : (
                  <MaterialIcons name="person" size={44} color="rgba(255,255,255,0.7)" />
                )}
              </View>
              {/* Edit badge */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 30, height: 30, borderRadius: 15,
                  backgroundColor: colors.primaryContainer,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderColor: colors.white,
                }}
              >
                <MaterialIcons name="edit" size={14} color={colors.white} />
              </TouchableOpacity>
            </View>

            <Text style={{
              fontFamily: 'Inter', fontSize: 22, fontWeight: '800',
              color: colors.onSurface, marginBottom: 4,
            }}>
              {displayName}
            </Text>
            <Text style={{
              fontFamily: 'Inter', fontSize: 14,
              color: colors.onSurfaceVariant,
            }}>
              {displayTitle}
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

              <View style={{ marginBottom: 14 }}>
                <FieldLabel text="Full Name" />
                <StyledInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Marcus Thorne"
                />
              </View>

              <FieldLabel text="Email Address" />
              <StyledInput
                value={email}
                onChangeText={setEmail}
                placeholder="m.thorne@billbuzz.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {!isEdit && (
                <View style={{ marginTop: 14 }}>
                  <FieldLabel text="Temporary Password" />
                  {generatedPassword ? (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center',
                      height: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.statusPaidFg + '60',
                      backgroundColor: colors.statusPaidBg,
                      paddingHorizontal: 14, gap: 10,
                    }}>
                      <MaterialIcons name="key" size={18} color={colors.statusPaidFg} />
                      <Text style={{
                        flex: 1, fontFamily: 'Inter', fontSize: 16, fontWeight: '700',
                        color: colors.onSurface, letterSpacing: showGenPassword ? 3 : 2,
                      }}>
                        {showGenPassword ? generatedPassword : '••••••••'}
                      </Text>
                      <TouchableOpacity onPress={() => setShowGenPassword(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MaterialIcons name={showGenPassword ? 'visibility-off' : 'visibility'} size={18} color={colors.onSurfaceVariant} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={generatePassword} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MaterialIcons name="refresh" size={18} color={colors.primaryContainer} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={generatePassword}
                      activeOpacity={0.8}
                      style={{
                        height: 52, borderRadius: 12, borderWidth: 1.5,
                        borderColor: colors.primaryContainer + '60',
                        borderStyle: 'dashed',
                        backgroundColor: colors.primaryContainer + '06',
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      <MaterialIcons name="auto-awesome" size={18} color={colors.primaryContainer} />
                      <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.primaryContainer }}>
                        Generate Random Password
                      </Text>
                    </TouchableOpacity>
                  )}
                  <Text style={{ fontFamily: 'Inter', fontSize: 11, color: colors.onSurfaceVariant, marginTop: 6, lineHeight: 16 }}>
                    A temporary password will be emailed to the staff member. They should change it on first login.
                  </Text>
                </View>
              )}
            </View>

            {/* ── Job Title + Role row ── */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>

              {/* Job Title */}
              <View style={{
                flex: 3,
                backgroundColor: colors.white, borderRadius: 16,
                borderWidth: 1, borderColor: '#e9ecef',
                padding: 16,
              }}>
                <FieldLabel text="Job Title" />
                <StyledInput
                  value={jobTitle}
                  onChangeText={setJobTitle}
                  placeholder="Account Manager"
                />
              </View>

              {/* Role */}
              <View style={{
                flex: 2,
                backgroundColor: colors.white, borderRadius: 16,
                borderWidth: 1, borderColor: '#e9ecef',
                padding: 16,
              }}>
                <FieldLabel text="Role" />
                <TouchableOpacity
                  onPress={() => setRolePickerVisible(true)}
                  activeOpacity={0.75}
                  style={{
                    height: 52, borderRadius: 12, borderWidth: 1,
                    borderColor: '#dee2e6', backgroundColor: colors.white,
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 10, gap: 4,
                  }}
                >
                  <View style={{
                    backgroundColor: ROLE_CHIP_COLORS[role].bg,
                    borderRadius: 6, paddingVertical: 3, paddingHorizontal: 6,
                    flex: 1,
                  }}>
                    <Text style={{
                      fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
                      color: ROLE_CHIP_COLORS[role].fg, textAlign: 'center',
                    }}>
                      {ROLE_LABEL[role]}
                    </Text>
                  </View>
                  <MaterialIcons name="expand-more" size={18} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Status + Access Level row ── */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>

              {/* Status card */}
              <View style={{
                flex: 1, backgroundColor: colors.white, borderRadius: 16,
                borderWidth: 1, borderColor: '#e9ecef', padding: 16,
              }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  gap: 8, marginBottom: 16,
                }}>
                  <Text style={{
                    fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: 0.7,
                    color: colors.onSurfaceVariant,
                  }}>
                    STATUS
                  </Text>
                  <View style={{
                    backgroundColor: statusChipBg, borderRadius: 999,
                    paddingVertical: 2, paddingHorizontal: 8,
                  }}>
                    <Text style={{
                      fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
                      color: statusChipFg,
                    }}>
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
                  <Text style={{
                    fontFamily: 'Inter', fontSize: 14, fontWeight: '600',
                    color: colors.onSurface,
                  }}>
                    {statusLabel}
                  </Text>
                </View>
              </View>

              {/* Access Level card (read-only, driven by permissions) */}
              <View style={{
                flex: 1, backgroundColor: colors.white, borderRadius: 16,
                borderWidth: 1, borderColor: '#e9ecef', padding: 16,
              }}>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: 0.7,
                  color: colors.onSurfaceVariant, marginBottom: 16,
                }}>
                  ACCESS LEVEL
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <MaterialIcons
                    name="shield"
                    size={16}
                    color={colors.primaryContainer}
                  />
                  <Text style={{
                    fontFamily: 'Inter', fontSize: 16, fontWeight: '800',
                    color: colors.onSurface,
                  }}>
                    {accessCfg.level}
                  </Text>
                </View>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 11,
                  color: colors.onSurfaceVariant, lineHeight: 16,
                }}>
                  {accessCfg.levelSub}
                </Text>
              </View>
            </View>

            {/* ── Permissions card ── */}
            <View style={{
              backgroundColor: colors.white, borderRadius: 16,
              borderWidth: 1, borderColor: '#e9ecef',
              padding: 16, marginBottom: 8,
            }}>
              <SectionLabel text="Permissions" />
              <View style={{ gap: 10 }}>
                <RadioOption
                  accessKey="full"
                  selected={accessLevel === 'full'}
                  onSelect={() => setAccessLevel('full')}
                />
                <RadioOption
                  accessKey="limited"
                  selected={accessLevel === 'limited'}
                  onSelect={() => setAccessLevel('limited')}
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
            disabled={sendingInvite}
            style={{
              height: 56, borderRadius: 16,
              backgroundColor: colors.primaryContainer,
              flexDirection: 'row', alignItems: 'center',
              justifyContent: 'center', gap: 10,
              marginBottom: 14,
              opacity: sendingInvite ? 0.7 : 1,
            }}
          >
            {sendingInvite ? (
              <>
                <ActivityIndicator size="small" color={colors.white} />
                <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: colors.white }}>
                  Sending Invite…
                </Text>
              </>
            ) : (
              <>
                <MaterialIcons name={isEdit ? 'save' : 'send'} size={20} color={colors.white} />
                <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: colors.white }}>
                  {isEdit ? 'Save Changes' : 'Send Invite'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {isEdit && (
            <TouchableOpacity onPress={handleRevoke} activeOpacity={0.7} style={{ alignItems: 'center' }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 13, fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: 0.5,
                color: colors.error,
              }}>
                Revoke Access
              </Text>
            </TouchableOpacity>
          )}
        </View>

      </KeyboardAvoidingView>

      {/* ── Role picker sheet ── */}
      <Modal
        visible={rolePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRolePickerVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setRolePickerVisible(false)}
        >
          <Pressable>
            <View style={{
              backgroundColor: colors.white,
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 24,
            }}>
              <View style={{
                width: 40, height: 4, borderRadius: 2, backgroundColor: '#dde1e7',
                alignSelf: 'center', marginTop: 14, marginBottom: 4,
              }} />
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
              }}>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 18, fontWeight: '800',
                  color: colors.primaryContainer,
                }}>
                  Select Role
                </Text>
                <TouchableOpacity
                  onPress={() => setRolePickerVisible(false)}
                  style={{
                    width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f4',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="close" size={16} color={colors.onSurface} />
                </TouchableOpacity>
              </View>
              {ROLES.map((r, idx, arr) => {
                const chip = ROLE_CHIP_COLORS[r];
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => { setRole(r); setRolePickerVisible(false); }}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingVertical: 14, paddingHorizontal: 20,
                      borderTopWidth: idx === 0 ? 1 : 0,
                      borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                      borderColor: '#e9ecef', gap: 14,
                    }}
                  >
                    <View style={{
                      backgroundColor: chip.bg, borderRadius: 8,
                      paddingVertical: 3, paddingHorizontal: 10,
                    }}>
                      <Text style={{
                        fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
                        color: chip.fg,
                      }}>
                        {ROLE_LABEL[r]}
                      </Text>
                    </View>
                    <Text style={{
                      flex: 1, fontFamily: 'Inter', fontSize: 14, fontWeight: '500',
                      color: colors.onSurface, textTransform: 'capitalize',
                    }}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                    {role === r && (
                      <MaterialIcons name="check" size={20} color={colors.primaryContainer} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Three-dot action sheet (edit mode) ── */}
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
            {[
              {
                icon: 'lock-reset' as const,
                label: 'Reset Password',
                color: colors.onSurface,
                action: () => {
                  setMenuVisible(false);
                  Alert.alert('Reset Password', 'A password reset link has been sent.');
                },
              },
              {
                icon: 'archive' as const,
                label: 'Archive Staff',
                color: colors.onSurface,
                action: () => {
                  setMenuVisible(false);
                  Alert.alert('Archive', `${existing?.name ?? name} has been archived.`);
                },
              },
              {
                icon: 'delete' as const,
                label: 'Delete Staff',
                color: colors.error,
                action: () => {
                  setMenuVisible(false);
                  Alert.alert(
                    'Delete Staff',
                    `Permanently delete ${existing?.name ?? name}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => router.back() },
                    ],
                  );
                },
              },
            ].map((item, idx, arr) => (
              <TouchableOpacity
                key={item.label}
                onPress={item.action}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 14, paddingHorizontal: 16,
                  borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                  borderBottomColor: '#e9ecef', gap: 12,
                }}
              >
                <MaterialIcons name={item.icon} size={18} color={item.color} />
                <Text style={{
                  fontFamily: 'Inter', fontSize: 14, fontWeight: '600',
                  color: item.color,
                }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

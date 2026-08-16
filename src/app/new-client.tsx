import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Modal,
  Platform, Pressable, ScrollView,
  Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { customerService, PaymentMethodPreference } from '../services/customers';
import { colors } from '../styles/globals';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_OPTIONS = ['cash', 'bank_transfer', 'card', 'check'];

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  check: 'Check',
};

const ALL_TAGS = [
  'Enterprise', 'High-Priority', 'SMB', 'Retail',
  'Corporate', 'Logistics', 'VIP', 'New Client', 'Partner',
];

// ─── Module-level sub-components ─────────────────────────────────────────────
// (FieldLabel, PlainInput, AdornedInput, TagChip, SectionCard — unchanged from last turn)

function FieldLabel({ text }: { text: string }) {
  return (
    <Text style={{
      fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.8,
      color: colors.onSurfaceVariant, marginBottom: 6,
    }}>
      {text}
    </Text>
  );
}

function PlainInput({
  value, onChangeText, placeholder, keyboardType, multiline,
}: {
  value:          string;
  onChangeText:   (t: string) => void;
  placeholder?:   string;
  keyboardType?:  React.ComponentProps<typeof TextInput>['keyboardType'];
  multiline?:     boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.onSurfaceVariant + '99'}
      keyboardType={keyboardType}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={{
        minHeight: multiline ? 90 : 52,
        borderRadius: 12, borderWidth: 1, borderColor: '#dee2e6',
        backgroundColor: colors.white,
        paddingHorizontal: 14, paddingVertical: multiline ? 12 : 0,
        fontFamily: 'Inter', fontSize: 14,
        color: colors.onSurface,
      }}
    />
  );
}

function AdornedInput({
  icon, value, onChangeText, placeholder, keyboardType,
}: {
  icon:          React.ComponentProps<typeof MaterialIcons>['name'];
  value:         string;
  onChangeText:  (t: string) => void;
  placeholder?:  string;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      height: 52,
      borderRadius: 12, borderWidth: 1, borderColor: '#dee2e6',
      backgroundColor: colors.white,
      paddingHorizontal: 14,
    }}>
      <MaterialIcons name={icon} size={18} color={colors.onSurfaceVariant} style={{ marginRight: 10 }} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceVariant + '99'}
        keyboardType={keyboardType}
        style={{ flex: 1, fontFamily: 'Inter', fontSize: 14, color: colors.onSurface }}
      />
    </View>
  );
}

function TagChip({ tag, onRemove }: { tag: string; onRemove: () => void }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#f0f0f4',
      borderRadius: 999,
      paddingVertical: 6, paddingHorizontal: 12,
      gap: 6,
    }}>
      <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: colors.onSurface }}>
        {tag}
      </Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <MaterialIcons name="close" size={14} color={colors.onSurfaceVariant} />
      </TouchableOpacity>
    </View>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: colors.white,
      borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
      padding: 16, marginBottom: 16,
    }}>
      {children}
    </View>
  );
}

// ─── Success flash banner ──────────────────────────────────────────────────────
function SuccessFlash({ message }: { message: string }) {
  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      alignItems: 'center', paddingTop: 60, zIndex: 20,
    }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#1e7e34', borderRadius: 14,
        paddingVertical: 12, paddingHorizontal: 18,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 10, elevation: 6,
      }}>
        <MaterialIcons name="check-circle" size={20} color={colors.white} />
        <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.white }}>
          {message}
        </Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NewClientScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const isEdit = !!id;

  const [fullName,  setFullName]  = useState('');
  const [email,      setEmail]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [payPref,    setPayPref]    = useState<PaymentMethodPreference>('cash');
  const [tags,       setTags]       = useState<string[]>([]);
  const [notes,      setNotes]      = useState('');
  const [loading,    setLoading]    = useState(!!id);
  const [saving,     setSaving]     = useState(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    customerService.get(id)
      .then(data => {
        setFullName(data.fullName ?? '');
        setEmail(data.email ?? '');
        setPhone(data.phone ?? '');
        setPayPref(data.paymentMethodPreference ?? 'cash');
        setTags(data.tags ?? []);
        setNotes(data.notes ?? '');
      })
      .catch(() => Alert.alert('Error', 'Could not load this customer.'))
      .finally(() => setLoading(false));
  }, [id]);

  const [payPickerVisible, setPayPickerVisible] = useState(false);
  const [tagPickerVisible, setTagPickerVisible] = useState(false);

  const availableTags = ALL_TAGS.filter(t => !tags.includes(t));

  const showSuccessAndRedirect = (message: string) => {
    setFlashMessage(message);
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      // Adjust this path if your clients list lives at a different route.
      router.replace('/(owner-tabs)/clients' as never);
    });
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Missing Information', 'Full name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        email:    email.trim(),
        phone:    phone.trim(),
        paymentMethodPreference: payPref,
        tags,
        notes: notes.trim(),
      };
      if (isEdit && id) {
        await customerService.update(id, payload);
      } else {
        await customerService.create(payload);
      }
      showSuccessAndRedirect(
        `${fullName.trim()} has been ${isEdit ? 'updated' : 'added'} successfully.`,
      );
    } catch {
      Alert.alert('Error', 'Could not save customer. Please try again.');
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>

      {flashMessage && (
        <Animated.View
          pointerEvents="none"
          style={{
            opacity: flashAnim,
            transform: [{
              translateY: flashAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }),
            }],
          }}
        >
          <SuccessFlash message={flashMessage} />
        </Animated.View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >

        {/* ── Nav bar ── */}
        <View style={{
          backgroundColor: colors.white,
          borderBottomWidth: 1, borderBottomColor: '#e9ecef',
          paddingHorizontal: 16, paddingVertical: 14,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
          >
            <MaterialIcons name="arrow-back" size={14} color={colors.onSurfaceVariant} style={{ marginRight: 4 }} />
            <Text style={{
              fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 0.6,
              color: colors.onSurfaceVariant,
            }}>
              CLIENTS / {isEdit ? 'EDIT' : 'NEW'}
            </Text>
          </TouchableOpacity>
          <Text style={{
            fontFamily: 'Inter', fontSize: 24, fontWeight: '800',
            color: colors.primaryContainer,
          }}>
            {isEdit ? 'Edit Customer' : 'Add Customer'}
          </Text>
        </View>

        {/* ── Scrollable form ── */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        >

          <SectionCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 }}>
              <MaterialIcons name="people-outline" size={20} color={colors.primaryContainer} />
              <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '800', color: colors.onSurface }}>
                Basic Identity
              </Text>
            </View>
            <FieldLabel text="Full Name" />
            <PlainInput value={fullName} onChangeText={setFullName} placeholder="Jonathan Sterling" />
          </SectionCard>

          <SectionCard>
            <View style={{ marginBottom: 14 }}>
              <FieldLabel text="Email Address" />
              <AdornedInput
                icon="email"
                value={email}
                onChangeText={setEmail}
                placeholder="j.sterling@sterlinglogistics.com"
                keyboardType="email-address"
              />
            </View>
            <FieldLabel text="Phone Number" />
            <AdornedInput
              icon="phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 234-8901"
              keyboardType="phone-pad"
            />
          </SectionCard>

          <SectionCard>
            <FieldLabel text="Payment Preference" />
            <TouchableOpacity
              onPress={() => setPayPickerVisible(true)}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center',
                height: 52,
                borderRadius: 12, borderWidth: 1, borderColor: '#dee2e6',
                backgroundColor: colors.white,
                paddingHorizontal: 14,
              }}
            >
              <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: colors.onSurface }}>
                {PAYMENT_LABELS[payPref] ?? payPref}
              </Text>
              <MaterialIcons name="expand-more" size={22} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </SectionCard>

          <SectionCard>
            <FieldLabel text="Categories / Tags" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {tags.map(tag => (
                <TagChip key={tag} tag={tag} onRemove={() => setTags(prev => prev.filter(t => t !== tag))} />
              ))}
              <TouchableOpacity
                onPress={() => setTagPickerVisible(true)}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  borderRadius: 999,
                  borderWidth: 1.5, borderColor: '#c5c6d0',
                  borderStyle: 'dashed',
                  paddingVertical: 6, paddingHorizontal: 12,
                  gap: 4,
                }}
              >
                <MaterialIcons name="add" size={14} color={colors.onSurfaceVariant} />
                <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant }}>
                  Add Tag
                </Text>
              </TouchableOpacity>
            </View>
          </SectionCard>

          <SectionCard>
            <FieldLabel text="Notes (Optional)" />
            <PlainInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional context about this customer…"
              multiline
            />
          </SectionCard>

        </ScrollView>

        {/* ── Fixed footer ── */}
        <View style={{
          paddingHorizontal: 16, paddingTop: 14,
          paddingBottom: insets.bottom > 0 ? insets.bottom + 6 : 20,
          backgroundColor: colors.white,
          borderTopWidth: 1, borderTopColor: '#e9ecef',
        }}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
            style={{
              height: 56, borderRadius: 16,
              backgroundColor: colors.primaryContainer,
              flexDirection: 'row', alignItems: 'center',
              justifyContent: 'center', gap: 10,
            }}
          >
            {saving ? <ActivityIndicator color={colors.white} /> : <>
            <MaterialIcons name="check-circle" size={20} color={colors.white} />
            <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: colors.white }}>
              {isEdit ? 'Save Changes' : 'Create Customer'}
            </Text>
            </>}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* ── Payment Preference picker ── */}
      <Modal
        visible={payPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPayPickerVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setPayPickerVisible(false)}
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
                <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '800', color: colors.primaryContainer }}>
                  Payment Preference
                </Text>
                <TouchableOpacity
                  onPress={() => setPayPickerVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f4',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="close" size={16} color={colors.onSurface} />
                </TouchableOpacity>
              </View>
              {PAYMENT_OPTIONS.map((opt, idx) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => { setPayPref(opt); setPayPickerVisible(false); }}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 14, paddingHorizontal: 20,
                    borderTopWidth: idx === 0 ? 1 : 0,
                    borderBottomWidth: 1,
                    borderColor: '#e9ecef',
                  }}
                >
                  <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 15, fontWeight: '500', color: colors.onSurface }}>
                    {PAYMENT_LABELS[opt] ?? opt}
                  </Text>
                  {payPref === opt && <MaterialIcons name="check" size={20} color={colors.primaryContainer} />}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Tag picker ── */}
      <Modal
        visible={tagPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTagPickerVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setTagPickerVisible(false)}
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
                <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '800', color: colors.primaryContainer }}>
                  Add Tag
                </Text>
                <TouchableOpacity
                  onPress={() => setTagPickerVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f4',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="close" size={16} color={colors.onSurface} />
                </TouchableOpacity>
              </View>
              {availableTags.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant }}>
                    All tags have been added
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, paddingBottom: 8 }}>
                  {availableTags.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => { setTags(prev => [...prev, tag]); setTagPickerVisible(false); }}
                      activeOpacity={0.75}
                      style={{
                        backgroundColor: colors.primaryContainer + '12',
                        borderRadius: 999, borderWidth: 1,
                        borderColor: colors.primaryContainer + '30',
                        paddingVertical: 8, paddingHorizontal: 14,
                      }}
                    >
                      <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: colors.primaryContainer }}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}
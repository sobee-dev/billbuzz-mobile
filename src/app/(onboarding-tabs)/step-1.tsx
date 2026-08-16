import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { businessService } from '../../services/business';

import { getErrorMessage } from '@/utils/getErrorMessage';
import { colors } from '../../styles/globals';

// ─── Module-level components (keyboard stability) ─────────────────────────────

function FieldLabel({ label }: { label: string }) {
  return (
    <Text style={{
      fontFamily: 'Inter', fontSize: 13, fontWeight: '600',
      color: colors.onSurface, marginBottom: 7,
    }}>
      {label}
    </Text>
  );
}

function StyledInput({
  value, onChange, placeholder, keyboardType, autoCapitalize,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#a8aab8"
      keyboardType={keyboardType ?? 'default'}
      autoCapitalize={autoCapitalize ?? 'words'}
      style={{
        fontFamily: 'Inter', fontSize: 15, color: colors.onSurface,
        height: 52, borderRadius: 10, borderWidth: 1.2, borderColor: '#d5d8e2',
        paddingHorizontal: 14, backgroundColor: colors.white, marginBottom: 18,
      }}
    />
  );
}

function AddressInput({
  value, onChange,
}: {
  value: string; onChange: (v: string) => void;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="123 Business Way, Suite 100"
      placeholderTextColor="#a8aab8"
      multiline
      autoCapitalize="sentences"
      style={{
        fontFamily: 'Inter', fontSize: 15, color: colors.onSurface,
        minHeight: 100, borderRadius: 10, borderWidth: 1.2, borderColor: '#d5d8e2',
        paddingHorizontal: 14, paddingTop: 14,
        backgroundColor: colors.white, textAlignVertical: 'top',
      }}
    />
  );
}

function MultilineInput({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#a8aab8"
      multiline
      numberOfLines={3}
      autoCapitalize="sentences"
      style={{
        fontFamily: 'Inter', fontSize: 15, color: colors.onSurface,
        minHeight: 80, borderRadius: 10, borderWidth: 1.2, borderColor: '#d5d8e2',
        paddingHorizontal: 14, paddingTop: 14,
        backgroundColor: colors.white, textAlignVertical: 'top', marginBottom: 18,
      }}
    />
  );
}

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1, height: 4, borderRadius: 2,
            backgroundColor: i < current ? colors.primaryContainer : '#d2d5e0',
          }}
        />
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OnboardingStep1() {
  const router = useRouter();

  const [bizName,      setBizName]      = useState('');
  const [description,  setDescription]  = useState('');
  const [motto,        setMotto]        = useState('');
  const [email,        setEmail]        = useState('');
  const [phone,        setPhone]        = useState('');
  const [addressOne,   setAddressOne]   = useState('');
  const [addressTwo,   setAddressTwo]   = useState('');
  const [saving,       setSaving]       = useState(false);
  const bizIdRef = useRef<string | null>(null);

  async function handleNext() {
    if (!bizName.trim()) {
      Alert.alert('Required', 'Please enter your business name to continue.');
      return;
    }
    setSaving(true);
    try {
      const biz = await businessService.createBusiness({
        name:        bizName.trim(),
        description: description.trim(),
        motto:       motto.trim(),
        email:       email.trim(),
        phone:       phone.trim(),
        addressOne:  addressOne.trim(),
        addressTwo:  addressTwo.trim(),
      });
      bizIdRef.current = biz.id;
      router.push('/(onboarding-tabs)/step-2' as never);
    } catch (err) {
      // createBusiness can fail for real reasons (validation, network) or
      // because this owner already has a business (re-opening onboarding).
      // Don't assume the harmless case — verify a business actually exists
      // before treating this as safe to continue.
      try {
        await businessService.getMyBusiness();
        router.push('/(onboarding-tabs)/step-2' as never);
      } catch {
        Alert.alert(
          'Could not continue',
          getErrorMessage(err, 'Something went wrong creating your business profile. Please check your connection and try again.'),
        );
      }
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    router.replace('/(owner-tabs)/dashboard' as never);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f6fb' }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >

        {/* ── Nav ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20, paddingVertical: 14,
        }}>
          <Text style={{
            flex: 1, fontFamily: 'Inter', fontSize: 22, fontWeight: '800',
            color: colors.primaryContainer,
          }}>
            BillBuzz
          </Text>

          {/* STEP pill */}
          <View style={{
            backgroundColor: '#e3e6ef', borderRadius: 999,
            paddingVertical: 6, paddingHorizontal: 14, marginRight: 12,
          }}>
            <Text style={{
              fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 0.8,
              color: colors.onSurface,
            }}>
              Step 1 of 3
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSkip}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{
              fontFamily: 'Inter', fontSize: 14, fontWeight: '600',
              color: colors.onSurfaceVariant,
            }}>
              Skip
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Progress bar ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <StepProgress current={1} total={3} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
        >

          {/* Title */}
          <Text style={{
            fontFamily: 'Inter', fontSize: 32, fontWeight: '800',
            color: colors.primaryContainer, marginBottom: 8,
          }}>
            Business Profile
          </Text>
          <Text style={{
            fontFamily: 'Inter', fontSize: 15,
            color: colors.onSurfaceVariant, lineHeight: 22, marginBottom: 28,
          }}>
            Tell us a bit about your business to get your first invoice ready.
          </Text>

          {/* Form card */}
          <View style={{
            backgroundColor: colors.white, borderRadius: 18,
            borderWidth: 1, borderColor: '#e2e5ef',
            padding: 20,
            shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
          }}>
            <FieldLabel label="Business Name" />
            <StyledInput
              value={bizName}
              onChange={setBizName}
              placeholder="e.g. Acme Corp"
            />

            <FieldLabel label="Business Description (Optional)" />
            <MultilineInput
              value={description}
              onChange={setDescription}
              placeholder="e.g. Importers & exporters of..."
            />

            <FieldLabel label="Business Motto / Tagline (Optional)" />
            <StyledInput
              value={motto}
              onChange={setMotto}
              placeholder="e.g. In God We Trust"
            />

            <FieldLabel label="Business Email" />
            <StyledInput
              value={email}
              onChange={setEmail}
              placeholder="billing@acme.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <FieldLabel label="Phone" />
            <StyledInput
              value={phone}
              onChange={setPhone}
              placeholder="+1 (555) 000-0000"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />

            <FieldLabel label="Address Line 1" />
            <AddressInput value={addressOne} onChange={setAddressOne} />

            <FieldLabel label="Address Line 2 (optional)" />
            <AddressInput value={addressTwo} onChange={setAddressTwo} />
          </View>

        </ScrollView>

        {/* ── Footer ── */}
        <View style={{
          paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30,
          borderTopWidth: 1, borderTopColor: '#e2e5ef',
          backgroundColor: '#f5f6fb',
        }}>
          <TouchableOpacity
            onPress={handleNext}
            disabled={saving}
            activeOpacity={0.85}
            style={{
              backgroundColor: colors.primaryContainer, borderRadius: 14,
              paddingVertical: 17, flexDirection: 'row',
              alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 12,
            }}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text style={{ fontFamily: 'Inter', fontSize: 17, fontWeight: '800', color: colors.white }}>Next</Text>
                  <MaterialIcons name="arrow-forward" size={20} color={colors.white} />
                </>
            }
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <MaterialIcons name="lock-outline" size={13} color={colors.onSurfaceVariant} />
            <Text style={{
              fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant,
            }}>
              Your data is securely stored and encrypted.
            </Text>
          </View>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
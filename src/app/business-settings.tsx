import { MaterialIcons } from '@expo/vector-icons';

import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal,
  Platform, Pressable, ScrollView,
  StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SignatureField } from '../components/SignatureField';
import { DEFAULT_CURRENCY, GLOBAL_CURRENCIES } from '../data/constants';

import { useAuth } from '@/context/AuthContext';
import { deleteCloudinaryAsset, pickAndUploadImage, uploadToCloudinary } from '@/lib/imageUpload';

import { useAssetUpload } from '@/hooks/useAssetUpload';
import { resolveCurrency } from '@/utils/currencySymbol';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { SaveFormat } from 'expo-image-manipulator';
import { businessService } from '../services/business';
import { colors } from '../styles/globals';

// ─── Constants ────────────────────────────────────────────────────────────────

const HEX_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const BRAND_COLORS = [
  { hex: '#1b2e5e', label: 'Navy' },
  { hex: '#c47f17', label: 'Amber' },
  { hex: '#c62828', label: 'Red' },
  { hex: '#2e7d32', label: 'Green' },
  { hex: '#0277bd', label: 'Blue' },
  { hex: '#000000', label: 'Black' },
  { hex: '#212121', label: 'Charcoal' },
  { hex: '#e65100', label: 'Orange' },
  { hex: '#ff9800', label: 'Tangerine' },
  { hex: '#fbc02d', label: 'Yellow' },
  { hex: '#f9a825', label: 'Gold' },
];

function normalizeHex(hex: string): string {
  return hex.trim().toLowerCase();
}
// ─── Module-level form components (keyboard stability) ────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Text style={{
      fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.8,
      color: colors.onSurfaceVariant,
      marginBottom: 10, marginTop: 24,
    }}>
      {label}
    </Text>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <Text style={{
      fontFamily: 'Inter', fontSize: 12, fontWeight: '600',
      color: colors.onSurface, marginBottom: 6,
    }}>
      {text}
    </Text>
  );
}

function FormInput({
  value, onChangeText, placeholder, keyboardType, autoCapitalize,
}: {
  value:           string;
  onChangeText:    (t: string) => void;
  placeholder?:    string;
  keyboardType?:   React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
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
        height: 50,
        borderRadius: 10, borderWidth: 1, borderColor: '#dee2e6',
        backgroundColor: colors.white,
        paddingHorizontal: 14,
        fontFamily: 'Inter', fontSize: 14,
        color: colors.onSurface,
        marginBottom: 14,
      }}
    />
  );
}

function MultilineInput({
  value, onChangeText, placeholder,
}: {
  value:        string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.onSurfaceVariant + '88'}
      multiline
      numberOfLines={3}
      textAlignVertical="top"
      style={{
        minHeight: 80,
        borderRadius: 10, borderWidth: 1, borderColor: '#dee2e6',
        backgroundColor: colors.white,
        padding: 12,
        fontFamily: 'Inter', fontSize: 14,
        color: colors.onSurface,
        marginBottom: 14,
      }}
    />
  );
}

function TaxRateInput({
  value, onChangeText,
}: {
  value:        string;
  onChangeText: (t: string) => void;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      borderRadius: 10, borderWidth: 1, borderColor: '#dee2e6',
      backgroundColor: colors.white,
      overflow: 'hidden', height: 50,
    }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        style={{
          flex: 1, paddingHorizontal: 14,
          fontFamily: 'Inter', fontSize: 14,
          color: colors.onSurface, height: '100%',
        }}
      />
      <View style={{
        paddingHorizontal: 14, height: '100%',
        alignItems: 'center', justifyContent: 'center',
        borderLeftWidth: 1, borderLeftColor: '#dee2e6',
        backgroundColor: '#f5f5f8',
      }}>
        <Text style={{
          fontFamily: 'Inter', fontSize: 15, fontWeight: '700',
          color: colors.onSurfaceVariant,
        }}>
          %
        </Text>
      </View>
    </View>
  );
}

function LinkRow({
  icon, label, sub, onPress, last = false,
}: {
  icon:    React.ComponentProps<typeof MaterialIcons>['name'];
  label:   string;
  sub?:    string;
  onPress: () => void;
  last?:   boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
        padding: 16, gap: 14,
        marginBottom: last ? 0 : 10,
        shadowColor: '#1b2e5e', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
      }}
    >
      <View style={{
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: colors.primaryContainer + '15',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <MaterialIcons name={icon} size={22} color={colors.primaryContainer} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: 'Inter', fontSize: 15, fontWeight: '700',
          color: colors.onSurface,
        }}>
          {label}
        </Text>
        {sub ? (
          <Text style={{
            fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2,
          }}>
            {sub}
          </Text>
        ) : null}
      </View>
      <MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}

/**
 * Custom hex color picker. Registers itself as the live brand color the
 * moment it's a valid 3- or 6-digit hex — no separate "confirm" step.
 */
function CustomColorInput({
  value, onChange,
}: {
  value: string; onChange: (hex: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const isValid = HEX_PATTERN.test(draft);

  function handleChangeText(text: string) {
    let next = text;
    if (next.length > 0 && !next.startsWith('#')) next = `#${next}`;
    next = next.slice(0, 7);
    setDraft(next);
    if (HEX_PATTERN.test(next)) onChange(next);
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <View style={{
          width: 44, height: 44, borderRadius: 12,
          backgroundColor: isValid ? draft : '#eceef3',
          borderWidth: 1, borderColor: '#d5d8e2',
        }} />
        <View style={{
          flex: 1, flexDirection: 'row', alignItems: 'center',
          height: 48, borderRadius: 10, borderWidth: 1.2,
          borderColor: isValid ? colors.primaryContainer : '#d5d8e2',
          backgroundColor: colors.white, paddingHorizontal: 14,
        }}>
          <TextInput
            value={draft}
            onChangeText={handleChangeText}
            placeholder="#RRGGBB"
            placeholderTextColor="#a8aab8"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            style={{ flex: 1, fontFamily: 'Inter', fontSize: 15, color: colors.onSurface }}
          />
        </View>
      </View>
      <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
        {isValid ? 'This color is applied automatically.' : 'Enter a valid hex code, e.g. #1B2E5E'}
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BusinessSettingsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
   
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [bizId,   setBizId]   = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // ── Form state — field names match BusinessProfile exactly ──
  const [name,               setName]               = useState('');
  const [description,        setDescription]        = useState('');
  const [motto,               setMotto]              = useState('');
  const [phone,               setPhone]              = useState('');
  const [email,               setEmail]              = useState('');
  const [addressOne,          setAddressOne]         = useState('');
  const [addressTwo,          setAddressTwo]         = useState('');
  const [registrationNumber,  setRegistrationNumber] = useState('');
  const [logoUrl,              setLogoUrl]           = useState('');
  const [brandColor,          setBrandColor]         = useState('#1b2e5e');
  const [currency,             setCurrency]          = useState(DEFAULT_CURRENCY);
  const [taxEnabled,          setTaxEnabled]         = useState(false);
  const [taxRate,              setTaxRate]           = useState('');

  const [signatureType, setSignatureType] = useState<'none' | 'text' | 'image'>('none');
  const [signatureText, setSignatureText] = useState('');
  const [signatureUrl,  setSignatureUrl]  = useState('');

  const logo = useAssetUpload(logoUrl, setLogoUrl);
  const signature = useAssetUpload(signatureUrl, setSignatureUrl);

  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [colorPickerVisible,    setColorPickerVisible]    = useState(false);
  const [initialState, setInitialState] = useState<any>(null);

  // const loadedCurrency =
  // GLOBAL_CURRENCIES.find(c => c.code === b.currency) ??
  // GLOBAL_CURRENCIES.find(c => c.symbol === b.currency) ??
  // DEFAULT_CURRENCY;

  // Pre-fill from API
  useEffect(() => {
    let cancelled = false;

    businessService.getMyBusiness().then(b => {
      if (cancelled) return;
      setBizId(b.id);
      const loadedCurrency = resolveCurrency(b.currency)
      setName(b.name ?? '');
      setDescription(b.description ?? '');
      setMotto(b.motto ?? '');
      setPhone(b.phone ?? '');
      setEmail(b.email || user?.email || '');
      setAddressOne(b.addressOne ?? '');
      setAddressTwo(b.addressTwo ?? '');
      setRegistrationNumber(b.registrationNumber ?? '');
      setLogoUrl(b.logoUrl ?? '');
      setBrandColor(b.brandColorOne || '#1b2e5e');
      setCurrency(loadedCurrency);
      setTaxEnabled(b.taxEnabled ?? false);
      setTaxRate(b.taxRate ?? '');
      setSignatureType(b.signatureType ?? 'none');
      setSignatureText(b.signatureText ?? '');
      setSignatureUrl(b.signatureUrl ?? '');

      setInitialState({
        name: b.name ?? '',
        description: b.description ?? '',
        motto: b.motto ?? '',
        phone: b.phone ?? '',
        email: b.email || user?.email || '',
        addressOne: b.addressOne ?? '',
        addressTwo: b.addressTwo ?? '',
        registrationNumber: b.registrationNumber ?? '',
        logoUrl: b.logoUrl ?? '',
        brandColor: b.brandColorOne || '#1b2e5e',
        currencyCode: loadedCurrency.code,
        taxEnabled: b.taxEnabled ?? false,
        taxRate: b.taxRate ?? '',
        signatureType: b.signatureType ?? 'none',
        signatureText: b.signatureText ?? '',
        signatureUrl: b.signatureUrl ?? '',
      });

    }).catch(() => {
      if (!cancelled) setGeneralError('Could not load your business details. Pull to refresh or try again shortly.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  async function handlePickLogo() {
    await logo.run(
      () => pickAndUploadImage('business-logos', 'logo.jpg', setLogoUrl),
      'Failed to upload logo. Please try again.',
    );
  }

  async function handleRemoveLogo() {
    await logo.run(
      () => deleteCloudinaryAsset('business-logos').then(() => ''),
      'Failed to remove logo. Please try again.',
    );
  }

  async function handleSignatureCapture(fileUri: string) {
    setSignatureUrl(fileUri); // immediate preview of what they just drew
    await signature.run(
      () => uploadToCloudinary(
        fileUri,
        'business-signatures',
        undefined, // business-scoped, one slot per business — no resourceId needed
        'signature.png',
        SaveFormat.PNG, // keep transparency — this renders over invoice content
      ),
      'Failed to upload signature. Please try drawing it again.',
    );
  }

  async function handleRemoveSignature() {
    // Type only flips to "none" once the delete actually succeeds.
    await signature.run(
      () => deleteCloudinaryAsset('business-signatures').then(() => {
        setSignatureType('none');
        return '';
      }),
      'Failed to remove signature. Please try again.',
    );
  }

  function handleSignatureTypeChange(type: 'none' | 'text' | 'image') {
    setSignatureType(type);
    if (type !== 'image') setSignatureUrl('');
    if (type !== 'text') setSignatureText('');
  }

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Business name cannot be empty.');
      return;
    }
    if (!bizId) {
      setGeneralError('Your business record has not loaded yet. Please try again in a moment.');
      return;
    }

    setSaving(true);
    setGeneralError(null);
    try {
      await businessService.updateBusiness(bizId, {
        name: name.trim(),
        description: description.trim(),
        motto: motto.trim(),
        phone: phone.trim(),
        email: email.trim(),
        addressOne: addressOne.trim(),
        addressTwo: addressTwo.trim(),
        registrationNumber: registrationNumber.trim(),
        logoUrl,
        brandColorOne: brandColor,
        currency: currency.code,
        taxEnabled,
        taxRate: taxEnabled ? taxRate : '0',
        signatureType,
        signatureText: signatureType === 'text' ? signatureText : '',
        signatureUrl: signatureType === 'image' ? signatureUrl : '',
      });

      setInitialState({
        name: name.trim(),
        description: description.trim(),
        motto: motto.trim(),
        phone: phone.trim(),
        email: email.trim(),
        addressOne: addressOne.trim(),
        addressTwo: addressTwo.trim(),
        registrationNumber: registrationNumber.trim(),
        logoUrl,
        brandColor,
        currencyCode: currency.code,
        taxEnabled,
        taxRate,
        signatureType,
        signatureText: signatureType === 'text' ? signatureText : '',
        signatureUrl: signatureType === 'image' ? signatureUrl : '',
      });

      Alert.alert('Settings Saved', 'Your business settings have been updated successfully.');
    } catch (err) {
      setGeneralError(getErrorMessage(err, 'Could not save settings. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  // Helper to check if any field has been modified
  const hasUnsavedChanges = () => {
    if (!initialState) return false;
    return (
      name !== initialState.name ||
      description !== initialState.description ||
      motto !== initialState.motto ||
      phone !== initialState.phone ||
      email !== initialState.email ||
      addressOne !== initialState.addressOne ||
      addressTwo !== initialState.addressTwo ||
      registrationNumber !== initialState.registrationNumber ||
      logoUrl !== initialState.logoUrl ||
      brandColor !== initialState.brandColor ||
      currency.code !== initialState.currencyCode ||
      taxEnabled !== initialState.taxEnabled ||
      taxRate !== initialState.taxRate ||
      signatureType !== initialState.signatureType ||
      signatureText !== initialState.signatureText ||
      signatureUrl !== initialState.signatureUrl
    );
  };


  // Intercept all back navigation (hardware back, swipe back, and router.back())
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges()) {
        return; // No changes, let them leave safely
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to discard them and leave?',
        [
          { text: 'Keep editing', style: 'cancel', onPress: () => {} },
          {
            text: 'Discard',
            style: 'destructive',
            // If they confirm, dispatch the navigation action they originally requested
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [
    navigation, initialState, name, description, motto, phone, email,
    addressOne, addressTwo, registrationNumber, logoUrl, brandColor,
    currency, taxEnabled, taxRate, signatureType, signatureText, signatureUrl
  ]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primaryContainer} />
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
          <Text style={{
            flex: 1, fontFamily: 'Inter', fontSize: 18, fontWeight: '800',
            color: colors.primaryContainer,
          }}>
            BillBuzz
          </Text>
        </View>

        {/* ── Scrollable form ── */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
        >

          {/* Title */}
          <View style={{ paddingTop: 20, marginBottom: 20 }}>
            <Text style={{
              fontFamily: 'Inter', fontSize: 28, fontWeight: '800',
              color: colors.onSurface, marginBottom: 4,
            }}>
              Business Settings
            </Text>
            <Text style={{
              fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant,
            }}>
              Update your company profile and tax rules.
            </Text>
          </View>

          {generalError && (
            <View style={{
              backgroundColor: '#ffdad6', borderWidth: 1, borderColor: '#f9b4ae',
              borderRadius: 12, padding: 14, marginBottom: 14,
            }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 13, color: '#ba1a1a' }}>
                {generalError}
              </Text>
            </View>
          )}

          {/* ── Business Logo ── */}
          <View style={{
            backgroundColor: colors.white,
            borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
            padding: 16, flexDirection: 'row', alignItems: 'center',
            gap: 14, marginBottom: 6,
          }}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={{ position: 'relative' }}
              onPress={handlePickLogo}
              disabled={logo.uploading}
            >
              <View style={{
                width: 72, height: 72, borderRadius: 14,
                backgroundColor: logoUrl ? colors.white : colors.primaryContainer,
                borderWidth: logoUrl ? 1 : 0, borderColor: '#e9ecef',
                alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}>
                {logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                ) : (
                  <MaterialIcons name="flash-on" size={36} color={colors.secondaryContainer} />
                )}
                {logo.uploading && (
                  <View style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: 'rgba(255,255,255,0.55)',
                      alignItems: 'center', justifyContent: 'center',
                    },
                  ]}>
                    <ActivityIndicator color={colors.primaryContainer} size="small" />
                  </View>
                )}
              </View>
              <View style={{
                position: 'absolute', bottom: -4, right: -4,
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: colors.white,
                borderWidth: 1.5, borderColor: '#e9ecef',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <MaterialIcons name="edit" size={12} color={colors.primaryContainer} />
              </View>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 16, fontWeight: '800',
                color: colors.primaryContainer, marginBottom: 3,
              }}>
                Business Logo
              </Text>
              <Text style={{
                fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant,
                lineHeight: 18,
              }}>
                Recommended size: 512×512px.{'\n'}PNG or JPG, up to 2MB.
              </Text>
              {logo.error && (
                <Text style={{ fontFamily: 'Inter', fontSize: 12, color: '#ba1a1a', marginTop: 6 }}>
                  {logo.error}
                </Text>
              )}
            </View>
          </View>

          {/* ── Business Profile ── */}
          <SectionLabel label="Business Profile" />
          <View style={{
            backgroundColor: colors.white,
            borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
            padding: 16, marginBottom: 6,
          }}>
            <FieldLabel text="Business Name" />
            <FormInput value={name} onChangeText={setName} placeholder="Your Company Name" />

            <FieldLabel text="Description" />
            <MultilineInput
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Importers & exporters of..."
            />

            <FieldLabel text="Motto / Tagline" />
            <FormInput value={motto} onChangeText={setMotto} placeholder="e.g. In God We Trust" />

            <FieldLabel text="Phone Number" />
            <FormInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 000-0000"
              keyboardType="phone-pad"
            />

            <FieldLabel text="Email Address" />
            <FormInput
              value={email}
              onChangeText={setEmail}
              placeholder="ops@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <FieldLabel text="Address Line 1" />
            <FormInput value={addressOne} onChangeText={setAddressOne} placeholder="Street address" />

            <FieldLabel text="Address Line 2 (Optional)" />
            <FormInput
              value={addressTwo}
              onChangeText={setAddressTwo}
              placeholder="City, State/Province, Postal Code"
            />

            <FieldLabel text="Registration # (Optional)" />
            <FormInput
              value={registrationNumber}
              onChangeText={setRegistrationNumber}
              placeholder="RC-12343216"
              autoCapitalize="characters"
            />
          </View>

          {/* ── Tax Settings ── */}
          <SectionLabel label="Tax Settings" />
          <View style={{
            backgroundColor: colors.white,
            borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
            padding: 16, marginBottom: 6,
          }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              marginBottom: taxEnabled ? 20 : 0,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.onSurface }}>
                  Enable Automated Tax
                </Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 }}>
                  Apply rates to all invoices
                </Text>
              </View>
              <Switch
                value={taxEnabled}
                onValueChange={setTaxEnabled}
                thumbColor={colors.white}
                trackColor={{ false: '#c5c6d0', true: colors.secondaryContainer }}
                ios_backgroundColor="#c5c6d0"
              />
            </View>

            {taxEnabled && (
              <>
                <FieldLabel text="Default Tax Rate (%)" />
                <TaxRateInput value={taxRate} onChangeText={setTaxRate} />
              </>
            )}
          </View>

          {/* ── Currency ── */}
          <SectionLabel label="Preferences" />
          <View style={{
            backgroundColor: colors.white,
            borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
            overflow: 'hidden', marginBottom: 6,
          }}>
            <TouchableOpacity
              onPress={() => setCurrencyPickerVisible(true)}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 15, paddingHorizontal: 16, gap: 14,
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: colors.primaryContainer + '15',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <MaterialIcons name="account-balance-wallet" size={20} color={colors.primaryContainer} />
              </View>
              <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.onSurface }}>
                Currency
              </Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.primaryContainer, marginRight: 4 }}>
                {currency.symbol} {currency.code}
              </Text>
              <MaterialIcons name="expand-more" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* ── Brand Color ── */}
          <SectionLabel label="Brand Color" />
          <View style={{
            backgroundColor: colors.white,
            borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
            padding: 16, marginBottom: 6,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {BRAND_COLORS.map(c => (
                <TouchableOpacity
                  key={c.hex}
                  onPress={() => setBrandColor(c.hex)}
                  style={{
                    width: 42, height: 42, borderRadius: 21,
                    backgroundColor: c.hex,
                    borderWidth: normalizeHex(brandColor) === normalizeHex(c.hex) ? 3 : 0,
                    borderColor: colors.white,
                    shadowColor: c.hex,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: normalizeHex(brandColor) === normalizeHex(c.hex) ? 0.6 : 0,
                    shadowRadius: 6,
                    elevation: normalizeHex(brandColor) === normalizeHex(c.hex) ? 4 : 0,
                  }}
                />
              ))}

              {/* Current color, shown only when it isn't one of the presets above —
                  so the business's actual saved color is always visibly represented. */}
              {HEX_PATTERN.test(brandColor) &&
                !BRAND_COLORS.some(c => normalizeHex(c.hex) === normalizeHex(brandColor)) && (
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 42, height: 42, borderRadius: 21,
                      backgroundColor: brandColor,
                      borderWidth: 3, borderColor: colors.primaryContainer,
                      shadowColor: brandColor,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6, shadowRadius: 6, elevation: 4,
                    }}
                  />
                </View>
              )}


              <TouchableOpacity
                onPress={() => setColorPickerVisible(true)}
                style={{
                  width: 42, height: 42, borderRadius: 21,
                  backgroundColor: '#eceef3',
                  alignItems: 'center', justifyContent: 'center',
                 
                }}
              >
                <MaterialIcons name="add" size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Signature ── */}
          <SectionLabel label="Signature" />
          <View style={{
            backgroundColor: colors.white,
            borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
            padding: 16, marginBottom: 6,
          }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 14 }}>
              Appears on your invoices as proof of authorization.
            </Text>

            <SignatureField
              signatureType={signatureType}
              signatureText={signatureText}
              signatureUrl={signatureUrl}
              uploading={signature.uploading}
              onTypeChange={handleSignatureTypeChange}
              onTextChange={setSignatureText}
              onDrawEnd={handleSignatureCapture}
              onRemoveImage={handleRemoveSignature}
            />
            {signature.error && (
              <Text style={{ fontFamily: 'Inter', fontSize: 12, color: '#ba1a1a', marginTop: 10 }}>
                {signature.error}
              </Text>
            )}
          </View>

          {/* ── Quick links ── */}
          <SectionLabel label="Management" />
          <LinkRow
            icon="people"
            label="Staff Management"
            sub="Manage team members & roles"
            onPress={() => router.push('/staff-list' as never)}
          />
          <LinkRow
            icon="receipt-long"
            label="Invoice Templates"
            sub="Customize invoice appearance"
            onPress={() => router.push('/invoice-templates' as never)}
            last
          />

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
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {saving
              ? <ActivityIndicator color={colors.white} />
              : <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: colors.white }}>
                  Update Settings
                </Text>
            }
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* ── Currency picker modal ── */}
      <Modal
        visible={currencyPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCurrencyPickerVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setCurrencyPickerVisible(false)}
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
                  Select Currency
                </Text>
                <TouchableOpacity
                  onPress={() => setCurrencyPickerVisible(false)}
                  style={{
                    width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f4',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="close" size={16} color={colors.onSurface} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {GLOBAL_CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c.code}
                    onPress={() => { setCurrency(c); setCurrencyPickerVisible(false); }}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingVertical: 14, paddingHorizontal: 20,
                      borderTopWidth: 1, borderColor: '#e9ecef',
                    }}
                  >
                    <Text style={{
                      flex: 1, fontFamily: 'Inter', fontSize: 15,
                      fontWeight: currency.code === c.code ? '700' : '500',
                      color: colors.onSurface,
                    }}>
                      {c.symbol} - {c.name}
                    </Text>
                    {currency.code === c.code && (
                      <MaterialIcons name="check" size={20} color={colors.primaryContainer} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Custom color picker modal ── */}
      <Modal
        visible={colorPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setColorPickerVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 }}
          onPress={() => setColorPickerVisible(false)}
        >
          <Pressable>
            <View style={{ backgroundColor: colors.white, borderRadius: 20, padding: 20 }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 17, fontWeight: '800', color: colors.onSurface, marginBottom: 16 }}>
                Custom Color
              </Text>
              <CustomColorInput value={brandColor} onChange={setBrandColor} />
              <TouchableOpacity
                onPress={() => setColorPickerVisible(false)}
                activeOpacity={0.85}
                style={{
                  marginTop: 20, backgroundColor: colors.primaryContainer,
                  borderRadius: 12, paddingVertical: 14, alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.white }}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}
import { MaterialIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Currency, DEFAULT_CURRENCY, GLOBAL_CURRENCIES } from '../../data/constants';
import { BusinessProfile, businessService } from '../../services/business';
import { colors } from '../../styles/globals';

import { deleteCloudinaryAsset, pickAndUploadImage, uploadToCloudinary } from '@/lib/imageUpload';

import { useAssetUpload } from '@/hooks/useAssetUpload';
import { resolveCurrency } from '@/utils/currencySymbol';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { SignatureField } from '../../components/SignatureField';

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

// ─── Module-level components (TextInput stability) ───────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Text style={{
      fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 1,
      color: colors.onSurfaceVariant, marginBottom: 10,
    }}>
      {label}
    </Text>
  );
}

function TaxRateInput({
  value, onChange,
}: {
  value: string; onChange: (v: string) => void;
}) {
  return (
    <View style={{
      flexDirection: 'row', borderRadius: 10,
      borderWidth: 1.2, borderColor: '#d5d8e2', overflow: 'hidden',
      height: 52, backgroundColor: colors.white,
    }}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="0.00"
        placeholderTextColor="#a8aab8"
        keyboardType="decimal-pad"
        style={{
          flex: 1, fontFamily: 'Inter', fontSize: 15,
          color: colors.onSurface, paddingHorizontal: 14,
        }}
      />
      <View style={{
        width: 46, alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#f0f2f7',
        borderLeftWidth: 1, borderLeftColor: '#d5d8e2',
      }}>
        <Text style={{
          fontFamily: 'Inter', fontSize: 15, fontWeight: '600',
          color: colors.onSurfaceVariant,
        }}>
          %
        </Text>
      </View>
    </View>
  );
}

function RegNumberInput({
  value, onChange,
}: {
  value: string; onChange: (v: string) => void;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="e.g. BN-12345678"
      placeholderTextColor="#a8aab8"
      autoCapitalize="characters"
      style={{
        fontFamily: 'Inter', fontSize: 15, color: colors.onSurface,
        height: 52, borderRadius: 10, borderWidth: 1.2, borderColor: '#d5d8e2',
        paddingHorizontal: 14, backgroundColor: colors.white,
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

/**
 * Custom hex color picker. The hex input registers itself as the live
 * brand color the moment it's a valid 3- or 6-digit hex — no separate
 * "confirm" step required.
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

    if (HEX_PATTERN.test(next)) {
      onChange(next);
    }
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
            style={{
              flex: 1, fontFamily: 'Inter', fontSize: 15,
              color: colors.onSurface,
            }}
          />
        </View>
      </View>
      <Text style={{
        fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant,
      }}>
        {isValid ? 'This color is applied automatically.' : 'Enter a valid hex code, e.g. #1B2E5E'}
      </Text>
    </View>
  );
}

function normalizeHex(hex: string): string {
  return hex.trim().toLowerCase();
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OnboardingStep2() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [business,    setBusiness]    = useState<BusinessProfile | null>(null);

  const [currency,    setCurrency]    = useState<Currency>(DEFAULT_CURRENCY);
  const [chargeTax,   setChargeTax]   = useState(false);
  const [taxRate,     setTaxRate]     = useState('');
  const [regNumber,   setRegNumber]   = useState('');
  const [brandColor,  setBrandColor]  = useState('#1b2e5e');
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const [logoUrl,        setLogoUrl]        = useState('');

  const [signatureType, setSignatureType] = useState<'none' | 'text' | 'image'>('none');
  const [signatureText, setSignatureText] = useState('');
  const [signatureUrl,  setSignatureUrl]  = useState('');
  const [generalError,  setGeneralError]  = useState<string | null>(null);

  // Each owns its own uploading/error state now — no more hand-rolled
  // previous-value tracking per field.
  const logo = useAssetUpload(logoUrl, setLogoUrl);
  const signature = useAssetUpload(signatureUrl, setSignatureUrl);

  // Load the owner's business record so this screen reflects (and can
  // update) whatever was already saved in step 1 or a previous visit here.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const biz = await businessService.getMyBusiness();
        if (cancelled) return;

        setBusiness(biz);
        setCurrency(resolveCurrency(biz.currency));
        setChargeTax(biz.taxEnabled ?? false);
        setTaxRate(biz.taxRate ?? '');
        setRegNumber(biz.registrationNumber ?? '');
        setBrandColor(biz.brandColorOne || '#1b2e5e');
        setLogoUrl(biz.logoUrl ?? '');

        setSignatureType(biz.signatureType ?? 'none');
        setSignatureText(biz.signatureText ?? '');
        setSignatureUrl(biz.signatureUrl ?? '');
      } catch {
        // If this fails, the user can still fill the form; saving on Next will surface the error.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  

  async function handlePickLogo() {
    // pickAndUploadImage still handles the "show it right away" preview
    // internally via its onLocalPreview callback — the hook just wraps
    // the upload call itself and manages loading/error/revert.
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
    setSignatureUrl(fileUri); // immediate preview of the just-drawn signature
    await signature.run(
      () => uploadToCloudinary(
        fileUri,
        'business-signatures',
        undefined, // business-scoped, one slot per business — no resourceId needed
        'signature.png',
        ImageManipulator.SaveFormat.PNG, // preserve transparency for invoice overlay
      ),
      'Failed to upload signature. Please try drawing it again.',
    );
  }

  async function handleRemoveSignature() {
    // Only flip the segmented control to "None" once the delete actually
    // succeeds — no need to optimistically clear it and then untangle
    // reverting two pieces of state on failure.
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

  async function handleNext() {
    if (!business) {
      // Couldn't load the business record — don't block navigation, but don't
      // silently pretend the save happened either.
      setGeneralError('Your business details could not be loaded. You can update them later from Settings.');
      router.push('/(onboarding-tabs)/step-3' as never);
      return;
    }

    setSaving(true);
    setGeneralError(null);
    try {
      
      await businessService.updateBusiness(business.id, {
        currency: currency.code,
        taxEnabled: chargeTax,
        taxRate: chargeTax ? taxRate : '',
        registrationNumber: regNumber,
        brandColorOne: brandColor,
        logoUrl,
        signatureType,
        signatureText: signatureType === 'text' ? signatureText : '',
        signatureUrl: signatureType === 'image' ? signatureUrl : null,
      });
      router.push('/(onboarding-tabs)/step-3' as never);
    } catch (err) {
      setGeneralError(getErrorMessage(err, 'Something went wrong saving your details. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    router.back();
  }

  function handleSkip() {
    router.replace('/(onboarding-tabs)/step-3' as never);
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f6fb', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primaryContainer} />
      </SafeAreaView>
    );
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
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginRight: 12 }}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>

          <Text style={{
            flex: 1, textAlign: 'center',
            fontFamily: 'Inter', fontSize: 20, fontWeight: '800',
            color: colors.primaryContainer,
          }}>
            BillBuzz
          </Text>

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

        {/* ── Progress header ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 8,
          }}>
            <Text style={{
              fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 0.8,
              color: colors.onSurfaceVariant,
            }}>
              Step 2 of 3
            </Text>
            <Text style={{
              fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 0.8,
              color: colors.primaryContainer,
            }}>
              66% Complete
            </Text>
          </View>
          <StepProgress current={2} total={3} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
        >

          {/* Title */}
          <Text style={{
            fontFamily: 'Inter', fontSize: 30, fontWeight: '800',
            color: colors.primaryContainer, marginBottom: 8,
          }}>
            Business Details
          </Text>
          <Text style={{
            fontFamily: 'Inter', fontSize: 15, color: colors.onSurfaceVariant,
            lineHeight: 22, marginBottom: 24,
          }}>
            Configure your billing and identity settings for professional invoicing.
          </Text>

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

          {/* ── Card: Business Logo ── */}
          <View style={{
            backgroundColor: colors.white, borderRadius: 16,
            borderWidth: 1, borderColor: '#e2e5ef',
            padding: 18, marginBottom: 14,
            shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
          }}>
            <SectionLabel label="Business Logo" />
            <TouchableOpacity
              onPress={handlePickLogo}
              onLongPress={logoUrl ? handleRemoveLogo : undefined}
              disabled={logo.uploading}
              activeOpacity={0.8}
              style={{
                borderWidth: 1.5, borderColor: '#c8ccd8', borderStyle: logoUrl ? 'solid' : 'dashed',
                borderRadius: 12, paddingVertical: logoUrl ? 16 : 28,
                alignItems: 'center', justifyContent: 'center', gap: 8,
                backgroundColor: '#fafbfd',
              }}
            >
              {logoUrl ? (
                <>
                  <View>
                    <Image
                      source={{ uri: logoUrl }}
                      style={{ width: 72, height: 72, borderRadius: 12 }}
                      resizeMode="contain"
                    />
                    {logo.uploading && (
                      <View style={[
                        StyleSheet.absoluteFill,
                        {
                          backgroundColor: 'rgba(255,255,255,0.6)',
                          alignItems: 'center', justifyContent: 'center', borderRadius: 12,
                        },
                      ]}>
                        <ActivityIndicator color={colors.primaryContainer} size="small" />
                      </View>
                    )}
                  </View>
                  <Text style={{
                    fontFamily: 'Inter', fontSize: 12, fontWeight: '700',
                    color: colors.primaryContainer,
                  }}>
                    Change Logo · Hold to Remove
                  </Text>
                </>
              ) : logo.uploading ? (
                <ActivityIndicator color={colors.primaryContainer} />
              ) : (
                <>
                  <MaterialIcons name="upload-file" size={32} color={colors.primaryContainer} />
                  <Text style={{
                    fontFamily: 'Inter', fontSize: 13, fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: 0.8,
                    color: colors.primaryContainer,
                  }}>
                    Upload Logo
                  </Text>
                  <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
                    PNG, JPG up to 5MB
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {logo.error && (
              <Text style={{ fontFamily: 'Inter', fontSize: 12, color: '#ba1a1a', marginTop: 10 }}>
                {logo.error}
              </Text>
            )}
          </View>

          {/* ── Card: Currency + Tax ── */}
          <View style={{
            backgroundColor: colors.white, borderRadius: 16,
            borderWidth: 1, borderColor: '#e2e5ef',
            padding: 18, marginBottom: 14,
            shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
          }}>
            <SectionLabel label="Default Currency" />
            <TouchableOpacity
              onPress={() => setPickerOpen(true)}
              activeOpacity={0.8}
              style={{
                height: 52, borderRadius: 10, borderWidth: 1.2, borderColor: '#d5d8e2',
                backgroundColor: colors.white, paddingHorizontal: 14,
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 18,
              }}
            >
              <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.onSurface }}>
                {currency.symbol} - {currency.name}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={22} color={colors.onSurfaceVariant} />
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: '#e9ecef', marginBottom: 16 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: chargeTax ? 14 : 0 }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: colors.onSurface,
                }}>
                  Charge Tax
                </Text>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 1,
                }}>
                  Apply VAT/GST to invoices
                </Text>
              </View>
              <Switch
                value={chargeTax}
                onValueChange={setChargeTax}
                thumbColor={colors.white}
                trackColor={{ false: '#c5c6d0', true: colors.primaryContainer }}
                ios_backgroundColor="#c5c6d0"
              />
            </View>

            {chargeTax && (
              <>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: 1,
                  color: colors.onSurfaceVariant, marginBottom: 8,
                }}>
                  Tax Rate (%)
                </Text>
                <TaxRateInput value={taxRate} onChange={setTaxRate} />
              </>
            )}
          </View>

          {/* ── Card: Registration + Brand Color ── */}
          <View style={{
            backgroundColor: colors.white, borderRadius: 16,
            borderWidth: 1, borderColor: '#e2e5ef',
            padding: 18, marginBottom: 14,
            shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
          }}>
            <SectionLabel label="Registration No. (Optional)" />
            <RegNumberInput value={regNumber} onChange={setRegNumber} />

            <View style={{ height: 1, backgroundColor: '#e9ecef', marginVertical: 16 }} />

            <SectionLabel label="Brand Color" />
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
                  so a custom-picked color stays visibly represented in the row. */}

              {HEX_PATTERN.test(brandColor) &&
                !BRAND_COLORS.some(c => normalizeHex(c.hex) === normalizeHex(brandColor)) && (
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
              )}

              <TouchableOpacity
                onPress={() => setColorPickerOpen(true)}
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

          {/* ── Card: Signature ── */}
          <View style={{
            backgroundColor: colors.white, borderRadius: 16,
            borderWidth: 1, borderColor: '#e2e5ef',
            padding: 18, marginBottom: 14,
            shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
          }}>
            <SectionLabel label="Signature (Optional)" />
            <Text style={{
              fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 14,
            }}>
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

        </ScrollView>

        {/* ── Footer ── */}
        <View style={{
          flexDirection: 'row', gap: 12,
          paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 16,
          borderTopWidth: 1, borderTopColor: '#e2e5ef',
          backgroundColor: '#f5f6fb',
        }}>
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.8}
            style={{
              flex: 1, borderRadius: 14, paddingVertical: 16,
              borderWidth: 1.5, borderColor: colors.primaryContainer,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <MaterialIcons name="arrow-back" size={18} color={colors.primaryContainer} />
            <Text style={{
              fontFamily: 'Inter', fontSize: 15, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 0.6,
              color: colors.primaryContainer,
            }}>
              Back
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            disabled={saving}
            activeOpacity={0.85}
            style={{
              flex: 2, backgroundColor: colors.primaryContainer,
              borderRadius: 14, paddingVertical: 16,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 15, fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: 0.6, color: colors.white,
                }}>
                  Next
                </Text>
                <MaterialIcons name="arrow-forward" size={18} color={colors.white} />
              </>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* ── Currency picker modal ── */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setPickerOpen(false)}
        >
          <Pressable>
            <View style={{
              backgroundColor: colors.white,
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              paddingTop: 12, paddingBottom: insets.bottom + 24,
            }}>
              <View style={{
                width: 38, height: 4, borderRadius: 2,
                backgroundColor: '#d0d4de', alignSelf: 'center', marginBottom: 16,
              }} />

              <Text style={{
                fontFamily: 'Inter', fontSize: 17, fontWeight: '800',
                color: colors.onSurface, paddingHorizontal: 20, marginBottom: 12,
              }}>
                Select Currency
              </Text>

              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {GLOBAL_CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c.code}
                    onPress={() => { setCurrency(c); setPickerOpen(false); }}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingVertical: 14, paddingHorizontal: 20,
                      borderBottomWidth: 1, borderBottomColor: '#eef0f5',
                    }}
                  >
                    <Text style={{
                      flex: 1, fontFamily: 'Inter', fontSize: 15,
                      color: colors.onSurface,
                      fontWeight: currency.code === c.code ? '700' : '400',
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
        visible={colorPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setColorPickerOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 }}
          onPress={() => setColorPickerOpen(false)}
        >
          <Pressable>
            <View style={{
              backgroundColor: colors.white, borderRadius: 20, padding: 20,
            }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 17, fontWeight: '800',
                color: colors.onSurface, marginBottom: 16,
              }}>
                Custom Color
              </Text>

              <CustomColorInput value={brandColor} onChange={setBrandColor} />

              <TouchableOpacity
                onPress={() => setColorPickerOpen(false)}
                activeOpacity={0.85}
                style={{
                  marginTop: 20, backgroundColor: colors.primaryContainer,
                  borderRadius: 12, paddingVertical: 14, alignItems: 'center',
                }}
              >
                <Text style={{
                  fontFamily: 'Inter', fontSize: 14, fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: 0.6, color: colors.white,
                }}>
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
import { useBusiness } from '@/context/BusinessContext';
import { deleteCloudinaryAsset, pickAndUploadImage, pickImage, uploadToCloudinary } from '@/lib/imageUpload';
import { resolveCurrency } from '@/utils/currencySymbol';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { productService } from '../../../services/products';
import { colors } from '../../../styles/globals';





// ─── Assets ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../../../assets/images/logo.png') as number;

// ─── Reusable field wrapper ───────────────────────────────────────────────────
function FieldLabel({ text }: { text: string }) {
  return (
    <Text style={{
      fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.6,
      color: colors.onSurfaceVariant, marginBottom: 8,
    }}>
      {text}
    </Text>
  );
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: colors.white, borderRadius: 16,
      borderWidth: 1, borderColor: '#e9ecef',
      padding: 16, marginBottom: 16,
    }}>
      {children}
    </View>
  );
}

const INPUT_STYLE = {
  fontFamily: 'Inter' as const,
  fontSize: 15,
  color: colors.onSurface,
  height: 44,
  borderWidth: 1,
  borderColor: '#e9ecef',
  borderRadius: 10,
  paddingHorizontal: 14,
  backgroundColor: colors.surface,
};




// ─── Screen ───────────────────────────────────────────────────────────────────
export default function NewProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  // Only used in "new product" mode: the picked-but-not-yet-uploaded file,
  // staged locally because there's no product id yet to scope an upload
  // to. Uploaded for real once handleSave gets a real id back. If the
  // user abandons the screen, nothing was ever sent to Cloudinary —
  // there's nothing to clean up.
  const [pendingLocalImage, setPendingLocalImage] = useState<{ uri: string; mimeType: string } | null>(null);
  // Tracks the qty as last loaded from the server, so we can tell whether
  // the user actually changed it (edit mode only — new products have no
  // "original" to diff against).
  const [originalQty, setOriginalQty] = useState<number | null>(null);
  const [adjustReason, setAdjustReason] = useState('');
  const { business, isLoading: businessLoading } = useBusiness();
  const currencySymbol = business?.currency ? resolveCurrency(business.currency).symbol : '';


  // Populate form if editing an existing product
  useEffect(() => {
    if (!id) return;
    productService.get(id).then(p => {
      setName(p.name ?? '');
      setSku(p.sku ?? '');
      setImageUrl(p.imageUrl ?? '');
      setDescription(p.description ?? '');
      setPrice(String(Number(p.unitPrice) || ''));
      const qtyOnHand = Number(p.quantityOnHand) || 0;
      setQty(String(qtyOnHand));
      setOriginalQty(qtyOnHand);
      setReorderLevel(String(p.reorderLevel != null ? Number(p.reorderLevel) : 3));
      setIsActive(p.isActive ?? true);
    }).catch(() => {});
  }, [id]);

  const skuRef = useRef<TextInput>(null);
  const descRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);
  const qtyRef = useRef<TextInput>(null);
  const reorderRef = useRef<TextInput>(null);

  // Only meaningful in edit mode: has the qty field actually been changed
  // from what the server last reported?
  const qtyDelta = isEdit && originalQty != null ? parseInt(qty, 10) - originalQty : 0;
  const qtyChanged = isEdit && qtyDelta !== 0;

  async function handlePickImage() {
  const previous = imageUrl;
  try {
    if (isEdit && id) {
      // Editing an existing product — we already have a real id, so
      // upload straight away, same as logo/signature elsewhere.
      setUploadingImage(true);
      const url = await pickAndUploadImage(
        'product-images', 'product.jpg', (localUri) => setImageUrl(localUri), id,
      );
      if (url) setImageUrl(url);
    } else {
      // New product — no id to scope an upload to yet. Stage it locally;
      // handleSave uploads it once the product is created.
      const picked = await pickImage((localUri) => setImageUrl(localUri));
      if (picked) setPendingLocalImage(picked);
    }
  } catch (err) {
    setImageUrl(previous);
    Alert.alert('Error', getErrorMessage(err, 'Failed to upload image. Please try again.'));
  } finally {
    setUploadingImage(false);
  }
}

async function handleRemoveImage() {
  if (!isEdit || !id) {
    // Nothing was ever sent to Cloudinary for a staged-but-unsaved image —
    // clearing local state is the whole operation.
    setImageUrl('');
    setPendingLocalImage(null);
    return;
  }
  const previous = imageUrl;
  setImageUrl('');
  setUploadingImage(true);
  try {
    await deleteCloudinaryAsset('product-images', id);
  } catch (err) {
    setImageUrl(previous);
    Alert.alert('Error', getErrorMessage(err, 'Failed to remove image. Please try again.'));
  } finally {
    setUploadingImage(false);
  }
}

  const handleSave = async () => {

    
    if (!name.trim()) {
      Alert.alert('Missing Field', 'Please enter a product name.');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Missing Field', 'Please enter a valid unit price.');
      return;
    }
    if (qtyChanged && !adjustReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for this stock change.');
      return;
    }
    setSaving(true);

    try {
      const skuValue = sku.trim() || (isEdit ? null : undefined);
      let detailsSaved = false;
      let qtyUpdated = true;

      if (isEdit && id) {
        await productService.update(id, {
          name: name.trim(),
          sku: skuValue,
          description: description.trim(),
          unitPrice: parseFloat(price),
          reorderLevel: parseInt(reorderLevel, 10),
          isActive,
          imageUrl,
        });
        detailsSaved = true;

        if (qtyChanged) {
          try {
            await productService.adjustStock(id, {
              quantityChange: qtyDelta,
              reason: adjustReason.trim(),
            });
          } catch {
            qtyUpdated = false;
          }
        }
      } else {
        const created = await productService.create({
          name: name.trim(),
          sku: skuValue,
          description: description.trim(),
          unitPrice: parseFloat(price),
          quantityOnHand: parseInt(qty, 10),
          reorderLevel: parseInt(reorderLevel, 10),
          isActive,
        });
        detailsSaved = true;

        // Now that the product has a real id, upload the staged image (if
        // any) and attach it. A failure here doesn't undo the product —
        // it just means the image can be added again from the edit screen.
        if (pendingLocalImage) {
          try {
            const url = await uploadToCloudinary(
              pendingLocalImage.uri, 'product-images', created.id, 'product.jpg',
            );
            await productService.update(created.id, { imageUrl: url });
          } catch {
            // Non-fatal — product is saved either way.
          }
        }
      }

      // Update redirects to the product's own page; create keeps going back
      // to the list, matching your earlier "only update" scope.
      const redirectTarget =
        isEdit && id
          ? (`/(owner-tabs)/products/${id}` as never)
          : ('/(owner-tabs)/products' as never);

      // Fires the redirect exactly once, whichever path triggers first —
      // a button press, the alert being dismissed with no choice (Android
      // back button, via onDismiss), or the timeout fallback if neither fires.
      let redirected = false;
      const goToTarget = () => {
        if (redirected) return;
        redirected = true;
        router.replace(redirectTarget);
      };
      const autoRedirectTimer = setTimeout(goToTarget, 4000);
      const withAutoRedirect = (onPress?: () => void) => () => {
        clearTimeout(autoRedirectTimer);
        onPress?.();
        goToTarget();
      };

      if (detailsSaved && !qtyUpdated) {
        Alert.alert(
          'Partial Update',
          'Product details were saved, but the quantity adjustment failed. Please try updating the quantity again.',
          [{ text: 'OK', onPress: withAutoRedirect() }],
          { onDismiss: goToTarget },
        );
      } else {
        Alert.alert(
          isEdit ? 'Product Updated' : 'Product Saved',
          `"${name}" has been ${isEdit ? 'updated' : 'added to your inventory'}.`,
          [{ text: 'Done', onPress: withAutoRedirect() }],
          { onDismiss: goToTarget },
        );
      }
    } catch (err: any) {
      Alert.alert('Error', getErrorMessage(err, 'Could not save product. Please try again.'));
  } finally {
    setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>

      {/* ── Nav bar ──────────────────────────────────────────────────────────── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: colors.surface,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginRight: 8 }}
        >
          <MaterialIcons name="arrow-back-ios" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={LOGO} style={{ width: 28, height: 28, borderRadius: 7 }} resizeMode="contain" />
          <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: colors.primaryContainer }}>
            BillBuzz
          </Text>
        </View>
        
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >

          {/* ── Page header ──────────────────────────────────────────────────── */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 26, fontWeight: '800', color: colors.onSurface, lineHeight: 30, marginBottom: 4 }}>
                {isEdit ? 'Edit Product' : 'New Product'}
              </Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant }}>
                Define your inventory item details
              </Text>
            </View>
            <View style={{
              width: 48, height: 48, borderRadius: 12,
              backgroundColor: colors.primaryContainer,
              alignItems: 'center', justifyContent: 'center', marginLeft: 12,
            }}>
              <MaterialCommunityIcons name="package-variant-closed" size={24} color={colors.white} />
            </View>
          </View>

          {/* ── Image upload placeholder ──────────────────────────────────────── */}
          <FieldLabel text="Product Image" />
          <TouchableOpacity
            onPress={handlePickImage}
            onLongPress={imageUrl ? handleRemoveImage : undefined}
            disabled={uploadingImage}
            activeOpacity={0.75}
            style={{
              height: 140, borderRadius: 16, marginBottom: 20,
              borderWidth: 1.5, borderColor: colors.gray, borderStyle: imageUrl ? 'solid' : 'dashed',
              backgroundColor: colors.surface,
              alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}
          >
            {imageUrl ? (
              <View style={{ width: '100%', height: '100%' }}>
                <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                {uploadingImage && (
                  <View style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
                  ]}>
                    <ActivityIndicator color={colors.primaryContainer} size="small" />
                  </View>
                )}
                <View style={{
                  position: 'absolute', bottom: 8, right: 8,
                  backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
                  paddingHorizontal: 8, paddingVertical: 4,
                }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 11, color: colors.white }}>
                    Tap to change · Hold to remove
                  </Text>
                </View>
              </View>
            ) : uploadingImage ? (
              <ActivityIndicator color={colors.gray} />
            ) : (
              <>
                <MaterialCommunityIcons name="camera-plus-outline" size={36} color={colors.gray} />
                <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant }}>
                  Tap to upload
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* ── Name + SKU ───────────────────────────────────────────────────── */}
          <FormCard>
            <FieldLabel text="Product Name" />
            <TextInput
              style={{ ...INPUT_STYLE, marginBottom: 14 }}
              placeholder="e.g. Premium Hub"
              placeholderTextColor={colors.gray}
              value={name}
              onChangeText={setName}
              returnKeyType="next"
              onSubmitEditing={() => skuRef.current?.focus()}
            />
            <FieldLabel text="SKU / Identifier" />
            <TextInput
              ref={skuRef}
              style={INPUT_STYLE}
              placeholder="PRO-001"
              placeholderTextColor={colors.gray}
              value={sku}
              onChangeText={setSku}
              autoCapitalize="characters"
              returnKeyType="next"
              onSubmitEditing={() => descRef.current?.focus()}
            />
          </FormCard>

          {/* ── Description ──────────────────────────────────────────────────── */}
          <FormCard>
            <FieldLabel text="Description" />
            <TextInput
              ref={descRef}
              style={{
                fontFamily: 'Inter', fontSize: 14, color: colors.onSurface,
                minHeight: 90, borderWidth: 1, borderColor: '#e9ecef',
                borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
                backgroundColor: colors.surface, textAlignVertical: 'top',
              }}
              placeholder="Enter detailed product description..."
              placeholderTextColor={colors.gray}
              value={description}
              onChangeText={setDescription}
              multiline
              returnKeyType="next"
              blurOnSubmit
            />
          </FormCard>

          {/* ── Price + Qty + Reorder ─────────────────────────────────────────── */}
          <FormCard>
            <FieldLabel text={`Unit Price (${currencySymbol})`} />
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              height: 44, borderWidth: 1, borderColor: '#e9ecef',
              borderRadius: 10, paddingHorizontal: 14, marginBottom: 14,
              backgroundColor: colors.surface,
            }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.onSurfaceVariant }}>{currencySymbol}</Text>
              <TextInput
                ref={priceRef}
                style={{ flex: 1, fontFamily: 'Inter', fontSize: 15, color: colors.onSurface }}
                placeholder="0.00"
                placeholderTextColor={colors.gray}
                keyboardType="decimal-pad"
                value={price}
                onChangeText={setPrice}
                returnKeyType="next"
                onSubmitEditing={() => qtyRef.current?.focus()}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <FieldLabel text={isEdit ? 'Qty on Hand' : 'Starting Qty'} />
                <TextInput
                  ref={qtyRef}
                  style={INPUT_STYLE}
                  keyboardType="number-pad"
                  value={qty}
                  onChangeText={setQty}
                  returnKeyType="next"
                  onSubmitEditing={() => reorderRef.current?.focus()}
                />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel text="Reorder Level" />
                <TextInput
                  ref={reorderRef}
                  style={INPUT_STYLE}
                  keyboardType="number-pad"
                  value={reorderLevel}
                  onChangeText={setReorderLevel}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
              </View>
            </View>

            {/* Only shown in edit mode, only once the qty field actually
                diverges from what's on the server — new products don't
                need a "reason" for their starting stock. */}
            {qtyChanged && (
              <View style={{ marginTop: 14 }}>
                <FieldLabel text="Reason for Stock Change" />
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  backgroundColor: colors.errorContainer + '40', borderRadius: 8,
                  paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10,
                }}>
                  <MaterialIcons name="info-outline" size={14} color={colors.onSurfaceVariant} />
                  <Text style={{ fontFamily: 'Inter', fontSize: 11, color: colors.onSurfaceVariant, flex: 1 }}>
                    {qtyDelta > 0 ? `Adding ${qtyDelta} unit(s)` : `Removing ${Math.abs(qtyDelta)} unit(s)`} — this will be logged.
                  </Text>
                </View>
                <TextInput
                  value={adjustReason}
                  onChangeText={setAdjustReason}
                  placeholder="e.g. Stock count correction, damaged goods..."
                  placeholderTextColor={colors.gray}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  style={{
                    fontFamily: 'Inter', fontSize: 14, color: colors.onSurface,
                    minHeight: 60, borderWidth: 1, borderColor: '#e9ecef',
                    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                    backgroundColor: colors.surface,
                  }}
                />
              </View>
            )}
          </FormCard>

          {/* ── Is Active toggle ──────────────────────────────────────────────── */}
          <FormCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.onSurface, marginBottom: 3 }}>
                  Is Active
                </Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.error }}>
                  Owner visibility only
                </Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                thumbColor={colors.white}
                trackColor={{ false: '#c5c6d0', true: colors.secondary }}
                ios_backgroundColor="#c5c6d0"
              />
            </View>
          </FormCard>

          {/* ── Save button ───────────────────────────────────────────────────── */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
            style={{
              height: 56, borderRadius: 16, marginTop: 4,
              backgroundColor: colors.primaryContainer,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <>
                  <MaterialCommunityIcons name="package-variant-closed" size={20} color={colors.white} />
                  <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: colors.white }}>
                    {isEdit ? 'Update Product' : 'Save Product'}
                  </Text>
                </>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import api from '../lib/axios';

// These come back through Django's CamelCaseJSONRenderer, so the raw
// snake_case dict the view returns (api_key, cloud_name, public_id) arrives
// here already converted — apiKey, cloudName, publicId. timestamp/signature/
// overwrite have no underscore so they look the same either way, which is
// what made the mismatch easy to miss.
interface CloudinarySignaturePayload {
  signature: string;
  timestamp: number;
  apiKey:    string;
  cloudName: string;
  publicId:  string;
  overwrite: boolean;
}

const MAX_DIMENSION = 1024;
const MAX_PICKED_FILE_BYTES = 8 * 1024 * 1024;

async function getUploadSignature(folder: string, resourceId?: string): Promise<CloudinarySignaturePayload> {
  const { data } = await api.post<CloudinarySignaturePayload>('/api/business/cloudinary/signature/', {
    folder,
    resourceId,
  });
  return data;
}

export async function deleteCloudinaryAsset(folder: string, resourceId?: string): Promise<void> {
  await api.post('/api/business/cloudinary/remove/', { folder, resourceId });
}

async function prepareForUpload(
  uri: string,
  format: SaveFormat = SaveFormat.JPEG,
  maxDimension: number = MAX_DIMENSION,
): Promise<{ uri: string; mimeType: string }> {
  const actions = maxDimension ? [{ resize: { width: maxDimension } }] : [];
  const result = await manipulateAsync(uri, actions, { compress: 0.8, format });
  const mimeType = format === SaveFormat.PNG ? 'image/png' : 'image/jpeg';
  return { uri: result.uri, mimeType };
}

/**
 * Pick an image from the library and prep it (resize/compress), without
 * uploading anywhere. Use this when you don't have a real resourceId yet
 * (e.g. a product that hasn't been saved) — stage the local uri in your
 * own state and call uploadToCloudinary once you do have an id.
 */
export async function pickImage(
  onLocalPreview?: (localUri: string) => void,
): Promise<{ uri: string; mimeType: string } | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission needed', 'Allow photo library access to continue.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: true,
  });
  if (result.canceled || !result.assets?.[0]?.uri) return null;

  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > MAX_PICKED_FILE_BYTES) {
    Alert.alert('Image too large', 'Please choose a smaller image (under 8MB).');
    return null;
  }

  onLocalPreview?.(asset.uri);
  return prepareForUpload(asset.uri, SaveFormat.JPEG);
}

export async function uploadToCloudinary(
  fileUri: string,
  folder: string,
  resourceId: string | undefined,
  filename: string = 'upload.jpg',
  format: SaveFormat = SaveFormat.JPEG,
): Promise<string> {
  const sig = await getUploadSignature(folder, resourceId);
  // Signature pads are small line drawings, not photos — don't upscale
  // them to 1024px, that just blurs a crisp vector-ish stroke.
  const maxDimension = format === SaveFormat.PNG ? 0 : MAX_DIMENSION;
  const prepared = await prepareForUpload(fileUri, format, maxDimension);

  const form = new FormData();
  if (Platform.OS === 'web') {
    // RN's { uri, name, type } shape means nothing to a real browser
    // FormData — it just stringifies it to "[object Object]" and sends
    // that as the file content. On web we need an actual Blob.
    const blob = await (await fetch(prepared.uri)).blob();
    form.append('file', blob, filename);
  } else {
    // On native, this object shape is what RN's fetch/FormData
    // implementation specifically recognizes and streams as binary.
    form.append('file', { uri: prepared.uri, name: filename, type: prepared.mimeType } as unknown as Blob);
  }
  // These field names (api_key, public_id) are Cloudinary's own upload API
  // contract — unrelated to Django's camelCase renderer, so they stay
  // snake_case here even though we read sig.apiKey / sig.publicId above.
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('public_id', sig.publicId);
  form.append('overwrite', String(sig.overwrite));

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: form });
  } catch (err) {
    
    throw new Error(`Could not reach Cloudinary: ${err instanceof Error ? err.message : String(err)}`);
  }
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message || 'Cloudinary upload failed');
  return data.secure_url as string;
}


export async function pickAndUploadImage(
  folder: string,
  filename: string = 'upload.jpg',
  onLocalPreview?: (localUri: string) => void,
  resourceId?: string,
): Promise<string | null> {
  const picked = await pickImage(onLocalPreview);
  if (!picked) return null;
  return uploadToCloudinary(picked.uri, folder, resourceId, filename, SaveFormat.JPEG);
}
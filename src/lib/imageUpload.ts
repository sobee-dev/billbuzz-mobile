import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import api from '../lib/axios'; // your existing authenticated axios instance

interface CloudinarySignaturePayload {
  signature:  string;
  timestamp:  number;
  api_key:    string;
  cloud_name: string;
  folder:     string;
  public_id:  string;
}

/** Asks the backend for a short-lived, scoped upload signature. Auth (via
 *  the shared axios instance) is what ties this to the current user — the
 *  backend decides the folder/public_id, not the client. */
async function getUploadSignature(folder: string): Promise<CloudinarySignaturePayload> {
  const { data } = await api.post<CloudinarySignaturePayload>('/api/cloudinary/signature/', { folder });
  return data;
}

/**
 * Uploads a local file URI to Cloudinary via a signed request. The actual
 * binary upload still goes directly device -> Cloudinary (no bandwidth or
 * latency added to our own API) — only the authorization is server-issued.
 */
export async function uploadToCloudinary(
  fileUri: string,
  folder: string,
  filename: string = 'upload.png',
): Promise<string> {
  const sig = await getUploadSignature(folder);

  const form = new FormData();
  form.append('file', {
    uri: fileUri,
    name: filename,
    type: 'image/png',
  } as unknown as Blob);
  form.append('api_key', sig.api_key);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);
  form.append('public_id', sig.public_id);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`,
    { method: 'POST', body: form },
  );
  const data = await res.json();
  if (!data.secure_url) throw new Error('Cloudinary upload failed');
  return data.secure_url as string;
}

/**
 * Opens the photo library, and if the user picks an image, uploads it to
 * Cloudinary under the given folder. Returns null if the user cancels or
 * denies permission (permission denial already shows its own alert here,
 * so callers don't need to handle that case separately). Throws if the
 * upload itself fails — callers should catch and surface via getErrorMessage.
 */
export async function pickAndUploadImage(
  folder: string,
  filename: string = 'upload.png',
): Promise<string | null> {
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

  return uploadToCloudinary(result.assets[0].uri, folder, filename);
}
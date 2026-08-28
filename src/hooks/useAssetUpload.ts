import { getErrorMessage } from '@/utils/getErrorMessage';
import { useState } from 'react';

/**
 * Wraps the "save previous value, optimistically update, upload, revert
 * on failure" pattern that was previously copy-pasted per-field across
 * step-2.tsx, business-settings.tsx, and new.tsx (once for the logo,
 * once for the signature, once for the product image — same 15 lines,
 * three times). Doesn't change behavior, just removes the duplication.
 *
 * Usage:
 *   const logo = useAssetUpload(logoUrl, setLogoUrl);
 *   ...
 *   onPress={() => logo.run(() => pickAndUploadImage('business-logos', 'logo.jpg', setLogoUrl))}
 *   {logo.uploading && <ActivityIndicator />}
 *   {logo.error && <ErrorBanner text={logo.error} />}
 */
export function useAssetUpload(value: string, setValue: (v: string) => void) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(uploadFn: () => Promise<string | null>, fallbackErrorText?: string) {
    const previous = value;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadFn();
      if (result !== null) setValue(result);
    } catch (err) {
      setValue(previous);
      setError(getErrorMessage(err, fallbackErrorText ?? 'Upload failed. Please try again.'));
    } finally {
      setUploading(false);
    }
  }

  return { uploading, error, run, setError };
}
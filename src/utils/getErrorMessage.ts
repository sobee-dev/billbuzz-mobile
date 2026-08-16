export function getErrorMessage(err: any, fallback: string): string {
  // Request never reached the server, or the server never responded —
  // distinct from a validation rejection, so don't blur the two together.
  if (!err?.response) {
    return 'Network error — please check your connection and try again.';
  }

  const data = err.response.data;
  if (!data) return fallback;

  // DRF non-field/model-level errors (e.g. unique_together ValidationError)
  if (Array.isArray(data.__all__) && typeof data.__all__[0] === 'string') {
    return data.__all__[0];
  }

  // Plain string detail (DRF's default for permission/404/throttle errors)
  if (typeof data.detail === 'string') return data.detail;

  // Field-level errors — surface the first one found, prefixed with the
  // field name so "sku: already exists" reads clearly on its own.
  for (const [field, val] of Object.entries(data)) {
    if (field === 'detail') continue;

    if (Array.isArray(val)) {
      // Flat case: { sku: ["already exists"] }
      const firstString = val.find((v) => typeof v === 'string');
      if (firstString) return `${field}: ${firstString}`;

      // Nested case: { items: [{}, { quantity: ["required"] }] } —
      // DocumentItemSerializer-style per-row validation errors.
      for (const entry of val) {
        if (entry && typeof entry === 'object') {
          const nested = Object.entries(entry).find(
            ([, v]) => Array.isArray(v) && typeof v[0] === 'string'
          );
          if (nested) {
            const [nestedField, nestedMessages] = nested as [string, string[]];
            return `${field}.${nestedField}: ${nestedMessages[0]}`;
          }
        }
      }
    }
  }

  return fallback;
}
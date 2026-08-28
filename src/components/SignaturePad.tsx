import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from 'react-native';
import Signature from 'react-native-signature-canvas';
import { colors } from '../styles/globals';
/**
 * Freehand signature pad, built on react-native-signature-canvas instead
 * of a hand-rolled PanResponder + SVG implementation. That library wraps
 * the well-established signature_pad.js and is maintained specifically to
 * behave the same on iOS, Android, and web — which is exactly the part we
 * kept losing to platform differences when building it ourselves. There's
 * no Platform.OS branching left in this file; the library owns that.
 *
 * onSave receives a "data:image/png;base64,..." string, not a file path —
 * the caller decides what to do with it (see handleSignatureCapture in the
 * screens that use this: native writes it to a temp file first since
 * uploadToCloudinary's native path expects a real file:// uri; web can
 * pass the data uri straight through).
 */

let WebSignaturePad: any = null;
if (Platform.OS === 'web') {
  WebSignaturePad = require('react-signature-canvas').default;
}

export function SignaturePad({ onSave }: { onSave: (base64Png: string) => void }) {
  const webRef = useRef<any>(null);
  const ref = useRef<any>(null);
  const [saving, setSaving] = useState(false);

  function handleOK(base64Png: string) {
    setSaving(false);
    onSave(base64Png);
  }

  function handleEmpty() {
    // Save was tapped with nothing drawn — just reset, nothing to upload.
    setSaving(false);
  }

  function handleSave() {
    if (saving) return;
    setSaving(true);
    // Resolves to handleOK (has a drawing) or handleEmpty (blank pad).
    ref.current?.readSignature();
  }

  function handleClear() {
    ref.current?.clearSignature();
  }

  if (Platform.OS === 'web') {
    function handleWebSave() {
      if (saving || webRef.current?.isEmpty()) return;
      setSaving(true);
      const dataUrl = webRef.current.getTrimmedCanvas().toDataURL('image/png');
      setSaving(false);
      onSave(dataUrl);
    }

    return (
      <View>
        <View style={{
          height: 160, borderRadius: 12, borderWidth: 1.2,
          borderColor: '#d5d8e2', backgroundColor: colors.white, overflow: 'hidden',
        }}>
          <WebSignaturePad ref={webRef} penColor="#0000FF" canvasProps={{ style: { width: '100%', height: '100%' } }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <TouchableOpacity
            onPress={() => webRef.current?.clear()}
            disabled={saving}
            activeOpacity={0.8}
            style={{
              flex: 1, borderRadius: 10, paddingVertical: 12,
              borderWidth: 1.2, borderColor: '#d5d8e2',
              alignItems: 'center', backgroundColor: colors.white,
            }}
          >
            <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.onSurfaceVariant }}>
              Clear
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleWebSave}
            disabled={saving}
            activeOpacity={0.8}
            style={{
              flex: 1, borderRadius: 10, paddingVertical: 12,
              backgroundColor: colors.primaryContainer,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.white }}>
                Save Signature
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={{
        height: 160, borderRadius: 12, borderWidth: 1.2,
        borderColor: '#d5d8e2', backgroundColor: colors.white, overflow: 'hidden',
      }}>
        <Signature
          ref={ref}
          onOK={handleOK}
          onEmpty={handleEmpty}
          backgroundColor="transparent"
          penColor="#1a3d8f"
          // The library ships its own Clear/Save buttons inside the canvas
          // itself; we hide those and drive everything from our own
          // buttons below via the imperative ref methods instead, so the
          // rest of the screen's styling stays consistent.
          webStyle={`
            .m-signature-pad { box-shadow: none; border: none; }
            .m-signature-pad--body { border: none; }
            .m-signature-pad--footer { display: none; }
            body,html { background-color: transparent; }
          `}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <TouchableOpacity
          onPress={handleClear}
          disabled={saving}
          activeOpacity={0.8}
          style={{
            flex: 1, borderRadius: 10, paddingVertical: 12,
            borderWidth: 1.2, borderColor: '#d5d8e2',
            alignItems: 'center', backgroundColor: colors.white,
          }}
        >
          <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.onSurfaceVariant }}>
            Clear
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
          style={{
            flex: 1, borderRadius: 10, paddingVertical: 12,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.white }}>
              Save Signature
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
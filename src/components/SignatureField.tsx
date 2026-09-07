import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../styles/globals';
import { SignaturePad } from './SignaturePad';

export type SignatureType = 'none' | 'text' | 'image';

function SegmentTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center',
        backgroundColor: active ? colors.primaryContainer : 'transparent',
      }}
    >
      <Text style={{
        fontFamily: 'Inter', fontSize: 12, fontWeight: '700',
        color: active ? colors.white : colors.onSurfaceVariant,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function SignatureField({
  signatureType,
  signatureText,
  signatureUrl,
  uploading,
  onTypeChange,
  onTextChange,
  onDrawEnd,
  onRemoveImage,
}: {
  signatureType: SignatureType;
  signatureText: string;
  signatureUrl: string;
  uploading: boolean;
  onTypeChange: (type: SignatureType) => void;
  onTextChange: (text: string) => void;
  onDrawEnd: (fileUri: string) => void;
  onRemoveImage: () => void;
}) {
  const [padVisible, setPadVisible] = useState(false);

  function handleDrawSave(uri: string) {
    onDrawEnd(uri);
    setPadVisible(false); // close the modal the moment a stroke is saved
  }

  return (
    <View>
      <View style={{
        flexDirection: 'row', backgroundColor: '#f0f2f7',
        borderRadius: 10, padding: 4, marginBottom: 16,
      }}>
        <SegmentTab label="None" active={signatureType === 'none'} onPress={() => onTypeChange('none')} />
        <SegmentTab label="Draw" active={signatureType === 'image'} onPress={() => onTypeChange('image')} />
        <SegmentTab label="Text" active={signatureType === 'text'} onPress={() => onTypeChange('text')} />
      </View>

      {signatureType === 'text' && (
        <View>
          <TextInput
            value={signatureText}
            onChangeText={onTextChange}
            placeholder="e.g. Chike Ade, CEO"
            placeholderTextColor="#a8aab8"
            style={{
              fontFamily: 'Inter', fontSize: 15, color: colors.onSurface,
              height: 52, borderRadius: 10, borderWidth: 1.2, borderColor: '#d5d8e2',
              paddingHorizontal: 14, backgroundColor: colors.white, marginBottom: 12,
            }}
          />
          {signatureText.length > 0 && (
            <View style={{
              borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef',
              paddingVertical: 20, alignItems: 'center', backgroundColor: '#fafbfd',
            }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 26, fontStyle: 'italic', color: '#1a3d8f' }}>
                {signatureText}
              </Text>
            </View>
          )}
        </View>
      )}

      {signatureType === 'image' && (
        signatureUrl ? (
          // ── Saved signature preview — pen icon is intentionally absent here.
          // It only reappears once onRemoveImage clears signatureUrl.
          <View style={{ gap: 8 }}>
            <View style={{
              position: 'relative', height: 112, borderRadius: 12,
              borderWidth: 1, borderColor: '#d5d8e2', backgroundColor: '#f5f3f8',
              alignItems: 'center', justifyContent: 'center', padding: 16,
            }}>
              <Image source={{ uri: signatureUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              <TouchableOpacity
                onPress={onRemoveImage}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 26, height: 26, borderRadius: 13,
                  backgroundColor: '#ffdad6', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MaterialIcons name="close" size={16} color="#ba1a1a" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: '#1a5c2a' }}>
              ✓ Signature saved to cloud
            </Text>
          </View>
        ) : (
          // ── Empty state: placeholder box + pen icon that launches the modal
          <View>
            <View style={{
              position: 'relative', height: 112, borderRadius: 12,
              borderWidth: 1.5, borderColor: '#c8ccd8', borderStyle: 'dashed',
              backgroundColor: '#fafbfd', alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
                No signature yet
              </Text>

              <TouchableOpacity
                onPress={() => setPadVisible(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 30, height: 30, borderRadius: 15,
                  backgroundColor: colors.primaryContainer,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MaterialIcons name="edit" size={16} color={colors.white} />
              </TouchableOpacity>
            </View>

            {uploading && (
              <Text style={{
                fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant,
                marginTop: 8, textAlign: 'center',
              }}>
                Uploading signature…
              </Text>
            )}

            {/* ── Signature draw modal ── */}
            <Modal
              visible={padVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setPadVisible(false)}
            >
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                {/* Backdrop — a separate absolutely-filled layer, NOT a wrapper around the card */}
                <Pressable
                  style={[{ backgroundColor: 'rgba(0,0,0,0.45)' }, StyleSheet.absoluteFill]}
                  onPress={() => setPadVisible(false)}
                />

                {/* Card sits on top as an independent sibling — no Pressable wraps it,
                    so nothing here competes with the WebView for touch-move events */}
                <View
                  style={{
                    width: 320, backgroundColor: colors.white,
                    borderRadius: 16, padding: 16,
                    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
                  }}
                >
                  <Text style={{
                    fontFamily: 'Inter', fontSize: 13, fontWeight: '700',
                    color: colors.onSurface, marginBottom: 10, textAlign: 'center',
                  }}>
                    Draw your signature
                  </Text>
                  <SignaturePad onSave={handleDrawSave} />
                </View>
              </View>
            </Modal>
          </View>
        )
      )}
    </View>
  );
}
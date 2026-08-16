import { useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { colors } from '../styles/globals';

/**
 * Freehand signature pad. Touches are captured with PanResponder and
 * rendered as SVG strokes purely as local component state — nothing is
 * uploaded while drawing. Only when "Save Signature" is tapped does the
 * pad rasterize itself to a temp PNG file and call onSave, exactly once.
 *
 * This is deliberate: an earlier version called onSave (then named
 * onDrawEnd) after every single stroke, which meant a multi-stroke
 * signature triggered one Cloudinary upload per stroke — wasteful even
 * with unsigned uploads, and outright costly with signed ones, since each
 * upload also round-trips to our own signature-issuing endpoint first.
 * Explicit Clear/Save keeps this to exactly one upload per signature.
 */
export function SignaturePad({ onSave }: { onSave: (fileUri: string) => void }) {
  const [strokes, setStrokes] = useState<string[]>([]);
  const [activePath, setActivePath] = useState('');
  const [saving, setSaving] = useState(false);
  const activePathRef = useRef('');
  const padRef = useRef<View>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        activePathRef.current = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        setActivePath(activePathRef.current);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        activePathRef.current += ` L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        setActivePath(activePathRef.current);
      },
      onPanResponderRelease: () => {
        if (!activePathRef.current) return;
        setStrokes(prev => [...prev, activePathRef.current]);
        activePathRef.current = '';
        setActivePath('');
      },
    })
  ).current;

  function handleClear() {
    setStrokes([]);
    setActivePath('');
    activePathRef.current = '';
  }

  async function handleSave() {
    if (strokes.length === 0 || saving) return;
    setSaving(true);
    try {
      const uri = await captureRef(padRef, { format: 'png', quality: 1, result: 'tmpfile' });
      onSave(uri);
    } catch {
      // Parent surfaces an error if the resulting upload fails; a capture
      // failure here just means Save didn't produce anything to hand off.
    } finally {
      setSaving(false);
    }
  }

  const hasDrawing = strokes.length > 0;

  return (
    <View>
      <View
        ref={padRef}
        collapsable={false}
        {...panResponder.panHandlers}
        style={{
          height: 160, borderRadius: 12, borderWidth: 1.2,
          borderColor: '#d5d8e2', backgroundColor: colors.white, overflow: 'hidden',
        }}
      >
        <Svg width="100%" height="100%">
          {strokes.map((d, i) => (
            <Path key={i} d={d} stroke={colors.onSurface} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {activePath !== '' && (
            <Path d={activePath} stroke={colors.onSurface} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </Svg>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <TouchableOpacity
          onPress={handleClear}
          disabled={saving || !hasDrawing}
          activeOpacity={0.8}
          style={{
            flex: 1, borderRadius: 10, paddingVertical: 12,
            borderWidth: 1.2, borderColor: '#d5d8e2',
            alignItems: 'center', backgroundColor: colors.white,
            opacity: !hasDrawing ? 0.5 : 1,
          }}
        >
          <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.onSurfaceVariant }}>
            Clear
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !hasDrawing}
          activeOpacity={0.8}
          style={{
            flex: 1, borderRadius: 10, paddingVertical: 12,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center', justifyContent: 'center',
            opacity: !hasDrawing ? 0.5 : 1,
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
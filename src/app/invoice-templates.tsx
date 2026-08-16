import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { businessService } from '../services/business';
import { colors } from '../styles/globals';

// ─── Template data ────────────────────────────────────────────────────────────
// Note: TemplateId is intentionally a superset of BusinessProfile['selectedTemplateId']
// ('modern' | 'classic' | 'minimal') — 'professional' stays local-only and unselectable
// until its card above is uncommented and the backend actually supports it.

type TemplateId = 'classic' | 'modern' | 'minimal' | 'professional';
type SavedTemplateId = 'modern' | 'classic' | 'minimal';

interface Template {
  id:          TemplateId;
  name:        string;
  description: string;
  icon:        React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  tag?:        string;
  tagColor?:   string;
  tagBg?:      string;
  accent:      string;
  preview:     { headerBg: string; accentLine: string; lineColors: string[] };
}

const TEMPLATES: Template[] = [
  {
    id:          'classic',
    name:        'Classic',
    description: 'Traditional layout with a clean header block and line-item table. Works universally across industries.',
    icon:        'file-document-outline',
    tag:         'DEFAULT',
    tagColor:    colors.onSecondaryContainer,
    tagBg:       colors.secondaryContainer,
    accent:      colors.primaryContainer,
    preview:     { headerBg: '#e8ecf5', accentLine: colors.primaryContainer, lineColors: ['#c8cdd9', '#d8dce7', '#e4e7ef'] },
  },
  {
    id:          'modern',
    name:        'Modern',
    description: 'Bold header with contrasting accent. Great for tech companies and creative studios.',
    icon:        'lightning-bolt',
    tag:         'POPULAR',
    tagColor:    '#755700',
    tagBg:       '#fff3cd',
    accent:      colors.primaryContainer,
    preview:     { headerBg: colors.primaryContainer, accentLine: colors.secondaryContainer, lineColors: ['#c8cdd9', '#d8dce7', '#e4e7ef'] },
  },
  {
    id:          'minimal',
    name:        'Minimal',
    description: 'Whitespace-first design with light dividers and understated typography. Perfect for freelancers.',
    icon:        'view-sequential',
    accent:      '#555',
    preview:     { headerBg: '#f8f8fa', accentLine: '#bbb', lineColors: ['#e0e0e4', '#e8e8ec', '#f0f0f3'] },
  },
  // {
  //   id:          'professional',
  //   name:        'Professional',
  //   description: 'Two-column header with company logo placement and a footer signature line. Ideal for enterprises.',
  //   icon:        'briefcase-outline',
  //   tag:         'NEW',
  //   tagColor:    '#1a5c2a',
  //   tagBg:       '#d4edda',
  //   accent:      '#1b5e20',
  //   preview:     { headerBg: '#e8f5e9', accentLine: '#1b5e20', lineColors: ['#c8d8ca', '#d8e4d9', '#e4ede5'] },
  // },
];

// ─── Module-level components ──────────────────────────────────────────────────

function TemplatePreview({ template }: { template: Template }) {
  const { preview } = template;
  return (
    <View style={{
      width: '100%', height: 110, borderRadius: 10,
      backgroundColor: '#fff', overflow: 'hidden',
      borderWidth: 1, borderColor: '#e9ecef',
    }}>
      {/* Header bar */}
      <View style={{ height: 28, backgroundColor: preview.headerBg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 6 }}>
        <View style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: preview.accentLine, opacity: 0.9 }} />
        <View style={{ flex: 1 }}>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: preview.accentLine, width: '55%', opacity: 0.7, marginBottom: 3 }} />
          <View style={{ height: 3, borderRadius: 2, backgroundColor: preview.accentLine, width: '38%', opacity: 0.45 }} />
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <View style={{ height: 3, width: 30, borderRadius: 2, backgroundColor: preview.accentLine, opacity: 0.55 }} />
          <View style={{ height: 3, width: 22, borderRadius: 2, backgroundColor: preview.accentLine, opacity: 0.35 }} />
        </View>
      </View>

      {/* Accent divider */}
      <View style={{ height: 2, backgroundColor: preview.accentLine }} />

      {/* Line items */}
      <View style={{ padding: 8, gap: 5 }}>
        {preview.lineColors.map((c, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ height: 5, borderRadius: 2, flex: 3, backgroundColor: c }} />
            <View style={{ height: 5, borderRadius: 2, flex: 1, backgroundColor: c, opacity: 0.65 }} />
            <View style={{ height: 5, borderRadius: 2, width: 28, backgroundColor: c, opacity: 0.8 }} />
          </View>
        ))}
      </View>

      {/* Footer line */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: preview.accentLine, opacity: 0.35 }} />
    </View>
  );
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: Template;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.82}
      style={{
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.primaryContainer : '#e9ecef',
        padding: 16,
        marginBottom: 14,
        shadowColor: colors.primaryContainer,
        shadowOffset: { width: 0, height: selected ? 4 : 2 },
        shadowOpacity: selected ? 0.14 : 0.05,
        shadowRadius: selected ? 8 : 4,
        elevation: selected ? 4 : 1,
      }}
    >
      {/* Preview image */}
      <TemplatePreview template={template} />

      {/* Name row */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        marginTop: 12, marginBottom: 4, gap: 8,
      }}>
        <View style={{
          width: 30, height: 30, borderRadius: 8,
          backgroundColor: selected ? colors.primaryContainer : colors.primaryContainer + '12',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <MaterialCommunityIcons
            name={template.icon}
            size={16}
            color={selected ? colors.white : colors.primaryContainer}
          />
        </View>
        <Text style={{
          fontFamily: 'Inter', fontSize: 15, fontWeight: '700',
          color: colors.onSurface, flex: 1,
        }}>
          {template.name}
        </Text>

        {/* Badge tag */}
        {template.tag && (
          <View style={{
            backgroundColor: template.tagBg,
            borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9,
          }}>
            <Text style={{
              fontFamily: 'Inter', fontSize: 10, fontWeight: '800',
              textTransform: 'uppercase', letterSpacing: 0.6,
              color: template.tagColor,
            }}>
              {template.tag}
            </Text>
          </View>
        )}

        {/* Selected check */}
        {selected && (
          <View style={{
            width: 22, height: 22, borderRadius: 11,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <MaterialIcons name="check" size={14} color={colors.white} />
          </View>
        )}
      </View>

      {/* Description */}
      <Text style={{
        fontFamily: 'Inter', fontSize: 13,
        color: colors.onSurfaceVariant, lineHeight: 19,
        marginLeft: 38,
      }}>
        {template.description}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function InvoiceTemplatesScreen() {
  const router = useRouter();

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [bizId,    setBizId]    = useState<string | null>(null);
  const [selected, setSelected] = useState<TemplateId>('classic');

  // Load whichever template is actually saved on the business, rather than
  // always defaulting the picker to Classic regardless of the real value.
  useEffect(() => {
    let cancelled = false;

    businessService.getMyBusiness().then(b => {
      if (cancelled) return;
      setBizId(b.id);
      setSelected(b.selectedTemplateId ?? 'classic');
    }).catch(() => {
      // Non-fatal — the picker still works locally, it just can't confirm
      // the current saved state; Apply will surface the real error.
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  async function handleSave() {
    if (selected === 'professional') {
      // Guard against the disabled/commented-out card ever being selectable.
      Alert.alert('Not Available', 'The Professional template is not available yet.');
      return;
    }
    if (!bizId) {
      Alert.alert('Error', 'Your business details are still loading. Please try again in a moment.');
      return;
    }

    setSaving(true);
    try {
      await businessService.updateBusiness(bizId, {
        selectedTemplateId: selected as SavedTemplateId,
      });
      Alert.alert(
        'Template Applied',
        `The "${TEMPLATES.find(t => t.id === selected)?.name}" template will be used for all new invoices.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch {
      Alert.alert('Error', 'Could not save your template selection. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primaryContainer} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>

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
        <View style={{ flex: 1 }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 17, fontWeight: '800',
            color: colors.onSurface,
          }}>
            Invoice Templates
          </Text>
          <Text style={{
            fontFamily: 'Inter', fontSize: 12,
            color: colors.onSurfaceVariant,
          }}>
            Choose your default invoice layout
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 110 }}
      >

        {/* ── Info banner ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 10,
          backgroundColor: colors.primaryContainer + '0d',
          borderRadius: 12, borderWidth: 1, borderColor: colors.primaryContainer + '25',
          paddingVertical: 12, paddingHorizontal: 14, marginBottom: 20,
        }}>
          <MaterialIcons name="info-outline" size={18} color={colors.primaryContainer} style={{ marginTop: 1 }} />
          <Text style={{
            flex: 1, fontFamily: 'Inter', fontSize: 13,
            color: colors.primaryContainer, lineHeight: 19,
          }}>
            The selected template applies to all created invoices and quotes.
          </Text>
        </View>

        {/* ── Template cards ── */}
        {TEMPLATES.map(t => (
          <TemplateCard
            key={t.id}
            template={t}
            selected={selected === t.id}
            onSelect={() => setSelected(t.id)}
          />
        ))}

        {/* ── Customise note ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingVertical: 14, paddingHorizontal: 14,
          backgroundColor: colors.white,
          borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef',
          marginTop: 4,
        }}>
          <MaterialCommunityIcons name="palette-outline" size={20} color={colors.onSurfaceVariant} />
          <Text style={{
            flex: 1, fontFamily: 'Inter', fontSize: 13,
            color: colors.onSurfaceVariant, lineHeight: 18,
          }}>
            Custom colour schemes and logo placement are available in the{' '}
            <Text style={{ fontWeight: '700', color: colors.primaryContainer }}>Pro plan</Text>.
          </Text>
        </View>

      </ScrollView>

      {/* ── Fixed footer ── */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.white,
        borderTopWidth: 1, borderTopColor: '#e9ecef',
        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 30,
      }}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          style={{
            backgroundColor: colors.primaryContainer,
            borderRadius: 14, paddingVertical: 16,
            alignItems: 'center',
          }}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={{
              fontFamily: 'Inter', fontSize: 16, fontWeight: '800',
              color: colors.white, letterSpacing: 0.3,
            }}>
              Apply Template
            </Text>
          )}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}
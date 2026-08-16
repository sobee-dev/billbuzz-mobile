import { getErrorMessage } from '@/utils/getErrorMessage';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BusinessProfile, businessService } from '../../services/business';
import { colors } from '../../styles/globals';

// ─── Template data ────────────────────────────────────────────────────────────

interface TemplateData {
  id:          string;
  name:        string;
  badge?:      string;
  badgeColor:  string;
  badgeBg:     string;
  accent:      string;
  headerStyle: 'filled' | 'split' | 'minimal';
}

const TEMPLATES: TemplateData[] = [
  {
    id: 'modern',  name: 'Modern Corporate',
    badge: 'RECOMMENDED', badgeColor: colors.onSecondaryContainer, badgeBg: colors.secondaryContainer,
    accent: colors.primaryContainer, headerStyle: 'filled',
  },
  {
    id: 'classic', name: 'Classic Clean',
    badge: 'POPULAR', badgeColor: '#1a5c2a', badgeBg: '#d4edda',
    accent: '#374151', headerStyle: 'split',
  },
  {
    id: 'minimal', name: 'Minimal Edge',
    badgeColor: colors.onSurfaceVariant, badgeBg: '#f0f0f4',
    accent: '#555', headerStyle: 'minimal',
  },
];

// ─── Module-level components ──────────────────────────────────────────────────

/** Scaled-down invoice document rendered entirely from Views */
function InvoiceMockup({ accent, headerStyle }: { accent: string; headerStyle: TemplateData['headerStyle'] }) {
  const isMinimal = headerStyle === 'minimal';
  const isSplit   = headerStyle === 'split';

  return (
    <View style={{
      width: '100%',
      backgroundColor: colors.white,
      borderRadius: 10, overflow: 'hidden',
      borderWidth: isMinimal ? 1 : 0, borderColor: '#d8dce7',
    }}>
      {/* Document header */}
      {isMinimal ? (
        /* Minimal: thin accent top border + white header */
        <View>
          <View style={{ height: 3, backgroundColor: accent }} />
          <View style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ gap: 4 }}>
              <View style={{ height: 6, width: 52, backgroundColor: accent, borderRadius: 3 }} />
              <View style={{ height: 3, width: 36, backgroundColor: '#d0d3da', borderRadius: 2 }} />
            </View>
            <View style={{ gap: 3, alignItems: 'flex-end' }}>
              <View style={{ height: 3, width: 28, backgroundColor: '#d0d3da', borderRadius: 2 }} />
              <View style={{ height: 3, width: 20, backgroundColor: '#d0d3da', borderRadius: 2 }} />
            </View>
          </View>
        </View>
      ) : isSplit ? (
        /* Split: light header with colour accent block */
        <View style={{ flexDirection: 'row', height: 52 }}>
          <View style={{ flex: 2, backgroundColor: '#f4f5f8', justifyContent: 'center', paddingLeft: 14 }}>
            <View style={{ height: 6, width: 44, backgroundColor: accent, borderRadius: 3, marginBottom: 4 }} />
            <View style={{ height: 3, width: 30, backgroundColor: '#c0c4cc', borderRadius: 2 }} />
          </View>
          <View style={{ flex: 1, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <View style={{ height: 3, width: 22, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 2 }} />
            <View style={{ height: 3, width: 16, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2 }} />
          </View>
        </View>
      ) : (
        /* Filled: solid colour header */
        <View style={{
          backgroundColor: accent, paddingVertical: 12, paddingHorizontal: 14,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' }} />
            <View>
              <View style={{ height: 4, width: 34, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 2, marginBottom: 2 }} />
              <View style={{ height: 2.5, width: 22, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 2 }} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 3 }}>
            <View style={{ height: 3, width: 24, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 2 }} />
            <View style={{ height: 2.5, width: 18, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2 }} />
          </View>
        </View>
      )}

      {/* Invoice body */}
      <View style={{ padding: 12 }}>
        {/* Bill to / invoice meta */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ gap: 3 }}>
            {[38, 50, 28].map((w, i) => (
              <View key={i} style={{ height: 3, width: w, backgroundColor: '#d0d3da', borderRadius: 2 }} />
            ))}
          </View>
          <View style={{ gap: 3, alignItems: 'flex-end' }}>
            {[30, 40].map((w, i) => (
              <View key={i} style={{ height: 3, width: w, backgroundColor: '#d0d3da', borderRadius: 2 }} />
            ))}
          </View>
        </View>

        {/* Table header */}
        <View style={{
          backgroundColor: accent, flexDirection: 'row',
          paddingVertical: 5, paddingHorizontal: 6, borderRadius: 3, marginBottom: 3,
        }}>
          {[{ flex: 3, label: 'DESC' }, { flex: 1, label: 'QTY' }, { flex: 1, label: 'RATE' }, { flex: 1, label: 'AMT' }]
            .map(col => (
              <View key={col.label} style={{ flex: col.flex }}>
                <View style={{ height: 2.5, width: col.label === 'DESC' ? 20 : 12, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 1 }} />
              </View>
            ))
          }
        </View>

        {/* Line item rows */}
        {[40, 55, 35, 48, 30, 42].map((w, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row', alignItems: 'center',
              paddingVertical: 4, paddingHorizontal: 6,
              backgroundColor: i % 2 === 1 ? '#f5f6fa' : colors.white,
              borderRadius: 2,
            }}
          >
            <View style={{ flex: 3 }}>
              <View style={{ height: 2.5, width: w, backgroundColor: '#c8ccd4', borderRadius: 2 }} />
            </View>
            {[1, 1, 1].map((_, j) => (
              <View key={j} style={{ flex: 1, alignItems: 'flex-end' }}>
                <View style={{ height: 2.5, width: 12, backgroundColor: '#c8ccd4', borderRadius: 2 }} />
              </View>
            ))}
          </View>
        ))}

        {/* Totals */}
        <View style={{ marginTop: 10, alignItems: 'flex-end', gap: 4 }}>
          {[{ w: 28, accent: false }, { w: 20, accent: false }, { w: 32, accent: true }].map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ height: 2.5, width: 26, backgroundColor: '#c8ccd4', borderRadius: 2 }} />
              <View style={{ height: 2.5, width: row.w, backgroundColor: row.accent ? accent : '#c8ccd4', borderRadius: 2 }} />
            </View>
          ))}
        </View>

        {/* Payment strip */}
        <View style={{
          marginTop: 10, backgroundColor: accent, borderRadius: 4,
          paddingVertical: 6, paddingHorizontal: 8,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <View style={{ gap: 3 }}>
            <View style={{ height: 3, width: 48, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 2 }} />
            <View style={{ height: 2.5, width: 32, backgroundColor: 'rgba(255,255,255,0.38)', borderRadius: 2 }} />
          </View>
          <View style={{ height: 3, width: 28, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 2 }} />
        </View>
      </View>
    </View>
  );
}

function TemplateCard({
  template, selected, onSelect,
}: {
  template: TemplateData; selected: boolean; onSelect: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.9}
      style={{
        backgroundColor: colors.white, borderRadius: 20,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.primaryContainer : '#e0e3ed',
        padding: 14, marginBottom: 16,
        shadowColor: colors.primaryContainer,
        shadowOffset: { width: 0, height: selected ? 6 : 2 },
        shadowOpacity: selected ? 0.15 : 0.05,
        shadowRadius: selected ? 10 : 4,
        elevation: selected ? 6 : 1,
      }}
    >
      {/* Preview area */}
      <View style={{ position: 'relative' }}>
        <View style={{
          backgroundColor: '#eff1f7', borderRadius: 12,
          padding: 14, paddingBottom: 18, marginBottom: 14,
          alignItems: 'center',
        }}>
          <InvoiceMockup accent={template.accent} headerStyle={template.headerStyle} />
        </View>

        {/* Selected check badge */}
        {selected && (
          <View style={{
            position: 'absolute', top: 10, right: 10,
            width: 30, height: 30, borderRadius: 15,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <MaterialIcons name="check" size={18} color={colors.white} />
          </View>
        )}
      </View>

      {/* Template label */}
      <View style={{ paddingHorizontal: 4, gap: 4 }}>
        {template.badge && (
          <View style={{ flexDirection: 'row' }}>
            <View style={{
              backgroundColor: template.badgeBg, borderRadius: 999,
              paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 10, fontWeight: '800',
                textTransform: 'uppercase', letterSpacing: 0.8,
                color: template.badgeColor,
              }}>
                {template.badge}
              </Text>
            </View>
          </View>
        )}
        <Text style={{
          fontFamily: 'Inter', fontSize: 22, fontWeight: '800',
          color: colors.onSurface,
        }}>
          {template.name}
        </Text>
      </View>
    </TouchableOpacity>
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


function getMissingFields(biz: BusinessProfile): string[] {
  const missing: string[] = [];
  if (!biz.name?.trim()) missing.push('Business name');
  if (!biz.currency?.trim()) missing.push('Default currency');
  if (biz.taxEnabled && (!biz.taxRate || Number(biz.taxRate) <= 0)) missing.push('Tax rate');
  if (!biz.brandColorOne?.trim()) missing.push('Brand color');
  if (!biz.selectedTemplateId) missing.push('Invoice template');
  return missing;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OnboardingStep3() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selected, setSelected] = useState<string>('modern');
  const [finishing, setFinishing] = useState(false);

  async function handleFinish() {
    setFinishing(true);
    try {
      const biz = await businessService.getMyBusiness();
      const updated = await businessService.updateBusiness(biz.id, {
        selectedTemplateId: selected as 'modern' | 'classic' | 'minimal',
      });

      const missing = getMissingFields(updated);
      if (missing.length === 0) {
        await businessService.completeOnboarding(updated.id);
      } else {
        Alert.alert(
          'A few details are still missing',
          `You can finish these later from Settings: ${missing.join(', ')}.`,
        );
      }
    } catch (err) {
      Alert.alert(
        'Setup incomplete',
        getErrorMessage(err, 'We could not confirm your business details were saved. You can finish setup later from Business Settings.'),
      );
    } finally {
      setFinishing(false);
      router.replace('/(owner-tabs)/dashboard' as never);
    }
  }

  function handleSkip() {
    router.replace('/(owner-tabs)/dashboard' as never);
  }

  function handleBack() {
    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f6fb' }} edges={['top']}>

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
            Step 3 of 3
          </Text>
          {/* Three dashes indicator (all active = all filled) */}
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[1, 2, 3].map(i => (
              <View key={i} style={{ width: 18, height: 4, borderRadius: 2, backgroundColor: colors.primaryContainer }} />
            ))}
          </View>
        </View>
        <StepProgress current={3} total={3} />
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
      >
        {/* Title */}
        <Text style={{
          fontFamily: 'Inter', fontSize: 30, fontWeight: '800',
          color: colors.primaryContainer, marginBottom: 8,
        }}>
          Choose your template
        </Text>
        <Text style={{
          fontFamily: 'Inter', fontSize: 15, color: colors.onSurfaceVariant,
          lineHeight: 22, marginBottom: 24,
        }}>
          Select the visual identity for your business invoices. You can change this later.
        </Text>

        {/* Template cards */}
        {TEMPLATES.map(t => (
          <TemplateCard
            key={t.id}
            template={t}
            selected={selected === t.id}
            onSelect={() => setSelected(t.id)}
          />
        ))}
      </ScrollView>

      {/* ── Footer ── */}
      <View style={{
        paddingHorizontal: 20, paddingTop: 14,
        paddingBottom: insets.bottom + 16,
        borderTopWidth: 1, borderTopColor: '#e2e5ef',
        backgroundColor: '#f5f6fb',
      }}>
        <TouchableOpacity
          onPress={handleFinish}
          disabled={finishing}
          activeOpacity={0.85}
          style={{
            backgroundColor: colors.primaryContainer, borderRadius: 14,
            paddingVertical: 17, flexDirection: 'row',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 10,
          }}
        >
          {finishing
            ? <ActivityIndicator color="#fff" />
            : <>
                <Text style={{ fontFamily: 'Inter', fontSize: 17, fontWeight: '800', color: colors.white }}>
                  Finish Setup
                </Text>
                <MaterialIcons name="chevron-right" size={22} color={colors.white} />
              </>
          }
        </TouchableOpacity>

        <Text style={{
          fontFamily: 'Inter', fontSize: 12, textAlign: 'center',
          color: colors.onSurfaceVariant,
        }}>
          Step 3 of 3 • Almost there
        </Text>
      </View>

    </SafeAreaView>
  );
}

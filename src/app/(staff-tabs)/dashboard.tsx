import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DOCS, DocRecord, DocStatus, fmt, total } from '../../data/constants';
import { documentService } from '../../services/documents';
import { staffService } from '../../services/staff';
import { colors } from '../../styles/globals';

// ─── Assets ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../../assets/images/logo.png') as number;

// ─── Status chip ──────────────────────────────────────────────────────────────
const ROW_STATUS: Record<DocStatus, { bg: string; fg: string; label: string }> = {
  draft:     { bg: colors.statusDraftBg,     fg: colors.statusDraftFg,     label: 'DRAFT'     },
  confirmed: { bg: colors.statusUnpaidBg,    fg: '#a05f00',                label: 'CONFIRMED' },
  delivered: { bg: colors.statusPaidBg,      fg: colors.statusPaidFg,      label: 'DELIVERED' },
  cancelled: { bg: colors.statusCancelledBg, fg: colors.statusCancelledFg, label: 'CANCELLED' },
};

function StatusChip({ status }: { status: DocStatus }) {
  const c = ROW_STATUS[status];
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: c.fg }}>
        {c.label}
      </Text>
    </View>
  );
}

function DocRow({ doc, onPress }: { doc: DocRecord; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 16, gap: 12,
        borderBottomWidth: 1, borderBottomColor: '#e9ecef',
      }}
    >
      <View style={{
        width: 40, height: 40, borderRadius: 8,
        backgroundColor: colors.statusDraftBg,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <MaterialIcons name="description" size={20} color={colors.onSurfaceVariant} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.onSurface }}>
          {doc.docNumber}
        </Text>
        <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
          {doc.client}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.onSurface }}>
          {fmt(total(doc))}
        </Text>
        <StatusChip status={doc.status} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const router = useRouter();

  const [recentDocs, setRecentDocs] = useState<DocRecord[]>(DOCS.slice(0, 4));
  const [dashStats,  setDashStats]  = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      staffService.getStaffDashboard()
        .then(data => setDashStats(data))
        .catch(() => {});
      documentService.list({ ordering: '-issued_date' })
        .then(data => {
          const results = data.results ?? data;
          if (Array.isArray(results) && results.length) setRecentDocs(results.slice(0, 4));
        })
        .catch(() => {});
    }, []),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>

      {/* ── Nav bar ──────────────────────────────────────────────────────────── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: colors.surface,
      }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={LOGO} style={{ width: 30, height: 30, borderRadius: 8 }} resizeMode="contain" />
          <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: colors.primaryContainer }}>
            BillBuzz
          </Text>
        </View>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="search" size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 }}
      >
        {/* Welcome */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: '800', color: colors.onSurface, lineHeight: 30 }}>
            Welcome back, Alex
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant, marginTop: 4 }}>
            Here's a summary of your performance today.
          </Text>
        </View>

        {/* ── Revenue card (full width) ────────────────────────────────────── */}
        <View style={{
          backgroundColor: colors.white, borderRadius: 16,
          padding: 20, marginBottom: 12,
          borderWidth: 1, borderColor: '#e9ecef',
          shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
          flexDirection: 'row', alignItems: 'center',
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontFamily: 'Inter', fontSize: 11, fontWeight: '600',
              textTransform: 'uppercase', letterSpacing: 0.6,
              color: colors.onSurfaceVariant, marginBottom: 6,
            }}>
              Revenue Generated
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 34, fontWeight: '800', color: colors.onSurface, marginBottom: 8 }}>
              $8,400
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialIcons name="trending-up" size={16} color={colors.secondary} />
              <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: colors.secondary }}>
                +12.5% from last week
              </Text>
            </View>
          </View>
          <View style={{
            width: 72, height: 72, borderRadius: 16,
            backgroundColor: colors.statusDraftBg,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <MaterialIcons name="payments" size={32} color={colors.gray} />
          </View>
        </View>

        {/* ── Two stat cards ───────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <View style={{
            flex: 1, backgroundColor: colors.white, borderRadius: 16, padding: 16,
            borderWidth: 1, borderColor: '#e9ecef',
            shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
          }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.onSurfaceVariant, marginBottom: 8 }}>
              Documents
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 30, fontWeight: '800', color: colors.onSurface, marginBottom: 6 }}>
              12
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
              Monthly quota: 85%
            </Text>
          </View>

          <View style={{
            flex: 1, backgroundColor: colors.white, borderRadius: 16, padding: 16,
            borderWidth: 1, borderColor: '#e9ecef',
            shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
          }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.onSurfaceVariant, marginBottom: 8 }}>
              Avg Trans.
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 30, fontWeight: '800', color: colors.onSurface, marginBottom: 6 }}>
              $700
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialIcons name="star" size={14} color={colors.secondary} />
              <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
                Top Staff
              </Text>
            </View>
          </View>
        </View>

        {/* ── Recent Documents ─────────────────────────────────────────────── */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: colors.onSurface }}>
              My Recent Documents
            </Text>
            <TouchableOpacity onPress={() => router.push('/(staff-tabs)/docs' as never)}>
              <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.primaryContainer }}>
                View All
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{
            backgroundColor: colors.white, borderRadius: 16, overflow: 'hidden',
            shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
          }}>
            {recentDocs.map((doc, i) => (
              <View key={doc.id} style={i === recentDocs.length - 1 ? { borderBottomWidth: 0 } : {}}>
                <DocRow
                  doc={doc}
                  onPress={() => router.push(`/doc-detail?id=${doc.id}` as never)}
                />
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

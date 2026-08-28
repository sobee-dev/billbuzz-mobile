import LoadingScreen from '@/components/LoadingScreen';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { resolveCurrency } from '@/utils/currencySymbol';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Document, DocumentStatus, documentService } from '../../services/documents';
import { StaffDashboardData, staffService } from '../../services/staff';
import { colors } from '../../styles/globals';

// ─── Assets ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../../assets/images/logo.png') as number;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmt(n: number, currency: string): string {
  return `${currency}${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

// A staff member's own dashboard only ever surfaces docs they're allowed to
// create — sales & proforma invoices. Supplier orders never show up here.
const STAFF_DOCUMENT_TYPES = ['sales_invoice', 'proforma_invoice'];

// ─── Status chip — matches Document.Status exactly, same set as the docs screen ──
const ROW_STATUS: Record<DocumentStatus, { bg: string; fg: string; label: string }> = {
  draft:     { bg: colors.statusDraftBg,               fg: colors.statusDraftFg ?? colors.onSurfaceVariant, label: 'DRAFT'     },
  unpaid:    { bg: colors.statusUnpaidBg ?? '#fff3e0',  fg: '#a05f00',                                       label: 'UNPAID'    },
  paid:      { bg: colors.statusPaidBg,                 fg: colors.statusPaidFg,                             label: 'PAID'      },
  delivered: { bg: colors.statusPaidBg,                 fg: colors.statusPaidFg,                             label: 'DELIVERED' },
  deleted:   { bg: colors.errorContainer,               fg: colors.error,                                    label: 'DELETED'   },
};

function StatusChip({ status }: { status: DocumentStatus }) {
  const c = ROW_STATUS[status];
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: c.fg }}>
        {c.label}
      </Text>
    </View>
  );
}

function DocRow({ doc, currency, onPress }: { doc: Document; currency: string;  onPress: () => void }) {
  const clientLabel = doc.customerName || doc.supplierName || '—';
  const displaySymbol = resolveCurrency(doc.currency || currency || 'USD').symbol;
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
          {doc.documentNumber}    
        </Text>
        <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurface }}>
          {clientLabel}  
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.onSurface }}>
          {fmtAmt(Number(doc.grandTotal), displaySymbol)}
        </Text>
        <StatusChip status={doc.status} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const { user } = useAuth();
  const { business, isLoading: businessLoading } = useBusiness();
  const router = useRouter();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [dashStats,  setDashStats]  = useState<StaffDashboardData | null>(null);

  // All hooks must run unconditionally, in the same order every render —
  // the businessLoading early return below has to come AFTER every hook
  // call, never before one, or React's hook-order invariant breaks.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      staffService.getMyDashboard()
        .then((data) => {
          if (cancelled) return;
          setDashStats(data);
        })
        .catch(() => {
          if (!cancelled) setDashStats(null);
        });

      documentService.list({ ordering: '-document_date', page: 1 })
        .then((data) => {
          if (cancelled) return;
          const results = Array.isArray(data) ? data : data.results ?? [];
          const ownDocs = results.filter(d => STAFF_DOCUMENT_TYPES.includes(d.documentType));
          setRecentDocs(ownDocs.slice(0, 4));
        })
        .catch(() => {
          if (!cancelled) setRecentDocs([]);
        });

      return () => { cancelled = true; };
    }, []),
  );

  if (businessLoading) return <LoadingScreen text="Loading your dashboard..." />;

  const currencyCode = business?.currency ?? '';
  const currencySymbol = currencyCode ? resolveCurrency(currencyCode).symbol : '';
  const displayName = user?.firstName || user?.email.split('@')[0] || 'there';

  const revenueValue = dashStats ? Number(dashStats.revenueGenerated) : null;
  const avgTransactionValue = dashStats ? Number(dashStats.avgTransactionValue) : null;
  const insets = useSafeAreaInsets();
  
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
        
      </View>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 }}
      >
        {/* Welcome */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: '800', color: colors.onSurface, lineHeight: 30 }}>
            Welcome back, {displayName}
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant, marginTop: 4 }}>
            Here's a summary of your performance for {business?.name}
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
            <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '800', color: colors.onSurface, marginBottom: 8 }}>
              {revenueValue !== null ? fmtAmt(revenueValue, currencySymbol) : '....'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              
              <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
                All-time total from your paid invoices
              </Text>
            </View>
          </View>
          {/* <View style={{
            width: 72, height: 72, borderRadius: 16,
            backgroundColor: colors.statusDraftBg,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <MaterialIcons name="payments" size={32} color={colors.gray} />
          </View> */}
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
            <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '800', color: colors.onSurface, marginBottom: 6 }}>
              {dashStats ? dashStats.documentsCreated : '—'}
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
              Total created by you
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
            <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '800', color: colors.onSurface, marginBottom: 6 }}>
              {avgTransactionValue !== null ? fmtAmt(avgTransactionValue, currencySymbol) : '—'}
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
              Per document
            </Text>
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
            {recentDocs.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant }}>
                  No recent documents found
                </Text>
              </View>
            ) : (
              recentDocs.map((doc, i) => (
                <View key={doc.id} style={i === recentDocs.length - 1 ? { borderBottomWidth: 0 } : {}}>
                  <DocRow
                    doc={doc}
                    currency={currencyCode}
                    
                    onPress={() => router.push(`/doc-detail?id=${doc.id}` as never)}
                  />
                </View>
              ))
            )}
          </View>
        </View>

      </ScrollView>
            {/* ── FAB ──────────────────────────────────────────────────────────────── */}
      <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setPickerVisible(true)}
              style={{
                position: 'absolute', bottom: 16, right: 16,
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: colors.primaryContainer,
                alignItems: 'center', justifyContent: 'center',
                shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
              }}
            >
              <MaterialIcons name="add" size={28} color={colors.white} />
            </TouchableOpacity>
      
            {/* ── Document type picker — sales & proforma only, no supplier orders ──── */}
            <Modal
              visible={pickerVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setPickerVisible(false)}
            >
              <Pressable
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                onPress={() => setPickerVisible(false)}
              >
                <Pressable>
                  <View style={{
                    backgroundColor: colors.white,
                    borderTopLeftRadius: 24, borderTopRightRadius: 24,
                    padding: 24, paddingBottom: insets.bottom + 24,
                  }}>
                    <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: colors.onSurface, marginBottom: 20 }}>
                      Create Document
                    </Text>
      
                    <TouchableOpacity
                      onPress={() => { setPickerVisible(false); router.push('/new-sales-invoice' as never); }}
                      activeOpacity={0.8}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 14,
                        backgroundColor: colors.surface, borderRadius: 14,
                        borderWidth: 1, borderColor: '#e9ecef',
                        padding: 16, marginBottom: 10,
                      }}
                    >
                      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.secondaryContainer, alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialIcons name="receipt-long" size={22} color={colors.onSecondaryContainer} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.onSurface, marginBottom: 2 }}>
                          Sales Invoice
                        </Text>
                        <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
                          Invoice with inline items, tax & discount
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
                    </TouchableOpacity>
      
                    <TouchableOpacity
                      onPress={() => { setPickerVisible(false); router.push('/new-document' as never); }}
                      activeOpacity={0.8}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 14,
                        backgroundColor: colors.surface, borderRadius: 14,
                        borderWidth: 1, borderColor: '#e9ecef',
                        padding: 16,
                      }}
                    >
                      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#e8eaf6', alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialIcons name="description" size={22} color={colors.primaryContainer} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.onSurface, marginBottom: 2 }}>
                          Proforma Invoice
                        </Text>
                        <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
                          Quote or proforma invoice
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
    </SafeAreaView>
  );
}
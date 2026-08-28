import LoadingScreen from '@/components/LoadingScreen';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeductInventoryModal, DeductItem } from '../../components/DeductInventoryModal';

import { productService } from '@/services/products';
import { resolveCurrency } from '@/utils/currencySymbol';
import { fmtDateTime } from '@/utils/formatDate';
import { RecentDocument, SummaryData, businessService } from '../../services/business';
import { DocumentStatus, DocumentType, documentService } from '../../services/documents';
import { ReportsDashboard, reportService } from '../../services/reports';
import { colors } from '../../styles/globals';
import { getDisplayName } from '../../utils/displayName';


// ─── Assets ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO      = require('../../../assets/images/logo.png')      as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO_GLOW = require('../../../assets/images/logo-glow.png') as number;


// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmt(n: number, currency: string): string {
  return `${currency}${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  sales_invoice:    'Sales',
  proforma_invoice: 'Proforma',
  purchase_invoice: 'Supplier',
};



// ─── Status chip ──────────────────────────────────────────────────────────────

// Matches Document.Status on the model exactly — draft, paid, unpaid, delivered, deleted.
const STATUS_CONFIG: Record<DocumentStatus, { bg: string; fg: string; label: string }> = {
  draft:     { bg: colors.statusDraftBg,     fg: colors.statusDraftFg ?? colors.onSurfaceVariant, label: 'DRAFT'     },
  unpaid:    { bg: colors.statusUnpaidBg ?? '#fff3e0', fg: '#a05f00',                              label: 'UNPAID'    },
  paid:      { bg: colors.statusPaidBg,      fg: colors.statusPaidFg,                              label: 'PAID'      },
  delivered: { bg: colors.statusPaidBg,      fg: colors.statusPaidFg,                              label: 'DELIVERED' },
  deleted:   { bg: colors.errorContainer,    fg: colors.error,                                      label: 'DELETED'   },
};


function StatusChip({ status }: { status: DocumentStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', color: c.fg }}>
        {c.label}
      </Text>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InsightRow({
  icon, iconBg, iconColor, label, sub, onPress,
}: {
  icon:      React.ComponentProps<typeof MaterialIcons>['name'];
  iconBg:    string;
  iconColor: string;
  label:     string;
  sub:       string;
  onPress:   () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 14, gap: 12,
        borderBottomWidth: 1, borderBottomColor: '#e9ecef',
      }}
    >
      <View style={{
        width: 42, height: 42, borderRadius: 12,
        backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center',
      }}>
        <MaterialIcons name={icon} size={21} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.onSurface }}>
          {label}
        </Text>
        <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 1 }}>
          {sub}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={18} color={colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}

function InvoiceRow({ doc, currency, currentUser, onPress, onLongPress }: {
  doc:         RecentDocument;
  currency:    string;
  currentUser: { id: string } | null | undefined;
  onPress:     () => void;
  onLongPress?: () => void;
}) {
  const typeShort = DOCUMENT_TYPE_LABEL[doc.documentType] ?? doc.documentType;
  const displaySymbol = resolveCurrency(doc.currency || currency).symbol;
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
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

      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.onSurface }}>
            {doc.documentNumber}
          </Text>
          <View style={{ backgroundColor: colors.primaryContainer, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', color: colors.white, letterSpacing: 0.4 }}>
              {typeShort}
            </Text>
          </View>
        </View>
        <Text style={{ fontFamily: 'Inter', fontSize: 9, color: colors.onSurfaceVariant }}>
          {fmtDateTime(doc.createdAt)}
          {doc.createdBy ? `  •  ${getDisplayName(doc.createdBy, currentUser)}` : ''}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.onSurface }}>
          {fmtAmt(doc.totalAmount, displaySymbol)}
        </Text>
        <StatusChip status={doc.status} />
      </View>
    </TouchableOpacity>
  );
}

interface StatCardProps {
  iconName:  React.ComponentProps<typeof MaterialIcons>['name'];
  iconBg:    string;
  iconColor: string;
  label:     string;
  value:     string;
  valueColor?: string;
  tone?:     'default' | 'alert' | 'success';
  currency?: string;
}

function StatCard({ iconName, iconBg, iconColor, currency, label, value, valueColor, tone = 'default' }: StatCardProps) {
  const TONE_STYLES = {
    default: { bg: colors.white, borderColor: 'transparent', borderWidth: 0, textColor: colors.onSurfaceVariant },
    alert:   { bg: '#fff0f0',    borderColor: colors.error,  borderWidth: 1.5, textColor: colors.error },
    success: { bg: '#e8f5e9',    borderColor: '#2e7d32',     borderWidth: 1.5, textColor: '#2e7d32' },
  } as const;
  const t = TONE_STYLES[tone];

  return (
    <View style={{
      flex: 1,
      backgroundColor: t.bg,
      borderRadius:    12,
      padding:         16,
      borderWidth:     t.borderWidth,
      borderColor:     t.borderColor,
      minHeight:       160,
      justifyContent:  'space-between',
      shadowColor:     colors.primaryContainer,
      shadowOffset:    { width: 0, height: 2 },
      shadowOpacity:   0.06,
      shadowRadius:    4,
      elevation:       2,
    }}>
      <View style={{
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: iconBg,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <MaterialIcons name={iconName} size={24} color={iconColor} />
      </View>
      <View style={{ gap: 2 }}>
        <Text style={{
          fontFamily: 'Inter', fontSize: 11, fontWeight: '600',
          textTransform: 'uppercase', letterSpacing: 0.5,
          color: tone === 'default' ? colors.onSurfaceVariant : t.textColor,
        }}>
          {label}
        </Text>
        <Text style={{
          fontFamily: 'Inter', fontSize: 22, fontWeight: '700',
          color: valueColor ?? (tone === 'default' ? colors.onSurface : t.textColor),
        }}>
          {currency}{value}
        </Text>
      </View>
    </View>
  );
}


// ─── Screen ───────────────────────────────────────────────────────────────────
export default function OwnerDashboard() {
  const { user } = useAuth();
  const { business, isLoading: businessLoading } = useBusiness();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [pickerVisible, setPickerVisible] = useState(false);
  const [deductVisible, setDeductVisible] = useState(false);
  const [deductItems,   setDeductItems]   = useState<DeductItem[]>([]);
  const [deductDocId,   setDeductDocId]   = useState<string | null>(null);
  const [deductLoading, setDeductLoading] = useState(false);

  const [recentDocs, setRecentDocs] = useState<RecentDocument[]>([]);
  const [stats,      setStats]      = useState<SummaryData | null>(null);
  const [imageError, setImageError] = useState(false);
  const lowStockCount = stats?.lowStockCount ?? 0;
  const hasLowStock = !!stats && lowStockCount > 0;
  const [report, setReport] = useState<ReportsDashboard | null>(null);


  // All hooks must run unconditionally, in the same order every render —
  // the businessLoading early return has to come AFTER every hook call,
  // never before one, or React's hook-order invariant breaks.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      businessService.getSummaryData()
        .then((s) => {
          if (cancelled) return;
          setStats(s);
          setRecentDocs(s.recentDocuments?.slice(0, 4) ?? []);
        })
        .catch(() => {
          if (cancelled) return;
          setStats(null);
          setRecentDocs([]);
        });
      reportService.getDashboard()
        .then((r) => {
          if (cancelled) return;
          setReport(r);
        })
        .catch(() => {
          if (cancelled) return;
          setReport(null);
        });
      return () => { cancelled = true; };
    }, []),
  );

  if (businessLoading) return <LoadingScreen text="Loading business details..." />;

  const displayName = user?.firstName || user?.email.split('@')[0] || 'User';
  const currencyCode = business?.currency ?? '';

  const currencySymbol = currencyCode ? resolveCurrency(currencyCode).symbol : '';

  // Long-press a sales invoice row -> fetch the real document (list rows don't
  // carry nested items) and build deduct rows keyed by the real DocumentItem.id.
  const handleLongPressInvoice = async (docId: string) => {
    setDeductLoading(true);
    try {
      const full = await documentService.get(docId);
      const trackedItems = (full.items ?? []).filter(li => li.product);

      if (trackedItems.length === 0) {
        Alert.alert('Nothing to Deduct', 'This invoice has no product-linked line items.');
        return;
      }

      const uniqueProductIds = [...new Set(trackedItems.map(li => li.product!))];
      const products = await Promise.all(uniqueProductIds.map(id => productService.get(id)));
      const productMap = new Map(products.map(p => [p.id, p]));

      const built: DeductItem[] = trackedItems.map(li => {
        const product = productMap.get(li.product!);
        return {
          itemId:       li.id,
          productId:    li.product!,
          name:         li.description,
          sku:          product?.sku ?? '—',
          invoicedQty:  Math.round(li.quantity),
          currentStock: product ? Math.round(Number(product.quantityOnHand)) : 0,
        };
      });

      setDeductItems(built);
      setDeductDocId(docId);
      setDeductVisible(true);
    } catch {
      Alert.alert('Error', 'Could not load this invoice for stock deduction.');
    } finally {
      setDeductLoading(false);
    }
  };

  const handleDeductApply = (deductions: { itemId: string; name: string; deductQty: number }[]) => {
    setDeductDocId(null);
    const lines = deductions
      .filter(d => d.deductQty > 0)
      .map(d => `  • ${d.name}: −${d.deductQty}`)
      .join('\n');
    Alert.alert('Inventory Updated', lines || 'No stock changes were made.');
  };

  const growthIsPositive = report ? !report.revenueGrowth.startsWith('-') && report.revenueGrowth !== '—' : true;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>

      {/* ── Top nav bar ──────────────────────────────────────────────────────── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: colors.surface,
      }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image
            source={LOGO}
            placeholder={{ blurhash: 'L5H2ld%200%14TIV00Rj?wS#xuay' }}
            style={{ width: 30, height: 30, borderRadius: 8 }}
            contentFit="contain"
            transition={200}
          />
          <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: colors.primaryContainer }}>
            BillBuzz
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => router.push('/settings')}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              overflow: 'hidden',
              borderWidth: 1.5,
              borderColor: colors.gray,
              backgroundColor: colors.secondaryContainer,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {business?.logoUrl && !imageError ? (
              <Image
                source={{ uri: business.logoUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={200}
                onError={() => setImageError(true)}
              />
            ) : (
              <MaterialIcons name="person" size={20} color={colors.onSurfaceVariant} />
            )}
          </Pressable>
        </View>
      </View>

      {/* ── Scrollable body ────────────────────────────────────────────────---- */}
      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 96 }}
        >
          {/* Welcome */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '700', color: colors.onSurface }}>
              {business?.name || 'Loading...'}
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant, marginTop: 2 }}>
              Welcome back, {displayName}
            </Text>
          </View>

          {/* ── Stats grid 2×2 ───────────────────────────────────────────────── */}
          <View style={{ gap: 12, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <StatCard
                iconName="payments"
                iconBg={colors.primaryContainer}
                iconColor={colors.white}
                label="Monthly Revenue"
                value={stats ? `${stats.monthlyRevenue?.toLocaleString() ?? '—'}` : '....'}
                currency={currencySymbol}
              />
              <StatCard
                iconName="pending-actions"
                iconBg={colors.secondaryContainer}
                iconColor={colors.onSecondaryContainer}
                label="Invoices This Month"
                value={stats ? `${stats.salesInvoicesIssuedThisMonth?.toLocaleString() ?? '—'}` : '....'}
                valueColor={colors.secondary}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <StatCard
                iconName="inventory-2"
                iconBg={colors.statusDraftBg}
                iconColor={colors.onSurfaceVariant}
                label="New Clients"
                value={stats ? `${stats.newClientsThisMonth ?? '—'}` : '—'}
              />
              <StatCard
                iconName={hasLowStock ? 'warning' : 'check-circle'}
                iconBg={hasLowStock ? colors.errorContainer : '#e8f5e9'}
                iconColor={hasLowStock ? colors.error : '#2e7d32'}
                label="Low Stock Alerts"
                value={stats ? `${lowStockCount} Items` : '0 Items'}
                tone={hasLowStock ? 'alert' : 'success'}
              />
            </View>
          </View>

          {/* ── Recent Documents ─────────────────────────────────────────────── */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: colors.onSurface }}>
                Recent Documents
              </Text>
              <TouchableOpacity onPress={() => router.push('/(owner-tabs)/docs' as never)}>
                <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.primaryContainer }}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{
              backgroundColor: colors.white,
              borderRadius: 12,
              overflow: 'hidden',
              shadowColor: colors.primaryContainer,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
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
                    <InvoiceRow
                      doc={doc}
                      currency={currencyCode}
                      currentUser={user}
                      onPress={() => router.push(`/doc-detail?id=${doc.id}` as never)}
                      onLongPress={doc.documentType === 'sales_invoice' ? () => handleLongPressInvoice(doc.id) : undefined}
                    />
                  </View>
                ))
              )}
            </View>
          </View>

          {/* ── Business Insights ────────────────────────────────────────────── */}
          <View style={{ marginBottom: 24 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 12,
            }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: colors.onSurface }}>
                Business Insights
              </Text>
              <TouchableOpacity onPress={() => router.push('/analytics' as never)}>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
                  letterSpacing: 0.6, textTransform: 'uppercase',
                  color: colors.primaryContainer,
                }}>
                  Full Report
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{
              backgroundColor: colors.white, borderRadius: 14,
              borderWidth: 1, borderColor: '#e9ecef', overflow: 'hidden',
              shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
              marginBottom: 12,
            }}>
              <InsightRow
                icon="inventory"
                iconBg="#e8f5e9"
                iconColor="#2e7d32"
                label="Stock Report"
                sub="Levels, alerts & total value"
                onPress={() => router.push('/stock-report' as never)}
              />
              <InsightRow
                icon="people-alt"
                iconBg={colors.secondaryContainer}
                iconColor={colors.onSecondaryContainer}
                label="Customer Analytics"
                sub="LTV, overdue & payment trends"
                onPress={() => router.push('/customer-analytics' as never)}
              />
              <InsightRow
                icon="receipt-long"
                iconBg={colors.primaryContainer + '14'}
                iconColor={colors.primaryContainer}
                label="View All Invoices"
                sub="Browse complete document history"
                onPress={() => router.push('/(owner-tabs)/docs' as never)}
              />
              <TouchableOpacity
                onPress={() => router.push('/analytics' as never)}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 14, paddingHorizontal: 14, gap: 12,
                }}
              >
                <View style={{
                  width: 42, height: 42, borderRadius: 12,
                  backgroundColor: colors.primaryContainer + '14',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <MaterialIcons name="analytics" size={21} color={colors.primaryContainer} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.primaryContainer }}>
                    Performance Dashboard
                  </Text>
                  <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 1 }}>
                    Revenue trends & owner advisory
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={18} color={colors.primaryContainer} />
              </TouchableOpacity>
            </View>

            
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push('/analytics' as never)}
              style={{ borderRadius: 16, overflow: 'hidden' }}
            >
              <ImageBackground source={LOGO_GLOW} style={{ height: 152 }} resizeMode="cover">
                <View style={{ ...StyleSheet.absoluteFill }}>
                  <View style={{ flex: 1, backgroundColor: 'rgba(1,24,72,0.02)' }} />
                  <View style={{ flex: 1, backgroundColor: 'rgba(1,24,72,0.22)' }} />
                  <View style={{ flex: 1, backgroundColor: 'rgba(1,24,72,0.55)' }} />
                  <View style={{ flex: 1, backgroundColor: 'rgba(1,24,72,0.85)' }} />
                </View>
                <View style={{ flex: 1, padding: 20, justifyContent: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <MaterialIcons name="lightbulb-outline" size={13} color={colors.secondaryContainer} />
                    <Text style={{
                      fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
                      textTransform: 'uppercase', letterSpacing: 0.8,
                      color: colors.secondaryContainer,
                    }}>
                      Owner Advisory
                    </Text>
                  </View>
                  <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: colors.white }}>
                    {!report || report.revenueGrowth === '—'
                      ? 'No revenue recorded yet'
                      : `Revenue is ${growthIsPositive ? 'up' : 'down'} ${report.revenueGrowth.replace('+', '').replace('-', '')} this month`}
                  </Text>
                  <Text style={{ fontFamily: 'Inter', fontSize: 13, color: 'rgba(255,255,255,0.72)', marginTop: 3 }}>
                    Tap to view full analytics →
                  </Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* ── FAB ──────────────────────────────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setPickerVisible(true)}
          style={{
            position:        'absolute',
            bottom:          16,
            right:           16,
            width:           56,
            height:          56,
            borderRadius:    28,
            backgroundColor: colors.primaryContainer,
            alignItems:      'center',
            justifyContent:  'center',
            shadowColor:     colors.primaryContainer,
            shadowOffset:    { width: 0, height: 4 },
            shadowOpacity:   0.35,
            shadowRadius:    10,
            elevation:       8,
          }}
        >
          <MaterialIcons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* ── Deduct stock modal (long-press on sales invoice) ─────────────────── */}
      <DeductInventoryModal
        documentId={deductDocId ?? ''}
        visible={deductVisible}
        onClose={() => { setDeductVisible(false); setDeductDocId(null); }}
        onApply={handleDeductApply}
        items={deductItems}      />

      {/* ── Document type picker ─────────────────────────────────────────────── */}
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
              <Text style={{
                fontFamily: 'Inter', fontSize: 18, fontWeight: '700',
                color: colors.onSurface, marginBottom: 20,
              }}>
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
                <View style={{
                  width: 44, height: 44, borderRadius: 12,
                  backgroundColor: colors.secondaryContainer,
                  alignItems: 'center', justifyContent: 'center',
                }}>
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
                <View style={{
                  width: 44, height: 44, borderRadius: 12,
                  backgroundColor: '#e8eaf6',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <MaterialIcons name="description" size={22} color={colors.primaryContainer} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.onSurface, marginBottom: 2 }}>
                    Proforma / Supplier Order
                  </Text>
                  <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
                    Quote, proforma invoice, or purchase order
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
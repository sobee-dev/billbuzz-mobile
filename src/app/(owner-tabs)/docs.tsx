import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { productService } from '@/services/products';
import { resolveCurrency } from '@/utils/currencySymbol';
import { fmtDateTime } from '@/utils/formatDate';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeductInventoryModal, DeductItem } from '../../components/DeductInventoryModal';
import { Document, DocumentStatus, DocumentType, documentService } from '../../services/documents';
import { colors } from '../../styles/globals';
import { getDisplayName } from '../../utils/displayName';
// ─── Assets ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../../assets/images/logo.png') as number;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmt(n: number, currency: string): string {
  return `${currency}${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

// ─── Filter config — mirrors the real Document.DocumentType / Document.Status enums ──

type TypeFilter = 'all' | DocumentType;

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all',               label: 'All'              },
  { key: 'sales_invoice',     label: 'Sales Invoice'    },
  { key: 'proforma_invoice',  label: 'Proforma Invoice' },
  { key: 'purchase_invoice',  label: 'Supplier Order' },
];

const STATUS_FILTERS: { key: DocumentStatus; label: string; dot: string }[] = [
  { key: 'draft',     label: 'Draft',     dot: colors.onSurfaceVariant },
  { key: 'unpaid',    label: 'Unpaid',    dot: '#a05f00'               },
  { key: 'paid',      label: 'Paid',      dot: colors.statusPaidFg     },
  { key: 'delivered', label: 'Delivered', dot: colors.primaryContainer },
  { key: 'deleted',   label: 'Deleted',   dot: colors.error            },
];

const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  sales_invoice:    'Sales',
  proforma_invoice: 'Proforma',
  purchase_invoice: 'Supplier',
};

// ─── Status chip config — matches Document.Status exactly, no invented states ────

interface ChipCfg { bg: string; fg: string; icon: string }

const CHIP: Record<DocumentStatus, ChipCfg> = {
  draft:     { bg: colors.statusDraftBg,               fg: colors.statusDraftFg ?? colors.onSurfaceVariant, icon: 'edit-note'    },
  unpaid:    { bg: colors.statusUnpaidBg ?? '#fff3e0',  fg: '#a05f00',                                       icon: 'money-off'    },
  paid:      { bg: colors.statusPaidBg,                 fg: colors.statusPaidFg,                             icon: 'payments'     },
  delivered: { bg: colors.statusPaidBg,                 fg: colors.statusPaidFg,                             icon: 'check-circle' },
  deleted:   { bg: colors.errorContainer,               fg: colors.error,                                    icon: 'cancel'       },
};

// ─── Module-level components ──────────────────────────────────────────────────

function DocChip({ status }: { status: DocumentStatus }) {
  const cfg = CHIP[status];
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: cfg.bg, borderRadius: 999,
      paddingVertical: 4, paddingHorizontal: 8,
    }}>
      <MaterialIcons name={cfg.icon as React.ComponentProps<typeof MaterialIcons>['name']} size={12} color={cfg.fg} />
      <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: cfg.fg }}>
        {status}
      </Text>
    </View>
  );
}

function DocCard({ doc, currency, currentUser, onPress, onLongPress }: {
  doc:         Document;
  currency:    string;
  currentUser: { id: string } | null | undefined;
  onPress:     () => void;
  onLongPress?: () => void;
}) {
  const clientLabel = doc.customerName || doc.supplierName || '—';
  const displaySymbol = resolveCurrency(doc.currency || currency).symbol;
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.85}
      style={{
        backgroundColor: colors.white, borderRadius: 16, padding: 16,
        marginBottom: 12,
        shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
      }}
    >
      {/* Row 1: doc number + amount */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <Text style={{
          fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
          textTransform: 'uppercase', letterSpacing: 0.8,
          color: colors.primaryContainer,
        }}>
          {doc.documentNumber}
        </Text>
        <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '800', color: colors.onSurface }}>
          {fmtAmt(Number(doc.grandTotal), displaySymbol)}
        </Text>
      </View>

      {/* Row 2: client name + type badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: colors.onSurface }}>
          {clientLabel}
        </Text>
        <View style={{ backgroundColor: colors.primaryContainer, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', color: colors.white, letterSpacing: 0.4 }}>
            {DOCUMENT_TYPE_LABEL[doc.documentType] ?? doc.documentType}
          </Text>
        </View>
      </View>

      {/* Row 3: date + status */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 9, color: colors.onSurfaceVariant }}>
          {fmtDateTime(doc.documentDate)}
          {doc.createdBy ? `  •  ${getDisplayName(doc.createdBy, currentUser)}` : ''}
        </Text>
        <DocChip status={doc.status} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DocsScreen() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search,        setSearch]        = useState('');
  const [activeType,    setActiveType]    = useState<TypeFilter>('all');
  const [activeStatus,  setActiveStatus]  = useState<DocumentStatus | 'all'>('all');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [deductVisible, setDeductVisible] = useState(false);
  const [deductItems,   setDeductItems]   = useState<DeductItem[]>([]);
  const [deductDocId,   setDeductDocId]   = useState<string | null>(null);
  const [deductLoading, setDeductLoading] = useState(false);
  const [docs,          setDocs]          = useState<Document[]>([]);
  const [imageError,    setImageError]    = useState(false);

  const currencyCode = business?.currency ?? '';

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      documentService.list({ ordering: '-document_date', page: 1 })
        .then((data) => {
          if (cancelled) return;
          const results = Array.isArray(data) ? data : data.results ?? [];
          setDocs(results);
        })
        .catch(() => {
          if (!cancelled) setDocs([]);
        });
      return () => { cancelled = true; };
    }, []),
  );

  const filtered = docs.filter(doc => {
    const matchesType   = activeType   === 'all' || doc.documentType === activeType;
    const matchesStatus = activeStatus === 'all' || doc.status === activeStatus;
    const q = search.toLowerCase();
    const matchesSearch = !q
      || doc.documentNumber.toLowerCase().includes(q)
      || (doc.customerName ?? '').toLowerCase().includes(q)
      || (doc.supplierName ?? '').toLowerCase().includes(q);
    return matchesType && matchesStatus && matchesSearch;
  });

  // Long-press a sales invoice card -> fetch the real document (list rows don't
  // carry nested items) and build deduct rows keyed by the real DocumentItem.id.
  // Mirrors the same flow on the owner dashboard.
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
    setDeductVisible(false);
    setDeductDocId(null);
    const lines = deductions
      .filter(d => d.deductQty > 0)
      .map(d => `  • ${d.name}: −${d.deductQty}`)
      .join('\n');
    Alert.alert('Inventory Updated', lines || 'No stock changes were made.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>

      {/* ── Nav bar ──────────────────────────────────────────────────────────── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: colors.surface,
      }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={LOGO} style={{ width: 30, height: 30, borderRadius: 8 }} contentFit="contain" />
          <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '800', color: colors.primaryContainer }}>
            BillBuzz
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => router.push('/settings')}
            style={{
              width: 34, height: 34, borderRadius: 17, overflow: 'hidden',
              borderWidth: 1.5, borderColor: colors.gray,
              backgroundColor: colors.secondaryContainer,
              justifyContent: 'center', alignItems: 'center',
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 }}>

        {/* ── Search bar ───────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, marginBottom: 16 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: colors.white, borderRadius: 999,
            borderWidth: 1.5, borderColor: '#e9ecef',
            paddingHorizontal: 16, height: 48,
          }}>
            <MaterialIcons name="search" size={20} color={colors.onSurfaceVariant} />
            <TextInput
              style={{ flex: 1, fontFamily: 'Inter', fontSize: 14, color: colors.onSurface }}
              placeholder="Search Document #, Customer..."
              placeholderTextColor={colors.gray}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialIcons name="close" size={18} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Type filter ──────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
        >
          {TYPE_FILTERS.map(f => {
            const active = activeType === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveType(f.key)}
                activeOpacity={0.8}
                style={{
                  paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999,
                  backgroundColor: active ? colors.primaryContainer : colors.white,
                  borderWidth: 1.5,
                  borderColor: active ? colors.primaryContainer : '#e9ecef',
                }}
              >
                <Text style={{
                  fontFamily: 'Inter', fontSize: 14, fontWeight: active ? '700' : '500',
                  color: active ? colors.white : colors.onSurface,
                }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Status filter ────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 16 }}
        >
          {STATUS_FILTERS.map(f => {
            const active = activeStatus === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveStatus(activeStatus === f.key ? 'all' : f.key)}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999,
                  backgroundColor: active ? '#f0f0f4' : colors.white,
                  borderWidth: 1.5,
                  borderColor: active ? colors.primaryContainer : '#e9ecef',
                }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: f.dot }} />
                <Text style={{
                  fontFamily: 'Inter', fontSize: 13, fontWeight: active ? '700' : '500',
                  color: active ? colors.primaryContainer : colors.onSurface,
                }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Document cards ───────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16 }}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <MaterialIcons name="find-in-page" size={48} color={colors.gray} />
              <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.onSurfaceVariant, marginTop: 12 }}>
                No documents found
              </Text>
            </View>
          ) : (
            filtered.map(doc => (
              <DocCard
                key={doc.id}
                doc={doc}
                currency={currencyCode}
                currentUser={user}
                onPress={() => router.push(`/doc-detail?id=${doc.id}` as never)}
                onLongPress={doc.documentType === 'sales_invoice' ? () => handleLongPressInvoice(doc.id) : undefined}
              />
            ))
          )}
        </View>

      </ScrollView>

      {/* ── Deduct stock modal (long-press on sales invoice) ─────────────────── */}
      <DeductInventoryModal
        documentId ={deductDocId ?? ''}
        visible={deductVisible}
        onClose={() => { setDeductVisible(false); setDeductDocId(null); }}
        onApply={handleDeductApply}
        items={deductItems}
      />

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
import { useBusiness } from '@/context/BusinessContext';
import { Product, productService } from '@/services/products';
import { resolveCurrency } from '@/utils/currencySymbol';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEFAULT_CURRENCY } from '../data/constants';
import { Customer, customerService } from '../services/customers';
import { DocumentItemPayload, documentService } from '../services/documents';
import { colors } from '../styles/globals';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id:        string;
  productId?: string;
  name:       string;
  qtyStr:     string;
  priceStr:   string;
}

// Only the two types this screen handles — sales_invoice has its own
// dedicated screen (new-sales-invoice.tsx).
type DocKind = 'proforma_invoice' | 'purchase_invoice';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DOC_PREFIX: Record<DocKind, string> = {
  proforma_invoice: 'PRO',
  purchase_invoice: 'PUR',
};

function fmtAmt(n: number, symbol: string): string {
  return `${symbol}${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function lineTotal(item: LineItem): number {
  return (parseFloat(item.qtyStr) || 0) * (parseFloat(item.priceStr) || 0);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function todayString(): string {
  const d  = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

// ─── Module-level components (stable refs — no keyboard regression) ───────────

function SuggestionList<T>({
  items, keyExtractor, renderLabel, renderSub, onSelect,
}: {
  items: T[];
  keyExtractor: (item: T) => string;
  renderLabel: (item: T) => string;
  renderSub?: (item: T) => string | undefined;
  onSelect: (item: T) => void;
}) {
  if (items.length === 0) return null;
  return (
    <View style={{
      backgroundColor: colors.white, borderRadius: 10,
      borderWidth: 1, borderColor: '#e9ecef',
      marginTop: 6, marginBottom: 14, overflow: 'hidden',
    }}>
      {items.map((item, idx) => (
        <TouchableOpacity
          key={keyExtractor(item)}
          onPress={() => onSelect(item)}
          activeOpacity={0.7}
          style={{
            paddingVertical: 10, paddingHorizontal: 14,
            borderBottomWidth: idx === items.length - 1 ? 0 : 1,
            borderBottomColor: '#f0f0f3',
          }}
        >
          <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.onSurface }}>
            {renderLabel(item)}
          </Text>
          {renderSub?.(item) ? (
            <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 1 }}>
              {renderSub(item)}
            </Text>
          ) : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function LineItemCard({
  item, currencySymbol, onEdit, onDelete,
}: {
  item:           LineItem;
  currencySymbol: string;
  onEdit:         () => void;
  onDelete:       () => void;
}) {
  const qty   = parseFloat(item.qtyStr)   || 0;
  const price = parseFloat(item.priceStr) || 0;
  const total = lineTotal(item);

  return (
    <View style={{
      backgroundColor: colors.white, borderRadius: 14,
      borderWidth: 1, borderColor: '#e9ecef',
      padding: 14, marginBottom: 12,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
        <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.onSurface, marginRight: 8 }}>
          {item.name}
        </Text>
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={{ marginRight: 10 }}>
          <MaterialIcons name="edit" size={18} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <MaterialIcons name="delete-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>

      <View style={{ height: 1, backgroundColor: '#e9ecef', marginBottom: 10 }} />

      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ flex: 1, flexDirection: 'row', gap: 24 }}>
          <View>
            <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: colors.onSurfaceVariant, marginBottom: 3 }}>
              QTY
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurface }}>
              {qty.toFixed(2)}
            </Text>
          </View>
          <View>
            <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: colors.onSurfaceVariant, marginBottom: 3 }}>
              Price
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurface }}>
              {fmtAmt(price, currencySymbol)}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: colors.onSurfaceVariant, marginBottom: 3 }}>
            Total
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '800', color: colors.primaryContainer }}>
            {fmtAmt(total, currencySymbol)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NewDocumentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { business } = useBusiness();

  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  // Prefill from client-detail's document picker — only meaningful for
  // proforma invoices (a customer, not a supplier), applied on initial
  // load only, never when editing an existing document.
  const {
    customerId:    prefillCustomerId,
    customerName:  prefillCustomerName,
    customerPhone: prefillCustomerPhone,
    customerEmail: prefillCustomerEmail,
  } = useLocalSearchParams<{
    customerId?: string; customerName?: string; customerPhone?: string; customerEmail?: string;
  }>();

  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [savedDocId, setSavedDocId] = useState<string | undefined>(id ?? undefined);

  const [docType, setDocType] = useState<DocKind>('proforma_invoice');
  const [documentDate] = useState(todayIso());

  // ── Currency + tax — follow the business's own settings, same convention
  // as new-sales-invoice.tsx: store the code, resolve the symbol for display.
  const [currencyCode, setCurrencyCode] = useState(business?.currency || DEFAULT_CURRENCY.code);
  const currencySymbol = resolveCurrency(currencyCode).symbol;
  const [taxRatePct, setTaxRatePct] = useState(String(business?.taxRate ?? 0));
  const taxRateTouchedRef = useRef(false);

  useEffect(() => {
    if (taxRateTouchedRef.current) return;
    if (business?.taxRate != null) setTaxRatePct(String(business.taxRate));
  }, [business?.taxRate]);

  // ── Proforma counterparty: a real customer, searchable ─────────────────────
  const [customerId,   setCustomerId]   = useState<string | undefined>(isEdit ? undefined : prefillCustomerId);
  const [customerName, setCustomerName] = useState(isEdit ? '' : (prefillCustomerName ?? ''));
  const [phone,          setPhone]          = useState(isEdit ? '' : (prefillCustomerPhone ?? ''));
  const [email,          setEmail]          = useState(isEdit ? '' : (prefillCustomerEmail ?? ''));
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);

  // ── Purchase counterparty: freeform — no supplier directory service exists ──
  const [supplierName, setSupplierName] = useState('');

  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);

  function handleDocTypeChange(next: DocKind) {
    setDocType(next);
    if (next === 'purchase_invoice') {
      // Suppliers aren't customers — a customer prefill/search doesn't
      // apply here, so drop it rather than silently carrying it over.
      setCustomerId(undefined);
      setCustomerName('');
      setPhone('');
      setEmail('');
      setCustomerResults([]);
    }
  }

  // ── Load existing document when editing ─────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    documentService.get(id)
      .then(data => {
        const kind: DocKind = data.documentType === 'purchase_invoice' ? 'purchase_invoice' : 'proforma_invoice';
        setDocType(kind);
        setCurrencyCode(data.currency || business?.currency || DEFAULT_CURRENCY.code);
        setNotes(data.notes ?? '');

        taxRateTouchedRef.current = true;
        setTaxRatePct(String((Number(data.taxRate ?? 0)) * 100));

        if (kind === 'proforma_invoice') {
          setCustomerId(data.customer ?? undefined);
          setCustomerName(data.customerName ?? '');
          setEmail(data.customerEmail ?? '');
          setPhone(data.customerPhone ?? '');
        } else {
          setSupplierName(data.supplierName ?? '');
        }

        if (Array.isArray(data.items)) {
          setItems(data.items.map((li, i) => ({
            id:      String(i + 1),
            name:    li.description,
            qtyStr:  String(li.quantity),
            priceStr: String(li.unitPrice),
          })));
        }
      })
      .catch(() => Alert.alert('Error', 'Could not load this document.'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Customer search (proforma only, debounced) ──────────────────────────────
  useEffect(() => {
    if (docType !== 'proforma_invoice' || customerId) {
      setCustomerResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      if (!customerName.trim()) { setCustomerResults([]); return; }
      setCustomerSearching(true);
      try {
        setCustomerResults(await customerService.search(customerName.trim()));
      } catch {
        setCustomerResults([]);
      } finally {
        setCustomerSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [customerName, customerId, docType]);

  

  const handleCustomerNameChange = (val: string) => {
    setCustomerName(val);
    if (customerId) setCustomerId(undefined);
  };

  const handleSelectCustomer = (c: Customer) => {
    setCustomerId(c.id);
    setCustomerName(c.fullName);
    setEmail(c.email ?? '');
    setPhone(c.phone ?? '');
    setCustomerResults([]);
  };

  // ── Modal state (add/edit line item) ────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem,  setEditingItem]  = useState<LineItem | null>(null);
  const [formName,     setFormName]     = useState('');
  const [formQty,      setFormQty]      = useState('1.00');
  const [formPrice,    setFormPrice]    = useState('');
  const [formProductId, setFormProductId] = useState<string | undefined>(undefined);
  const [productResults,   setProductResults]   = useState<Product[]>([]);
  const [productSearching, setProductSearching] = useState(false);

  const modalQtyRef   = useRef<TextInput>(null);
  const modalPriceRef = useRef<TextInput>(null);

  // ── Computed ────────────────────────────────────────────────────────────────
  const subtotal   = items.reduce((s, i) => s + lineTotal(i), 0);
  const taxRateNum = parseFloat(taxRatePct) || 0;
  const tax        = subtotal * taxRateNum / 100;
  const grandTotal = subtotal + tax;
  const docNumber  = `${DOC_PREFIX[docType]}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;


  useEffect(() => {
    if (!modalVisible) return;
    if (formProductId) return;
    const handle = setTimeout(async () => {
      if (!formName.trim()) { setProductResults([]); return; }
      setProductSearching(true);
      try {
        setProductResults(await productService.search(formName.trim()));
      } catch {
        setProductResults([]);
      } finally {
        setProductSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [formName, modalVisible, formProductId]);

  // ── Line item handlers ───────────────────────────────────────────────────────
  const openAdd = () => {
  setEditingItem(null);
  setFormName(''); setFormQty('1'); setFormPrice('');
  setFormProductId(undefined);
  setProductResults([]);
  setModalVisible(true);
  };

  const openEdit = (item: LineItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormQty(item.qtyStr);
    setFormPrice(item.priceStr);
    setFormProductId(item.productId);
    setProductResults([]);
    setModalVisible(true);
  };

  const deleteItem = (itemId: string) => {
    Alert.alert('Remove Item', 'Remove this line item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setItems(prev => prev.filter(i => i.id !== itemId)) },
    ]);
  };

  const saveItem = () => {
  if (!formName.trim()) {
    Alert.alert('Missing Field', 'Please enter an item name.'); return;
  }
  if (editingItem) {
    setItems(prev => prev.map(i =>
      i.id === editingItem.id
        ? { ...i, name: formName.trim(), qtyStr: formQty, priceStr: formPrice, productId: formProductId }
        : i
    ));
  } else {
    setItems(prev => [
      ...prev,
      { id: Date.now().toString(), name: formName.trim(), qtyStr: formQty || '1', priceStr: formPrice || '0.00', productId: formProductId },
    ]);
  }
  setModalVisible(false);
};

  const buildItemsPayload = (): DocumentItemPayload[] =>
    items.map(i => ({
      product:     i.productId,
      productName: i.productId ? undefined : i.name,
      description: i.name,
      quantity:    parseFloat(i.qtyStr)   || 0,
      unitPrice:   parseFloat(i.priceStr) || 0,
    }));

  // Common to both create and update. documentType is deliberately NOT
  // here — DocumentUpdatePayload excludes it entirely (a document's type
  // can't change after creation, matching the disabled toggle above), so
  // it's added only in the create-specific payload below.
  function buildCommonFields() {
    const counterparty = docType === 'proforma_invoice'
      ? {
          customer: customerId,
          customerName,
          customerEmail: email,
          customerPhone: phone,
        }
      : { supplierName };

    return {
      documentDate,
      currency: currencyCode,
      notes: notes.trim(),
      discount: 0,
      taxRate: taxRateNum / 100,
      items: buildItemsPayload(),
      ...counterparty,
    };
  }

  const validateBeforeSave = (): boolean => {
    if (docType === 'proforma_invoice' && !customerName.trim()) {
      Alert.alert('Missing Field', 'Please enter a customer name.'); return false;
    }
    if (docType === 'purchase_invoice' && !supplierName.trim()) {
      Alert.alert('Missing Field', 'Please enter a supplier name.'); return false;
    }
    if (items.length === 0) {
      Alert.alert('No Items', 'Add at least one line item.'); return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateBeforeSave()) return;
    setSaving(true);
    try {
      if (savedDocId) {
        const saved = await documentService.update(savedDocId, buildCommonFields());
        Alert.alert('Document Updated', `${saved.documentNumber ?? docNumber} has been updated successfully.`,
          [{ text: 'Done', onPress: () => router.back() }]);
      } else {
        const saved = await documentService.create({ documentType: docType, ...buildCommonFields() });
        setSavedDocId(saved.id);
        Alert.alert('Document Created', `${saved.documentNumber ?? docNumber} has been created successfully.`,
          [{ text: 'Done', onPress: () => router.back() }]);
      }
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'Could not save document. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  // const handleSaveDraft = async () => {
  //   if (items.length === 0) {
  //     Alert.alert('No Items', 'Add at least one line item before saving a draft.'); return;
  //   }
  //   setSaving(true);
  //   try {
  //     const saved = savedDocId
  //       ? await documentService.update(savedDocId, { status: 'draft', ...buildCommonFields() })
  //       : await documentService.create({ documentType: docType, status: 'draft', ...buildCommonFields() });
  //     setSavedDocId(saved.id);
  //     Alert.alert('Draft Saved', `${saved.documentNumber ?? docNumber} has been saved as a draft.`,
  //       [{ text: 'OK', onPress: () => router.back() }]);
  //   } catch (err) {
  //     Alert.alert('Error', getErrorMessage(err, 'Could not save draft. Please try again.'));
  //   } finally {
  //     setSaving(false);
  //   }
  // };

  const handleFormNameChange = (val: string) => {
    setFormName(val);
    if (formProductId) setFormProductId(undefined);
  };

  const handleSelectProduct = (p: Product) => {
    setFormName(p.name);
    setFormProductId(p.id);
    setFormPrice(String(p.unitPrice));
    setProductResults([]);
  };

 

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primaryContainer} />
      </SafeAreaView>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#e9ecef',
        backgroundColor: colors.surface,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="close" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={{
          flex: 1, fontFamily: 'Inter', fontSize: 17, fontWeight: '700',
          color: colors.onSurface, textAlign: 'center',
        }}>
          {isEdit ? 'Edit Document' : 'New Document'}
        </Text>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="more-vert" size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        >

          {/* Document type segmented control */}
          <Text style={{
            fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: 0.6,
            color: colors.onSurfaceVariant, marginBottom: 10,
          }}>
            Document Type
          </Text>
          <View style={{
            flexDirection: 'row',
            backgroundColor: '#ededf0', borderRadius: 12,
            padding: 4, marginBottom: 20,
          }}>
            {([
              { key: 'proforma_invoice' as const, label: 'Proforma' },
              { key: 'purchase_invoice' as const, label: 'Supplier Order' },
            ]).map(t => (
              <TouchableOpacity
                key={t.key}
                onPress={() => handleDocTypeChange(t.key)}
                disabled={isEdit}
                activeOpacity={0.8}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 9,
                  borderRadius: 9,
                  backgroundColor: docType === t.key ? colors.white : 'transparent',
                  shadowColor: docType === t.key ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: docType === t.key ? 0.08 : 0,
                  shadowRadius: 2, elevation: docType === t.key ? 2 : 0,
                  opacity: isEdit && docType !== t.key ? 0.4 : 1,
                }}
              >
                <Text style={{
                  fontFamily: 'Inter', fontSize: 14,
                  fontWeight: docType === t.key ? '700' : '500',
                  color: docType === t.key ? colors.onSurface : colors.onSurfaceVariant,
                }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Doc # + Date + Counterparty card */}
          <View style={{
            backgroundColor: colors.white, borderRadius: 16,
            borderWidth: 1, borderColor: '#e9ecef',
            padding: 16, marginBottom: 24,
          }}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: 0.6,
                  color: colors.onSurfaceVariant, marginBottom: 8,
                }}>
                  Document #
                </Text>
                <View style={{
                  height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e9ecef',
                  backgroundColor: colors.surface, paddingHorizontal: 12,
                  justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurface }}>
                    {docNumber}
                  </Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: 0.6,
                  color: colors.onSurfaceVariant, marginBottom: 8,
                }}>
                  Date
                </Text>
                <View style={{
                  height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e9ecef',
                  backgroundColor: colors.surface, paddingHorizontal: 12,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurface }}>
                    {todayString()}
                  </Text>
                  <MaterialIcons name="calendar-today" size={16} color={colors.onSurfaceVariant} />
                </View>
              </View>
            </View>

            {docType === 'proforma_invoice' ? (
              <>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: 0.6,
                  color: colors.onSurfaceVariant, marginBottom: 8,
                }}>
                  Customer
                </Text>
                <View style={{
                  height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e9ecef',
                  backgroundColor: colors.surface, paddingHorizontal: 12,
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                }}>
                  <MaterialIcons name="search" size={18} color={colors.onSurfaceVariant} />
                  <TextInput
                    style={{ flex: 1, fontFamily: 'Inter', fontSize: 14, color: colors.onSurface }}
                    placeholder="Search or type customer name..."
                    placeholderTextColor={colors.gray}
                    value={customerName}
                    onChangeText={handleCustomerNameChange}
                    returnKeyType="done"
                  />
                </View>
                {customerSearching ? (
                  <ActivityIndicator size="small" color={colors.onSurfaceVariant} style={{ marginTop: 8 }} />
                ) : (
                  <SuggestionList
                    items={customerResults}
                    keyExtractor={c => c.id}
                    renderLabel={c => c.fullName}
                    renderSub={c => c.email || c.phone}
                    onSelect={handleSelectCustomer}
                  />
                )}
                {!customerId && customerName.trim() ? (
                  <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 6 }}>
                    No match — this will be saved as document-only customer info.
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: 0.6,
                  color: colors.onSurfaceVariant, marginBottom: 8,
                }}>
                  Supplier
                </Text>
                <TextInput
                  style={{
                    height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e9ecef',
                    backgroundColor: colors.surface, paddingHorizontal: 14,
                    fontFamily: 'Inter', fontSize: 14, color: colors.onSurface,
                  }}
                  placeholder="Supplier / vendor name"
                  placeholderTextColor={colors.gray}
                  value={supplierName}
                  onChangeText={setSupplierName}
                  returnKeyType="done"
                />
              </>
            )}
          </View>

          {/* Line items header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '700', color: colors.onSurface }}>
              Line Items
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: colors.onSurfaceVariant }}>
              {items.length} {items.length === 1 ? 'ITEM' : 'ITEMS'}
            </Text>
          </View>

          {items.length === 0 ? (
            <View style={{
              backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: '#e9ecef',
              padding: 24, alignItems: 'center', marginBottom: 12,
            }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant }}>
                No items yet — tap Add New Item below.
              </Text>
            </View>
          ) : items.map(item => (
            <LineItemCard
              key={item.id}
              item={item}
              currencySymbol={currencySymbol}
              onEdit={() => openEdit(item)}
              onDelete={() => deleteItem(item.id)}
            />
          ))}

          {/* Notes */}
          <View style={{
            backgroundColor: colors.white, borderRadius: 16,
            borderWidth: 1, borderColor: '#e9ecef',
            padding: 16, marginTop: 4,
          }}>
            <Text style={{
              fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 0.6,
              color: colors.onSurfaceVariant, marginBottom: 8,
            }}>
              Notes
            </Text>
            <TextInput
              style={{
                fontFamily: 'Inter', fontSize: 14, color: colors.onSurface,
                height: 70, borderWidth: 1, borderColor: '#e9ecef', borderRadius: 10,
                paddingHorizontal: 14, paddingTop: 10, backgroundColor: colors.surface,
                textAlignVertical: 'top',
              }}
              placeholder="Optional notes for this document..."
              placeholderTextColor={colors.gray}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>

        </ScrollView>

        {/* ── Fixed bottom (never scrolls) ─────────────────────────────────── */}
        <View style={{
          paddingHorizontal: 16, paddingTop: 12,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
          backgroundColor: colors.surface,
          borderTopWidth: 1, borderTopColor: '#e9ecef',
        }}>

          <TouchableOpacity
            onPress={openAdd}
            activeOpacity={0.75}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              height: 48, borderRadius: 12,
              borderWidth: 1.5, borderColor: colors.gray, borderStyle: 'dashed',
              marginBottom: 12,
            }}
          >
            <MaterialIcons name="add-circle-outline" size={20} color={colors.onSurfaceVariant} />
            <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.onSurfaceVariant }}>
              Add New Item
            </Text>
          </TouchableOpacity>

          <View style={{
            backgroundColor: colors.primaryContainer, borderRadius: 16,
            padding: 16, marginBottom: 14,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>Subtotal</Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>{fmtAmt(subtotal, currencySymbol)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <TextInput
                value={taxRatePct}
                onChangeText={(v) => { taxRateTouchedRef.current = true; setTaxRatePct(v); }}
                keyboardType="decimal-pad"
                placeholder="tax rate"
                placeholderTextColor={colors.gray}
                selectTextOnFocus
                style={{ fontFamily: 'Inter', fontSize: 14, color: 'rgba(255,255,255,0.85)', width: 60 }}
              />
              <Text style={{ fontFamily: 'Inter', fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>Tax ({fmtAmt(tax, currencySymbol)})</Text>
            </View>
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: colors.secondaryContainer }}>
                Grand Total
              </Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '800', color: colors.white }}>
                {fmtAmt(grandTotal, currencySymbol)}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            
            <TouchableOpacity
              onPress={handleCreate}
              disabled={saving}
              activeOpacity={0.85}
              style={{
                flex: 1, height: 50, borderRadius: 14,
                backgroundColor: colors.primaryContainer,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {saving
                ? <ActivityIndicator color={colors.white} />
                : <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.white }}>
                    {isEdit ? 'Update' : 'Create'}
                  </Text>
              }
            </TouchableOpacity>
          </View>

        </View>
      </View>

      {/* ── Add / Edit item modal ─────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setModalVisible(false)} />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={{
              backgroundColor: colors.white,
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: 24, paddingBottom: insets.bottom + 24,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: colors.onSurface }}>
                  {editingItem ? 'Edit Item' : 'New Item'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.onSurfaceVariant, marginBottom: 6 }}>
                Item Name
              </Text>
              <TextInput
                style={{
                  fontFamily: 'Inter', fontSize: 15, color: colors.onSurface,
                  height: 44, borderWidth: 1, borderColor: '#e9ecef', borderRadius: 10,
                  paddingHorizontal: 14, backgroundColor: colors.surface, marginBottom: productResults.length || productSearching ? 6 : 20,
                }}
                placeholder="e.g. Consulting Services"
                placeholderTextColor={colors.gray}
                value={formName}
                onChangeText={handleFormNameChange}
                returnKeyType="next"
                onSubmitEditing={() => modalQtyRef.current?.focus()}
              />
              {productSearching ? (
                <ActivityIndicator size="small" color={colors.onSurfaceVariant} style={{ marginBottom: 20 }} />
              ) : (
                <SuggestionList
                  items={productResults}
                  keyExtractor={p => p.id}
                  renderLabel={p => p.name}
                  renderSub={p => `${p.sku} · ${p.unitPrice}${p.description ? ` · ${p.description}` : ''}`}
                  onSelect={handleSelectProduct}
                />
              )}
              {formProductId ? (
                <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 14 }}>
                  Matched existing product — price auto-filled, editable below.
                </Text>
              ) : formName.trim() ? (
                <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 14 }}>
                  No match — this will be created as a new product on save.
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.onSurfaceVariant, marginBottom: 6 }}>
                    Qty
                  </Text>
                  <TextInput
                    ref={modalQtyRef}
                    style={{
                      fontFamily: 'Inter', fontSize: 15, color: colors.onSurface,
                      height: 44, borderWidth: 1, borderColor: '#e9ecef', borderRadius: 10,
                      paddingHorizontal: 14, backgroundColor: colors.surface,
                    }}
                    placeholder="1.00"
                    placeholderTextColor={colors.gray}
                    // keyboardType="decimal-pad"
                    value={formQty}
                    onChangeText={setFormQty}
                    returnKeyType="next"
                    onSubmitEditing={() => modalPriceRef.current?.focus()}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.onSurfaceVariant, marginBottom: 6 }}>
                    Unit Price ({currencySymbol})
                  </Text>
                  <TextInput
                    ref={modalPriceRef}
                    style={{
                      fontFamily: 'Inter', fontSize: 15, color: colors.onSurface,
                      height: 44, borderWidth: 1, borderColor: '#e9ecef', borderRadius: 10,
                      paddingHorizontal: 14, backgroundColor: colors.surface,
                    }}
                    placeholder="0.00"
                    placeholderTextColor={colors.gray}
                    keyboardType="decimal-pad"
                    value={formPrice}
                    onChangeText={setFormPrice}
                    returnKeyType="done"
                    onSubmitEditing={saveItem}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1, height: 50, borderRadius: 14,
                    borderWidth: 1.5, borderColor: '#c5c6d0',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: colors.onSurface }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveItem}
                  activeOpacity={0.85}
                  style={{
                    flex: 1, height: 50, borderRadius: 14,
                    backgroundColor: colors.primaryContainer,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.white }}>
                    {editingItem ? 'Save Changes' : 'Add Item'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
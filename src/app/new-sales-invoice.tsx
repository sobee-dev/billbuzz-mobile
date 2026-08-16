import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { DEFAULT_CURRENCY, GLOBAL_CURRENCIES } from '@/data/constants';
import { resolveCurrency } from '@/utils/currencySymbol';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeductInventoryModal, DeductItem } from '../components/DeductInventoryModal';
import { Customer, customerService } from '../services/customers';
import { DocumentItem, documentService } from '../services/documents';
import { Product, productService } from '../services/products';
import { colors } from '../styles/globals';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SalesItem {
  id:         string;
  productId?: string; // set only when matched to a real product
  name:       string;
  sku?:       string | null;
  qtyOnHand?: number;
  qtyStr:     string;
  priceStr:   string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lineTotal(item: SalesItem): number {
  return (parseFloat(item.qtyStr) || 0) * (parseFloat(item.priceStr) || 0);
}

function fmtAmt(n: number, symbol: string): string {
  return `${symbol}${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}


function fmtUnitPrice(n: number): string {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function todayStr(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function resolveCurrencySelection(stored: string): { code: string; customSymbol: string; isCustom: boolean } {
  const byCode = GLOBAL_CURRENCIES.find(c => c.code === stored);
  if (byCode) return { code: byCode.code, customSymbol: '', isCustom: false };

  const bySymbol = GLOBAL_CURRENCIES.find(c => c.symbol === stored);
  if (bySymbol) return { code: bySymbol.code, customSymbol: '', isCustom: false };

  return { code: DEFAULT_CURRENCY.code, customSymbol: stored, isCustom: true };
}

function buildDeductItems(savedDocItems: DocumentItem[]): DeductItem[] {
  return savedDocItems
    .filter(li => li.product) // only product-linked lines are trackable — matches backend's `tracked` queryset
    .map(li => ({
      itemId:       li.id,           // real DocumentItem.id — required by the deduct-inventory endpoint
      productId:    li.product!,
      name:         li.description,
      sku:          '—',             // DocumentItem doesn't carry SKU — see note below
      invoicedQty:  Math.round(li.quantity),
      currentStock: 0,               // DocumentItem doesn't carry stock — see note below
    }));
}

// ─── Module-level components (keyboard stability) ─────────────────────────────

function FieldLabel({ text }: { text: string }) {
  return (
    <Text style={{
      fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.6,
      color: colors.onSurfaceVariant, marginBottom: 6,
    }}>
      {text}
    </Text>
  );
}

const INPUT_STYLE = {
  fontFamily: 'Inter'  as const,
  fontSize:   15,
  color:      colors.onSurface,
  height:     44,
  borderWidth: 1,
  borderColor: '#e9ecef',
  borderRadius: 10,
  paddingHorizontal: 14,
  backgroundColor: colors.surface,
} as const;

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
      marginTop: -8, marginBottom: 14, overflow: 'hidden',
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

function SalesLineItemCard({
  item, 
  currencySymbol, 
  onChangeName, 
  onChangeQty, 
  onChangePrice, 
  onDelete,
  productResults,
  productSearching,
  onSearchName,
  onSelectProduct,
}: {
  item:           SalesItem;
  currencySymbol: string;
  onChangeName:   (id: string, val: string) => void;
  onChangeQty:    (id: string, val: string) => void;
  onChangePrice:  (id: string, val: string) => void;
  onDelete:       (id: string) => void;
  productResults: Product[];
  productSearching: boolean;
  onSearchName:   (itemId: string, val: string) => void;
  onSelectProduct: (itemId: string, product: Product) => void;
}) {
  const tot = lineTotal(item);
  return (
    <View style={{
      backgroundColor: colors.white,
      borderRadius: 14, borderWidth: 1, borderColor: '#e9ecef',
      padding: 14, marginBottom: 12,
      zIndex: item.id === item.id ? 10 : 1, // Ensure dropdown sits on top
    }}>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <TextInput
            style={{
              fontFamily: 'Inter', fontSize: 18, fontWeight: '700',
              color: colors.onSurface, lineHeight: 20, padding: 0,
            }}
            value={item.name}
            onChangeText={v => onChangeName(item.id, v)}
            placeholder="Item name"
            placeholderTextColor={colors.gray}
          />
          {!item.productId ? (
            <Text style={{ fontFamily: 'Inter', fontSize: 9, color: colors.onSurfaceVariant, marginTop: 2 }}>
              New product, — to be created on save
            </Text>
          ) : (
            <Text style={{ fontFamily: 'Inter', fontSize: 9, color: colors.onSurfaceVariant, marginTop: 2 }}>
              Matched to existing product
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => onDelete(item.id)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={{
            width: 30, height: 30, borderRadius: 8,
            backgroundColor: colors.errorContainer,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <MaterialIcons name="delete-outline" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>

        <View style={{ flex: 1 }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: 0.5,
            color: colors.onSurfaceVariant, marginBottom: 5,
          }}>
            QTY
          </Text>
          <TextInput
            style={INPUT_STYLE}
            value={item.qtyStr}
            onChangeText={v => onChangeQty(item.id, v)}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>

        <View style={{ flex: 2 }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: 0.5,
            color: colors.onSurfaceVariant, marginBottom: 5,
          }}>
            PRICE
          </Text>
          <TextInput
            style={INPUT_STYLE}
            value={item.priceStr}
            onChangeText={v => onChangePrice(item.id, v)}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>

        <View style={{ flex: 2 }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: 0.5,
            color: colors.onSurfaceVariant, marginBottom: 5,
          }}>
            TOTAL
          </Text>
          <View style={{
            height: 44, borderRadius: 10,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center', justifyContent: 'center',
            paddingHorizontal: 12,
          }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '800', color: colors.white }}>
              {fmtAmt(tot, currencySymbol)}
            </Text>
          </View>
        </View>

      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function NewSalesInvoiceScreen() {
  const { user } = useAuth();
  const { business, isLoading: businessLoading } = useBusiness();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const {
   customerId:    prefillCustomerId,
   customerName:  prefillCustomerName,
   customerPhone: prefillCustomerPhone,
   customerEmail: prefillCustomerEmail,
  } = useLocalSearchParams<{
    customerId?: string; customerName?: string; customerPhone?: string; customerEmail?: string;
  }>();
  const initialCurrencyCode = business?.currency || DEFAULT_CURRENCY.code;
  const BUSINESS_DEFAULT_TAX_RATE = business?.taxRate ?? 0; // fallback only — the actual value in use lives in taxRatePct state below
  const [saving, setSaving]         = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(!!id);
  const [savedDocId, setSavedDocId] = useState<string | undefined>(id ?? undefined);
  const [savedItems, setSavedItems] = useState<DocumentItem[]>([]);

  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    const yr  = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
    return `INV-${yr}-${seq}`;
  });
  const [issuedDate, setIssuedDate]     = useState(todayStr());
  const [documentDate, setDocumentDate] = useState(todayIso());

  const [activeSearchItemId, setActiveSearchItemId] = useState<string | null>(null);
  const [lineItemProductResults, setLineItemProductResults] = useState<Product[]>([]);
  const [lineItemSearching, setLineItemSearching] = useState(false);

  // ── Customer ────────────────────────────────────────────────────────────────
  const [customerId,   setCustomerId]   = useState<string | undefined>(id ? undefined : prefillCustomerId);
  const [customerName, setCustomerName] = useState(id ? '' : (prefillCustomerName ?? ''));
  const [phone,          setPhone]          = useState(id ? '' : (prefillCustomerPhone ?? ''));
  const [email,          setEmail]          = useState(id ? '' : (prefillCustomerEmail ?? ''));
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);

  // ── Items ───────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<SalesItem[]>([]);

  // ── Currency ────────────────────────────────────────────────────────────────
  const [currencyCode, setCurrencyCode] = useState(initialCurrencyCode);
  const [customSymbol, setCustomSymbol] = useState('');
  const [customCurrencyMode, setCustomCurrencyMode] = useState(false);
  const displaySymbol = customCurrencyMode ? (customSymbol || '?') : resolveCurrency(currencyCode).symbol;

  // ── Financials ──────────────────────────────────────────────────────────────
  const [discount, setDiscount] = useState('0.00');
  const [taxRatePct, setTaxRatePct] = useState(String(BUSINESS_DEFAULT_TAX_RATE));
  const taxRateTouchedRef = useRef(false); // becomes true once the user edits it directly, or once a real doc is loaded
  const [notes, setNotes] = useState('');
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const alreadyPaidRef = useRef(false); // true once we know the loaded/saved doc is already paid — disables toggling off

  // Sync the tax rate default once business data finishes loading — the
  // initial useState above may have fired before `business` was available.
  useEffect(() => {
    if (taxRateTouchedRef.current) return; // don't clobber a user edit or a loaded document's rate
    if (business?.taxRate != null) {
      setTaxRatePct(String(business.taxRate));
    }
  }, [business?.taxRate]);

  // ── Add Item modal ──────────────────────────────────────────────────────────
  const [addModalVisible,  setAddModalVisible]  = useState(false);
  const [pendingName,      setPendingName]      = useState('');
  const [pendingQty,       setPendingQty]       = useState('1');
  const [pendingPrice,     setPendingPrice]     = useState('0.00');
  const [pendingProductId, setPendingProductId] = useState<string | undefined>(undefined);
  const [pendingSku,       setPendingSku]       = useState<string | null>(null);
  const [pendingQtyOnHand, setPendingQtyOnHand] = useState<number | undefined>(undefined);
  const [productResults,   setProductResults]   = useState<Product[]>([]);
  const [productSearching, setProductSearching] = useState(false);

  const [deductVisible,  setDeductVisible]  = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const [currencyDropdownVisible, setCurrencyDropdownVisible] = useState(false);

  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const [savedInvoiceNumber, setSavedInvoiceNumber] = useState('');
  // ── Load real document when editing ─────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoadingDoc(true);
    documentService.get(id)
      .then(data => {
        setInvoiceNumber(data.documentNumber ?? invoiceNumber);
        setIssuedDate(data.documentDate ?? issuedDate);
        setDocumentDate(data.documentDate ?? documentDate);
        setCustomerId(data.customer ?? undefined);
        setCustomerName(data.customerName ?? '');
        setEmail(data.customerEmail ?? '');
        setPhone(data.customerPhone ?? '');
        const resolved = resolveCurrencySelection(data.currency ?? DEFAULT_CURRENCY.code);
        setCurrencyCode(resolved.code);
        setCustomSymbol(resolved.customSymbol);
        setCustomCurrencyMode(resolved.isCustom);
        setDiscount(String(data.discount ?? '0.00'));


        setNotes(data.notes ?? '');
        const isPaid = data.status === 'paid';
        setMarkAsPaid(isPaid);
        alreadyPaidRef.current = isPaid;


        // Loaded documents store taxRate as a decimal (e.g. 0.15) — convert to a percent for the input
        taxRateTouchedRef.current = true;
        setTaxRatePct(String((Number(data.taxRate ?? 0)) * 100));
        if (Array.isArray(data.items)) {
          setItems(data.items.map((li, i) => ({
            id:        String(i + 1),
            productId: li.product ?? undefined,
            name:      li.description,
            qtyStr:    String(li.quantity),
            priceStr:  String(li.unitPrice),

          })));
          setSavedItems(data.items);
        }
      })
      .catch(() => Alert.alert('Error', 'Could not load this invoice.'))
      .finally(() => setLoadingDoc(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Product search (debounced, live while typing in Add Item modal) ────────
  useEffect(() => {
    if (!addModalVisible) return;
    if (pendingProductId) return;
    const handle = setTimeout(async () => {
      if (!pendingName.trim()) { setProductResults([]); return; }
      setProductSearching(true);
      try {
        setProductResults(await productService.search(pendingName.trim()));
      } catch {
        setProductResults([]);
      } finally {
        setProductSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [pendingName, addModalVisible, pendingProductId]);

  // Debounced search effect for inline line item cards
  useEffect(() => {
    if (!activeSearchItemId) {
      setLineItemProductResults([]);
      return;
    }
    const activeItem = items.find(i => i.id === activeSearchItemId);
    if (!activeItem || !activeItem.name.trim() || activeItem.productId) {
      setLineItemProductResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      setLineItemSearching(true);
      try {
        const results = await productService.search(activeItem.name.trim());
        setLineItemProductResults(results);
      } catch {
        setLineItemProductResults([]);
      } finally {
        setLineItemSearching(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [activeSearchItemId, items]);

  // ── Customer search (debounced, live while typing customer name) ───────────
  useEffect(() => {
    if (customerId) return;
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
  }, [customerName, customerId]);

  const handleLineItemNameChange = (itemId: string, val: string) => {
    setActiveSearchItemId(itemId);
    setItems(prev => prev.map(i =>
      i.id === itemId
        ? { ...i, name: val, productId: undefined, sku: undefined, qtyOnHand: undefined }
        : i
    ));
  };

  const handleSelectLineItemProduct = (itemId: string, p: Product) => {
    setItems(prev => prev.map(i =>
      i.id === itemId
        ? {
            ...i,
            name: p.name,
            productId: p.id,
            sku: p.sku,
            qtyOnHand: Number(p.quantityOnHand),
            priceStr: String(p.unitPrice),
          }
        : i
    ));
    setActiveSearchItemId(null);
    setLineItemProductResults([]);
  };


  // ── Computed ────────────────────────────────────────────────────────────────
  const subtotal    = items.reduce((s, i) => s + lineTotal(i), 0);
  const taxRateNum  = parseFloat(taxRatePct) || 0;
  const taxAmount   = subtotal * taxRateNum / 100;
  const discountAmt = parseFloat(discount) || 0;
  const grandTotal  = subtotal + taxAmount - discountAmt;
  const [deductItemsReady, setDeductItemsReady] = useState<DeductItem[]>([]);
  // ── Handlers: customer ───────────────────────────────────────────────────────
  const handleCustomerNameChange = (val: string) => {
    setCustomerName(val);
    if (customerId) setCustomerId(undefined);
  };

  const handleSelectCustomer = (c: Customer) => {
    setCustomerId(c.id);
    setCustomerName(c.fullName) ;
    setEmail(c.email ?? '');
    setPhone(c.phone ?? '');
    setCustomerResults([]);
  };

  // ── Handlers: financials ─────────────────────────────────────────────────────
  const handleChangeTaxRate = (val: string) => {
    taxRateTouchedRef.current = true;
    setTaxRatePct(val);
  };

  // ── Handlers: items ──────────────────────────────────────────────────────────
  const handleChangeName  = (itemId: string, val: string) =>
    setItems(prev => prev.map(i =>
      i.id === itemId
        ? { ...i, name: val, productId: undefined, sku: undefined, qtyOnHand: undefined } // editing the name breaks the product match
        : i
    ));
  const handleChangeQty   = (itemId: string, val: string) =>
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, qtyStr:   val } : i));
  const handleChangePrice = (itemId: string, val: string) =>
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, priceStr: val } : i));

  const handleDelete = (itemId: string) =>
    setItems(prev => prev.filter(i => i.id !== itemId));

  const handlePendingNameChange = (val: string) => {
    setPendingName(val);
    if (pendingProductId) {
      setPendingProductId(undefined);
      setPendingSku(null);
      setPendingQtyOnHand(undefined);
    }
  };

  const handleSelectProduct = (p: Product) => {
    setPendingName(p.name);
    setPendingProductId(p.id);
    setPendingPrice(String(p.unitPrice));
    setPendingSku(p.sku);
    setPendingQtyOnHand(Number(p.quantityOnHand));
    setProductResults([]);
  };

  const handleAddItem = () => {
    if (!pendingName.trim()) {
      Alert.alert('Missing Name', 'Please enter an item name.'); return;
    }
    setItems(prev => [...prev, {
      id:        Date.now().toString(),
      productId: pendingProductId,
      name:      pendingName.trim(),
      sku:       pendingSku,
      qtyOnHand: pendingQtyOnHand,
      qtyStr:    pendingQty || '1',
      priceStr:  pendingPrice || '0.00',
    }]);
    setPendingName('');
    setPendingQty('1');
    setPendingPrice('0.00');
    setPendingProductId(undefined);
    setPendingSku(null);
    setPendingQtyOnHand(undefined);
    setProductResults([]);
    setAddModalVisible(false);
  };




  const buildItemsPayload = () =>
  items.map(i => ({
    product:     i.productId,
    productName: i.productId ? undefined : i.name,
    description: i.name,
    quantity:    parseFloat(i.qtyStr)   || 0,
    unitPrice:   parseFloat(i.priceStr) || 0,
  }));
  
  
  
  const handleSave = async () => {
    if (!customerName.trim()) {
      Alert.alert('Missing Field', 'Please enter a customer name.'); return;
    }
    if (items.length === 0) {
      Alert.alert('No Items', 'Add at least one line item.'); return;
    }

    setSaving(true);
    try {
      let saved;

      if (!savedDocId) {
        saved = await documentService.create({
          documentType: 'sales_invoice',
          documentDate,
          customer: customerId,
          customerName,
          customerEmail: email,
          customerPhone: phone,
          currency: customCurrencyMode ? customSymbol : currencyCode,
          notes: notes.trim(),
          discount: discountAmt,
          taxRate: taxRateNum / 100,
          items: buildItemsPayload(),
        });
        
      } else {
        // Only run update if it's an existing document being edited
        saved = await documentService.update(savedDocId, {
          customerName,
          customerEmail: email,
          customerPhone: phone,
          currency: customCurrencyMode ? customSymbol : currencyCode,
          notes: notes.trim(),
          discount: discountAmt,
          taxRate:  taxRateNum / 100, // requires tax_rate on DocumentUpdateSerializer — see earlier note
          items:    buildItemsPayload(),
        });
      }

      const newDocId = saved?.id ?? savedDocId ?? null;

      
      if (markAsPaid && !alreadyPaidRef.current && newDocId) {
        saved = await documentService.markPaid(newDocId);
      }



      setSavedItems(saved?.items ?? []);
      const finalItems = saved?.items ?? [];
      setSavedItems(finalItems);

      const trackedItems = finalItems.filter(li => li.product);
      if (trackedItems.length > 0) {
        const uniqueProductIds = [...new Set(trackedItems.map(li => li.product!))];
        try {
          const products = await Promise.all(uniqueProductIds.map(pid => productService.get(pid)));
          const productMap = new Map(products.map(p => [p.id, p]));
          setDeductItemsReady(buildDeductItems(finalItems, productMap));
        } catch {
          // Stock lookup failed — fall back to zero-stock items rather than
          // blocking the save itself, which already succeeded.
          setDeductItemsReady(buildDeductItems(finalItems, new Map()));
        }
      } else {
        setDeductItemsReady([]);
      }

      setSavedDocId(saved?.id ?? savedDocId ?? null);
      setSavedInvoiceNumber(saved?.documentNumber ?? invoiceNumber);
      setSuccessVisible(true);
    } catch (err: any) {
      Alert.alert('Error', getErrorMessage(err, 'Could not save invoice. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  function buildDeductItems(savedDocItems: DocumentItem[], productMap: Map<string, Product>): DeductItem[] {
    return savedDocItems
      .filter(li => li.product)
      .map(li => {
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
  }

  // ── Inventory deduction — now a separate, optional step from the success modal ──
  const handleDeductApply = (deductions: { itemId: string; name: string; deductQty: number }[]) => {
    setDeductVisible(false);
    const lines = deductions
      .filter(d => d.deductQty > 0)
      .map(d => `  • ${d.name}: −${d.deductQty} unit${d.deductQty !== 1 ? 's' : ''}`)
      .join('\n');
    Alert.alert('Inventory Updated', lines || 'No stock changes were made.', [
      { text: 'OK', onPress: handleDashboardRedirect }
    ]);
  };

  if (loadingDoc) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primaryContainer} />
      </SafeAreaView>
    );
  }

  // Helper to handle navigation based on user role
  const handleDashboardRedirect = () => {
    setSuccessVisible(false);
    if (user?.role === 'owner') {
      router.replace('/(owner-tabs)/dashboard' as any);
    } else {
      router.replace('/(staff-tabs)/dashboard' as any);
    }
  };

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
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="close" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={{
          flex: 1, fontFamily: 'Inter', fontSize: 17, fontWeight: '700',
          color: colors.onSurface, textAlign: 'center',
        }}>
          {id ? 'Edit Invoice' : 'New Sales Invoice'}
        </Text>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="more-vert" size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1 }}>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          >

            {/* ── Receipt # + Date + Currency ─────────────────────────────── */}
            <View style={{
              backgroundColor: colors.white, borderRadius: 16,
              borderWidth: 1, borderColor: '#e9ecef',
              padding: 16, marginBottom: 16,
            }}>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <FieldLabel text="Invoice Number" />
                  <View style={{
                    height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e9ecef',
                    backgroundColor: '#f5f5f8', paddingHorizontal: 12, justifyContent: 'center',
                  }}>
                    <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.onSurface }}>
                      {invoiceNumber}
                    </Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <FieldLabel text="Date" />
                  <View style={{
                    height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e9ecef',
                    backgroundColor: colors.surface, paddingHorizontal: 12,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurface }}>
                      {issuedDate}
                    </Text>
                    <MaterialIcons name="calendar-today" size={16} color={colors.onSurfaceVariant} />
                  </View>
                </View>
              </View>

              <FieldLabel text="Currency" />

              {/* ── Dropdown Trigger Button ───────────────────────────────────────── */}
              <TouchableOpacity
                onPress={() => setCurrencyDropdownVisible(prev => !prev)}
                activeOpacity={0.8}
                style={{
                  height: 44,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#e9ecef',
                  backgroundColor: colors.surface,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: customCurrencyMode ? 10 : 0,
                }}
              >
                <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.onSurface }}>
                  {customCurrencyMode 
                    ? `Other (${customSymbol || 'Custom'})`
                    : `${resolveCurrency(currencyCode).symbol} - ${resolveCurrency(currencyCode).name}`}
                </Text>
                <MaterialIcons 
                  name={currencyDropdownVisible ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={20} 
                  color={colors.onSurfaceVariant} 
                />
              </TouchableOpacity>

              {/* ── Dropdown Options List ─────────────────────────────────────────── */}
              {currencyDropdownVisible && (
                <View style={{
                  backgroundColor: colors.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#e9ecef',
                  marginTop: 6,
                  marginBottom: 12,
                  overflow: 'hidden',
                  elevation: 2,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                }}>
                  {GLOBAL_CURRENCIES.map(opt => {
                    const active = !customCurrencyMode && currencyCode === opt.code;
                    return (
                      <TouchableOpacity
                        key={opt.name}
                        onPress={() => {
                          setCurrencyCode(opt.code);
                          setCustomCurrencyMode(false);
                          setCurrencyDropdownVisible(false);
                        }}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottomWidth: 1,
                          borderBottomColor: '#f1f3f5',
                          backgroundColor: active ? colors.primaryContainer + '15' : 'transparent',
                        }}
                      >
                        <Text style={{
                          fontFamily: 'Inter',
                          fontSize: 14,
                          fontWeight: active ? '700' : '500',
                          color: active ? colors.primaryContainer : colors.onSurface,
                        }}>
                          {opt.symbol} — {opt.name}
                        </Text>
                        {active && <MaterialIcons name="check" size={16} color={colors.primaryContainer} />}
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    onPress={() => {
                      setCustomCurrencyMode(true);
                      setCurrencyDropdownVisible(false);
                    }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: customCurrencyMode ? colors.primaryContainer + '15' : 'transparent',
                    }}
                  >
                    <Text style={{
                      fontFamily: 'Inter',
                      fontSize: 14,
                      fontWeight: customCurrencyMode ? '700' : '500',
                      color: customCurrencyMode ? colors.primaryContainer : colors.onSurface,
                    }}>
                      Other (Custom Symbol)
                    </Text>
                    {customCurrencyMode && <MaterialIcons name="check" size={16} color={colors.primaryContainer} />}
                  </TouchableOpacity>
                </View>
              )}

              {customCurrencyMode ? (
                <TextInput
                  style={{ ...INPUT_STYLE, marginTop: 10 }}
                  placeholder="Currency symbol, e.g. ¥"
                  placeholderTextColor={colors.gray}
                  value={customSymbol}
                  onChangeText={setCustomSymbol}
                  maxLength={5}
                />
              ) : null}

              {/* ── Payment Status toggle ─────────────────────────────────────────── */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 16, paddingTop: 16,
                borderTopWidth: 1, borderTopColor: '#f0f0f3',
              }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.onSurface }}>
                    Mark as Paid
                  </Text>
                  <Text style={{ fontFamily: 'Inter', fontSize: 11, color: colors.onSurfaceVariant, marginTop: 2 }}>
                    {alreadyPaidRef.current
                      ? 'This invoice is already marked paid and can\'t be reverted here.'
                      : 'Leave off to save as a draft invoice.'}
                  </Text>
                </View>
                <Switch
                  value={markAsPaid}
                  onValueChange={setMarkAsPaid}
                  disabled={alreadyPaidRef.current}
                  thumbColor={colors.white}
                  trackColor={{ false: '#c5c6d0', true: colors.secondary }}
                  ios_backgroundColor="#c5c6d0"
                />
              </View>
            </View>

            

            {/* ── Customer card ───────────────────────────────────────────── */}
            <View style={{
              backgroundColor: colors.white, borderRadius: 16,
              borderWidth: 1, borderColor: '#e9ecef',
              padding: 16, marginBottom: 24,
            }}>
              <FieldLabel text="Customer Name" />
              <TextInput
                style={{ ...INPUT_STYLE, marginBottom: customerResults.length ? 6 : 14 }}
                placeholder="Full legal name"
                placeholderTextColor={colors.gray}
                value={customerName}
                onChangeText={handleCustomerNameChange}
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
              {customerSearching ? (
                <ActivityIndicator size="small" color={colors.onSurfaceVariant} style={{ marginBottom: 14 }} />
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
                <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 14 }}>
                  No match — this will be saved as new customer info.
                </Text>
              ) : null}

              <FieldLabel text="Phone" />
              <TextInput
                ref={phoneRef}
                style={{ ...INPUT_STYLE, marginBottom: 14 }}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor={colors.gray}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />

              <FieldLabel text="Email" />
              <TextInput
                ref={emailRef}
                style={INPUT_STYLE}
                placeholder="client@example.com"
                placeholderTextColor={colors.gray}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
              />
            </View>

            {/* ── Line Items header ────────────────────────────────────────── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '700', color: colors.onSurface }}>
                Line Items {items.length > 0 ? `(${items.length})` : ''}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setPendingName(''); setPendingQty('1'); setPendingPrice('0.00');
                  setPendingProductId(undefined); setPendingSku(null); setPendingQtyOnHand(undefined);
                  setProductResults([]);
                  setAddModalVisible(true);
                }}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: colors.secondaryContainer,
                  borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14,
                }}
              >
                <MaterialIcons name="add" size={16} color={colors.onSecondaryContainer} />
                <Text style={{
                  fontFamily: 'Inter', fontSize: 12, fontWeight: '800',
                  textTransform: 'uppercase', letterSpacing: 0.6,
                  color: colors.onSecondaryContainer,
                }}>
                  Add Item
                </Text>
              </TouchableOpacity>
            </View>

            {items.length === 0 ? (
              <View style={{
                backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: '#e9ecef',
                padding: 24, alignItems: 'center', marginBottom: 12,
              }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant }}>
                  No items yet — tap Add Item to get started.
                </Text>
              </View>
            ) : items.map(item => (
              <SalesLineItemCard
                key={item.id}
                item={item}
                currencySymbol={displaySymbol}
                onChangeName={(id, val) => handleLineItemNameChange(id, val)}
                onChangeQty={handleChangeQty}
                onChangePrice={handleChangePrice}
                onDelete={handleDelete}
                productResults={activeSearchItemId === item.id ? lineItemProductResults : []}
                productSearching={activeSearchItemId === item.id && lineItemSearching}
                onSearchName={handleLineItemNameChange}
                onSelectProduct={handleSelectLineItemProduct}
              />
            ))}


            {/* Notes */}
            
            <View style={{
              backgroundColor: colors.white, borderRadius: 16,
              borderWidth: 1, borderColor: '#e9ecef',
              padding: 16, marginBottom: 16,
            }}>
              <FieldLabel text="Notes" />
              <TextInput
                style={{
                  ...INPUT_STYLE,
                  height: 88,
                  textAlignVertical: 'top',
                  paddingTop: 10,
                }}
                placeholder="Payment terms, delivery instructions, or anything else for this invoice…"
                placeholderTextColor={colors.gray}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* ── Grand Total card (navy) ──────────────────────────────────── */}
            <View style={{
              backgroundColor: colors.primaryContainer,
              borderRadius: 16, padding: 16, marginTop: 4,
            }}>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
                    Tax Rate (%)
                  </Text>
                  <TextInput
                    style={{
                      fontFamily: 'Inter', fontSize: 15, fontWeight: '600',
                      color: colors.white, borderBottomColor: 'rgba(255,255,255,0.35)',
                      paddingBottom: 4, paddingHorizontal: 0,
                    }}
                    value={taxRatePct}
                    onChangeText={handleChangeTaxRate}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    placeholder="0"
                  />
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
                    Tax Amount
                  </Text>
                  <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                    {fmtAmt(taxAmount, displaySymbol)}
                  </Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 14 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
                    Discount ({displaySymbol})
                  </Text>
                  <TextInput
                    style={{
                      fontFamily: 'Inter', fontSize: 15, fontWeight: '600',
                      color: colors.white,  borderBottomColor: 'rgba(255,255,255,0.35)',
                      paddingBottom: 4, paddingHorizontal: 0,
                    }}
                    value={discount}
                    onChangeText={setDiscount}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    placeholder="0.00"
                  />
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
                    Subtotal
                  </Text>
                  <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                    {fmtAmt(subtotal, displaySymbol)}
                  </Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 14 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: colors.white }}>
                  Grand Total
                </Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 26, fontWeight: '800', color: colors.secondaryContainer }}>
                  {fmtAmt(grandTotal, displaySymbol)}
                </Text>
              </View>

            </View>

          </ScrollView>

          {/* ── Fixed bottom action bar — Save only ─────────────────────────── */}
          <View style={{
            flexDirection: 'row', gap: 12,
            paddingHorizontal: 16, paddingTop: 12,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
            backgroundColor: colors.surface,
            borderTopWidth: 1, borderTopColor: '#e9ecef',
          }}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
              style={{
                flex: 1, height: 52, borderRadius: 14,
                backgroundColor: colors.primaryContainer,
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'center', gap: 8,
              }}
            >
              {saving
                ? <ActivityIndicator color={colors.white} />
                : <>
                    <MaterialCommunityIcons name="content-save-outline" size={18} color={colors.white} />
                    <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.white }}>
                      Save Invoice
                    </Text>
                  </>
              }
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>

      {/* ── Add Item modal ───────────────────────────────────────────────────── */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setAddModalVisible(false)} />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={{
              backgroundColor: colors.white,
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: 24, paddingBottom: insets.bottom + 24,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: colors.onSurface }}>
                  New Item
                </Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <FieldLabel text="Item Name" />
              <TextInput
                style={{ ...INPUT_STYLE, marginBottom: productResults.length || productSearching ? 6 : 20 }}
                placeholder="Start typing to search products…"
                placeholderTextColor={colors.gray}
                value={pendingName}
                onChangeText={handlePendingNameChange}
                returnKeyType="done"
                autoFocus
              />
              {productSearching ? (
                <ActivityIndicator size="small" color={colors.onSurfaceVariant} style={{ marginBottom: 20 }} />
              ) : (
                <SuggestionList
                  items={productResults}
                  keyExtractor={p => p.id}
                  renderLabel={p => p.name}
                  renderSub={p => `${p.sku} · ${fmtUnitPrice(Number(p.unitPrice))}${p.description ? ` · ${p.description}` : ''}`}
                  onSelect={handleSelectProduct}
                />
              )}

              {pendingProductId ? (
                <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 14 }}>
                  Matched existing product — price auto-filled, editable below.
                </Text>
              ) : pendingName.trim() ? (
                <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 14 }}>
                  No match — this will be created as a new product on save.
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                <View style={{ flex: 1 }}>
                  <FieldLabel text="Qty" />
                  <TextInput
                    style={INPUT_STYLE}
                    placeholder="1"
                    placeholderTextColor={colors.gray}
                    value={pendingQty}
                    onChangeText={setPendingQty}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <FieldLabel text={`Unit Price (${displaySymbol})`} />
                  <TextInput
                    style={INPUT_STYLE}
                    placeholder="0.00"
                    placeholderTextColor={colors.gray}
                    value={pendingPrice}
                    onChangeText={setPendingPrice}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    returnKeyType="done"
                    onSubmitEditing={handleAddItem}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setAddModalVisible(false)}
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
                  onPress={handleAddItem}
                  activeOpacity={0.85}
                  style={{
                    flex: 1, height: 50, borderRadius: 14,
                    backgroundColor: colors.primaryContainer,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.white }}>
                    Add Item
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Deduct stock modal — now opened from the success modal's "Update Inventory" ── */}
    {savedDocId && (
      <DeductInventoryModal
        documentId={savedDocId!}
        visible={deductVisible}
        onClose={() => { setDeductVisible(false); handleDashboardRedirect(); }}
        onApply={handleDeductApply}
        items={deductItemsReady}
      />
    )}
      {/* ── Saved Successfully modal ─────────────────────────────────────────── */}
      
      <Modal
        visible={successVisible}
        animationType="fade"
        transparent
        onRequestClose={handleDashboardRedirect}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 24 }}>
          <View style={{
            width: '100%', maxWidth: 360,
            backgroundColor: colors.white, borderRadius: 20,
            padding: 24, alignItems: 'center',
            position: 'relative',
          }}>
            {/* Tiny "Skip" button at the top-right corner to go straight to dashboard */}
            <TouchableOpacity
              onPress={handleDashboardRedirect}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                paddingHorizontal: 10,
                height: 26,
                borderRadius: 13,
                backgroundColor: '#f1f3f5',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: colors.onSurfaceVariant }}>
                Skip
              </Text>
            </TouchableOpacity>

            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: colors.statusPaidBg ?? colors.secondaryContainer,
              alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <MaterialIcons name="check-circle" size={32} color={colors.statusPaidFg ?? colors.primaryContainer} />
            </View>

            <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: colors.onSurface, marginBottom: 6, textAlign: 'center' }}>
              Saved Successfully
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant, marginBottom: 24, textAlign: 'center' }}>
              {savedInvoiceNumber} has been saved.
            </Text>

            {/* Conditionally display Update Inventory button only for owners */}
            {user?.role === 'owner' && (
              <TouchableOpacity
                onPress={() => { setSuccessVisible(false); setDeductVisible(true); }}
                activeOpacity={0.85}
                style={{
                  width: '100%', height: 50, borderRadius: 14,
                  backgroundColor: colors.primaryContainer,
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.white }}>
                  Update Inventory
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => {
                setSuccessVisible(false);
                if (savedDocId) {
                  router.replace(`/doc-detail?id=${savedDocId}` as never);
                } else {
                  handleDashboardRedirect();
                }
              }}
              activeOpacity={0.8}
              style={{
                width: '100%', height: 50, borderRadius: 14,
                borderWidth: 1.5, borderColor: '#c5c6d0',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: colors.onSurface }}>
                View
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
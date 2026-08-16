import { useBusiness } from '@/context/BusinessContext';
import { InventoryTransaction, TransactionType, inventoryService } from '@/services/inventory';
import { Product as RawProduct, productService } from '@/services/products';
import { colors } from '@/styles/globals';
import { resolveCurrency } from '@/utils/currencySymbol';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView, Modal,
  Platform, Pressable, ScrollView,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';


// ─── Normalized product (DecimalFields coerced) ───────────────────────────────
interface Product extends Omit<RawProduct, 'unitPrice' | 'quantityOnHand'> {
  unitPrice: number;
  quantityOnHand: number;
}

function normalizeProduct(p: RawProduct): Product {
  return {
    ...p,
    unitPrice: Number(p.unitPrice),
    quantityOnHand: Number(p.quantityOnHand),
    
  };
}

function fmtPrice(n: number, currency: string): string {
  return `${currency}${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}



// ─── Date helpers — no dateGroup/time fields exist on the backend, only createdAt ──
function dateGroupLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const md = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  if (sameDay(date, now)) return `TODAY, ${md}`;
  if (sameDay(date, yesterday)) return `YESTERDAY, ${md}`;
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function groupByDate(txs: InventoryTransaction[]): { dateGroup: string; items: InventoryTransaction[] }[] {
  const map = new Map<string, InventoryTransaction[]>();
  for (const t of txs) {
    const label = dateGroupLabel(t.createdAt);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(t);
  }
  return Array.from(map.entries()).map(([dateGroup, items]) => ({ dateGroup, items }));
}

// ─── Filter tab config — matches InventoryTransaction.TransactionType exactly ─────
type FilterTab = 'all' | TransactionType;

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',               label: 'All History'  },
  { key: 'sales_confirmed',   label: 'Sales'        },
  { key: 'purchase_received', label: 'Purchases'    },
  { key: 'adjustment',        label: 'Adjustments'  },
];

const TX_CONFIG: Record<TransactionType, {
  icon:   React.ComponentProps<typeof MaterialIcons>['name'];
  iconBg: string;
  iconFg: string;
  title:  string;
}> = {
  sales_confirmed: {
    icon: 'shopping-cart', iconBg: '#fff3cd', iconFg: '#c47f17',
    title: 'Sale Confirmed',
  },
  purchase_received: {
    icon: 'add-shopping-cart', iconBg: colors.primaryContainer + '18', iconFg: colors.primaryContainer,
    title: 'Purchase Received',
  },
  adjustment: {
    icon: 'tune', iconBg: '#fff0e6', iconFg: '#e65100',
    title: 'Stock Adjustment',
  },
};

// ─── Module-level sub-components (keyboard stability) ─────────────────────────

function ReasonInput({ value, onChangeText }: { value: string; onChangeText: (t: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="e.g. Damaged in transit, stock count correction…"
      placeholderTextColor={colors.onSurfaceVariant + '88'}
      multiline
      numberOfLines={3}
      textAlignVertical="top"
      style={{
        borderRadius: 12, borderWidth: 1, borderColor: '#dee2e6',
        backgroundColor: colors.white,
        padding: 12,
        fontFamily: 'Inter', fontSize: 14,
        color: colors.onSurface,
        minHeight: 80,
      }}
    />
  );
}

function TxRow({ tx }: { tx: InventoryTransaction }) {
  const router = useRouter();
  const cfg = TX_CONFIG[tx.transactionType];
  const isPos = tx.quantityChange > 0;
  const qtyColor = isPos ? colors.onSecondaryContainer : colors.error;

  return (
    <View style={{
      backgroundColor: colors.white,
      borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
      padding: 14, marginBottom: 10,
      shadowColor: '#1b2e5e',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{
          width: 46, height: 46, borderRadius: 23,
          backgroundColor: cfg.iconBg,
          alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <MaterialIcons name={cfg.icon} size={22} color={cfg.iconFg} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 15, fontWeight: '700',
            color: colors.onSurface, marginBottom: 3,
          }}>
            {cfg.title}
          </Text>
          {tx.referenceDocumentId ? (
            <TouchableOpacity
              onPress={() => router.push(`/doc-detail/${tx.referenceDocumentId}` as never)}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: colors.primaryContainer }}>
                View Related Document
              </Text>
              <MaterialIcons name="open-in-new" size={13} color={colors.primaryContainer} />
            </TouchableOpacity>
          ) : (
            <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
              No linked document
            </Text>
          )}
        </View>

        <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '800', color: qtyColor }}>
            {isPos ? `+${tx.quantityChange}` : `${tx.quantityChange}`}
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 1 }}>
            {timeLabel(tx.createdAt)}
          </Text>
        </View>
      </View>

      {tx.reason && (
        <View style={{
          flexDirection: 'row',
          marginTop: 12,
          borderLeftWidth: 3,
          borderLeftColor: colors.primaryContainer + '60',
          paddingLeft: 12,
        }}>
          <Text style={{
            flex: 1,
            fontFamily: 'Inter', fontSize: 13,
            fontStyle: 'italic',
            color: colors.onSurfaceVariant,
            lineHeight: 20,
          }}>
            Reason: {tx.reason}
          </Text>
        </View>
      )}
    </View>
  );
}

function DateGroupHeader({ label }: { label: string }) {
  return (
    <View style={{
      alignSelf: 'flex-start',
      backgroundColor: '#e9ecef',
      borderRadius: 8,
      paddingVertical: 5, paddingHorizontal: 12,
      marginBottom: 12, marginTop: 4,
    }}>
      <Text style={{
        fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 0.6,
        color: colors.onSurfaceVariant,
      }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function InventoryHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { business } = useBusiness();

  const currency = business?.currency ? resolveCurrency(business.currency).symbol : '';

  const [product, setProduct] = useState<Product | null>(null);
  const [allTxs, setAllTxs] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  


  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      productService.get(id),
      inventoryService.getHistory(id),
    ])
      .then(([p, history]) => {
        setProduct(normalizeProduct(p));
        setAllTxs(history.results);
      })
      .catch(() => {
        setProduct(null);
        setAllTxs([]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [adjVisible, setAdjVisible] = useState(false);

  
  const [adjDirection, setAdjDirection] = useState<'+' | '-'>('+');
  const [adjQty, setAdjQty] = useState(1);
  const [adjReason, setAdjReason] = useState('');

  const filtered = useMemo(() => {
    return activeTab === 'all' ? allTxs : allTxs.filter(t => t.transactionType === activeTab);
  }, [allTxs, activeTab]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const stockValue = product ? product.quantityOnHand * product.unitPrice : 0;

  const [adjSaving, setAdjSaving] = useState(false);

  const handleLogAdjustment = async () => {
    if (!adjReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for this stock adjustment.');
      return;
    }
    if (!id) return;

    const quantityChange = adjDirection === '+' ? adjQty : -adjQty;
    setAdjSaving(true);
    try {
      await productService.adjustStock(id, { quantityChange, reason: adjReason.trim() });
      // Refresh product + history so the new transaction and updated stock show immediately
      const [p, history] = await Promise.all([
        productService.get(id),
        inventoryService.getHistory(id),
      ]);
      setProduct(normalizeProduct(p));
      setAllTxs(history.results);

      Alert.alert(
        'Adjustment Logged',
        `Stock ${adjDirection === '+' ? 'increased' : 'decreased'} by ${adjQty} unit${adjQty !== 1 ? 's' : ''} for ${product?.name ?? 'this product'}.`,
        [{ text: 'OK', onPress: () => { setAdjVisible(false); setAdjReason(''); setAdjQty(1); } }],
      );
    } catch (err: any) {
      Alert.alert('Error', getErrorMessage(err, 'Could not log this adjustment. Please try again.'));
    } finally {
      setAdjSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
      <View style={{ flex: 1 }}>

        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: colors.white,
          borderBottomWidth: 1, borderBottomColor: '#e9ecef',
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f8',
              alignItems: 'center', justifyContent: 'center', marginRight: 10,
            }}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 18, fontWeight: '800', color: colors.primaryContainer }}>
            BillBuzz
          </Text>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
            <MaterialIcons name="search" size={22} color={colors.onSurface} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <MaterialCommunityIcons name="history" size={16} color={colors.onSurfaceVariant} />
              <Text style={{
                fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: 0.8,
                color: colors.onSurfaceVariant,
              }}>
                Inventory History
              </Text>
            </View>
            <Text style={{ fontFamily: 'Inter', fontSize: 26, fontWeight: '800', color: colors.primaryContainer, lineHeight: 32 }}>
              {product?.name}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <View style={{
              backgroundColor: colors.white,
              borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
              flexDirection: 'row', overflow: 'hidden',
            }}>
              <View style={{ flex: 1, padding: 16, borderRightWidth: 1, borderRightColor: '#e9ecef' }}>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: 0.8,
                  color: colors.onSurfaceVariant, marginBottom: 8,
                }}>
                  Current Stock
                </Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '800', color: colors.onSurface }}>
                  {product?.quantityOnHand} Units
                </Text>
              </View>
              <View style={{ flex: 1, padding: 16, alignItems: 'flex-end' }}>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: 0.8,
                  color: colors.onSurfaceVariant, marginBottom: 8,
                }}>
                  Value
                </Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '800', color: colors.primaryContainer }}>
                  {fmtPrice(stockValue, currency)}
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 4 }}
            style={{ marginBottom: 20 }}
          >
            {TABS.map(tab => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.75}
                  style={{
                    paddingVertical: 8, paddingHorizontal: 18,
                    borderRadius: 999,
                    backgroundColor: active ? colors.primaryContainer : colors.white,
                    borderWidth: 1,
                    borderColor: active ? colors.primaryContainer : '#e9ecef',
                  }}
                >
                  <Text style={{
                    fontFamily: 'Inter', fontSize: 13, fontWeight: active ? '700' : '500',
                    color: active ? colors.white : colors.onSurface,
                  }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={{ paddingHorizontal: 20 }}>
            {groups.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <MaterialIcons name="inventory" size={48} color="#dde1e7" />
                <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant, marginTop: 12 }}>
                  No transactions found
                </Text>
              </View>
            ) : (
              groups.map(group => (
                <View key={group.dateGroup}>
                  <DateGroupHeader label={group.dateGroup} />
                  {group.items.map(tx => (
                    <TxRow key={tx.id} tx={tx} />
                  ))}
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <TouchableOpacity
          onPress={() => setAdjVisible(true)}
          activeOpacity={0.85}
          style={{
            position: 'absolute', bottom: 24, right: 20,
            width: 58, height: 58, borderRadius: 29,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
          }}
        >
          <MaterialIcons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      </View>

      <Modal visible={adjVisible} transparent animationType="slide" onRequestClose={() => setAdjVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
            onPress={() => setAdjVisible(false)}
          >
            <Pressable>
              <View style={{
                backgroundColor: colors.white,
                borderTopLeftRadius: 24, borderTopRightRadius: 24,
                paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 28,
              }}>
                <View style={{
                  width: 40, height: 4, borderRadius: 2, backgroundColor: '#dde1e7',
                  alignSelf: 'center', marginTop: 14, marginBottom: 4,
                }} />

                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
                }}>
                  <View>
                    <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '800', color: colors.primaryContainer }}>
                      Log Adjustment
                    </Text>
                    <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 }}>
                      {product?.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setAdjVisible(false)}
                    style={{
                      width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f4',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons name="close" size={16} color={colors.onSurface} />
                  </TouchableOpacity>
                </View>

                <View style={{ paddingHorizontal: 20 }}>
                  <Text style={{
                    fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: 0.8,
                    color: colors.onSurfaceVariant, marginBottom: 8,
                  }}>
                    Adjustment Type
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                    {(['+', '-'] as const).map(dir => {
                      const active = adjDirection === dir;
                      const isAdd = dir === '+';
                      return (
                        <TouchableOpacity
                          key={dir}
                          onPress={() => setAdjDirection(dir)}
                          activeOpacity={0.8}
                          style={{
                            flex: 1, height: 48, borderRadius: 12,
                            borderWidth: 1.5,
                            borderColor: active ? (isAdd ? '#1e7e34' : colors.error) : '#e9ecef',
                            backgroundColor: active ? (isAdd ? '#e6f4ea' : colors.errorContainer) : colors.white,
                            alignItems: 'center', justifyContent: 'center',
                            gap: 6, flexDirection: 'row',
                          }}
                        >
                          <MaterialIcons
                            name={isAdd ? 'add-circle-outline' : 'remove-circle-outline'}
                            size={18}
                            color={active ? (isAdd ? '#1e7e34' : colors.error) : colors.onSurfaceVariant}
                          />
                          <Text style={{
                            fontFamily: 'Inter', fontSize: 14, fontWeight: '700',
                            color: active ? (isAdd ? '#1e7e34' : colors.error) : colors.onSurfaceVariant,
                          }}>
                            {isAdd ? 'Add Stock' : 'Remove Stock'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={{
                    fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: 0.8,
                    color: colors.onSurfaceVariant, marginBottom: 8,
                  }}>
                    Quantity
                  </Text>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    borderRadius: 12, borderWidth: 1, borderColor: '#dee2e6',
                    overflow: 'hidden', marginBottom: 20,
                  }}>
                    <TouchableOpacity
                      onPress={() => setAdjQty(q => Math.max(1, q - 1))}
                      activeOpacity={0.7}
                      style={{ width: 54, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f8' }}
                    >
                      <MaterialIcons name="remove" size={20} color={colors.onSurface} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'center', backgroundColor: colors.white }}>
                      <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '800', color: colors.onSurface }}>
                        {adjQty}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setAdjQty(q => q + 1)}
                      activeOpacity={0.7}
                      style={{ width: 54, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f8' }}
                    >
                      <MaterialIcons name="add" size={20} color={colors.onSurface} />
                    </TouchableOpacity>
                  </View>

                  <Text style={{
                    fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: 0.8,
                    color: colors.onSurfaceVariant, marginBottom: 8,
                  }}>
                    Reason <Text style={{ color: colors.error }}>*</Text>
                  </Text>
                  <ReasonInput value={adjReason} onChangeText={setAdjReason} />

                  <TouchableOpacity
                    onPress={handleLogAdjustment}
                    disabled={adjSaving}
                    activeOpacity={0.85}
                    style={{
                      height: 54, borderRadius: 16,
                      backgroundColor: colors.primaryContainer,
                      flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'center', gap: 10,
                      marginTop: 20,
                      opacity: adjSaving ? 0.6 : 1,
                    }}
                  >
                    {adjSaving ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <>
                        <MaterialIcons name="save" size={20} color={colors.white} />
                        <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.white }}>
                          Log Adjustment
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
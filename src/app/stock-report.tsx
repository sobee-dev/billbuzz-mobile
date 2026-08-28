import { useBusiness } from '@/context/BusinessContext';
import { resolveCurrency } from '@/utils/currencySymbol';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { productService, Product as RawProduct } from '../services/products';
import { colors } from '../styles/globals';

// ─── Normalized product (DecimalFields coerced) ────────────────────────────────
interface Product extends Omit<RawProduct, 'unitPrice' | 'quantityOnHand' | 'totalSold' | 'availableToSell'> {
  unitPrice: number;
  quantityOnHand: number;
  totalSold: number;
  availableToSell: number;
}

function normalize(p: RawProduct): Product {
  return {
    ...p,
    unitPrice: Number(p.unitPrice),
    quantityOnHand: Number(p.quantityOnHand),
    totalSold: Number(p.totalSold ?? 0),
    availableToSell: Number(p.availableToSell),
  };
}

function isOutOfStock(p: Product): boolean {
  return p.availableToSell <= 0;
}

function fmtPrice(n: number, symbol: string): string {
  return `${symbol}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** This screen shows business-wide totals, so it needs every product, not
 *  just one page — a browsable list can get away with page 1, a report can't. */
async function fetchAllProducts(): Promise<RawProduct[]> {
  let page = 1;
  let all: RawProduct[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await productService.list({ page });
    all = all.concat(res.results);
    if (!res.next) break;
    page += 1;
  }
  return all;
}

// ─── Types & helpers ──────────────────────────────────────────────────────────

type StockStatus = 'out' | 'low' | 'ok';
type FilterTab   = 'all' | 'critical' | 'ok';

function getStatus(p: Product): StockStatus {
  if (isOutOfStock(p))  return 'out';
  if (p.isLowStock)     return 'low';
  return 'ok';
}

const STATUS_STYLE: Record<StockStatus, {
  label: string; chipBg: string; chipFg: string; bar: string; sortKey: number;
}> = {
  out: { label: 'OUT OF STOCK', chipBg: colors.errorContainer, chipFg: colors.error,    bar: colors.error, sortKey: 0 },
  low: { label: 'LOW STOCK',   chipBg: '#fff3cd',              chipFg: '#755700',        bar: '#f59e0b',    sortKey: 1 },
  ok:  { label: 'IN STOCK',    chipBg: '#e8f5e9',              chipFg: '#1a5c2a',        bar: '#2e7d32',    sortKey: 2 },
};

// ─── Module-level components ──────────────────────────────────────────────────

function SummaryPill({
  label, value, accent,
}: {
  label: string; value: string | number; accent: string;
}) {
  return (
    <View style={{
      flex: 1, backgroundColor: colors.white,
      borderRadius: 14, borderWidth: 1, borderColor: '#e9ecef',
      padding: 14, alignItems: 'center',
    }}>
      <Text style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: '800', color: accent }}>
        {value}
      </Text>
      <Text style={{
        fontFamily: 'Inter', fontSize: 10, fontWeight: '600',
        textTransform: 'uppercase', letterSpacing: 0.6,
        color: colors.onSurfaceVariant, marginTop: 4, textAlign: 'center',
      }}>
        {label}
      </Text>
    </View>
  );
}

function FilterPill({
  label, active, onPress,
}: {
  label: string; active: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress} activeOpacity={0.75}
      style={{
        borderRadius: 999,
        paddingVertical: 7, paddingHorizontal: 16,
        backgroundColor: active ? colors.primaryContainer : colors.white,
        borderWidth: 1,
        borderColor: active ? colors.primaryContainer : '#d0d4de',
        marginRight: 8,
      }}
    >
      <Text style={{
        fontFamily: 'Inter', fontSize: 13, fontWeight: active ? '700' : '500',
        color: active ? colors.white : colors.onSurfaceVariant,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ProductStockRow({ product }: { product: Product }) {
  const status   = getStatus(product);
  const style    = STATUS_STYLE[status];
  const reorderLevel = product.reorderLevel;
  // Backend list response doesn't always include reorderLevel (unconfirmed on
  // this endpoint) — bar still renders sensibly using quantityOnHand alone
  // if it's missing, rather than dividing by an undefined/zero threshold.
  const maxStock = Math.max((reorderLevel ?? 0) * 4, product.quantityOnHand, 1);
  const barFill  = Math.min(1, product.quantityOnHand / maxStock);

  return (
    <View style={{
      paddingVertical: 14, paddingHorizontal: 16,
      borderBottomWidth: 1, borderBottomColor: '#e9ecef',
    }}>
      {/* Top row: icon / name + sku / status chip */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <View style={{
          width: 42, height: 42, borderRadius: 11,
          backgroundColor: colors.primaryContainer + '18', flexShrink: 0,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <MaterialCommunityIcons name="package-variant-closed" size={20} color={colors.primaryContainer} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.onSurface }}
          >
            {product.name}
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
            {product.sku ?? '—'}
          </Text>
        </View>

        <View style={{
          backgroundColor: style.chipBg, borderRadius: 999,
          paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0,
        }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 9, fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: 0.4,
            color: style.chipFg,
          }}>
            {style.label}
          </Text>
        </View>
      </View>

      {/* Stock bar */}
      <View style={{
        height: 5, backgroundColor: '#e9ecef', borderRadius: 3, marginBottom: 10,
      }}>
        <View style={{
          height: 5,
          width: `${Math.round(barFill * 100)}%`,
          backgroundColor: style.bar,
          borderRadius: 3,
        }} />
      </View>

      {/* Qty numbers — "Reserved" isn't a real field on Product, so this
          shows what the backend actually tracks: on-hand, available to
          sell, sold-to-date, and the reorder threshold. */}
      <View style={{ flexDirection: 'row', gap: 0 }}>
        {[
        //   { label: 'On Hand',    value: product.quantityOnHand },
          { label: 'Available',  value: product.availableToSell },
          { label: 'Sold',       value: product.totalSold },
          { label: 'Reorder @',  value: reorderLevel != null ? reorderLevel : '—' },
        ].map(q => (
          <View key={q.label} style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 11, color: colors.onSurfaceVariant }}>
              {q.label}
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.onSurface, marginTop: 1 }}>
              {q.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StockReportScreen() {
  const router = useRouter();
  const { business } = useBusiness();
  const currencySymbol = business?.currency ? resolveCurrency(business.currency).symbol : '';

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      fetchAllProducts()
        .then(raw => {
          if (cancelled) return;
          setProducts(raw.map(normalize));
        })
        .catch(() => {
          if (!cancelled) {
            setProducts([]);
            Alert.alert('Error', 'Could not load stock report.');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => { cancelled = true; };
    }, []),
  );

  const outCount   = products.filter(p => isOutOfStock(p)).length;
  const lowCount   = products.filter(p => !isOutOfStock(p) && p.isLowStock).length;
  const totalValue = products.reduce((sum, p) => sum + p.unitPrice * p.quantityOnHand, 0);

  const filtered = useMemo(() => {
    const sorted = [...products].sort(
      (a, b) => STATUS_STYLE[getStatus(a)].sortKey - STATUS_STYLE[getStatus(b)].sortKey,
    );
    if (activeFilter === 'critical') return sorted.filter(p => isOutOfStock(p) || p.isLowStock);
    if (activeFilter === 'ok')       return sorted.filter(p => getStatus(p) === 'ok');
    return sorted;
  }, [products, activeFilter]);

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
          <Text style={{ fontFamily: 'Inter', fontSize: 17, fontWeight: '800', color: colors.onSurface }}>
            Stock Report
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
            Current inventory levels
          </Text>
        </View>

        {/* <TouchableOpacity
          onPress={() => Alert.alert('Export', 'CSV export coming soon.')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 4 }}
        >
          <MaterialIcons name="file-download" size={22} color={colors.onSurfaceVariant} />
        </TouchableOpacity> */}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primaryContainer} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >

          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>

            {/* ── Summary pills ── */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <SummaryPill
                label="Total products"
                value={products.length}
                accent={colors.primaryContainer}
              />
              <SummaryPill
                label="Low Stock"
                value={lowCount}
                accent={lowCount > 0 ? '#f59e0b' : '#2e7d32'}
              />
              <SummaryPill
                label="Out of Stock"
                value={outCount}
                accent={outCount > 0 ? colors.error : '#2e7d32'}
              />
            </View>

            {/* ── Total value banner ── */}
            <View style={{
              backgroundColor: colors.primaryContainer, borderRadius: 16,
              padding: 18, marginBottom: 20, flexDirection: 'row',
              alignItems: 'center', justifyContent: 'space-between',
              overflow: 'hidden',
            }}>
              <View>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 11, fontWeight: '600',
                  textTransform: 'uppercase', letterSpacing: 0.6,
                  color: 'rgba(255,255,255,0.6)', marginBottom: 5,
                }}>
                  Total Inventory Value
                </Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 28, fontWeight: '800', color: colors.white }}>
                  {fmtPrice(totalValue, currencySymbol)}
                </Text>
              </View>
              <View style={{
                width: 54, height: 54, borderRadius: 15,
                backgroundColor: 'rgba(255,255,255,0.14)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <MaterialIcons name="inventory" size={26} color={colors.white} />
              </View>
            </View>

            {/* ── Filter pills ── */}
            <View style={{ flexDirection: 'row', marginBottom: 14 }}>
              <FilterPill label="All"      active={activeFilter === 'all'}      onPress={() => setActiveFilter('all')} />
              <FilterPill label="Critical" active={activeFilter === 'critical'} onPress={() => setActiveFilter('critical')} />
              <FilterPill label="In Stock" active={activeFilter === 'ok'}       onPress={() => setActiveFilter('ok')} />
            </View>

          </View>

          {/* ── Products list ── */}
          <View style={{
            backgroundColor: colors.white,
            borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e9ecef',
          }}>
            {filtered.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center', gap: 10 }}>
                <MaterialIcons name="check-circle-outline" size={36} color={colors.onSurfaceVariant} />
                <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant }}>
                  No products match this filter
                </Text>
              </View>
            ) : (
              filtered.map((p, i) => (
                <View key={p.id} style={i === filtered.length - 1 ? { borderBottomWidth: 0 } : {}}>
                  <ProductStockRow product={p} />
                </View>
              ))
            )}
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}
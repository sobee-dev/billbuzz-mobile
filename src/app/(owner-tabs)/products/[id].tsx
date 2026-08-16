import { useBusiness } from '@/context/BusinessContext';
import { resolveCurrency } from '@/utils/currencySymbol';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { productService, Product as RawProduct } from '../../../services/products';
import { colors } from '../../../styles/globals';

// Normalized shape used throughout this screen — coerces DecimalField
// strings to real numbers. isLowStock/availableToSell are trusted as-is
// from the backend rather than recomputed (there's no quantityReserved
// field to recompute from anymore).
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

function fmtPrice(n: number, currency: string): string {
  return `${currency}${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

// Specs derived from real fields — no invented spec sheet.
function buildSpecs(p: Product): { label: string; value: string }[] {
  return [
    { label: 'SKU', value: p.sku ?? '—' },
    { label: 'Description', value: p.description?.trim() || '—' },
    { label: 'Reorder Level', value: p.reorderLevel != null ? String(p.reorderLevel) : 'Not set' },
    { label: 'Total Sold', value: String(p.totalSold) },
  ];
}

function InventoryBox({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={{
      flex: 1, borderRadius: 14, padding: 14, alignItems: 'center',
      backgroundColor: highlight ? colors.primaryContainer : colors.white,
      borderWidth: highlight ? 0 : 1, borderColor: '#e9ecef',
      shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
      shadowOpacity: highlight ? 0.18 : 0.05, shadowRadius: 4, elevation: highlight ? 4 : 1,
    }}>
      <Text style={{
        fontFamily: 'Inter', fontSize: 12, fontWeight: '600',
        color: highlight ? 'rgba(255,255,255,0.65)' : colors.onSurfaceVariant,
        marginBottom: 6, textAlign: 'center',
      }}>
        {label}
      </Text>
      <Text style={{ fontFamily: 'Inter', fontSize: 26, fontWeight: '800', color: highlight ? colors.white : colors.onSurface }}>
        {value}
      </Text>
    </View>
  );
}

function SpecRow({ spec }: { spec: { label: string; value: string } }) {
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e9ecef',
    }}>
      <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant, flex: 1 }}>{spec.label}</Text>
      <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: colors.onSurface, flex: 1, textAlign: 'right' }}>
        {spec.value}
      </Text>
    </View>
  );
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const { business } = useBusiness();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [specsExpanded, setSpecsExpanded] = useState(true);
  const [loading, setLoading] = useState(true);

  const currencySymbol = business?.currency ? resolveCurrency(business.currency).symbol : '';

  useEffect(() => {
    if (!id) return;
    productService.get(id)
      .then(data => setProduct(normalize(data)))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'Inter', color: colors.onSurfaceVariant }}>
          {loading ? 'Loading...' : 'Product not found'}
        </Text>
      </SafeAreaView>
    );
  }

  const specs = buildSpecs(product);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#e9ecef',
        backgroundColor: colors.surface,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginRight: 8 }}>
          <MaterialIcons name="arrow-back-ios" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: colors.primaryContainer }}>
          BillBuzz
        </Text>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginRight: 14 }}>
          <MaterialIcons name="search" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="more-vert" size={22} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{
          height: 240, backgroundColor: colors.primaryContainer + '18',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <MaterialCommunityIcons name="package-variant-closed" size={110} color={colors.primaryContainer} />
        </View>

        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{
              flex: 1, fontFamily: 'Inter', fontSize: 22, fontWeight: '800',
              color: colors.primaryContainer, lineHeight: 28, marginRight: 12,
            }}>
              {product.name}
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 2 }}>
                Unit Price
              </Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '800', color: colors.primaryContainer }}>
                {fmtPrice(product.unitPrice, currencySymbol)}
              </Text>
            </View>
          </View>

          <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant, marginBottom: 16 }}>
            SKU: {product.sku ?? '—'}
          </Text>

          {product.isLowStock && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: colors.errorContainer, borderRadius: 12,
              paddingVertical: 12, paddingHorizontal: 14, marginBottom: 20,
            }}>
              <MaterialIcons name="warning-amber" size={20} color={colors.error} />
              <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: colors.error, lineHeight: 18 }}>
                Low Stock: Reorder recommended immediately.
              </Text>
            </View>
          )}

          <Text style={{
            fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: 0.8,
            color: colors.onSurfaceVariant, marginBottom: 12,
          }}>
            Inventory Overview
          </Text>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <InventoryBox label="On Hand" value={product.quantityOnHand} />
            <InventoryBox label="Sold" value={product.totalSold} />
            <InventoryBox label="Available" value={product.availableToSell} highlight />
          </View>

          <TouchableOpacity
            onPress={() => router.push(`/(owner-tabs)/products/inventory-history?id=${product.id}` as never)}
            activeOpacity={0.75}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: colors.primaryContainer + '0d', borderRadius: 14,
              borderWidth: 1, borderColor: colors.primaryContainer + '30',
              paddingVertical: 16, paddingHorizontal: 16, marginBottom: 20,
            }}
          >
            <MaterialCommunityIcons name="history" size={22} color={colors.primaryContainer} />
            <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: colors.primaryContainer }}>
              View Inventory History
            </Text>
            <MaterialIcons name="chevron-right" size={22} color={colors.primaryContainer} />
          </TouchableOpacity>

          <View style={{ backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: '#e9ecef', overflow: 'hidden' }}>
            <TouchableOpacity
              onPress={() => setSpecsExpanded(v => !v)}
              activeOpacity={0.75}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16 }}
            >
              <Text style={{
                fontFamily: 'Inter', fontSize: 12, fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: 0.8, color: colors.onSurface,
              }}>
                Quick Specifications
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => router.push(`/(owner-tabs)/products/new?id=${product.id}` as never)}
                >
                  <MaterialIcons name="edit" size={18} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
                <MaterialIcons name={specsExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={22} color={colors.onSurfaceVariant} />
              </View>
            </TouchableOpacity>

            {specsExpanded && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
                {specs.map((spec, i) => (
                  <View key={spec.label} style={i === specs.length - 1 ? { borderBottomWidth: 0 } : {}}>
                    <SpecRow spec={spec} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
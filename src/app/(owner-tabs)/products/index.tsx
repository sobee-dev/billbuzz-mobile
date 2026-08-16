import { useBusiness } from '@/context/BusinessContext';
import { resolveCurrency } from '@/utils/currencySymbol';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { productService, Product as RawProduct } from '../../../services/products';
import { colors } from '../../../styles/globals';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../../../assets/images/logo.png') as number;

// Normalized shape used throughout this screen — coerces DecimalField
// strings (unitPrice, quantityOnHand, totalSold, availableToSell) to real
// numbers. isLowStock/availableToSell are trusted as-is from the backend
// rather than recomputed client-side, since the backend already has the
// authoritative reorder-level/reservation logic.
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
    totalSold: Number(p.totalSold),
    availableToSell: Number(p.availableToSell),
  };
}

function fmtPrice(n: number, currency: string = '$'): string {
  const formattedNumber = n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency}${formattedNumber}`;
}

function isOutOfStock(p: Product): boolean {
  return p.availableToSell <= 0;
}

type FilterKey = 'active' | 'out-of-stock' | 'services';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'active',       label: 'Active'       },
  { key: 'out-of-stock', label: 'Out of Stock' },
  { key: 'services',     label: 'Services'     }, // NOTE: no `category` field on backend Product — always empty until that field exists
];

function ProductThumb({ imageUrl }: { imageUrl?: string }) {
  return (
    <View style={{
      width: 80, height: 80, borderRadius: 14,
      backgroundColor: colors.primaryContainer + '18',
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden',
    }}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <MaterialCommunityIcons name="package-variant-closed" size={36} color={colors.primaryContainer} />
      )}
    </View>
  );
}

function StatusChip({ product }: { product: Product }) {
  if (product.isLowStock) {
    return (
      <View style={{ backgroundColor: colors.errorContainer, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, color: colors.error }}>
          Low Stock
        </Text>
      </View>
    );
  }
  if (isOutOfStock(product)) {
    return (
      <View style={{ backgroundColor: colors.statusCancelledBg, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, color: colors.statusCancelledFg }}>
          Out of Stock
        </Text>
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: colors.statusDraftBg, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
      <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, color: colors.statusDraftFg }}>
        Active
      </Text>
    </View>
  );
}

function StockLabel({ product }: { product: Product }) {
  if (product.isLowStock) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <MaterialIcons name="warning-amber" size={14} color={colors.error} />
        <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: colors.error }}>
          {product.quantityOnHand} units left
        </Text>
      </View>
    );
  }
  return (
    <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
      Stock: {product.quantityOnHand} units
    </Text>
  );
}

function ProductRow({ product, onPress, currency }: { product: Product; currency: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: colors.white, borderRadius: 16, padding: 12,
        marginBottom: 12, flexDirection: 'row', gap: 12,
        shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
      }}
    >
      <ProductThumb imageUrl={product.imageUrl} />

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.primaryContainer, marginRight: 8 }}
          >
            {product.name}
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '800', color: colors.primaryContainer }}>
            {fmtPrice(product.unitPrice, currency)}
          </Text>
        </View>

        <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 10 }}>
          SKU: {product.sku || '—'}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <StockLabel product={product} />
          <StatusChip product={product} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ProductsScreen() {
  const router = useRouter();
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState<FilterKey>('active');
  const [products, setProducts] = useState<Product[]>([]);
  const { business } = useBusiness();
  const currency = business?.currency ? resolveCurrency(business.currency).symbol : '$';

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      productService.list()
        .then((data) => {
          if (cancelled) return;
          const results = Array.isArray(data) ? data : data.results ?? [];
          setProducts(results.map(normalize));
        })
        .catch(() => {
          if (!cancelled) setProducts([]);
        });
      return () => { cancelled = true; };
    }, []),
  );

  const filtered = products.filter(p => {
    const matchesFilter =
      // NOTE: currently requires isActive AND in-stock. If you want "Active"
      // to mean "listed/sellable" independent of stock level (matching the
      // backend's separate isActive/availableToSell fields), change this to
      // just `p.isActive` and let the "Out of Stock" tab be the only place
      // zero-stock products are called out.
      filter === 'active'       ? p.isActive && p.quantityOnHand > 0 :
      filter === 'out-of-stock' ? isOutOfStock(p) :
      false; // 'services' — no backend field to match against yet

    const q = search.toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: colors.surface,
      }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={LOGO} style={{ width: 30, height: 30, borderRadius: 8 }} resizeMode="contain" />
          <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '800', color: colors.primaryContainer }}>
            BillBuzz
          </Text>
        </View>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="search" size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 }}>
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
              placeholder="Search products..."
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

        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 }}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999,
                  backgroundColor: active ? colors.secondaryContainer : colors.white,
                  borderWidth: 1.5,
                  borderColor: active ? colors.secondaryContainer : '#e9ecef',
                }}
              >
                {active && (
                  <MaterialIcons name="check-circle" size={15} color={colors.onSecondaryContainer} />
                )}
                <Text style={{
                  fontFamily: 'Inter', fontSize: 14, fontWeight: active ? '700' : '500',
                  color: active ? colors.onSecondaryContainer : colors.onSurface,
                }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <MaterialIcons name="inventory-2" size={48} color={colors.gray} />
              <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.onSurfaceVariant, marginTop: 12 }}>
                No products found
              </Text>
            </View>
          ) : (
            filtered.map(product => (
              <ProductRow
                key={product.id}
                product={product}
                currency={currency}
                onPress={() => router.push(`/(owner-tabs)/products/${product.id}` as never)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/(owner-tabs)/products/new' as never)}
        style={{
          position: 'absolute', bottom: 16, right: 16,
          width: 58, height: 58, borderRadius: 18,
          backgroundColor: colors.secondaryContainer,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: colors.secondary, shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
        }}
      >
        <MaterialIcons name="add" size={28} color={colors.onSecondaryContainer} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
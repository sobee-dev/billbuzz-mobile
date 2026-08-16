import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { documentService } from '@/services/documents';
import { colors } from '../styles/globals';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DeductItem {
  itemId:       string;  // DocumentItem.id — required for the API call
  productId:    string;  // still useful for display/matching, but not what gets sent
  name:         string;
  sku:          string;
  invoicedQty:  number;
  currentStock: number;
}

export interface AppliedDeduction {
  itemId:    string;
  productId: string;
  name:      string;
  deductQty: number;
}

interface Props {
  visible:    boolean;
  onClose:    () => void;
  onApply:    (deductions: AppliedDeduction[]) => void;
  items:      DeductItem[];
  documentId: string; // the sales invoice this deduction applies to
}



function ItemRow({
  item,
  deductQty,
  onIncrement,
  onDecrement,
  disabled,
}: {
  item:        DeductItem;
  deductQty:   number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled:    boolean;
}) {
  const cannotCover  = deductQty < item.invoicedQty;
  const insufficient = item.currentStock < item.invoicedQty;

  return (
    <View style={{ paddingVertical: 18, opacity: disabled ? 0.5 : 1 }}>

      {/* ── Product name + stock chip ── */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 15, fontWeight: '700',
            color: colors.onSurface, marginBottom: 3,
          }}>
            {item.name}
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
            SKU: {item.sku}
          </Text>
        </View>

        {/* In-Stock chip — driven by actual stock, unrelated to what's being deducted */}
        <View style={{
          backgroundColor: insufficient ? colors.errorContainer : colors.secondaryContainer,
          borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10,
          alignSelf: 'flex-start',
        }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
            color: insufficient ? colors.error : colors.onSecondaryContainer,
          }}>
            {item.currentStock > 0 ? `${item.currentStock} In Stock` : 'Out of Stock'}
          </Text>
        </View>
      </View>

      {/* ── Stepper (left) + Invoiced (right) ── */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>

        {/* Deduct Quantity */}
        <View>
          <Text style={{
            fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: 0.5,
            color: colors.onSurfaceVariant, marginBottom: 8,
          }}>
            Deduct Quantity
          </Text>

          {/* Stepper — border/count red only for a genuine stock shortfall */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            borderWidth: 1.5,
            borderColor: insufficient ? colors.error : '#dde1e7',
            borderRadius: 12, overflow: 'hidden',
          }}>
            <TouchableOpacity
              onPress={onDecrement}
              activeOpacity={0.7}
              disabled={disabled}
              style={{
                width: 46, height: 46,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#f5f5f8',
              }}
            >
              <MaterialIcons name="remove" size={18} color={colors.onSurface} />
            </TouchableOpacity>

            <View style={{ width: 64, alignItems: 'center', backgroundColor: colors.white }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 20, fontWeight: '800',
                color: insufficient ? colors.error : colors.onSurface,
              }}>
                {deductQty}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onIncrement}
              activeOpacity={0.7}
              disabled={disabled}
              style={{
                width: 46, height: 46,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#f5f5f8',
              }}
            >
              <MaterialIcons name="add" size={18} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Invoiced — also only reads as an error state on genuine shortfall */}
        <View style={{ alignItems: 'flex-end', paddingBottom: 4 }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: 0.5,
            color: colors.onSurfaceVariant, marginBottom: 8,
          }}>
            Invoiced
          </Text>
          <Text style={{
            fontFamily: 'Inter', fontSize: 18, fontWeight: '800',
            color: insufficient ? colors.error : colors.primaryContainer,
          }}>
            {item.invoicedQty} Units
          </Text>
        </View>

      </View>

      {/* ── Partial-deduction notice vs. genuine insufficient-stock warning ── */}
      {insufficient ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <MaterialIcons name="warning-amber" size={14} color={colors.error} />
          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.error }}>
            Insufficient stock to cover full invoice
          </Text>
        </View>
      ) : cannotCover ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <MaterialIcons name="info-outline" size={14} color={colors.onSurfaceVariant} />
          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
            Deducting less than the full invoiced quantity
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function DeductInventoryModal({ documentId, visible, onClose, onApply, items }: Props) {
  const insets = useSafeAreaInsets();

  const [subtractAll, setSubtractAll] = useState(false);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [applying, setApplying] = useState(false);

  // Reset state whenever the modal opens
  useEffect(() => {
    if (visible) {
      setSubtractAll(false);
      setApplying(false);
      const init: Record<string, number> = {};
      items.forEach(i => {
        // Start at the maximum deductable quantity
        init[i.itemId] = Math.min(i.invoicedQty, i.currentStock);
      });
      setQtys(init);
    }
  }, [visible, items]);

  const handleSubtractAll = (val: boolean) => {
    setSubtractAll(val);
    const next: Record<string, number> = {};
    items.forEach(i => {
      next[i.itemId] = Math.min(i.invoicedQty, i.currentStock);
    });
    setQtys(next);
  };

  const increment = (itemId: string) => {
    const item = items.find(i => i.itemId === itemId);
    if (!item) return;
    const maxDeductable = Math.min(item.invoicedQty, item.currentStock);
    setQtys(prev => ({ ...prev, [itemId]: Math.min((prev[itemId] ?? 0) + 1, maxDeductable) }));
  };

  const decrement = (itemId: string) => {
    setQtys(prev => ({ ...prev, [itemId]: Math.max((prev[itemId] ?? 0) - 1, 0) }));
  };

  const totalDeduct = Object.values(qtys).reduce((s, q) => s + q, 0);



  const handleApply = async () => {
    const toDeduct = items.filter(i => (qtys[i.itemId] ?? 0) > 0);

    if (toDeduct.length === 0) {
      onApply([]);
      return;
    }

    setApplying(true);
    try {
      await documentService.deductInventory(
        documentId,
        toDeduct.map(item => ({
          itemId: item.itemId,
          qty:    qtys[item.itemId],
        })),
      );

      const deductions: AppliedDeduction[] = toDeduct.map(item => ({
        itemId:    item.itemId,
        productId: item.productId,
        name:      item.name,
        deductQty: qtys[item.itemId],
      }));
      onApply(deductions);
    } catch (err: any) {
      // deduct-inventory is all-or-nothing on the backend — nothing was
      // applied if this throws, so we never call onApply here.
      const message = err?.response?.data?.error;
      Alert.alert('Could Not Deduct Stock', message || 'Please try again.');
    } finally {
      setApplying(false);
    }
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={applying ? undefined : onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: colors.white,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          maxHeight: '92%',
        }}>

          {/* ── Header ── */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingTop: 22, paddingBottom: 16,
          }}>
            <Text style={{
              fontFamily: 'Inter', fontSize: 22, fontWeight: '800',
              color: colors.primaryContainer,
            }}>
              Deduct Stock
            </Text>
            <TouchableOpacity
              onPress={onClose}
              disabled={applying}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: '#f0f0f4',
                alignItems: 'center', justifyContent: 'center',
                opacity: applying ? 0.5 : 1,
              }}
            >
              <MaterialIcons name="close" size={18} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* ── Scrollable body ── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
          >

            {/* Subtract All toggle */}
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface, borderRadius: 14,
              borderWidth: 1, borderColor: '#e9ecef',
              padding: 16, marginBottom: 24,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 15, fontWeight: '700',
                  color: colors.onSurface, marginBottom: 2,
                }}>
                  Subtract All
                </Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
                  Automatically match quantities to invoice
                </Text>
              </View>
              <Switch
                value={subtractAll}
                onValueChange={handleSubtractAll}
                disabled={applying}
                thumbColor={colors.white}
                trackColor={{ false: '#c5c6d0', true: colors.primaryContainer }}
                ios_backgroundColor="#c5c6d0"
              />
            </View>

            {/* Invoice Items label */}
            <Text style={{
              fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 0.8,
              color: colors.onSurfaceVariant, marginBottom: 4,
            }}>
              Invoice Items
            </Text>

            {/* Item rows with dividers */}
            <View style={{
              borderWidth: 1, borderColor: '#e9ecef',
              borderRadius: 14, overflow: 'hidden',
              backgroundColor: colors.white,
              paddingHorizontal: 16,
            }}>
              {items.map((item, idx) => (
                <View
                  key={item.itemId}
                  style={idx < items.length - 1
                    ? { borderBottomWidth: 1, borderBottomColor: '#e9ecef' }
                    : undefined
                  }
                >
                  <ItemRow
                    item={item}
                    deductQty={qtys[item.itemId] ?? 0}
                    onIncrement={() => increment(item.itemId)}
                    onDecrement={() => decrement(item.itemId)}
                    disabled={applying}
                  />
                </View>
              ))}
            </View>

          </ScrollView>

          {/* ── Footer ── */}
          <View style={{
            paddingHorizontal: 20, paddingTop: 16,
            paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 20,
            borderTopWidth: 1, borderTopColor: '#e9ecef',
          }}>
            {/* Total row */}
            <View style={{
              flexDirection: 'row', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 16,
            }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 15, fontWeight: '500',
                color: colors.onSurface,
              }}>
                Total Items to Deduct:
              </Text>
              <Text style={{
                fontFamily: 'Inter', fontSize: 16, fontWeight: '800',
                color: colors.primaryContainer,
              }}>
                {totalDeduct} Units
              </Text>
            </View>

            {/* Apply button */}
            <TouchableOpacity
              onPress={handleApply}
              activeOpacity={0.85}
              disabled={applying}
              style={{
                height: 56, borderRadius: 16,
                backgroundColor: colors.primaryContainer,
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'center', gap: 10,
                opacity: applying ? 0.7 : 1,
              }}
            >
              {applying ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <MaterialIcons name="inventory-2" size={20} color={colors.white} />
                  <Text style={{
                    fontFamily: 'Inter', fontSize: 16, fontWeight: '700',
                    color: colors.white,
                  }}>
                    Apply Deduction
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}
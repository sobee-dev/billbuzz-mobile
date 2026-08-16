import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { DocumentItem, documentService } from '../services/documents';
import { colors } from '../styles/globals';
import { getErrorMessage } from '../utils/getErrorMessage';

export function AddToInventoryModal({
  documentId, items, visible, onClose, onApplied,
}: {
  documentId: string;
  items:      DocumentItem[];
  visible:    boolean;
  onClose:    () => void;
  onApplied:  () => void; // fires after a successful add — parent should refresh the document
}) {
  const [saving, setSaving] = useState(false);
  const trackedItems = items.filter(i => i.product);

  async function handleConfirm() {
    setSaving(true);
    try {
      await documentService.addToInventory(documentId);
      onApplied();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'Could not add these items to inventory. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}
        onPress={onClose}
      >
        <Pressable>
          <View style={{
            backgroundColor: colors.white, borderRadius: 20, padding: 22,
            maxWidth: 400, alignSelf: 'center', width: '100%',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <MaterialIcons name="inventory" size={22} color={colors.primaryContainer} />
              <Text style={{ fontFamily: 'Inter', fontSize: 17, fontWeight: '800', color: colors.onSurface }}>
                Add to Inventory
              </Text>
            </View>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant, marginBottom: 16 }}>
              These items will be added into stock at the quantities on this order.
            </Text>

            {trackedItems.length === 0 ? (
              <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant, marginBottom: 20 }}>
                No product-linked line items on this order.
              </Text>
            ) : (
              <View style={{ marginBottom: 20, gap: 8 }}>
                {trackedItems.map(item => (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: 'row', justifyContent: 'space-between',
                      paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f3',
                    }}
                  >
                    <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 13, color: colors.onSurface }} numberOfLines={1}>
                      {item.description}
                    </Text>
                    <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.primaryContainer }}>
                      +{Math.round(item.quantity)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={onClose}
                disabled={saving}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  borderWidth: 1.5, borderColor: '#c5c6d0',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.onSurface }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={saving}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  backgroundColor: colors.primaryContainer,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {saving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.white }}>
                    Add to Inventory
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
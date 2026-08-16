import { getInvoiceTemplate } from '@/components/invoice-templates';
import { useBusiness } from '@/context/BusinessContext';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Pressable, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot, { captureRef } from 'react-native-view-shot';

import { AddToInventoryModal } from '@/components/AddToInentoryModal';
import { Document, DocumentStatus, DocumentType, documentService } from '../services/documents';
import { colors } from '../styles/globals';


const TYPE_LABEL: Record<DocumentType, string> = {
  sales_invoice:    'Sales Invoice',
  proforma_invoice: 'Proforma Invoice',
  purchase_invoice: 'Purchase Invoice',
};

function derivePaymentChip(doc: Document): 'paid' | 'pending' | 'unpaid' {
  if (doc.status === 'paid') return 'paid';
  if (doc.amountPaid > 0) return 'pending';
  return 'unpaid';
}

type ChipVariant = DocumentStatus | 'pending';
interface ChipCfg { bg: string; fg: string }

const CHIP_CFG: Record<ChipVariant, ChipCfg> = {
  draft:      { bg: colors.statusDraftBg,      fg: colors.statusDraftFg      },
  delivered:  { bg: colors.statusPaidBg,       fg: colors.statusPaidFg       },
  deleted:    { bg: colors.statusCancelledBg,  fg: colors.statusCancelledFg  },
  paid:       { bg: colors.statusPaidBg,       fg: colors.statusPaidFg       },
  unpaid:     { bg: colors.statusCancelledBg,  fg: colors.statusCancelledFg  },
  pending:    { bg: colors.statusUnpaidBg,     fg: colors.statusUnpaidFg     },
};

function Chip({ label }: { label: string }) {
  const key = label.toLowerCase() as ChipVariant;
  const cfg = CHIP_CFG[key] ?? { bg: colors.statusDraftBg, fg: colors.statusDraftFg };
  return (
    <View style={{ backgroundColor: cfg.bg, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 }}>
      <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: cfg.fg }}>
        {label}
      </Text>
    </View>
  );
}

function ActionBtn({
  icon, label, onPress, disabled = false,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  const bg = disabled ? '#f0f0f4' : pressed ? colors.secondaryContainer : '#f0f0f4';
  const fg = disabled ? colors.onSurfaceVariant : pressed ? colors.onSecondaryContainer : colors.onSurface;

  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      onPressIn={() => !disabled && setPressed(true)}
      onPressOut={() => setPressed(false)}
      activeOpacity={disabled ? 1 : 0.8}
      disabled={disabled}
      style={{ alignItems: 'center', gap: 4, opacity: disabled ? 0.4 : 1 }}
    >
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name={icon} size={22} color={fg} />
      </View>
      <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '600', color: fg }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Speed-dial option button — small circle, rises above the Share button ──
function ShareOption({
  icon, label, onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}
    >
      <View style={{
        backgroundColor: colors.white,
        paddingVertical: 4, paddingHorizontal: 10,
        borderRadius: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
      }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: colors.onSurface }}>
          {label}
        </Text>
      </View>
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.primaryContainer,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
      }}>
        <MaterialIcons name={icon} size={20} color={colors.white} />
      </View>
    </TouchableOpacity>
  );
}

export default function DocDetailScreen() {
  const router = useRouter();
  const { business } = useBusiness();
  const { id, docNumber } = useLocalSearchParams<{ id?: string; docNumber?: string }>();

  const [doc,           setDoc]           = useState<Document | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [sharing,       setSharing]       = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [addInventoryVisible, setAddInventoryVisible] = useState(false);

  const viewShotRef = useRef<React.ComponentRef<typeof ViewShot>>(null);
  const shareAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(shareAnim, {
      toValue: shareMenuOpen ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [shareMenuOpen]);

  useEffect(() => {
    const key = id ?? docNumber;
    if (!key) { setLoading(false); return; }

    setLoading(true);
    const load = id
      ? documentService.get(id)
      : documentService.list({ search: docNumber }).then(async (res) => {
          const match = (res.results ?? [])[0];
          return match ? documentService.get(match.id) : null;
        });

    load
      .then(data => { if (data) setDoc(data); })
      .catch(() => Alert.alert('Error', 'Could not load this document.'))
      .finally(() => setLoading(false));
  }, [id, docNumber]);

  if (loading || !doc || !business) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primaryContainer} />
      </SafeAreaView>
    );
  }

  const paymentChip = derivePaymentChip(doc);
  const Template = getInvoiceTemplate(business?.selectedTemplateId, doc.documentType);

  // ── Text share — unchanged, no file involved ──
  const shareAsText = async () => {
    const text = [
      `${TYPE_LABEL[doc.documentType]} — ${doc.documentNumber}`,
      `Client: ${doc.customerName || doc.supplierName}`,
      `Issued: ${doc.documentDate}`,
      `Total: ${doc.currency}${Number(doc.grandTotal).toFixed(2)}`,
      `Status: ${doc.status.toUpperCase()}`,
    ].join('\n');
    try {
      await Share.share({ title: `${TYPE_LABEL[doc.documentType]} ${doc.documentNumber}`, message: text });
    } catch (_) {
      // share dismissed by user — nothing to do
    }
  };

  const shareAsImage = async () => {
    setSharing(true);
    try {
      const uri = await captureRef(viewShotRef, { format: 'png', quality: 1 });
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Not Available', 'Sharing isn\'t available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `${doc.documentNumber}.png`,
      });
    } catch {
      Alert.alert('Error', 'Could not generate the receipt image.');
    } finally {
      setSharing(false);
    }
  };

  // ── PDF share — screenshot the Template, embed it in a single-image PDF page ──
  const shareAsPdf = async () => {
    setSharing(true);
    try {
      const uri = await captureRef(viewShotRef, { format: 'png', quality: 1 });
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const html = `
        <html>
          <body style="margin:0;padding:0;">
            <img src="data:image/png;base64,${base64}" style="width:100%;" />
          </body>
        </html>
      `;
      const { uri: pdfUri } = await Print.printToFileAsync({ html });
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Not Available', 'Sharing isn\'t available on this device.');
        return;
      }
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `${doc.documentNumber}.pdf`,
      });
    } catch {
      Alert.alert('Error', 'Could not generate the receipt PDF.');
    } finally {
      setSharing(false);
    }
  };

  const runShare = (fn: () => Promise<void>) => {
    setShareMenuOpen(false);
    fn();
  };

  const editDisabled =
    (doc.documentType === 'purchase_invoice' && doc.status === 'delivered') ||
    !(
      doc.status === 'draft' ||
      doc.documentType === 'proforma_invoice' ||
      doc.documentType === 'purchase_invoice'
    );
 
  const handleMarkDelivered = async () => {
    if (doc.status === 'delivered') return;
    setActionLoading(true);
    try {
      const updated = await documentService.markDelivered(doc.id);
      setDoc(prev => (prev ? { ...prev, ...updated } : updated));
      setAddInventoryVisible(true);
    } catch {
      Alert.alert('Error', 'Could not mark this purchase order as delivered.');
    } finally {
      setActionLoading(false);
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>

      {/* ── Nav bar ──────────────────────────────────────────────────────────── */}
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
      </View>

      {/* ── Status row ───────────────────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.onSurfaceVariant }}>
          Issued {doc.documentDate}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Chip label={doc.status} />
          <Chip label={paymentChip} />
        </View>
      </View>

      {/* ── Receipt — wrapped in ViewShot so only the receipt itself is captured ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 112 }}>
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
          <Template doc={doc} business={business} />
        </ViewShot>
      </ScrollView>

      {/* ── Backdrop — tap anywhere to close the share menu ── */}
      {shareMenuOpen && (
        <Pressable
          onPress={() => setShareMenuOpen(false)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}

      {/* ── Action bar ───────────────────────────────────────────────────────── */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.white,
        borderTopWidth: 1, borderTopColor: '#e9ecef',
        flexDirection: 'row', justifyContent: 'space-around',
        paddingTop: 14, paddingBottom: 28, paddingHorizontal: 16,
      }}>
        <ActionBtn
          icon="edit"
          label="Edit"
          disabled={editDisabled}
          onPress={() => router.push(
            doc.documentType === 'sales_invoice'
              ? `/new-sales-invoice?id=${doc.id}` as never
              : `/new-document?id=${doc.id}` as never
          )}
        />
        {(doc.documentType === 'sales_invoice' || doc.documentType === 'proforma_invoice') && (
          <ActionBtn
            icon="payments"
            label="Mark Paid"
            disabled={doc.status === 'paid' || actionLoading}
            onPress={async () => {
              if (doc.status === 'paid') return;
              setActionLoading(true);
              try {
                const updated = await documentService.markPaid(doc.id);
                setDoc(prev => (prev ? { ...prev, ...updated } : updated));
              } catch {
                Alert.alert('Error', 'Could not mark document as paid.');
              } finally {
                setActionLoading(false);
              }
            }}
          />
        )}


        {doc.documentType === 'purchase_invoice' && (
          <ActionBtn
            icon="local-shipping"
            label="Delivered"
            disabled={doc.status === 'delivered' || actionLoading}
            onPress={handleMarkDelivered}
          />
        )}

        {/* ── Share button + its rising speed-dial menu ── */}
        <View style={{ alignItems: 'center' }}>
          {shareMenuOpen && (
            <Animated.View
              pointerEvents={shareMenuOpen ? 'auto' : 'none'}
              style={{
                position: 'absolute',
                bottom: 70,
                alignItems: 'flex-end',
                opacity: shareAnim,
                transform: [
                  {
                    translateY: shareAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
              }}
            >
              <ShareOption icon="picture-as-pdf" label="PDF"   onPress={() => runShare(shareAsPdf)} />
              <ShareOption icon="image"          label="Image" onPress={() => runShare(shareAsImage)} />
              <ShareOption icon="text-snippet"   label="Text"  onPress={() => runShare(shareAsText)} />
            </Animated.View>
          )}

          <ActionBtn
            icon={shareMenuOpen ? 'close' : 'share'}
            label="Share"
            disabled={sharing}
            onPress={() => setShareMenuOpen(prev => !prev)}
          />
        </View>
      </View>

      <AddToInventoryModal
        documentId={doc.id}
        items={doc.items ?? []}
        visible={addInventoryVisible}
        onClose={() => setAddInventoryVisible(false)}
        onApplied={() => {
          setAddInventoryVisible(false);
          Alert.alert('Inventory Updated', 'Items have been added to inventory.');
        }}
      />

    </SafeAreaView>
  );
}
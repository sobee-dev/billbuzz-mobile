import { useBusiness } from '@/context/BusinessContext';
import { resolveCurrency } from '@/utils/currencySymbol';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Pressable, ScrollView,
  Share, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Customer, CustomerStatus, customerService } from '../services/customers';
import { Document, DocumentStatus, DocumentType, documentService } from '../services/documents';
import { colors } from '../styles/globals';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CHIP: Record<CustomerStatus, { bg: string; fg: string; label: string }> = {
  active:   { bg: '#e6f4ea', fg: '#1e7e34', label: 'ACTIVE'   },
  inactive: { bg: '#f0f0f4', fg: '#45464f', label: 'INACTIVE' },
};

const TYPE_ICON: Record<DocumentType, React.ComponentProps<typeof MaterialIcons>['name']> = {
  sales_invoice:    'receipt-long',
  proforma_invoice: 'description',
  purchase_invoice: 'inventory',
};

const DOC_CHIP: Record<DocumentStatus, { bg: string; fg: string }> = {
  draft:     { bg: colors.statusDraftBg,              fg: colors.statusDraftFg ?? colors.onSurfaceVariant },
  unpaid:    { bg: colors.statusUnpaidBg ?? '#fff3e0', fg: '#a05f00' },
  paid:      { bg: colors.statusPaidBg,                fg: colors.statusPaidFg },
  delivered: { bg: colors.statusPaidBg,                fg: colors.statusPaidFg },
  deleted:   { bg: colors.errorContainer,              fg: colors.error },
};

function fmtMoney(amount: number | string | undefined | null, currency = ''): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  const safe = typeof n === 'number' && !isNaN(n) ? n : 0;
  return `${currency}${safe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Sub-components (module-level) ────────────────────────────────────────────

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.white,
      borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
      padding: 16,
    }}>
      <Text style={{
        fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 0.8,
        color: colors.onSurfaceVariant, marginBottom: 10,
      }}>
        {title}
      </Text>
      <Text style={{
        fontFamily: 'Inter', fontSize: 18, fontWeight: '800',
        color: colors.onSurface,
      }}>
        {value}
      </Text>
    </View>
  );
}

function ContactRow({
  icon, label, value, border,
}: {
  icon:   React.ComponentProps<typeof MaterialIcons>['name'];
  label:  string;
  value:  string;
  border: boolean;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: border ? 1 : 0,
      borderBottomColor: '#e9ecef',
    }}>
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.primaryContainer + '14',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 14,
      }}>
        <MaterialIcons name={icon} size={20} color={colors.primaryContainer} />
      </View>
      <View>
        <Text style={{
          fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
          textTransform: 'uppercase', letterSpacing: 0.6,
          color: colors.onSurfaceVariant, marginBottom: 2,
        }}>
          {label}
        </Text>
        <Text style={{
          fontFamily: 'Inter', fontSize: 14, fontWeight: '600',
          color: colors.onSurface,
        }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function DocRow({ doc, currency }: { doc: Document; currency: string }) {
  const chip = DOC_CHIP[doc.status];
  const router = useRouter();
  const displaySymbol = resolveCurrency(doc.currency || currency).symbol;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/doc-detail?id=${doc.id}` as never)}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#e9ecef',
      }}
    >
      <View style={{
        width: 42, height: 42, borderRadius: 10,
        backgroundColor: '#f5f5f8',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
      }}>
        <MaterialIcons name={TYPE_ICON[doc.documentType]} size={20} color={colors.onSurfaceVariant} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: 'Inter', fontSize: 14, fontWeight: '700',
          color: colors.onSurface,
        }}>
          {doc.documentNumber}
        </Text>
        <Text style={{
          fontFamily: 'Inter', fontSize: 12,
          color: colors.onSurfaceVariant, marginTop: 1,
        }}>
          {doc.documentDate}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{
          fontFamily: 'Inter', fontSize: 14, fontWeight: '800',
          color: colors.onSurface,
        }}>
          {fmtMoney(doc.grandTotal, displaySymbol)}
        </Text>
        <View style={{
          backgroundColor: chip.bg, borderRadius: 999,
          paddingVertical: 3, paddingHorizontal: 8,
        }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
            color: chip.fg, textTransform: 'uppercase',
          }}>
            {doc.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ClientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { business } = useBusiness();
  const businessCurrencyCode   = business?.currency ?? '';
  const businessCurrencySymbol = businessCurrencyCode ? resolveCurrency(businessCurrencyCode).symbol : '';

  const [client,      setClient]      = useState<Customer | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [recentDocs,  setRecentDocs]  = useState<Document[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [docPickerVisible, setDocPickerVisible] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    let cancelled = false;

    customerService.get(id)
      .then(data => { if (!cancelled) setClient(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    documentService.list({ customer: id, ordering: '-document_date', page: 1 })
      .then(data => {
        if (cancelled) return;
        const results = Array.isArray(data) ? data : data.results ?? [];
        setRecentDocs(results.slice(0, 5));
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [id]);

  function buildCustomerParams(c: Customer): string {
    const params = new URLSearchParams();
    params.set('customerId', c.id);
    params.set('customerName', c.fullName);
    if (c.phone) params.set('customerPhone', c.phone);
    if (c.email) params.set('customerEmail', c.email);
    return params.toString();
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primaryContainer} />
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 16, color: colors.onSurfaceVariant }}>
            Client not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const chip = STATUS_CHIP[client.status];

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate Customer',
      `Are you sure you want to deactivate ${client.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate', style: 'destructive',
          onPress: async () => {
            setStatusUpdating(true);
            try {
              const updated = await customerService.deactivate(client.id);
              setClient(updated);
            } catch {
              Alert.alert('Error', 'Could not deactivate customer.');
            } finally {
              setStatusUpdating(false);
            }
          },
        },
      ],
    );
  };

  const handleReactivate = async () => {
    setStatusUpdating(true);
    try {
      const updated = await customerService.reactivate(client.id);
      setClient(updated);
    } catch {
      Alert.alert('Error', 'Could not reactivate customer.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleShareContact = async () => {
    const lines = [
      client.fullName,
      client.phone ? `Phone: ${client.phone}` : null,
      client.email ? `Email: ${client.email}` : null,
    ].filter(Boolean);
    try {
      await Share.share({ title: client.fullName, message: lines.join('\n') });
    } catch (_) {
      // share dismissed by user — nothing to do
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>

      {/* ── Nav bar ── */}
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
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: '#f5f5f8',
            alignItems: 'center', justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={{
          flex: 1, fontFamily: 'Inter', fontSize: 18, fontWeight: '800',
          color: colors.primaryContainer,
        }}>
          BillBuzz
        </Text>
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 4 }}
        >
          <MaterialIcons name="more-vert" size={22} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* ── Body ── */}
      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        >

          {/* Name + status */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22 }}>
            <Text style={{
              flex: 1, fontFamily: 'Inter', fontSize: 28, fontWeight: '800',
              color: colors.onSurface,
            }}>
              {client.fullName}
            </Text>
            <View style={{
              backgroundColor: chip.bg, borderRadius: 999,
              paddingVertical: 6, paddingHorizontal: 12,
              marginTop: 6,
            }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
                color: chip.fg,
              }}>
                {chip.label}
              </Text>
            </View>
          </View>

          {/* Metric cards — Outstanding + Lifetime Value, both real fields */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <MetricCard title="Outstanding" value={fmtMoney(client.outstandingBalance, businessCurrencySymbol)} />
            <MetricCard title="Lifetime Value" value={fmtMoney(client.lifetimeValue, businessCurrencySymbol)} />
          </View>

          {/* Contact info */}
          <View style={{
            backgroundColor: colors.white,
            borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
            paddingHorizontal: 16, marginBottom: 24,
          }}>
            <ContactRow icon="phone" label="Mobile" value={client.phone || '—'} border />
            <ContactRow icon="email" label="Email"  value={client.email || '—'} border={!!client.notes || client.tags.length > 0} />
            {client.notes ? (
              <ContactRow icon="notes" label="Notes" value={client.notes} border={client.tags.length > 0} />
            ) : null}
            {client.tags.length > 0 ? (
              <ContactRow icon="label" label="Tags" value={client.tags.join(', ')} border={false} />
            ) : null}
          </View>

          {/* Recent Documents */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            marginBottom: 12,
          }}>
            <Text style={{
              flex: 1, fontFamily: 'Inter', fontSize: 20, fontWeight: '800',
              color: colors.onSurface,
            }}>
              Recent Documents
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(owner-tabs)/docs' as never)}
              activeOpacity={0.7}
            >
              <Text style={{
                fontFamily: 'Inter', fontSize: 12, fontWeight: '700',
                color: colors.primaryContainer, textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                VIEW ALL
              </Text>
            </TouchableOpacity>
          </View>

          {recentDocs.length > 0 ? (
            <View style={{
              backgroundColor: colors.white,
              borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
              paddingHorizontal: 16, marginBottom: 28,
              overflow: 'hidden',
            }}>
              {recentDocs.map((doc, idx) => (
                <View key={doc.id} style={idx === recentDocs.length - 1 ? { borderBottomWidth: 0 } : {}}>
                  <DocRow doc={doc} currency={businessCurrencyCode} />
                </View>
              ))}
            </View>
          ) : (
            <View style={{
              backgroundColor: colors.white,
              borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
              padding: 24, alignItems: 'center', marginBottom: 28,
            }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 13,
                color: colors.onSurfaceVariant,
              }}>
                No documents yet
              </Text>
            </View>
          )}

          {/* Create Invoice CTA */}
          <TouchableOpacity
            onPress={() => setDocPickerVisible(true)}
            activeOpacity={0.85}
            style={{
              height: 56, borderRadius: 16,
              backgroundColor: colors.primaryContainer,
              flexDirection: 'row', alignItems: 'center',
              justifyContent: 'center', gap: 10,
              marginBottom: 12,
            }}
          >
            <MaterialIcons name="add" size={22} color={colors.white} />
            <Text style={{
              fontFamily: 'Inter', fontSize: 15, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 0.5,
              color: colors.white,
            }}>
              Create New Invoice
            </Text>
          </TouchableOpacity>

          {/* Deactivate / Reactivate — reflects the customer's real status */}
          <TouchableOpacity
            onPress={client.status === 'active' ? handleDeactivate : handleReactivate}
            disabled={statusUpdating}
            activeOpacity={0.85}
            style={{
              height: 56, borderRadius: 16,
              borderWidth: 1.5,
              borderColor: client.status === 'active' ? colors.error : colors.primaryContainer,
              flexDirection: 'row', alignItems: 'center',
              justifyContent: 'center', gap: 10,
              opacity: statusUpdating ? 0.6 : 1,
            }}
          >
            {statusUpdating ? (
              <ActivityIndicator color={client.status === 'active' ? colors.error : colors.primaryContainer} />
            ) : (
              <>
                <MaterialIcons
                  name={client.status === 'active' ? 'person-off' : 'person'}
                  size={20}
                  color={client.status === 'active' ? colors.error : colors.primaryContainer}
                />
                <Text style={{
                  fontFamily: 'Inter', fontSize: 15, fontWeight: '700',
                  color: client.status === 'active' ? colors.error : colors.primaryContainer,
                }}>
                  {client.status === 'active' ? 'Deactivate Customer' : 'Reactivate Customer'}
                </Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </View>

      {/* ── Three-dot action sheet ── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
          onPress={() => setMenuVisible(false)}
        >
          <View style={{
            position: 'absolute', top: 60, right: 16,
            backgroundColor: colors.white,
            borderRadius: 14, borderWidth: 1, borderColor: '#e9ecef',
            minWidth: 180,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 10,
            elevation: 8,
            overflow: 'hidden',
          }}>
            {[
              { icon: 'edit' as const,       label: 'Edit Client',   action: () => { setMenuVisible(false); router.push(`/new-client?id=${client.id}` as never); } },
              { icon: 'share' as const,      label: 'Share Contact', action: () => { setMenuVisible(false); handleShareContact(); } },
              {
                icon: (client.status === 'active' ? 'person-off' : 'person') as React.ComponentProps<typeof MaterialIcons>['name'],
                label: client.status === 'active' ? 'Deactivate' : 'Reactivate',
                action: () => { setMenuVisible(false); client.status === 'active' ? handleDeactivate() : handleReactivate(); },
              },
            ].map((item, idx, arr) => (
              <TouchableOpacity
                key={item.label}
                onPress={item.action}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 14, paddingHorizontal: 16,
                  borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                  borderBottomColor: '#e9ecef',
                  gap: 12,
                }}
              >
                <MaterialIcons
                  name={item.icon}
                  size={18}
                  color={item.label === 'Deactivate' ? colors.error : colors.onSurface}
                />
                <Text style={{
                  fontFamily: 'Inter', fontSize: 14, fontWeight: '600',
                  color: item.label === 'Deactivate' ? colors.error : colors.onSurface,
                }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

           {/* ── Document type picker — mirrors the one on the docs list screen ── */}
      <Modal
        visible={docPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDocPickerVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setDocPickerVisible(false)}
        >
          <Pressable>
            <View style={{
              backgroundColor: colors.white,
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: 24, paddingBottom: 24,
            }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: colors.onSurface, marginBottom: 4 }}>
                Create Document
              </Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant, marginBottom: 20 }}>
                For {client.fullName}
              </Text>
 
              <TouchableOpacity
                onPress={() => {
                  setDocPickerVisible(false);
                  router.push(`/new-sales-invoice?${buildCustomerParams(client)}` as never);
                }}
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
                onPress={() => {
                  setDocPickerVisible(false);
                  router.push(`/new-document?${buildCustomerParams(client)}` as never);
                }}
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
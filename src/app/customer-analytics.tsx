import { useBusiness } from '@/context/BusinessContext';
import { resolveCurrency } from '@/utils/currencySymbol';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomerAnalytics, customerService } from '../services/customers';
import { colors } from '../styles/globals';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function fmtMoney(amount: number | string | undefined | null, symbol: string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  const safe = typeof n === 'number' && !isNaN(n) ? n : 0;
  return `${symbol}${safe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtCompact(amount: number | string, symbol: string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  const safe = typeof n === 'number' && !isNaN(n) ? n : 0;
  if (safe >= 1000) return `${symbol}${(safe / 1000).toFixed(1)}k`;
  return fmtMoney(safe, symbol);
}

const AVATAR_COLORS = ['#1b2e5e', '#c47f17', '#2e7d32', '#0277bd', '#c62828', '#6a1b9a'];

function avatarColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  check: 'Check',
};

function paymentLabel(pref: string): string {
  return PAYMENT_LABELS[pref] ?? pref;
}

// ─── Module-level components ──────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent,
}: {
  label: string; value: string; sub?: string; accent: string;
}) {
  return (
    <View style={{
      flex: 1, backgroundColor: colors.white,
      borderRadius: 14, borderWidth: 1, borderColor: '#e9ecef',
      padding: 14,
    }}>
      <Text style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: '800', color: accent, marginBottom: 4 }}>
        {value}
      </Text>
      <Text style={{
        fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 0.6,
        color: colors.onSurfaceVariant,
      }}>
        {label}
      </Text>
      {sub ? (
        <Text style={{ fontFamily: 'Inter', fontSize: 11, color: colors.onSurfaceVariant, marginTop: 2 }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function ClientLTVRow({
  id, fullName, email, ltv, rank, currencySymbol,
}: {
  id: string; fullName: string; email?: string; ltv: number | string; rank: number; currencySymbol: string;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, paddingHorizontal: 16, gap: 12,
      borderBottomWidth: 1, borderBottomColor: '#e9ecef',
    }}>
      <View style={{
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: rank === 1 ? colors.secondaryContainer : '#f0f0f4',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Text style={{
          fontFamily: 'Inter', fontSize: 12, fontWeight: '800',
          color: rank === 1 ? colors.onSecondaryContainer : colors.onSurfaceVariant,
        }}>
          {rank}
        </Text>
      </View>

      <View style={{
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: avatarColorFor(id), flexShrink: 0,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '800', color: colors.white }}>
          {initials(fullName)}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.onSurface }}>
          {fullName}
        </Text>
        {email ? (
          <Text numberOfLines={1} style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
            {email}
          </Text>
        ) : null}
      </View>

      <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.primaryContainer }}>
        {fmtMoney(ltv, currencySymbol)}
      </Text>
    </View>
  );
}

function PaymentRow({
  label, count, fillPct, last = false,
}: {
  label: string; count: number; fillPct: number; last?: boolean;
}) {
  return (
    <View style={{
      paddingVertical: 13, paddingHorizontal: 16,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: '#e9ecef',
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: colors.onSurface }}>
          {label}
        </Text>
        <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
          {count} client{count !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={{ height: 5, backgroundColor: '#e9ecef', borderRadius: 3 }}>
        <View style={{
          height: 5, width: `${fillPct}%`,
          backgroundColor: colors.primaryContainer, borderRadius: 3,
        }} />
      </View>
    </View>
  );
}

function BalanceDueRow({
  id, fullName, phone, outstandingBalance, currencySymbol,
}: {
  id: string; fullName: string; phone?: string; outstandingBalance: number | string; currencySymbol: string;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 12, paddingHorizontal: 16, gap: 12,
      borderBottomWidth: 1, borderBottomColor: '#e9ecef',
    }}>
      <View style={{
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: avatarColorFor(id),
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '800', color: colors.white }}>
          {initials(fullName)}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.onSurface }}>
          {fullName}
        </Text>
        {phone ? (
          <Text numberOfLines={1} style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
            {phone}
          </Text>
        ) : null}
      </View>

      <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.error }}>
        {fmtMoney(outstandingBalance, currencySymbol)}
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CustomerAnalyticsScreen() {
  const router = useRouter();
  const { business } = useBusiness();
  const currencySymbol = business?.currency ? resolveCurrency(business.currency).symbol : '';

  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    customerService.fetchCustomerAnalytics()
      .then(data => { if (!cancelled) setAnalytics(data); })
      .catch(() => { if (!cancelled) setAnalytics(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primaryContainer} />
      </SafeAreaView>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant }}>
          Could not load customer analytics.
        </Text>
      </SafeAreaView>
    );
  }

  const {
    totalCustomers, activeCount, inactiveCount,
    totalLtv, avgLtv, totalOutstanding, balanceDueCount,
    topClients, balanceDueClients, paymentBreakdown,
  } = analytics;

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
            Customer Analytics
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
            Client performance overview
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 }}
      >

        {/* ── Stats grid ── */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <StatCard
            label="Total Clients"
            value={String(totalCustomers)}
            accent={colors.primaryContainer}
          />
          <StatCard
            label="Active"
            value={String(activeCount)}
            sub={`${inactiveCount} inactive`}
            accent="#2e7d32"
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <StatCard
            label="Balance Due"
            value={String(balanceDueCount)}
            sub={balanceDueCount > 0 ? fmtMoney(totalOutstanding, currencySymbol) + ' total' : 'All settled'}
            accent={balanceDueCount > 0 ? colors.error : '#2e7d32'}
          />
          <StatCard
            label="Avg. LTV"
            value={fmtCompact(avgLtv, currencySymbol)}
            sub="avg lifetime value"
            accent={colors.primaryContainer}
          />
        </View>

        {/* ── Revenue banner ── */}
        <View style={{
          backgroundColor: colors.secondaryContainer,
          borderRadius: 16, padding: 18, marginBottom: 20,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <View>
            <Text style={{
              fontFamily: 'Inter', fontSize: 11, fontWeight: '600',
              textTransform: 'uppercase', letterSpacing: 0.6,
              color: colors.onSecondaryContainer + 'aa', marginBottom: 4,
            }}>
              Total Lifetime Revenue
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 28, fontWeight: '800', color: colors.onSecondaryContainer }}>
              {fmtMoney(totalLtv, currencySymbol)}
            </Text>
          </View>
          <View style={{
            width: 52, height: 52, borderRadius: 14,
            backgroundColor: 'rgba(0,0,0,0.08)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <MaterialIcons name="people-alt" size={26} color={colors.onSecondaryContainer} />
          </View>
        </View>

        {/* ── Top clients ── */}
        {topClients.length > 0 && (
          <>
            <Text style={{
              fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 0.8,
              color: colors.onSurfaceVariant, marginBottom: 10,
            }}>
              Top Clients by Lifetime Value
            </Text>
            <View style={{
              backgroundColor: colors.white, borderRadius: 16,
              borderWidth: 1, borderColor: '#e9ecef', overflow: 'hidden',
              marginBottom: 20,
              shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
            }}>
              {topClients.map((c, i) => (
                <View key={c.id} style={i === topClients.length - 1 ? { borderBottomWidth: 0 } : {}}>
                  <ClientLTVRow
                    id={c.id}
                    fullName={c.fullName}
                    email={c.email}
                    ltv={c.lifetimeValue}
                    rank={i + 1}
                    currencySymbol={currencySymbol}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Customers with balance due ── */}
        {balanceDueClients.length > 0 && (
          <>
            <Text style={{
              fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 0.8,
              color: colors.onSurfaceVariant, marginBottom: 10,
            }}>
              Customers with Balance Due
            </Text>
            <View style={{
              backgroundColor: colors.white, borderRadius: 16,
              borderWidth: 1.5, borderColor: colors.errorContainer,
              overflow: 'hidden', marginBottom: 20,
            }}>
              {balanceDueClients.map((c, i) => (
                <View key={c.id} style={i === balanceDueClients.length - 1 ? { borderBottomWidth: 0 } : {}}>
                  <BalanceDueRow
                    id={c.id}
                    fullName={c.fullName}
                    phone={c.phone}
                    outstandingBalance={c.outstandingBalance}
                    currencySymbol={currencySymbol}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Payment preferences ── */}
        {paymentBreakdown.length > 0 && (
          <>
            <Text style={{
              fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 0.8,
              color: colors.onSurfaceVariant, marginBottom: 10,
            }}>
              Payment Preferences
            </Text>
            <View style={{
              backgroundColor: colors.white, borderRadius: 16,
              borderWidth: 1, borderColor: '#e9ecef', overflow: 'hidden',
              marginBottom: 20,
            }}>
              {paymentBreakdown.map((p, i) => (
                <PaymentRow
                  key={p.preference}
                  label={paymentLabel(p.preference)}
                  count={p.count}
                  fillPct={pct(p.count, totalCustomers)}
                  last={i === paymentBreakdown.length - 1}
                />
              ))}
            </View>
          </>
        )}

        {/* ── Client status breakdown — only active/inactive exist on Customer ── */}
        <Text style={{
          fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
          textTransform: 'uppercase', letterSpacing: 0.8,
          color: colors.onSurfaceVariant, marginBottom: 10,
        }}>
          Status Breakdown
        </Text>
        <View style={{
          backgroundColor: colors.white, borderRadius: 16,
          borderWidth: 1, borderColor: '#e9ecef',
          padding: 16, flexDirection: 'row', gap: 8,
        }}>
          {([
            { key: 'active' as const, count: activeCount },
            { key: 'inactive' as const, count: inactiveCount },
          ]).map(({ key, count }) => {
            const fillW = pct(count, totalCustomers);
            const accent = key === 'active' ? '#2e7d32' : colors.onSurfaceVariant;
            return (
              <View key={key} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '800', color: accent }}>
                  {count}
                </Text>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 10, fontWeight: '600',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  color: colors.onSurfaceVariant, marginTop: 2,
                }}>
                  {key}
                </Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 11, color: colors.onSurfaceVariant, marginTop: 2 }}>
                  {fillW}%
                </Text>
              </View>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CLIENTS, Client, fmtMoney, initials } from '../data/clients';
import { colors } from '../styles/globals';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
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
  client, rank,
}: {
  client: Client; rank: number;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, paddingHorizontal: 16, gap: 12,
      borderBottomWidth: 1, borderBottomColor: '#e9ecef',
    }}>
      {/* Rank badge */}
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

      {/* Avatar */}
      <View style={{
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: client.avatarColor, flexShrink: 0,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '800', color: colors.white }}>
          {initials(client)}
        </Text>
      </View>

      {/* Name / business */}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.onSurface }}>
          {client.firstName} {client.lastName}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
          {client.businessName}
        </Text>
      </View>

      {/* LTV + YoY */}
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.primaryContainer }}>
          {fmtMoney(client.lifetimeValue)}
        </Text>
        <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '600', color: '#2e7d32', marginTop: 1 }}>
          {client.yoyGrowth} YoY
        </Text>
      </View>
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

function OverdueRow({ client }: { client: Client }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 12, paddingHorizontal: 16, gap: 12,
      borderBottomWidth: 1, borderBottomColor: '#e9ecef',
    }}>
      {/* Avatar */}
      <View style={{
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: client.avatarColor,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '800', color: colors.white }}>
          {initials(client)}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.onSurface }}>
          {client.firstName} {client.lastName}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
          {client.businessName}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.error }}>
          {fmtMoney(client.outstanding)}
        </Text>
        <View style={{
          backgroundColor: colors.errorContainer, borderRadius: 999,
          paddingHorizontal: 7, paddingVertical: 2, marginTop: 2,
        }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: colors.error }}>
            Overdue
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CustomerAnalyticsScreen() {
  const router = useRouter();

  // ── Derived stats ──
  const activeCount  = CLIENTS.filter(c => c.status === 'active').length;
  const overdueList  = CLIENTS.filter(c => c.isOverdue);
  const totalLTV     = CLIENTS.reduce((s, c) => s + c.lifetimeValue, 0);
  const avgLTV       = Math.round(totalLTV / CLIENTS.length);
  const totalOutstanding = CLIENTS.reduce((s, c) => s + c.outstanding, 0);

  const topClients = useMemo(
    () => [...CLIENTS].sort((a, b) => b.lifetimeValue - a.lifetimeValue).slice(0, 3),
    [],
  );

  const paymentPrefs = useMemo(() => {
    const map: Record<string, number> = {};
    CLIENTS.forEach(c => { map[c.paymentPreference] = (map[c.paymentPreference] ?? 0) + 1; });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count, fillPct: pct(count, CLIENTS.length) }));
  }, []);

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

        <TouchableOpacity
          onPress={() => Alert.alert('Export', 'CSV export coming soon.')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 4 }}
        >
          <MaterialIcons name="file-download" size={22} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 }}
      >

        {/* ── Stats grid ── */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <StatCard
            label="Total Clients"
            value={String(CLIENTS.length)}
            accent={colors.primaryContainer}
          />
          <StatCard
            label="Active"
            value={String(activeCount)}
            sub={`${CLIENTS.length - activeCount} inactive / pending`}
            accent="#2e7d32"
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <StatCard
            label="Overdue"
            value={String(overdueList.length)}
            sub={overdueList.length > 0 ? fmtMoney(totalOutstanding) + ' at risk' : 'All clear'}
            accent={overdueList.length > 0 ? colors.error : '#2e7d32'}
          />
          <StatCard
            label="Avg. LTV"
            value={`$${(avgLTV / 1000).toFixed(1)}k`}
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
              {fmtMoney(totalLTV)}
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
              <ClientLTVRow client={c} rank={i + 1} />
            </View>
          ))}
        </View>

        {/* ── Overdue clients ── */}
        {overdueList.length > 0 && (
          <>
            <Text style={{
              fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 0.8,
              color: colors.onSurfaceVariant, marginBottom: 10,
            }}>
              Overdue Accounts
            </Text>
            <View style={{
              backgroundColor: colors.white, borderRadius: 16,
              borderWidth: 1.5, borderColor: colors.errorContainer,
              overflow: 'hidden', marginBottom: 20,
            }}>
              {overdueList.map((c, i) => (
                <View key={c.id} style={i === overdueList.length - 1 ? { borderBottomWidth: 0 } : {}}>
                  <OverdueRow client={c} />
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Payment preferences ── */}
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
          {paymentPrefs.map((p, i) => (
            <PaymentRow
              key={p.label}
              label={p.label}
              count={p.count}
              fillPct={p.fillPct}
              last={i === paymentPrefs.length - 1}
            />
          ))}
        </View>

        {/* ── Client status breakdown ── */}
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
          {(['active', 'pending', 'inactive'] as const).map(status => {
            const count = CLIENTS.filter(c => c.status === status).length;
            const fillW  = pct(count, CLIENTS.length);
            const accent = status === 'active' ? '#2e7d32' : status === 'pending' ? '#f59e0b' : colors.onSurfaceVariant;
            return (
              <View key={status} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '800', color: accent }}>
                  {count}
                </Text>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 10, fontWeight: '600',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  color: colors.onSurfaceVariant, marginTop: 2,
                }}>
                  {status}
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

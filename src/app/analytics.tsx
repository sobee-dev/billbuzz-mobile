import { useBusiness } from '@/context/BusinessContext';
import { resolveCurrency } from '@/utils/currencySymbol';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReportsDashboard, reportService } from '../services/reports';
import { colors } from '../styles/globals';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNum(v: number | string | undefined | null): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  return typeof n === 'number' && !isNaN(n) ? n : 0;
}

function fmtMoney(v: number | string | undefined | null, symbol: string): string {
  return `${symbol}${toNum(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CHART_H = 100;

// ─── Module-level components ──────────────────────────────────────────────────

function BarChart({ data }: { data: ReportsDashboard['monthlyRevenue'] }) {
  const maxVal = Math.max(1, ...data.map(m => toNum(m.value)));

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H }}>
        {data.map(m => {
          const h = Math.max(6, Math.round((toNum(m.value) / maxVal) * CHART_H));
          return (
            <View key={m.month} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <View style={{
                width: 28, height: h,
                backgroundColor: m.current
                  ? colors.primaryContainer
                  : colors.primaryContainer + '38',
                borderRadius: 5,
              }} />
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', marginTop: 10 }}>
        {data.map(m => (
          <View key={m.month} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{
              fontFamily: 'Inter',
              fontSize: 11,
              fontWeight: m.current ? '700' : '400',
              color: m.current ? colors.primaryContainer : colors.onSurfaceVariant,
            }}>
              {m.month}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function InsightRow({
  icon, iconBg, iconColor, label, sub, onPress, last = false,
}: {
  icon:      React.ComponentProps<typeof MaterialIcons>['name'];
  iconBg:    string;
  iconColor: string;
  label:     string;
  sub?:      string;
  onPress:   () => void;
  last?:     boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 16, paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: '#e9ecef',
        gap: 14,
      }}
    >
      <View style={{
        width: 46, height: 46, borderRadius: 13,
        backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center',
      }}>
        <MaterialIcons name={icon} size={22} color={iconColor} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: 'Inter', fontSize: 15, fontWeight: '600',
          color: colors.onSurface,
        }}>
          {label}
        </Text>
        {sub ? (
          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 1 }}>
            {sub}
          </Text>
        ) : null}
      </View>

      <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef', padding: 16 }}>
      <Text style={{
        fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 0.7,
        color: colors.onSurfaceVariant, marginBottom: 8,
      }}>
        {label}
      </Text>
      <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '800', color }}>
        {value}
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const router = useRouter();
  const { business } = useBusiness();
  const currencySymbol = business?.currency ? resolveCurrency(business.currency).symbol : '';

  const [report,  setReport]  = useState<ReportsDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    reportService.getDashboard()
      .then(data => { if (!cancelled) setReport(data); })
      .catch(() => { if (!cancelled) setReport(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const growthIsPositive = report ? !report.revenueGrowth.startsWith('-') && report.revenueGrowth !== '—' : true;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primaryContainer} />
      </SafeAreaView>
    );
  }

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
        <Text style={{
          flex: 1, fontFamily: 'Inter', fontSize: 18, fontWeight: '800',
          color: colors.primaryContainer,
        }}>
          BillBuzz
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}
      >

        {/* ── Title ── */}
        <View style={{ paddingTop: 22, marginBottom: 22 }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 26, fontWeight: '800', color: colors.onSurface,
          }}>
            Performance Dashboard
          </Text>
          <Text style={{
            fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant, marginTop: 4,
          }}>
            Owner's real-time business insights
          </Text>
        </View>

        {!report ? (
          <View style={{
            backgroundColor: colors.white, borderRadius: 16,
            borderWidth: 1, borderColor: '#e9ecef',
            padding: 24, alignItems: 'center', marginBottom: 20,
          }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant }}>
              Could not load your business insights.
            </Text>
          </View>
        ) : (
          <>
            {/* ── Total Revenue card ── */}
            <View style={{
              backgroundColor: colors.white, borderRadius: 16,
              borderWidth: 1, borderColor: '#e9ecef',
              padding: 20, marginBottom: 12,
              shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
            }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: 0.8,
                color: colors.onSurfaceVariant, marginBottom: 8,
              }}>
                Revenue This Month
              </Text>
              <Text style={{
                fontFamily: 'Inter', fontSize: 36, fontWeight: '800', color: colors.onSurface,
              }}>
                {fmtMoney(report.revenueTotal, currencySymbol)}
              </Text>
              {report.revenueGrowth !== '—' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                  <MaterialIcons
                    name={growthIsPositive ? 'trending-up' : 'trending-down'}
                    size={17}
                    color={growthIsPositive ? '#2e7d32' : colors.error}
                  />
                  <Text style={{
                    fontFamily: 'Inter', fontSize: 13, fontWeight: '600',
                    color: growthIsPositive ? '#2e7d32' : colors.error,
                  }}>
                    {report.revenueGrowth} vs last month
                  </Text>
                </View>
              )}
            </View>

            {/* ── Outstanding + Collection Rate ── */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <MiniStat
                label="Outstanding"
                value={fmtMoney(report.outstandingTotal, currencySymbol)}
                color={colors.error}
              />
              <MiniStat
                label="Collection Rate"
                value={report.collectionRate}
                color={colors.onSurface}
              />
            </View>

            {/* ── Avg Invoice Value ── */}
            <View style={{ marginBottom: 12 }}>
              <MiniStat
                label="Avg. Invoice Value (This Month)"
                value={fmtMoney(report.avgInvoiceValue, currencySymbol)}
                color={colors.primaryContainer}
              />
            </View>

            {/* ── Monthly Revenue chart ── */}
            <View style={{
              backgroundColor: colors.white, borderRadius: 16,
              borderWidth: 1, borderColor: '#e9ecef',
              padding: 20, marginBottom: 28,
              shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
            }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 16,
              }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: colors.onSurface }}>
                  Monthly Revenue
                </Text>
                <MaterialIcons name="bar-chart" size={22} color={colors.onSurfaceVariant} />
              </View>
              <BarChart data={report.monthlyRevenue} />
            </View>
          </>
        )}

        {/* ── Business Insights header ── */}
        <Text style={{
          fontFamily: 'Inter', fontSize: 22, fontWeight: '800',
          color: colors.onSurface, marginBottom: 14,
        }}>
          Business Insights
        </Text>

        {/* ── Insight rows card ── */}
        <View style={{
          backgroundColor: colors.white, borderRadius: 16,
          borderWidth: 1, borderColor: '#e9ecef', overflow: 'hidden',
          marginBottom: 20,
          shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
        }}>
          <InsightRow
            icon="inventory"
            iconBg="#e8f5e9"
            iconColor="#2e7d32"
            label="Stock Report"
            sub="Inventory levels & reorder alerts"
            onPress={() => router.push('/stock-report' as never)}
          />
          <InsightRow
            icon="people-alt"
            iconBg={colors.secondaryContainer}
            iconColor={colors.onSecondaryContainer}
            label="Customer Analytics"
            sub="LTV, payment trends & balances due"
            onPress={() => router.push('/customer-analytics' as never)}
          />
          <InsightRow
            icon="receipt-long"
            iconBg={colors.primaryContainer + '14'}
            iconColor={colors.primaryContainer}
            label="View All Invoices"
            sub="Browse complete document history"
            onPress={() => router.push('/(owner-tabs)/docs' as never)}
            last
          />
        </View>

        {/* ── Owner Advisory card — real data ── */}
        {report && (
          <View style={{
            backgroundColor: colors.primaryContainer,
            borderRadius: 16, padding: 22, overflow: 'hidden',
          }}>
            <View style={{
              position: 'absolute', top: -32, right: -32,
              width: 120, height: 120, borderRadius: 60,
              borderWidth: 18, borderColor: 'rgba(255,255,255,0.06)',
            }} />
            <View style={{
              position: 'absolute', top: 16, right: 20,
              width: 60, height: 60, borderRadius: 30,
              borderWidth: 10, borderColor: 'rgba(255,255,255,0.08)',
            }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <MaterialIcons name="lightbulb-outline" size={15} color={colors.secondaryContainer} />
              <Text style={{
                fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: 0.8,
                color: colors.secondaryContainer,
              }}>
                Owner Advisory
              </Text>
            </View>

            <Text style={{
              fontFamily: 'Inter', fontSize: 24, fontWeight: '800',
              color: colors.white, lineHeight: 32,
            }}>
              {report.revenueGrowth === '—'
                ? 'No revenue recorded yet'
                : `Revenue is ${growthIsPositive ? 'up' : 'down'} ${report.revenueGrowth.replace('+', '').replace('-', '')}\nthis month`}
            </Text>

            <Text style={{
              fontFamily: 'Inter', fontSize: 13,
              color: 'rgba(255,255,255,0.7)', marginTop: 10, lineHeight: 20,
            }}>
              {report.revenueGrowth === '—'
                ? 'Once you have paid invoices, monthly trends will show up here.'
                : growthIsPositive
                  ? 'Strong invoicing performance is driving growth compared to last month.'
                  : 'Revenue has slowed compared to last month — worth a closer look at outstanding invoices.'}
            </Text>

            <TouchableOpacity
              onPress={() => router.push('/(owner-tabs)/docs' as never)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                marginTop: 16, alignSelf: 'flex-start',
                backgroundColor: 'rgba(255,255,255,0.14)',
                borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14,
              }}
            >
              <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.white }}>
                See full breakdown
              </Text>
              <MaterialIcons name="arrow-forward" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
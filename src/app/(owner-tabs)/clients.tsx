import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ScrollView, Switch, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Customer, CustomerStatus, customerService } from '../../services/customers';
import { colors } from '../../styles/globals';

// ─── Status chip config — matches Customer.status exactly (active/inactive only,
// no invented "pending" state — that never comes from the real backend) ───────
const STATUS_CHIP: Record<CustomerStatus, { bg: string; fg: string; label: string }> = {
  active:   { bg: '#e6f4ea', fg: '#1e7e34', label: 'ACTIVE'   },
  inactive: { bg: '#f0f0f4', fg: '#45464f', label: 'INACTIVE' },
};

// ─── Sort modes ───────────────────────────────────────────────────────────────
type SortMode = 'recent' | 'az' | 'za';
const SORT_LABELS: Record<SortMode, string> = {
  recent: 'RECENT',
  az:     'A – Z',
  za:     'Z – A',
};
const SORT_CYCLE: SortMode[] = ['recent', 'az', 'za'];

// ─── Avatar helpers — Customer has no avatarColor/isOnline fields, so these
// are derived client-side rather than trusting fields that don't exist ────────
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

// ─── Client card (module-level for keyboard stability) ────────────────────────
function ClientCard({
  customer,
  onPress,
}: {
  customer: Customer;
  onPress:  () => void;
}) {
  const chip = STATUS_CHIP[customer.status];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e9ecef',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 10,
      }}
    >
      {/* Avatar */}
      <View style={{
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: avatarColorFor(customer.id),
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Text style={{
          fontFamily: 'Inter', fontSize: 20, fontWeight: '800',
          color: colors.white,
        }}>
          {initials(customer.fullName)}
        </Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: 'Inter', fontSize: 16, fontWeight: '700',
          color: colors.onSurface, marginBottom: 2,
        }}>
          {customer.fullName}
        </Text>
        {customer.email ? (
          <Text style={{
            fontFamily: 'Inter', fontSize: 12,
            color: colors.onSurfaceVariant, marginBottom: 1,
          }}>
            {customer.email}
          </Text>
        ) : null}
        {customer.phone ? (
          <Text style={{
            fontFamily: 'Inter', fontSize: 12,
            color: colors.onSurfaceVariant,
          }}>
            {customer.phone}
          </Text>
        ) : null}
      </View>

      {/* Status chip */}
      <View style={{
        backgroundColor: chip.bg,
        borderRadius: 999,
        paddingVertical: 5, paddingHorizontal: 10,
        alignSelf: 'flex-start',
      }}>
        <Text style={{
          fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
          color: chip.fg,
        }}>
          {chip.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ClientsScreen() {
  const router = useRouter();

  const [search,     setSearch]     = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [sortMode,   setSortMode]   = useState<SortMode>('recent');
  const [clients,    setClients]    = useState<Customer[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      customerService.list()
        .then(data => {
          if (cancelled) return;
          const results = Array.isArray(data) ? data : data.results ?? [];
          setClients(results);
        })
        .catch(() => {
          if (!cancelled) setClients([]);
        });
      return () => { cancelled = true; };
    }, []),
  );

  const cycleSort = () => {
    const idx = SORT_CYCLE.indexOf(sortMode);
    setSortMode(SORT_CYCLE[(idx + 1) % SORT_CYCLE.length]);
  };

  const filtered = useMemo(() => {
    let list = activeOnly
      ? clients.filter(c => c.status === 'active')
      : [...clients];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.fullName.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q),
      );
    }

    if (sortMode === 'az') list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    if (sortMode === 'za') list.sort((a, b) => b.fullName.localeCompare(a.fullName));
    // 'recent' keeps whatever order the backend returned (assumed newest-first)

    return list;
  }, [clients, search, activeOnly, sortMode]);

  const totalClients = clients.length;

  const newThisMonth = useMemo(() => {
    const now = new Date();
    return clients.filter(c => {
      const created = new Date(c.createdAt);
      return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
    }).length;
  }, [clients]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
      <View style={{ flex: 1 }}>

        {/* ── Scrollable content ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        >

          {/* Search */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.white,
            borderRadius: 14, borderWidth: 1, borderColor: '#e9ecef',
            paddingHorizontal: 14, height: 52,
            marginBottom: 12,
          }}>
            <MaterialIcons name="search" size={20} color={colors.onSurfaceVariant} style={{ marginRight: 8 }} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search customers..."
              placeholderTextColor={colors.onSurfaceVariant}
              style={{
                flex: 1, fontFamily: 'Inter', fontSize: 15,
                color: colors.onSurface,
              }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialIcons name="close" size={18} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>

          {/* Active Only toggle */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.white,
            borderRadius: 14, borderWidth: 1, borderColor: '#e9ecef',
            paddingHorizontal: 16, paddingVertical: 14,
            marginBottom: 16,
          }}>
            <Text style={{
              flex: 1, fontFamily: 'Inter', fontSize: 15, fontWeight: '600',
              color: colors.onSurface,
            }}>
              Active Only
            </Text>
            <Switch
              value={activeOnly}
              onValueChange={setActiveOnly}
              thumbColor={colors.white}
              trackColor={{ false: '#c5c6d0', true: colors.primaryContainer }}
              ios_backgroundColor="#c5c6d0"
            />
          </View>

          {/* Stat cards */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <View style={{
              flex: 1, backgroundColor: colors.primaryContainer,
              borderRadius: 16, padding: 18,
            }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: 1,
                color: 'rgba(255,255,255,0.65)', marginBottom: 6,
              }}>
                Total Clients
              </Text>
              <Text style={{
                fontFamily: 'Inter', fontSize: 34, fontWeight: '800',
                color: colors.white,
              }}>
                {totalClients}
              </Text>
            </View>

            <View style={{
              flex: 1, backgroundColor: colors.secondaryContainer,
              borderRadius: 16, padding: 18,
            }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: 1,
                color: 'rgba(117,87,0,0.65)', marginBottom: 6,
              }}>
                New This Month
              </Text>
              <Text style={{
                fontFamily: 'Inter', fontSize: 34, fontWeight: '800',
                color: colors.onSecondaryContainer,
              }}>
                +{newThisMonth}
              </Text>
            </View>
          </View>

          {/* List heading + sort */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            marginBottom: 14,
          }}>
            <Text style={{
              flex: 1, fontFamily: 'Inter', fontSize: 22, fontWeight: '800',
              color: colors.onSurface,
            }}>
              Clients
            </Text>
            <TouchableOpacity onPress={cycleSort} activeOpacity={0.7}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: 0.5,
                color: colors.onSurfaceVariant,
              }}>
                SORT BY: {SORT_LABELS[sortMode]}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Client list */}
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <MaterialIcons name="person-search" size={48} color="#dde1e7" />
              <Text style={{
                fontFamily: 'Inter', fontSize: 14,
                color: colors.onSurfaceVariant, marginTop: 12,
              }}>
                No clients found
              </Text>
            </View>
          ) : (
            filtered.map(c => (
              <ClientCard
                key={c.id}
                customer={c}
                onPress={() => router.push(`/client-detail?id=${c.id}` as never)}
              />
            ))
          )}
        </ScrollView>

        {/* ── FAB ── */}
        <TouchableOpacity
          onPress={() => router.push('/new-client' as never)}
          activeOpacity={0.85}
          style={{
            position: 'absolute', bottom: 20, right: 20,
            width: 58, height: 58, borderRadius: 29,
            backgroundColor: colors.secondaryContainer,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <MaterialIcons name="add" size={28} color={colors.onSecondaryContainer} />
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}
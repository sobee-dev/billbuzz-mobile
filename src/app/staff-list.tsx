import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { staffService } from '../services/staff';
import {
  Alert, Modal, Pressable, ScrollView,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AccessLevel, ROLE_CHIP, ROLE_LABEL, STAFF_MEMBERS,
  StaffMember, StaffRole, StaffStatus, staffInitials,
} from '../data/staff';
import { colors } from '../styles/globals';

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterRole   = StaffRole | 'all';
type FilterStatus = StaffStatus | 'all';

// ─── Status display ───────────────────────────────────────────────────────────
const STATUS_DISPLAY: Record<StaffStatus, { label: string; color: string }> = {
  active:   { label: '● Active',      color: '#1e7e34'              },
  inactive: { label: '● Inactive',    color: colors.onSurfaceVariant },
  pending:  { label: 'Invite Sent',   color: colors.onSecondaryContainer },
};

// ─── Staff card (module-level) ────────────────────────────────────────────────
function StaffCard({
  member,
  onPress,
  onThreeDot,
}: {
  member:     StaffMember;
  onPress:    (() => void) | null;
  onThreeDot: () => void;
}) {
  const chip   = ROLE_CHIP[member.role];
  const status = STATUS_DISPLAY[member.status];

  const card = (
    <View style={{
      backgroundColor: colors.white,
      borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef',
      padding: 14,
      flexDirection: 'row', alignItems: 'center',
      gap: 12, marginBottom: 10,
      shadowColor: '#1b2e5e',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    }}>

      {/* Avatar */}
      <View style={{
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: member.status === 'pending' ? '#e9ecef' : member.avatarColor,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {member.status === 'pending' ? (
          <MaterialIcons name="more-horiz" size={22} color={colors.onSurfaceVariant} />
        ) : (
          <Text style={{
            fontFamily: 'Inter', fontSize: 18, fontWeight: '800',
            color: colors.white,
          }}>
            {staffInitials(member)}
          </Text>
        )}
      </View>

      {/* Info */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 15, fontWeight: '700',
            color: member.status === 'inactive' ? colors.onSurfaceVariant : colors.onSurface,
          }}>
            {member.name}
          </Text>
          <View style={{
            backgroundColor: chip.bg, borderRadius: 6,
            paddingVertical: 2, paddingHorizontal: 7,
          }}>
            <Text style={{
              fontFamily: 'Inter', fontSize: 10, fontWeight: '700',
              color: chip.fg,
            }}>
              {ROLE_LABEL[member.role]}
            </Text>
          </View>
        </View>
        <Text style={{
          fontFamily: 'Inter', fontSize: 12,
          color: colors.onSurfaceVariant,
        }} numberOfLines={1}>
          {member.email}
        </Text>
      </View>

      {/* Right: status + action */}
      <View style={{ alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <Text style={{
          fontFamily: 'Inter', fontSize: 12, fontWeight: '600',
          color: status.color,
        }}>
          {status.label}
        </Text>
        {member.status === 'pending' ? (
          <TouchableOpacity
            onPress={onThreeDot}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="more-vert" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        ) : (
          <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {card}
      </TouchableOpacity>
    );
  }
  return card;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function StaffListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Filter state
  const [filterVisible,  setFilterVisible]  = useState(false);
  const [filterRole,     setFilterRole]     = useState<FilterRole>('all');
  const [filterStatus,   setFilterStatus]   = useState<FilterStatus>('all');
  const [pendingRole,    setPendingRole]     = useState<FilterRole>('all');
  const [pendingStatus,  setPendingStatus]   = useState<FilterStatus>('all');
  const [members,        setMembers]         = useState<StaffMember[]>(STAFF_MEMBERS);

  useFocusEffect(
    useCallback(() => {
      staffService.list()
        .then(data => {
          const results = data.results ?? data;
          if (Array.isArray(results) && results.length) setMembers(results as StaffMember[]);
        })
        .catch(() => {});
    }, []),
  );

  // Pending member three-dot
  const [dotMemberId,  setDotMemberId]  = useState<string | null>(null);

  const filtered = useMemo(() => {
    return members.filter(m => {
      const roleOk   = filterRole   === 'all' || m.role   === filterRole;
      const statusOk = filterStatus === 'all' || m.status === filterStatus;
      return roleOk && statusOk;
    });
  }, [filterRole, filterStatus]);

  const hasActiveFilter = filterRole !== 'all' || filterStatus !== 'all';

  const openFilter = () => {
    setPendingRole(filterRole);
    setPendingStatus(filterStatus);
    setFilterVisible(true);
  };

  const applyFilter = () => {
    setFilterRole(pendingRole);
    setFilterStatus(pendingStatus);
    setFilterVisible(false);
  };

  const clearFilter = () => {
    setPendingRole('all');
    setPendingStatus('all');
    setFilterRole('all');
    setFilterStatus('all');
    setFilterVisible(false);
  };

  const handleThreeDot = (member: StaffMember) => {
    setDotMemberId(member.id);
  };

  const dotMember = STAFF_MEMBERS.find(m => m.id === dotMemberId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
      <View style={{ flex: 1 }}>

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
              width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f8',
              alignItems: 'center', justifyContent: 'center', marginRight: 10,
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
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
            <MaterialIcons name="search" size={22} color={colors.onSurface} />
          </TouchableOpacity>
        </View>

        {/* ── Body ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        >

          {/* Heading row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
            <Text style={{
              flex: 1, fontFamily: 'Inter', fontSize: 26, fontWeight: '800',
              color: colors.onSurface,
            }}>
              Staff Members
            </Text>
            <View style={{
              backgroundColor: colors.secondaryContainer, borderRadius: 999,
              paddingVertical: 5, paddingHorizontal: 12, marginTop: 4,
            }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 12, fontWeight: '700',
                color: colors.onSecondaryContainer,
              }}>
                {STAFF_MEMBERS.length} TOTAL
              </Text>
            </View>
          </View>

          <Text style={{
            fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant,
            lineHeight: 20, marginBottom: 22,
          }}>
            Manage team roles and access levels for your organization.
          </Text>

          {/* Action row */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={openFilter}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                paddingVertical: 10, paddingHorizontal: 18,
                borderRadius: 12, borderWidth: 1.5,
                borderColor: hasActiveFilter ? colors.primaryContainer : '#c5c6d0',
                backgroundColor: hasActiveFilter ? colors.primaryContainer + '10' : 'transparent',
              }}
            >
              <MaterialIcons name="tune" size={18} color={hasActiveFilter ? colors.primaryContainer : colors.onSurface} />
              <Text style={{
                fontFamily: 'Inter', fontSize: 14, fontWeight: '600',
                color: hasActiveFilter ? colors.primaryContainer : colors.onSurface,
              }}>
                Filter{hasActiveFilter ? ' •' : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/new-staff' as never)}
              activeOpacity={0.85}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center',
                justifyContent: 'center', gap: 8,
                paddingVertical: 10, borderRadius: 12,
                backgroundColor: colors.primaryContainer,
              }}
            >
              <MaterialIcons name="person-add" size={18} color={colors.white} />
              <Text style={{
                fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.white,
              }}>
                Add Staff
              </Text>
            </TouchableOpacity>
          </View>

          {/* Staff list */}
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <MaterialIcons name="group-off" size={48} color="#dde1e7" />
              <Text style={{
                fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant, marginTop: 12,
              }}>
                No staff match the current filter
              </Text>
              <TouchableOpacity onPress={clearFilter} style={{ marginTop: 12 }}>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 13, fontWeight: '700',
                  color: colors.primaryContainer,
                }}>
                  Clear Filter
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            filtered.map(member => (
              <StaffCard
                key={member.id}
                member={member}
                onPress={member.status !== 'pending'
                  ? () => router.push(`/new-staff?id=${member.id}` as never)
                  : null
                }
                onThreeDot={() => handleThreeDot(member)}
              />
            ))
          )}
        </ScrollView>

        {/* ── FAB ── */}
        <TouchableOpacity
          onPress={() => router.push('/new-staff' as never)}
          activeOpacity={0.85}
          style={{
            position: 'absolute', bottom: 24, right: 20,
            width: 58, height: 58, borderRadius: 29,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <MaterialIcons name="add" size={28} color={colors.white} />
        </TouchableOpacity>

      </View>

      {/* ── Pending member three-dot menu ── */}
      <Modal
        visible={dotMemberId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDotMemberId(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
          onPress={() => setDotMemberId(null)}
        >
          <View style={{
            position: 'absolute', top: 200, right: 16,
            backgroundColor: colors.white,
            borderRadius: 14, borderWidth: 1, borderColor: '#e9ecef',
            minWidth: 190,
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12, shadowRadius: 10, elevation: 8,
            overflow: 'hidden',
          }}>
            <TouchableOpacity
              onPress={() => {
                setDotMemberId(null);
                Alert.alert('Resend Invite', `Invite resent to ${dotMember?.email ?? ''}.`);
              }}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 14, paddingHorizontal: 16,
                borderBottomWidth: 1, borderBottomColor: '#e9ecef', gap: 12,
              }}
            >
              <MaterialIcons name="send" size={18} color={colors.onSurface} />
              <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.onSurface }}>
                Resend Invite
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setDotMemberId(null);
                Alert.alert(
                  'Cancel Invite',
                  `Cancel invite for ${dotMember?.name ?? ''}?`,
                  [
                    { text: 'Keep', style: 'cancel' },
                    { text: 'Cancel Invite', style: 'destructive', onPress: () => {} },
                  ],
                );
              }}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 14, paddingHorizontal: 16, gap: 12,
              }}
            >
              <MaterialIcons name="cancel" size={18} color={colors.error} />
              <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.error }}>
                Cancel Invite
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── Filter bottom sheet ── */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setFilterVisible(false)}
        >
          <Pressable>
            <View style={{
              backgroundColor: colors.white,
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 24,
            }}>
              {/* Handle */}
              <View style={{
                width: 40, height: 4, borderRadius: 2, backgroundColor: '#dde1e7',
                alignSelf: 'center', marginTop: 14, marginBottom: 4,
              }} />

              {/* Header */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
              }}>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 20, fontWeight: '800',
                  color: colors.primaryContainer,
                }}>
                  Filter Staff
                </Text>
                <TouchableOpacity
                  onPress={() => setFilterVisible(false)}
                  style={{
                    width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f4',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="close" size={16} color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              <View style={{ paddingHorizontal: 20 }}>
                {/* Role filter */}
                <Text style={{
                  fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: 0.7,
                  color: colors.onSurfaceVariant, marginBottom: 10,
                }}>
                  Role
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {(['all', 'owner', 'admin', 'manager', 'editor', 'viewer'] as FilterRole[]).map(r => {
                    const selected = pendingRole === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        onPress={() => setPendingRole(r)}
                        activeOpacity={0.75}
                        style={{
                          paddingVertical: 7, paddingHorizontal: 14,
                          borderRadius: 999, borderWidth: 1.5,
                          borderColor: selected ? colors.primaryContainer : '#c5c6d0',
                          backgroundColor: selected ? colors.primaryContainer : 'transparent',
                        }}
                      >
                        <Text style={{
                          fontFamily: 'Inter', fontSize: 13, fontWeight: '600',
                          color: selected ? colors.white : colors.onSurface,
                          textTransform: 'capitalize',
                        }}>
                          {r === 'all' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Status filter */}
                <Text style={{
                  fontFamily: 'Inter', fontSize: 11, fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: 0.7,
                  color: colors.onSurfaceVariant, marginBottom: 10,
                }}>
                  Status
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {(['all', 'active', 'inactive', 'pending'] as FilterStatus[]).map(s => {
                    const selected = pendingStatus === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setPendingStatus(s)}
                        activeOpacity={0.75}
                        style={{
                          paddingVertical: 7, paddingHorizontal: 14,
                          borderRadius: 999, borderWidth: 1.5,
                          borderColor: selected ? colors.primaryContainer : '#c5c6d0',
                          backgroundColor: selected ? colors.primaryContainer : 'transparent',
                        }}
                      >
                        <Text style={{
                          fontFamily: 'Inter', fontSize: 13, fontWeight: '600',
                          color: selected ? colors.white : colors.onSurface,
                          textTransform: 'capitalize',
                        }}>
                          {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Buttons */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={clearFilter}
                    activeOpacity={0.8}
                    style={{
                      flex: 1, height: 50, borderRadius: 14,
                      borderWidth: 1.5, borderColor: '#c5c6d0',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Text style={{
                      fontFamily: 'Inter', fontSize: 14, fontWeight: '600',
                      color: colors.onSurfaceVariant,
                    }}>
                      Clear
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={applyFilter}
                    activeOpacity={0.85}
                    style={{
                      flex: 2, height: 50, borderRadius: 14,
                      backgroundColor: colors.primaryContainer,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Text style={{
                      fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.white,
                    }}>
                      Apply Filter
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRequireBusiness } from '../../hooks/useRequireBusiness';
import { colors } from '../../styles/globals';

const TABS = [
  { name: 'dashboard', label: 'Dashboard', icon: 'dashboard'   },
  { name: 'docs',      label: 'Docs',      icon: 'description' },
  { name: 'products',  label: 'Products',  icon: 'inventory-2' },
  { name: 'clients',   label: 'Clients',   icon: 'people'      },
  { name: 'more',      label: 'More',      icon: 'more-horiz'  },
] as const;

const MORE_MENU_ITEMS = [
  { key: 'staff',     label: 'Staff',     description: 'Manage team members & roles', icon: 'badge',     route: '/staff-list' },
  { key: 'analytics', label: 'Analytics', description: 'Business insights & reports',  icon: 'analytics', route: '/analytics'  },
  { key: 'settings',  label: 'Settings',  description: 'App & account preferences',    icon: 'settings',  route: '/settings'   },
] as const;

const LOCKED_MESSAGE = 'Renew your subscription to unlock the rest of the app.';

function CustomTabBar({ state, navigation }: { state: any; navigation: any }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLocked } = useSubscriptionContext();
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);

  return (
    <>
      <View style={{
        flexDirection:     'row',
        backgroundColor:   colors.white,
        borderTopWidth:    1,
        borderTopColor:    '#e9ecef',
        paddingTop:        8,
        paddingBottom:     insets.bottom + 5,
        paddingHorizontal: 3,
      }}>
        {TABS.map((tab, index) => {
          const isMore   = tab.name === 'more';
          const isBlocked = isLocked && tab.name !== 'dashboard';
          const focused  = isMore
            ? moreMenuVisible
            : state.index === index && !moreMenuVisible;

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => {
                if (isBlocked) {
                  Alert.alert('Subscription Inactive', LOCKED_MESSAGE);
                  return;
                }
                if (isMore) {
                  setMoreMenuVisible(true);
                } else {
                  setMoreMenuVisible(false);
                  navigation.navigate(tab.name);
                }
              }}
              activeOpacity={0.7}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <View
                key={focused ? 'active' : 'inactive'}
                style={{
                  borderRadius:       12,
                  overflow:           'hidden',
                  alignItems:        'center',
                  justifyContent:    'center',
                  paddingVertical:    5,
                  paddingHorizontal: focused ? 8 : 0,
                  backgroundColor:    focused ? colors.secondaryContainer : 'transparent',
                  opacity: isBlocked ? 0.4 : 1,
                }}>
                <MaterialIcons
                  name={tab.icon as React.ComponentProps<typeof MaterialIcons>['name']}
                  size={22}
                  color={focused ? colors.onSecondaryContainer : colors.onSurfaceVariant}
                />
                <Text style={{
                  fontFamily: 'Inter',
                  fontSize:   11,
                  fontWeight: focused ? '700' : '400',
                  color:      focused ? colors.onSecondaryContainer : colors.onSurfaceVariant,
                  marginTop:  2,
                }}>
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* More menu — unreachable while locked since the 'more' tab itself is blocked above,
          but guarded here too in case it's ever opened another way. */}
      <Modal
        visible={moreMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMoreMenuVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setMoreMenuVisible(false)}
        >
          <Pressable>
            <View style={{
              backgroundColor:     colors.white,
              borderTopLeftRadius:  24,
              borderTopRightRadius: 24,
              paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 28,
            }}>
              <View style={{
                width: 40, height: 4, borderRadius: 2,
                backgroundColor: '#dde1e7',
                alignSelf: 'center',
                marginTop: 14, marginBottom: 4,
              }} />

              <View style={{
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
              }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '800', color: colors.primaryContainer }}>
                  More
                </Text>
                <TouchableOpacity
                  onPress={() => setMoreMenuVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f4', alignItems: 'center', justifyContent: 'center' }}
                >
                  <MaterialIcons name="close" size={18} color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              <View style={{ paddingHorizontal: 20, gap: 10 }}>
                {MORE_MENU_ITEMS.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => {
                      if (isLocked) {
                        Alert.alert('Subscription Inactive', LOCKED_MESSAGE);
                        return;
                      }
                      setMoreMenuVisible(false);
                      setTimeout(() => router.push(item.route as never), 180);
                    }}
                    activeOpacity={0.85}
                    style={{
                      flexDirection:   'row',
                      alignItems:      'center',
                      backgroundColor: colors.surface,
                      borderRadius:    16,
                      borderWidth:     1,
                      borderColor:     '#e9ecef',
                      padding:         16,
                    }}
                  >
                    <View style={{
                      width: 46, height: 46, borderRadius: 13,
                      backgroundColor: colors.primaryContainer + '18',
                      alignItems: 'center', justifyContent: 'center', marginRight: 14,
                    }}>
                      <MaterialIcons name={item.icon as React.ComponentProps<typeof MaterialIcons>['name']} size={24} color={colors.primaryContainer} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: colors.onSurface }}>{item.label}</Text>
                      <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 }}>{item.description}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function OwnerTabsLayout() {
  const checking = useRequireBusiness();

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }}>
        <ActivityIndicator color={colors.primaryContainer} />
      </View>
    );
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="docs"      />
      <Tabs.Screen name="products"  />
      <Tabs.Screen name="clients"   />
      <Tabs.Screen name="more"      />
    </Tabs>
  );
}
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../styles/globals';

const TABS = [
  { name: 'dashboard', label: 'Dashboard', icon: 'dashboard'   },
  { name: 'docs',      label: 'Docs',      icon: 'description' },
  { name: 'clients',   label: 'Clients',   icon: 'people'      },
  { name: 'more',      label: 'More',      icon: 'more-horiz'  },
] as const;

function CustomTabBar({ state, navigation }: { state: any; navigation: any }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      flexDirection:     'row',
      backgroundColor:   colors.white,
      borderTopWidth:    1,
      borderTopColor:    '#e9ecef',
      paddingTop:        8,
      paddingBottom:     insets.bottom + 6,
      paddingHorizontal: 4,
    }}>
      {TABS.map((tab, index) => {
        const focused = state.index === index;
        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{
              alignItems:        'center',
              justifyContent:    'center',
              paddingVertical:    5,
              paddingHorizontal: focused ? 14 : 0,
              borderRadius:      999,
              backgroundColor:   focused ? colors.secondaryContainer : 'transparent',
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
  );
}

export default function StaffTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="docs"      />
      <Tabs.Screen name="clients"   />
      <Tabs.Screen name="more"      />
    </Tabs>
  );
}

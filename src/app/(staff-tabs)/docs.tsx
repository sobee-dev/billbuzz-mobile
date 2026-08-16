import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../styles/globals';

export default function StaffDocsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '700', color: colors.primaryContainer }}>
          Docs
        </Text>
        <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant, marginTop: 4 }}>
          Coming soon
        </Text>
      </View>
    </SafeAreaView>
  );
}
